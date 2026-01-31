import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

let isRefreshing = false
let queue: ((token: string) => void)[] = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if ((error.response?.status === 401 || error.response?.status === 403) && !original._retry) {
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
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
          refreshToken,
        })

        const newToken = res.data.accessToken
        localStorage.setItem('accessToken', newToken)

        queue.forEach((cb) => cb(newToken))
        queue = []

        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.reload()
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api
