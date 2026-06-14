import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', style, onClick }) => {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: 'var(--color-card)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--color-card-border)',
        boxShadow: 'var(--shadow-card)',
        padding: '20px',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div
      style={{
    position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, animation: 'fadeIn 0.2s ease',
  }}
      onClick={onClose}
    >
      <div
        style={{
    background: 'var(--color-card)',
    borderRadius: 'var(--radius-card)',
    border: '1px solid var(--color-card-border)',
    boxShadow: 'var(--shadow-hover)',
    padding: '24px',
    minWidth: '320px', maxWidth: '90vw', maxHeight: '85vh',
    overflow: 'auto',
  }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            marginBottom: '20px',
            color: 'var(--color-text)',
            letterSpacing: '0.5px',
          }}>
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
};
