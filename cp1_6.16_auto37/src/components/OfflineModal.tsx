import React, { useState, useEffect } from 'react';
import { OfflineEarnings, ResourceType } from '../types';
import { formatDuration, formatNumber } from '../gameLogic';

interface OfflineModalProps {
  earnings: OfflineEarnings;
  onCollect: () => void;
  resources: Record<ResourceType, { icon: string; color: string }>;
}

const OfflineModal: React.FC<OfflineModalProps> = ({ earnings, onCollect, resources }) => {
  const [displayValues, setDisplayValues] = useState<Record<ResourceType, number>>({
    gold: 0,
    wood: 0,
    stone: 0
  });
  const [isCollecting, setIsCollecting] = useState(false);

  useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();
    const startValues: Record<ResourceType, number> = { gold: 0, wood: 0, stone: 0 };

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const newValues: Record<ResourceType, number> = { ...startValues };
      (Object.keys(earnings.earnings) as ResourceType[]).forEach(type => {
        newValues[type] = Math.floor(earnings.earnings[type] * easeProgress);
      });

      setDisplayValues(newValues);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [earnings.earnings]);

  const handleCollect = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isCollecting) return;
    setIsCollecting(true);

    const ripple = document.createElement('span');
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.className = 'ripple';

    e.currentTarget.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    setTimeout(() => {
      onCollect();
    }, 300);
  };

  const earningEntries = Object.entries(earnings.earnings) as [ResourceType, number][];
  const hasEarnings = earningEntries.some(([, value]) => value > 0);

  if (!hasEarnings) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        className="parchment-bg"
        style={{
          width: '90%',
          maxWidth: '400px',
          padding: '40px 30px',
          animation: 'modal-appear 0.4s ease-out',
          textAlign: 'center'
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#5C4033',
            marginBottom: '8px',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
          }}
        >
          👋 欢迎回来！
        </h1>

        <div
          style={{
            fontSize: '14px',
            color: '#6B4423',
            marginBottom: '24px'
          }}
        >
          你离开了 {formatDuration(earnings.duration)}
        </div>

        <div
          style={{
            background: 'rgba(92, 64, 51, 0.1)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px'
          }}
        >
          <div
            style={{
              fontSize: '14px',
              color: '#5C4033',
              marginBottom: '16px',
              fontWeight: 'bold'
            }}
          >
            离线期间收获：
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {earningEntries.map(([type, value]) => {
              if (value <= 0) return null;
              const resource = resources[type];
              return (
                <div
                  key={type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                  }}
                >
                  <span style={{ fontSize: '28px' }}>{resource.icon}</span>
                  <span
                    className="pixel-font"
                    style={{
                      fontSize: '28px',
                      fontWeight: 'bold',
                      color: resource.color,
                      minWidth: '80px',
                      textAlign: 'right'
                    }}
                  >
                    +{formatNumber(displayValues[type])}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleCollect}
          disabled={isCollecting}
          className="btn btn-accent"
          style={{
            width: '100%',
            padding: '16px 32px',
            fontSize: '18px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          🎁 领取奖励
        </button>
      </div>
    </div>
  );
};

export default OfflineModal;
