import React from 'react';
import { Bid } from '../types';

interface BidHistoryProps {
  bids: Bid[];
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const BidHistory: React.FC<BidHistoryProps> = ({ bids }) => {
  return (
    <div style={styles.container}>
      <div style={styles.title}>出价历史</div>
      <div style={styles.list}>
        {bids.length === 0 ? (
          <div style={styles.empty}>暂无出价</div>
        ) : (
          bids.map((bid, index) => (
            <div
              key={`${bid.timestamp}-${index}`}
              style={{
                ...styles.bidRow,
                animation: index === bids.length - 1 ? 'slideIn 0.3s ease-out' : 'none',
              }}
            >
              <span style={styles.bidder}>{bid.bidder}</span>
              <span style={styles.amount}>¥{bid.amount}</span>
              <span style={styles.time}>{formatTime(bid.timestamp)}</span>
            </div>
          ))
        )}
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#b0b0b0',
    marginBottom: '8px',
  },
  list: {
    maxHeight: '150px',
    overflowY: 'auto',
  },
  empty: {
    color: '#666',
    fontSize: '12px',
    textAlign: 'center',
    padding: '10px 0',
  },
  bidRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    fontSize: '12px',
    color: '#fff',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  bidder: {
    flex: 1,
  },
  amount: {
    flex: 1,
    textAlign: 'center',
    color: '#00b894',
    fontWeight: 'bold',
  },
  time: {
    flex: 1,
    textAlign: 'right',
    color: '#b0b0b0',
  },
};

export default BidHistory;
