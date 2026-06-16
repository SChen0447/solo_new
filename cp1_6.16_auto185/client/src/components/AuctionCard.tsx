import React, { useState, useMemo } from 'react';
import { AuctionItem, Bid } from '../types';
import BidHistory from './BidHistory';

interface AuctionCardProps {
  item: AuctionItem;
  bids: Bid[];
  onBid: (itemId: string, amount: number) => void;
}

function formatTimeLeft(endTime: number): string {
  const now = Date.now();
  const diff = Math.max(0, endTime - now);
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getTimeLeftSeconds(endTime: number): number {
  const now = Date.now();
  return Math.max(0, Math.ceil((endTime - now) / 1000));
}

export const AuctionCard: React.FC<AuctionCardProps> = ({ item, bids, onBid }) => {
  const [showBidInput, setShowBidInput] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [, setTick] = useState(0);

  const timeLeftSeconds = useMemo(
    () => (item.status === 'active' ? getTimeLeftSeconds(item.endTime) : 0),
    [item.endTime, item.status]
  );

  const isCompleted = item.status === 'completed';
  const isUrgent = !isCompleted && timeLeftSeconds < 30;
  const isShaking = !isCompleted && timeLeftSeconds < 10;

  React.useEffect(() => {
    if (isCompleted) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCompleted]);

  const handleBidClick = () => {
    setShowBidInput(true);
    setBidAmount(String(item.currentPrice + 1));
    setError('');
  };

  const handleConfirmBid = () => {
    const amount = parseInt(bidAmount, 10);
    if (isNaN(amount) || !Number.isInteger(amount)) {
      setError('请输入有效整数');
      return;
    }
    if (amount <= item.currentPrice) {
      setError(`出价必须高于当前价格 ¥${item.currentPrice}`);
      return;
    }
    onBid(item.id, amount);
    setShowBidInput(false);
    setBidAmount('');
  };

  const handleCancelBid = () => {
    setShowBidInput(false);
    setError('');
  };

  const cardStyle: React.CSSProperties = {
    ...styles.card,
    ...(isCompleted ? { border: '2px solid #ffd700' } : {}),
    ...(isUrgent && !isCompleted
      ? { backgroundColor: `rgba(255, 107, 107, ${0.1 + (30 - timeLeftSeconds) / 100})` }
      : {}),
    animation: isShaking ? 'shake 0.125s infinite' : 'none',
  };

  const timeColor = isUrgent ? '#ff6b6b' : '#fff';
  const totalBids = bids.length;
  const winner = isCompleted ? item.winner : null;

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isCompleted && (
        <div style={styles.soldLabel}>已成交</div>
      )}

      <div style={styles.imagePlaceholder}>
        <span style={styles.imageText}>🎨</span>
      </div>

      <div style={styles.itemName}>{item.name}</div>

      <div style={styles.priceRow}>
        <span style={styles.priceLabel}>当前出价</span>
        <span style={styles.priceValue}>¥{item.currentPrice}</span>
      </div>

      <div style={styles.timerRow}>
        <span style={styles.timerLabel}>剩余时间</span>
        <span style={{ ...styles.timerValue, color: timeColor }}>
          {isCompleted ? '已结束' : formatTimeLeft(item.endTime)}
        </span>
      </div>

      {!isCompleted && !showBidInput && (
        <button style={styles.bidButton} onClick={handleBidClick}>
          出价
        </button>
      )}

      {showBidInput && (
        <div style={styles.bidInputContainer}>
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            style={styles.bidInput}
            autoFocus
          />
          <div style={styles.bidButtons}>
            <button style={styles.confirmButton} onClick={handleConfirmBid}>
              确认
            </button>
            <button style={styles.cancelButton} onClick={handleCancelBid}>
              取消
            </button>
          </div>
          {error && <div style={styles.errorText}>{error}</div>}
        </div>
      )}

      {bids.length > 0 && <BidHistory bids={bids} />}

      {isCompleted && isHovered && (
        <div style={styles.summaryOverlay}>
          <div style={styles.summaryContent}>
            共 {totalBids} 次出价，获胜者 {winner || item.initialBidder}
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    position: 'relative',
    width: '320px',
    backgroundColor: '#2a2a3e',
    borderRadius: '12px',
    padding: '16px',
    color: '#fff',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
    transition: 'box-shadow 0.25s ease, transform 0.25s ease',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  soldLabel: {
    position: 'absolute',
    top: '12px',
    right: '-30px',
    backgroundColor: '#e17055',
    color: '#fff',
    padding: '4px 35px',
    fontSize: '12px',
    fontWeight: 'bold',
    transform: 'rotate(45deg)',
    zIndex: 10,
  },
  imagePlaceholder: {
    width: '100%',
    height: '180px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  imageText: {
    fontSize: '48px',
  },
  itemName: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '12px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  priceLabel: {
    color: '#b0b0b0',
    fontSize: '14px',
  },
  priceValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#00b894',
  },
  timerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  timerLabel: {
    color: '#b0b0b0',
    fontSize: '14px',
  },
  timerValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  bidButton: {
    width: '120px',
    height: '40px',
    backgroundColor: '#00b894',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'block',
    margin: '0 auto',
    transition: 'background-color 0.2s ease, transform 0.15s ease',
  },
  bidInputContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '8px',
  },
  bidInput: {
    width: '100%',
    height: '36px',
    padding: '0 12px',
    borderRadius: '8px',
    border: '2px solid transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  },
  bidButtons: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
  },
  confirmButton: {
    width: '100px',
    height: '32px',
    backgroundColor: '#00b894',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cancelButton: {
    width: '100px',
    height: '32px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#b0b0b0',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: '12px',
    textAlign: 'center',
  },
  summaryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: '12px 16px',
    animation: 'slideUp 0.3s ease-out',
  },
  summaryContent: {
    color: '#fff',
    fontSize: '13px',
    textAlign: 'center',
  },
};

export default AuctionCard;
