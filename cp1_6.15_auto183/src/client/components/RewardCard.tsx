import { useState } from 'react';
import { useRewardStore, Reward } from '../store/rewardStore';
import { useChallengeStore } from '../store/challengeStore';
import './RewardCard.css';

interface RewardCardProps {
  reward: Reward;
  onExchangeSuccess: () => void;
}

export default function RewardCard({ reward, onExchangeSuccess }: RewardCardProps) {
  const { exchangeReward } = useRewardStore();
  const { currentUser } = useChallengeStore();
  const [showModal, setShowModal] = useState(false);
  const [exchanging, setExchanging] = useState(false);

  const canAfford = currentUser.points >= reward.cost;

  const handleExchange = async () => {
    if (!canAfford) return;
    setExchanging(true);
    const success = await exchangeReward(currentUser.id, reward.id);
    setExchanging(false);
    setShowModal(false);
    if (success) {
      onExchangeSuccess();
    }
  };

  return (
    <>
      <div className="reward-card">
        <div className="reward-thumbnail-wrap">
          <div className="reward-thumbnail">
            <span className="reward-emoji">{reward.thumbnail}</span>
          </div>
        </div>
        <div className="reward-info">
          <h3 className="reward-name">{reward.name}</h3>
          <p className="reward-desc">{reward.description}</p>
          <div className="reward-footer">
            <span className="reward-cost">
              <span className="coin">🪙</span> {reward.cost} 积分
            </span>
            <button
              className={`exchange-btn ${!canAfford ? 'disabled' : ''}`}
              onClick={() => setShowModal(true)}
              disabled={!canAfford}
            >
              {canAfford ? '兑换' : '积分不足'}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-mask" onClick={() => !exchanging && setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => !exchanging && setShowModal(false)}>
              ✕
            </button>
            <div className="modal-content">
              <div className="modal-thumbnail">
                <span className="modal-emoji">{reward.thumbnail}</span>
              </div>
              <h3 className="modal-title">{reward.name}</h3>
              <p className="modal-desc">{reward.description}</p>
              <p className="modal-cost">
                消耗 <span className="cost-value">{reward.cost}</span> 积分（当前积分：
                <span className="current-points">{currentUser.points}</span>）
              </p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowModal(false)} disabled={exchanging}>
                  取消
                </button>
                <button className="btn-confirm" onClick={handleExchange} disabled={exchanging}>
                  {exchanging ? '兑换中...' : '确认兑换'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
