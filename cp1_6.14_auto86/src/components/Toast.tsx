import React from 'react';
import { useAppStore } from '../store';

export const Toast: React.FC = () => {
  const { toasts, removeToast } = useAppStore();
  
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast toast-${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          {toast.type === 'success' && <span className="toast-icon">✓</span>}
          {toast.type === 'error' && <span className="toast-icon">✕</span>}
          {toast.type === 'info' && <span className="toast-icon">ℹ</span>}
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  );
};
