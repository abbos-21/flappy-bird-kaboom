import api from '@/lib/api'
import { initData } from '@tma.js/sdk-vue'

export async function syncAuth() {
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
