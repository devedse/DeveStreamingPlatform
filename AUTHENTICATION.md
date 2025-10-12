# OvenMediaEngine API Authentication Guide

## How It Works

The DeveStreamingPlatform Web application authenticates with OvenMediaEngine's API using HTTP Basic Authentication.

### OvenMediaEngine Configuration

In your `Server.xml`, the API access token is configured under `<Managers>`:

```xml
<Managers>
    <API>
        <AccessToken>ome-access-token</AccessToken>
        <CrossDomains>
            <Url>*</Url>
        </CrossDomains>
    </API>
</Managers>
```

### Web Application Configuration

The web application must use the same access token. Set it in your environment file:

**`.env.development`:**
```env
VITE_API_ACCESS_TOKEN=ome-access-token
```

**`.env.production`:**
```env
VITE_API_ACCESS_TOKEN=ome-access-token
```

## Authentication Process

1. The access token is loaded from the environment variable
2. The token is base64 encoded: `btoa('ome-access-token')` → `b21lLWFjY2Vzcy10b2tlbg==`
3. The Authorization header is added to all API requests:
   ```
   Authorization: Basic b21lLWFjY2Vzcy10b2tlbg==
   ```

## Implementation Details

### In `src/config/index.ts`:
```typescript
export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    accessToken: import.meta.env.VITE_API_ACCESS_TOKEN || 'ome-access-token',
  },
  // ...
}
```

### In `src/services/api/omeApi.ts`:
```typescript
class OmeApiClient {
  constructor() {
    // Create base64 encoded auth token from config
    const base64Auth = btoa(config.api.accessToken)
    
    this.client = axios.create({
      baseURL: config.api.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64Auth}`,
      },
    })
  }
}
```

## Changing the Access Token

### Step 1: Update OvenMediaEngine
Edit your `Server.xml`:
```xml
<AccessToken>your-new-secret-token</AccessToken>
```

Restart OvenMediaEngine:
```bash
docker restart ovenmediaengine
# or
systemctl restart ovenmediaengine
```

### Step 2: Update Web Application

**For Development:**
1. Edit `.env.development`:
   ```env
   VITE_API_ACCESS_TOKEN=your-new-secret-token
   ```
2. Restart dev server: `pnpm dev`

**For Production:**
1. Edit `.env.production`:
   ```env
   VITE_API_ACCESS_TOKEN=your-new-secret-token
   ```
2. Rebuild the application: `pnpm build`
3. Rebuild Docker image: `docker build -t devedse/devestreamingplatformweb:latest .`
4. Restart container: `docker restart deveplatform_web`

## Security Best Practices

1. **Never commit access tokens to version control**
   - Use environment variables
   - Add `.env` files to `.gitignore`

2. **Use different tokens for development and production**
   ```env
   # Development
   VITE_API_ACCESS_TOKEN=dev-token-123
   
   # Production
   VITE_API_ACCESS_TOKEN=prod-secure-token-xyz
   ```

3. **Use strong, random tokens**
   ```bash
   # Generate a secure token
   openssl rand -base64 32
   ```

4. **Rotate tokens periodically**
   - Change tokens every few months
   - Update both OvenMediaEngine and the web app

## Troubleshooting

### Error: 401 Unauthorized

**Cause:** The access token doesn't match between OvenMediaEngine and the web app.

**Solution:**
1. Check the token in `Server.xml`: `<AccessToken>ome-access-token</AccessToken>`
2. Check the token in your `.env` file: `VITE_API_ACCESS_TOKEN=ome-access-token`
3. Ensure they match exactly
4. Restart both services

### Error: CORS Issues

**Cause:** OvenMediaEngine CORS settings may be blocking requests.

**Solution:**
Ensure your `Server.xml` has:
```xml
<API>
    <CrossDomains>
        <Url>*</Url>
    </CrossDomains>
</API>
```

### Verify Authentication is Working

Check the browser console (F12):
1. Go to Network tab
2. Filter for XHR/Fetch requests
3. Click on a request to OvenMediaEngine API
4. Check the Request Headers:
   ```
   Authorization: Basic b21lLWFjY2Vzcy10b2tlbg==
   ```
5. Check the Response status: Should be `200 OK`, not `401`

## Manual Testing

You can test the API authentication manually with curl:

```bash
# Using the token directly
curl -H "Authorization: Basic b21lLWFjY2Vzcy10b2tlbg==" \
  http://10.88.28.212:8081/v1/vhosts/default/apps/app/streams

# Or encode it on the fly
TOKEN=$(echo -n "ome-access-token" | base64)
curl -H "Authorization: Basic $TOKEN" \
  http://10.88.28.212:8081/v1/vhosts/default/apps/app/streams
```

Expected response:
```json
{
  "statusCode": 200,
  "message": "OK",
  "response": ["stream1", "stream2"]
}
```

## Notes

- The access token is **embedded in the compiled JavaScript bundle**
- This means it will be visible to anyone who views the page source
- For true security, consider:
  - Running a backend proxy that authenticates with OvenMediaEngine
  - Using OvenMediaEngine's SignedPolicy feature for stream-level security
  - Implementing the web app's own authentication layer

However, for a **private platform** protected by HTTP Basic Auth (Nginx), this approach is acceptable since only authenticated users can access the web interface anyway.
