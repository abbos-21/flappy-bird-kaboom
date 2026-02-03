import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/api'
import WebApp from '@twa-dev/sdk'

export const useUserStore = defineStore('user', () => {
  const coins = ref(0)
  const maxScore = ref(0)
  const firstName = ref('')

  async function sync() {
    const initData = WebApp.initData
    // const initData = null

    if (!initData) {
      throw new Error('Telegram initData not available')
    }

    try {
      const { data } = await api.get('/game/sync')
      if (data.success) {
        coins.value = data.user.coins
        maxScore.value = data.user.maxScore
        firstName.value = data.user.firstName
      }
    } catch (e) {
      console.error('Failed to sync user data', e)
    }
  }

  return { coins, maxScore, firstName, sync }
})
