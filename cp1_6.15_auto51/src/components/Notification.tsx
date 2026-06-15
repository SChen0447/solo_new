import React, { useEffect } from 'react';
import { useAvatarStore } from '../store/avatarStore';

export function Notification() {
  const { notification, setNotification } = useAvatarStore();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [notification, setNotification]);

  if (!notification) return null;

  return (
    <div
      style={{
        ...styles.container,
        background: notification.type === 'success' ? '#27ae60' : '#e74c3c',
      }}
    >
      {notification.message}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    padding: '12px 24px',
    color: 'white',
    fontSize: 14,
    fontWeight: 500,
    textAlign: 'center',
    zIndex: 9999,
    animation: 'slideDown 0.3s ease',
  },
};
