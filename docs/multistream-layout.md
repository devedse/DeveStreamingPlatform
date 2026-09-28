# Multistream layout requirements

- Every selected stream appears exactly once. Rectangles never overlap or extend outside the actual container, including borders and gaps.
- Preserve video aspect ratios without cropping. Prefer finite positive explicit ratios, then valid source dimensions, then 16:9.
- Give streams equal priority, not necessarily equal area. A wide stream can use a shallow strip; a portrait stream can use a side strip even when its video area is substantially smaller.
- Maximize the sum of log displayed video areas. Equivalently, maximize their geometric mean. Enlarging a tiny video matters more than enlarging an already large video; any zero-area video gives negative infinity. Break score ties by total video area. Do not count black bars as video area.
- Keep stream identity and input order. Horizontal shelves read left-to-right, top-to-bottom; vertical shelves read top-to-bottom, left-to-right. Do not search arbitrary permutations.
- React to container resize, stream selection and metadata changes; disconnect observers and listeners on teardown.
- Handle empty, hidden, invalid-size and tiny containers without invalid geometry. Reduce decoration when necessary. There is no fixed maximum stream count.

## Candidate search

Always include equal-cell grids as a baseline. Additionally, search independently sized horizontal rows and vertical columns (shelves). Up to ten streams, enumerate every contiguous partition into shelves. Above ten, consider every shelf capacity, with the incomplete shelf at either end. This keeps large multiviews approximately O(n²), rather than exponentially expensive. It can miss better irregular arrangements at larger counts.

Within a horizontal shelf, videos share a content height and receive widths proportional to their aspect ratios. Each shelf has a height cap determined by available width after borders and gaps. Allocate the total height budget by stream count, redistributing surplus from shelves that reach their caps. This maximizes the log-area objective within that family of common-height shelves. Center unused space. Apply the same construction with axes exchanged for vertical shelves. Score the final aspect-preserving fits, including the equal-grid candidates, and choose deterministically.

Candidate construction bounds all rectangles before scoring. Rendering uses absolute pixel rectangles inside a measured relative container, with explicit border-box cells. This avoids the old failure where taking maximum column widths from independently sized rows produced a combined grid wider than the viewport.

This is a packing heuristic, not a global arbitrary-rectangle optimizer. It has no hard minimum readable size or fixed smallest/largest area ratio. Equal priority can still produce unequal sizes, including for identical streams in incomplete shelves. Zero or numerically unrepresentable video areas are unavoidable for hidden containers or extreme metadata. The log score discourages starvation in usable containers; it does not promise a particular pixel minimum at arbitrary stream counts.

## Examples covered by tests

Dimensions below ignore the small space used by borders and gaps; automated coverage assertions allow for that decoration.

| Container | Streams | Expected useful arrangement |
| --- | --- | --- |
| 1920×1440 | 16:9 and 16:3 | 1920×1080 main video above a 1920×360 strip; approximately 3:1 areas |
| 1920×1080 | 4:3 and 4:9 | 1440×1080 main video beside a 480×1080 portrait strip; approximately 3:1 areas |
| 1920×1080 | 16:9, 16:9, 32:9 | Two 960×540 videos above one 1920×540 video; approximately 1:1:2 areas |
| 3440×1440 | Two 3440×1440 sources and one 2560×1440 source | All videos remain substantial, preserve aspect ratios and stay in bounds |

Tests also cover nine viewport shapes, mixed-resolution permutations, 300 seeded random cases, rectangle overlap, scores versus every equal-grid baseline, zero-area starvation, invalid metadata, 121 streams, and container/lifecycle changes.
