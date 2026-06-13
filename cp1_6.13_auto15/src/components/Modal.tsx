import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '@/store/gameStore';

const Modal: React.FC = () => {
  const { showModal, closeModal, winner, resetGame } = useGameStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (showModal.show) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [showModal.show]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal.show) {
        if (showModal.type !== 'win') {
          closeModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal.show, showModal.type, closeModal]);

  if (!isVisible && !showModal.show) return null;

  const getModalContent = () => {
    switch (showModal.type) {
      case 'ladder':
        return {
          icon: '🪜',
          title: '发现梯子！',
          color: '#4ade80'
        };
      case 'snake':
        return {
          icon: '🐍',
          title: '遇到蛇了！',
          color: '#f87171'
        };
      case 'win':
        return {
          icon: '🏆',
          title: '游戏结束',
          color: '#ffd700'
        };
      default:
        return {
          icon: '📢',
          title: '提示',
          color: '#60a5fa'
        };
    }
  };

  const content = getModalContent();

  return createPortal(
    <div className={`modal-overlay ${showModal.show ? 'modal-fade-in' : 'modal-fade-out'}`}>
      <div className={`modal-content ${showModal.show ? 'modal-enter' : 'modal-exit'}`}>
        <div className="modal-icon" style={{ color: content.color }}>
          {content.icon}
        </div>
        <h2 className="modal-title" style={{ color: content.color }}>
          {content.title}
        </h2>
        <p className="modal-message">{showModal.message}</p>
        
        {showModal.type === 'win' ? (
          <button className="modal-btn modal-btn-win" onClick={resetGame}>
            再来一局
          </button>
        ) : (
          <button className="modal-btn" onClick={closeModal}>
            确定
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
