import React, { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (open) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onCancel}
    >
      <div
        className="animate-[fade-in_0.2s_ease-out]"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '2px 4px 12px rgba(0,0,0,0.2)',
          padding: '24px',
          minWidth: '320px',
          maxWidth: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600, color: '#333' }}>
          {title}
        </h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#666', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'white',
              color: '#666',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'var(--color-critical)',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#D32F2F')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-critical)')}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
