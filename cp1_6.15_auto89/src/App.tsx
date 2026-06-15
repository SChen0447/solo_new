import React, { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useMenuStore, getTimeSlot, TimeSlot, MenuItem } from './store';
import MenuBoard from './modules/menu/MenuBoard';
import AdminPanel from './modules/admin/AdminPanel';

let socket: Socket | null = null;

const NavBar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '📋 菜单看板', desc: '顾客端展示' },
    { path: '/admin', label: '⚙️ 管理后台', desc: '管理员操作' }
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 4,
        padding: 6,
        backgroundColor: 'rgba(33, 33, 33, 0.92)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        zIndex: 1000,
        backdropFilter: 'blur(8px)'
      }}
    >
      {navItems.map((item) => {
        const isActive =
          (item.path === '/' && location.pathname === '/') ||
          (item.path !== '/' && location.pathname.startsWith(item.path));
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              color: isActive ? '#fff' : '#bdbdbd',
              backgroundColor: isActive ? '#1565c0' : 'transparent',
              transition: 'all 0.2s ease-in-out',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};

const App: React.FC = () => {
  const {
    fetchMenuItems,
    setCurrentTimeSlot,
    setStockLocal,
    setMenuItemLocal,
    removeMenuItemLocal,
    addMenuItemLocal
  } = useMenuStore();

  useEffect(() => {
    const updateTimeSlot = () => {
      const slot = getTimeSlot();
      setCurrentTimeSlot(slot);
    };

    updateTimeSlot();
    const intervalId = setInterval(updateTimeSlot, 60000);

    return () => clearInterval(intervalId);
  }, [setCurrentTimeSlot]);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  useEffect(() => {
    if (socket && socket.connected) return;

    try {
      socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10
      });

      socket.on('connect', () => {
        console.log('WebSocket 连接成功');
      });

      socket.on('connect_error', (err) => {
        console.warn('WebSocket 连接失败:', err.message);
      });

      socket.on('menu:init', (data: MenuItem[]) => {
        if (useMenuStore.getState().menuItems.length === 0 && data.length > 0) {
          useMenuStore.setState({ menuItems: data });
        }
      });

      socket.on('stock:updated', ({ id, stock }: { id: string; stock: number }) => {
        setStockLocal(id, stock);
      });

      socket.on('menu:updated', ({ action, item, id }: { action: string; item?: MenuItem; id?: string }) => {
        if (action === 'update' && item) {
          setMenuItemLocal(item);
        } else if (action === 'delete' && id) {
          removeMenuItemLocal(id);
        } else if (action === 'create' && item) {
          addMenuItemLocal(item);
        }
      });

      socket.on('order:created', () => {
        // 订单创建后库存已通过 stock:updated 同步
      });

      socket.on('disconnect', (reason) => {
        console.warn('WebSocket 断开:', reason);
      });
    } catch (err) {
      console.error('WebSocket 初始化错误:', err);
    }

    return () => {
      if (socket) {
        socket.off('stock:updated');
        socket.off('menu:updated');
        socket.off('order:created');
        socket.off('menu:init');
        socket.off('connect');
        socket.off('connect_error');
        socket.off('disconnect');
      }
    };
  }, [setStockLocal, setMenuItemLocal, removeMenuItemLocal, addMenuItemLocal]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Routes>
        <Route path="/" element={<MenuBoard />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<MenuBoard />} />
      </Routes>
      <NavBar />
    </div>
  );
};

export default App;
