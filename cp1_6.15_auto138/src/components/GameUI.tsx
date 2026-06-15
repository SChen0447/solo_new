import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

interface GameUIProps {
  onReset: () => void;
  onResume: () => void;
  onTouchLeft: (active: boolean) => void;
  onTouchRight: (active: boolean) => void;
  onTouchJump: (active: boolean) => void;
}

export const GameUI: React.FC<GameUIProps> = ({
  onReset,
  onResume,
  onTouchLeft,
  onTouchRight,
  onTouchJump
}) => {
  const {
    collectedKeys,
    totalKeys,
    timeRemaining,
    isPaused,
    isGameOver,
    isWin,
    showMobileControls,
    togglePause
  } = useGameStore();

  const [timerFlash, setTimerFlash] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const joystickActiveRef = useRef(false);
  const joystickCenterRef = useRef({ x: 0, y: 0 });

  const formatTime = (seconds: number): string => {
    return Math.ceil(seconds).toString();
  };

  const isLowTime = timeRemaining <= 15;

  useEffect(() => {
    if (isLowTime && !isGameOver && !isWin && !isPaused) {
      const interval = setInterval(() => {
        setTimerFlash(prev => !prev);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setTimerFlash(false);
    }
  }, [isLowTime, isGameOver, isWin, isPaused]);

  const handleJoystickStart = useCallback((clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    joystickCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    joystickActiveRef.current = true;
    handleJoystickMove(clientX, clientY);
  }, []);

  const handleJoystickMove = useCallback((clientX: number, clientY: number) => {
    if (!joystickActiveRef.current || !joystickKnobRef.current) return;

    const dx = clientX - joystickCenterRef.current.x;
    const dy = clientY - joystickCenterRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 30;
    const clampedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDistance;
    const knobY = Math.sin(angle) * clampedDistance;

    joystickKnobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`;

    const threshold = 10;
    if (dx < -threshold) {
      onTouchLeft(true);
      onTouchRight(false);
    } else if (dx > threshold) {
      onTouchRight(true);
      onTouchLeft(false);
    } else {
      onTouchLeft(false);
      onTouchRight(false);
    }
  }, [onTouchLeft, onTouchRight]);

  const handleJoystickEnd = useCallback(() => {
    joystickActiveRef.current = false;
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = 'translate(0, 0)';
    }
    onTouchLeft(false);
    onTouchRight(false);
  }, [onTouchLeft, onTouchRight]);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleJoystickStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleJoystickMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleJoystickEnd();
  };

  const handleJumpTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onTouchJump(true);
  };

  const handleJumpTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onTouchJump(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.hud}>
        <div style={styles.keyCounter}>
          <span style={styles.keyIcon}>🔑</span>
          <span style={{
            ...styles.keyText,
            color: collectedKeys >= totalKeys ? '#2ecc71' : '#f1c40f'
          }}>
            {collectedKeys}/{totalKeys}
          </span>
        </div>

        <div style={styles.rightHud}>
          <div style={{
            ...styles.timer,
            color: isLowTime && timerFlash ? '#e74c3c' : '#ecf0f0'
          }}>
            {formatTime(timeRemaining)}秒
          </div>
          <button
            style={styles.pauseButton}
            onClick={togglePause}
            onTouchEnd={(e) => { e.preventDefault(); togglePause(); }}
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        </div>
      </div>

      {showMobileControls && (
        <div style={styles.mobileControls}>
          <div
            ref={joystickRef}
            style={styles.joystick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={(e) => handleJoystickStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleJoystickMove(e.clientX, e.clientY)}
            onMouseUp={handleJoystickEnd}
            onMouseLeave={handleJoystickEnd}
          >
            <div ref={joystickKnobRef} style={styles.joystickKnob} />
          </div>
          <div
            style={styles.jumpButton}
            onTouchStart={handleJumpTouchStart}
            onTouchEnd={handleJumpTouchEnd}
            onMouseDown={handleJumpTouchStart}
            onMouseUp={handleJumpTouchEnd}
            onMouseLeave={handleJumpTouchEnd}
          >
            ⬆
          </div>
        </div>
      )}

      {isPaused && !isGameOver && !isWin && (
        <div style={styles.overlay}>
          <div style={styles.overlayContent}>
            <h2 style={styles.overlayTitle}>游戏暂停</h2>
            <button style={styles.overlayButton} onClick={onResume}>
              继续游戏
            </button>
            <button style={{ ...styles.overlayButton, marginTop: 12 }} onClick={onReset}>
              重新开始
            </button>
          </div>
        </div>
      )}

      {isGameOver && (
        <div style={styles.overlay}>
          <div style={styles.overlayContent}>
            <h2 style={{ ...styles.overlayTitle, color: '#e74c3c' }}>游戏失败</h2>
            <p style={styles.overlaySubtitle}>
              {timeRemaining <= 0 ? '时间耗尽！' : '触碰到激光！'}
            </p>
            <button style={styles.overlayButton} onClick={onReset}>
              重试
            </button>
          </div>
        </div>
      )}

      {isWin && (
        <div style={styles.overlay}>
          <div style={styles.overlayContent}>
            <h2 style={{ ...styles.overlayTitle, color: '#2ecc71' }}>🎉 恭喜通关！</h2>
            <p style={styles.overlaySubtitle}>
              剩余时间: {formatTime(timeRemaining)}秒
            </p>
            <button style={styles.overlayButton} onClick={onReset}>
              再玩一次
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 10
  },
  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px',
    pointerEvents: 'auto'
  },
  keyCounter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '24px',
    transition: 'all 0.3s ease'
  },
  keyIcon: {
    fontSize: '24px'
  },
  keyText: {
    fontSize: '24px',
    fontWeight: 'bold',
    transition: 'color 0.3s ease'
  },
  rightHud: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  timer: {
    fontSize: '24px',
    fontWeight: 'bold',
    padding: '8px 16px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '24px',
    transition: 'color 0.3s ease'
  },
  pauseButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(236, 240, 241, 0.3)',
    color: '#ffffff',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  },
  mobileControls: {
    position: 'absolute',
    bottom: '20px',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: '0 20px',
    pointerEvents: 'auto'
  },
  joystick: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(236, 240, 241, 0.2)',
    border: '2px solid rgba(236, 240, 241, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  joystickKnob: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: 'rgba(52, 152, 219, 0.8)',
    boxShadow: '0 0 10px rgba(52, 152, 219, 0.5)',
    transition: 'transform 0.1s ease-out'
  },
  jumpButton: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'rgba(46, 204, 113, 0.3)',
    border: '2px solid rgba(46, 204, 113, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#ffffff',
    touchAction: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.1s ease'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto'
  },
  overlayContent: {
    backgroundColor: '#1a1a2e',
    padding: '40px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 0 40px rgba(52, 152, 219, 0.3)',
    border: '2px solid #3498db',
    transition: 'all 0.3s ease'
  },
  overlayTitle: {
    fontSize: '32px',
    margin: '0 0 16px 0',
    color: '#ecf0f1'
  },
  overlaySubtitle: {
    fontSize: '18px',
    color: '#bdc3c7',
    margin: '0 0 24px 0'
  },
  overlayButton: {
    width: '160px',
    height: '48px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#333333',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  }
};

export default GameUI;
