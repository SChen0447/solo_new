import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import BookShelf from './components/BookShelf.vue'
import './styles.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: BookShelf }
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')
