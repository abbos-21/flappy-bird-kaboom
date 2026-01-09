import { init } from '@tma.js/sdk-vue'
init()
import { syncAuth } from './services/authService'

import './assets/main.css'
import { createApp } from 'vue'
syncAuth()
  .catch(() => {
    console.warn('Telegram auth failed')
  })
  .finally(() => {
    app.mount('#app')
  })
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import 'kaboom/global'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
