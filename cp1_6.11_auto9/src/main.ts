/**
 * main.ts - Vue 应用入口
 *
 * 调用关系：
 *   - 导入 App.vue 根组件，创建 Vue 应用实例并挂载到 #app
 *   - 导入 global.css 全局样式
 *
 * 数据流向：
 *   main.ts → createApp(App) → App.vue (根组件) → 整个应用渲染
 */
import { createApp } from 'vue'
import App from './App.vue'
import './styles/global.css'

createApp(App).mount('#app')
