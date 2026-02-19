import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const streamAuthToken = ref<string | null>(null)
  const checking = ref(false)

  /**
   * Check if the user is currently authenticated (valid cookie)
   */
  async function checkAuth(): Promise<boolean> {
    checking.value = true
    try {
      const res = await fetch('/api/auth-status')
      const data = await res.json()
      isAuthenticated.value = data.authenticated === true

      if (isAuthenticated.value) {
        await fetchStreamToken()
      } else {
        streamAuthToken.value = null
      }

      return isAuthenticated.value
    } catch (err) {
      console.error('Failed to check auth status:', err)
      isAuthenticated.value = false
      streamAuthToken.value = null
      return false
    } finally {
      checking.value = false
    }
  }

  /**
   * Fetch the stream auth token (only available when authenticated)
   */
  async function fetchStreamToken(): Promise<void> {
    try {
      const res = await fetch('/api/stream-token')
      if (res.ok) {
        const data = await res.json()
        streamAuthToken.value = data.token || null
      } else {
        streamAuthToken.value = null
      }
    } catch (err) {
      console.error('Failed to fetch stream token:', err)
      streamAuthToken.value = null
    }
  }

  /**
   * Log in with a password. The password is hashed client-side before sending.
   * Returns true if login was successful.
   */
  async function login(password: string): Promise<boolean> {
    try {
      // Hash the password client-side using SHA-256
      const encoder = new TextEncoder()
      const data = encoder.encode(password)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwordHash }),
      })

      if (res.ok) {
        // Cookie is set by the server (HttpOnly)
        // Now check auth to update state and fetch token
        await checkAuth()
        return true
      }

      return false
    } catch (err) {
      console.error('Login failed:', err)
      return false
    }
  }

  /**
   * Log out by clearing the auth cookie
   */
  async function logout(): Promise<void> {
    try {
      await fetch('/auth/logout')
    } catch (err) {
      console.error('Logout failed:', err)
    }
    isAuthenticated.value = false
    streamAuthToken.value = null
  }

  return {
    // State
    isAuthenticated,
    streamAuthToken,
    checking,
    // Actions
    checkAuth,
    login,
    logout,
  }
})
