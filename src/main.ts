import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { init } from '@tma.js/sdk-vue'
import { syncAuth } from './services/authService'

import './assets/main.css'
import 'kaboom/global'

async function bootstrap() {
  init()

  try {
    await syncAuth()
  } catch (e) {
    console.warn('Telegram auth failed', e)
  }

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}

bootstrap()
