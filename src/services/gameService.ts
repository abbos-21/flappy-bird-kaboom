import api from '@/lib/api'
import { useUserStore } from '@/stores/user'

export const gameService = {
  /**
   * Starts a secure game session on the server.
   * Returns the sessionId required to submit the score later.
   */
  async startSession(): Promise<string | null> {
    try {
      const res = await api.post('/game/start')
      return res.data.sessionId
    } catch (e) {
      console.error('Failed to start game session:', e)
      return null
    }
  },

  /**
   * Ends the session and verifies the score on the server.
   * Updates the local user store with the new coin balance.
   */
  async endSession(sessionId: string, score: number) {
    const userStore = useUserStore()

    try {
      const res = await api.post('/game/end', {
        sessionId,
        score
      })

      if (res.data.valid) {
        // Update local state with server response
        userStore.coins = res.data.newCoins
        if (res.data.highScore) {
          userStore.maxScore = res.data.highScore
        }
        return { success: true, earned: res.data.earned }
      } else {
        console.warn('Score rejected by server (Anti-Cheat)')
        return { success: false, earned: 0 }
      }
    } catch (e) {
      console.error('Failed to submit score:', e)
      return { success: false, earned: 0 }
    }
  }
}
