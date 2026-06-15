import { useEffect, useState } from 'react';
import { useRewardStore } from '../store/rewardStore';
import RewardCard from '../components/RewardCard';
import './ShopPage.css';

export default function ShopPage() {
  const { rewards, fetchRewards, loading } = useRewardStore();
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; tx: number; ty: number }[]>([]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const handleExchangeSuccess = () => {
    const colors = ['#ff4757', '#ffd700', '#54a0ff', '#2ed573', '#a55eea'];
    const newParticles = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + i,
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 60,
      y: window.innerHeight / 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      tx: (Math.random() - 0.5) * 160,
      ty: -80 - Math.random() * 80,
    }));
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 700);
  };

  return (
    <div className="shop-page">
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: p.x,
            top: p.y,
            backgroundColor: p.color,
            ['--tx' as any]: `${p.tx}px`,
            ['--ty' as any]: `${p.ty}px`,
          }}
        />
      ))}
      <div className="page-header">
        <h1 className="page-title">🛍️ 积分商城</h1>
        <p className="page-subtitle">用你的积分兑换专属数字商品！</p>
      </div>

      {loading && rewards.length === 0 ? (
        <div className="empty-state">加载中...</div>
      ) : rewards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">☁️</div>
          <p>商城暂未开放，敬请期待！</p>
        </div>
      ) : (
        <div className="reward-grid">
          {rewards.map((r) => (
            <RewardCard key={r.id} reward={r} onExchangeSuccess={handleExchangeSuccess} />
          ))}
        </div>
      )}
    </div>
  );
}
