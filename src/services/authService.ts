import api from '@/lib/api'
// import { retrieveLaunchParams } from '@tma.js/sdk'
import WebApp from '@twa-dev/sdk'

export async function syncAuth() {
  const initData = WebApp.initData

  if (!initData) {
    throw new Error('Telegram initData not available')
  }

  // Clear old tokens before syncing to ensure a fresh start
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')

  const res = await api.post(
    '/auth/sync',
    {},
    {
      headers: {
        // Use a custom header name if your backend supports it,
        // or ensure Bearer isn't attached (fixed in api.ts above)
        'Authorization': `tma ${initData}`,
      },
    },
  )

  const { accessToken, refreshToken, user } = res.data

  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
  localStorage.setItem('user', JSON.stringify(user))

  return user
}
