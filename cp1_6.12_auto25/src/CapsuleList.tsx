import { useState, useEffect } from 'react';
import { Capsule } from './types';
import { listCapsules, openCapsule } from './store';
import CapsuleDetail from './CapsuleDetail';

interface CapsuleListProps {
  refreshKey: number;
}

export default function CapsuleList({ refreshKey }: CapsuleListProps) {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setCapsules(listCapsules());
  }, [refreshKey]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getDaysRemaining = (openDate: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(openDate);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const canOpen = (capsule: Capsule) => {
    return getDaysRemaining(capsule.openDate) <= 0;
  };

  const handleOpenCapsule = (capsule: Capsule) => {
    const updated = openCapsule(capsule.id);
    if (updated) {
      setSelectedCapsule(updated);
      setIsFlipped(true);
      setCapsules(listCapsules());
    }
  };

  const handleCloseDetail = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setSelectedCapsule(null);
    }, 600);
  };

  const formatCountdown = (openDate: string) => {
    const days = getDaysRemaining(openDate);
    if (days < 0) return '已过期';
    if (days === 0) return '今天可开启';
    return `${days} 天后`;
  };

  return (
    <div className="capsule-list-container">
      <div className="capsule-grid">
        {capsules.map((capsule, index) => {
          const openable = canOpen(capsule);
          return (
            <div
              key={capsule.id}
              className="capsule-card"
              style={{
                background: `linear-gradient(135deg, ${capsule.coverColor.from}, ${capsule.coverColor.to})`,
                animationDelay: `${index * 0.08}s`,
              }}
            >
              <div className="card-content">
                <div className="card-lock-icon">
                  {capsule.isOpened ? '📬' : '🔒'}
                </div>
                <h3 className="card-title">{capsule.title}</h3>
                <div className="card-countdown">
                  <span className="countdown-label">
                    {openable ? '距离开启' : '距离开启'}
                  </span>
                  <span className="countdown-value">
                    {formatCountdown(capsule.openDate)}
                  </span>
                </div>
              </div>
              <div className="card-footer">
                {openable ? (
                  <button
                    className="open-btn"
                    onClick={() => handleOpenCapsule(capsule)}
                  >
                    {capsule.isOpened ? '查看内容' : '✨ 可开启'}
                  </button>
                ) : (
                  <div className="locked-badge">
                    🔒 封存中
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {capsules.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">💌</div>
          <p>还没有时光胶囊</p>
          <p className="empty-subtitle">点击上方按钮创建你的第一个胶囊吧</p>
        </div>
      )}

      {selectedCapsule && (
        <CapsuleDetail
          capsule={selectedCapsule}
          isFlipped={isFlipped}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
