import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// --- Request Interceptor ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')

  // Check if we are currently trying to sync or refresh
  // We don't want to attach an old Bearer token to these specific calls
  const isAuthRoute = config.url?.includes('/auth/sync') || config.url?.includes('/auth/refresh')

  if (token && !isAuthRoute) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

let isRefreshing = false
let queue: ((token: string) => void)[] = []

// --- Response Interceptor ---
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    // 1. If the /auth/sync call itself fails, DO NOT try to refresh.
    // This prevents the double 401 loop on startup.
    if (original.url?.includes('/auth/sync')) {
      return Promise.reject(error)
    }

    // 2. Handle 401 Unauthorized for all other requests
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      isRefreshing = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')

        // We use a clean axios instance here to avoid the interceptors above
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
          refreshToken,
        })

        const newToken = res.data.accessToken
        localStorage.setItem('accessToken', newToken)

        // Process the queue of failed requests
        queue.forEach((cb) => cb(newToken))
        queue = []

        // Retry the original request
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshError) {
        // If refresh fails, session is dead. Clean up and restart.
        localStorage.clear()
        window.location.reload()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api
