import api from '@/lib/api'
// import { retrieveLaunchParams } from '@tma.js/sdk'
// import WebApp from '@twa-dev/sdk'

export async function syncAuth() {
  // const initData = WebApp.initData
  const initData = null

  if (!initData) {
    throw new Error('Telegram initData not available')
  }

  const res = await api.post(
    '/auth/sync',
    {},
    {
      headers: {
        Authorization: `tma ${initData}`,
      },
    },
  )

  const { accessToken, refreshToken, user } = res.data

  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
  localStorage.setItem('user', JSON.stringify(user))

  return user
}
