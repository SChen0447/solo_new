import { useEffect } from 'react';
import { useChallengeStore } from '../store/challengeStore';
import ChallengeCard from '../components/ChallengeCard';
import './HomePage.css';

export default function HomePage() {
  const { challenges, fetchChallenges, loading } = useChallengeStore();

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  return (
    <div className="home-page">
      <div className="page-header">
        <h1 className="page-title">🎨 创作挑战</h1>
        <p className="page-subtitle">参与挑战，赢取积分，兑换专属福利！</p>
      </div>

      {loading && challenges.length === 0 ? (
        <div className="empty-state">加载中...</div>
      ) : challenges.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">☁️</div>
          <p>还没有内容，快成为第一个参与者吧！</p>
        </div>
      ) : (
        <div className="challenge-grid">
          {challenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </div>
      )}
    </div>
  );
}
