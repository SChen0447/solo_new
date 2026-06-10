/**
 * 主应用组件
 * 
 * 职责：
 * - 管理前端路由（/ 列表页、/create 创建页、/exhibition/:id 浏览页）
 * - 管理全局 Toast 提示条（成功/错误反馈）
 * - 提供 showToast 方法给子组件调用
 * 
 * 数据流向：
 * App → 子页面 → API 调用 → 返回结果 → App 更新 Toast 状态
 * 
 * 调用关系：
 * App.tsx → pages/ExhibitionList.tsx  (GET /api/exhibitions)
 *         → pages/CreateExhibition.tsx (POST /api/upload + POST /api/exhibitions)
 *         → pages/ViewExhibition.tsx → ExhibitionCanvas.tsx
 *              (GET /api/bubbles + POST /api/bubbles)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import ExhibitionList from './pages/ExhibitionList';
import CreateExhibition from './pages/CreateExhibition';
import ViewExhibition from './pages/ViewExhibition';
import type { EmotionTheme } from './types';
import { getThemeGradient } from './utils/theme';

// ================ Toast 上下文 ================

export interface ToastData {
  type: 'success' | 'error';
  message: string;
}

interface AppContextType {
  showToast: (type: 'success' | 'error', message: string) => void;
}

export const AppContext = React.createContext<AppContextType>({
  showToast: () => {},
});

// ================ 主组件 ================

const App: React.FC = () => {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [toastClosing, setToastClosing] = useState(false);

  /**
   * 显示提示条
   * - 成功：绿色 #4caf50，滑入，2秒后消失
   * - 错误：红色 #f44336，同时触发抖动
   */
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setToastClosing(false);

    // 2秒后开始滑出动画
    setTimeout(() => setToastClosing(true), 1700);
    setTimeout(() => setToast(null), 2000);
  }, []);

  return (
    <AppContext.Provider value={{ showToast }}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* 顶部导航栏 */}
        <NavBar />

        {/* 主内容区域 */}
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<ExhibitionList />} />
            <Route path="/create" element={<CreateExhibition />} />
            <Route path="/exhibition/:id" element={<ViewExhibition />} />
          </Routes>
        </main>

        {/* Toast 提示条 */}
        {toast && (
          <div className={`toast ${toast.type} ${toastClosing ? 'closing' : ''}`}>
            {toast.message}
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
};

// ================ 导航栏子组件 ================

const NavBar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <nav style={{
      backgroundColor: '#16213e',
      padding: '16px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link to="/" style={{
        fontSize: '22px',
        fontWeight: 700,
        color: '#e0e0e0',
        cursor: 'pointer',
        letterSpacing: '1px',
      }}>
        🖼️ 记忆走廊
      </Link>
      <button
        onClick={() => navigate('/create')}
        style={{
          padding: '10px 24px',
          background: getThemeGradient('hope' as EmotionTheme),
          color: '#fff',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(48,207,208,0.3)',
        }}
      >
        + 创建展览
      </button>
    </nav>
  );
};

export default App;
