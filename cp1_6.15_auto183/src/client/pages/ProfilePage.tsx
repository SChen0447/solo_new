import { useEffect, useRef, useCallback, useState } from 'react';
import { useChallengeStore, PointsHistoryItem } from '../store/challengeStore';
import './ProfilePage.css';

const getActionLabel = (action: string): string => {
  switch (action) {
    case 'join_challenge':
      return '🎯 完成挑战';
    case 'like_receive':
      return '❤️ 获得点赞';
    case 'bonus':
      return '🎁 积分奖励';
    case 'exchange':
      return '🛍️ 兑换奖品';
    default:
      return action;
  }
};

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function ProfilePage() {
  const { currentUser, pointsHistory, fetchPointsHistory } = useChallengeStore();
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPointsHistory(currentUser.id, 0);
    setOffset(20);
  }, [currentUser.id, fetchPointsHistory]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      fetchPointsHistory(currentUser.id, offset).then(() => {
        setOffset((prev) => {
          const next = prev + 20;
          if (pointsHistory.length >= next && pointsHistory.length % 20 !== 0) {
            setHasMore(false);
          }
          return next;
        });
      });
    }
  }, [currentUser.id, fetchPointsHistory, hasMore, offset, pointsHistory.length]);

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="user-avatar-lg">{currentUser.avatar}</div>
        <div className="user-meta">
          <h2 className="user-name">{currentUser.username}</h2>
          <p className="user-points-text">
            当前积分：<span className="points-value">🪙 {currentUser.points}</span>
          </p>
        </div>
      </div>

      <div className="section-title">📜 积分记录</div>

      <div className="timeline-wrap" ref={containerRef} onScroll={handleScroll}>
        {pointsHistory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-emoji">☁️</div>
            <p>还没有内容，快成为第一个参与者吧！</p>
          </div>
        ) : (
          <div className="timeline">
            {pointsHistory.map((item: PointsHistoryItem, idx: number) => (
              <div className="timeline-item" key={`${item.id}-${idx}`}>
                <span className="timeline-dot"></span>
                <div className="timeline-content">
                  <div className="timeline-top">
                    <span className="timeline-action">{getActionLabel(item.action)}</span>
                    <span className={`timeline-points ${item.points >= 0 ? 'positive' : 'negative'}`}>
                      {item.points >= 0 ? '+' : ''}
                      {item.points}
                    </span>
                  </div>
                  {item.description && <p className="timeline-desc">{item.description}</p>}
                  <span className="timeline-time">{formatTime(item.created_at)}</span>
                </div>
              </div>
            ))}
            {hasMore && pointsHistory.length > 0 && (
              <div className="loading-more">加载更多...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
