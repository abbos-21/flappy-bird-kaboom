import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/api'

export const useUserStore = defineStore('user', () => {
  const coins = ref(0)
  const maxScore = ref(0)
  const firstName = ref('')

  async function sync() {
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
