/**
 * React 应用入口文件
 * 
 * 数据流向：
 * index.html <script src="/src/main.tsx">
 *   → 创建 React Root → 渲染 <App /> 组件
 *     → <BrowserRouter> 提供路由上下文
 *       → App.tsx 根据路由渲染不同页面组件
 *         → 各页面组件调用 src/api/client.ts 与后端通信
 *           → Express API (server/index.ts 3001端口)
 * 
 * 调用关系：
 * main.tsx → App.tsx → [ExhibitionList | CreateExhibition | ViewExhibition]
 *   → ExhibitionCanvas.tsx (Canvas走廊场景 + 记忆气泡)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

// 挂载 React 应用到 #root
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
