import { useState, useCallback, useEffect } from 'react';
import type { AuctionItem } from './types';
import { calculateMinNextBid, getUserBidCount, validateBid } from './BidEngine';

interface BidPanelProps {
  item: AuctionItem;
  currentBidderId: string;
  currentBidderName: string;
}

const MAX_BIDS_PER_USER = 10;

const BidPanel = ({ item, currentBidderId, currentBidderName }: BidPanelProps) => {
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [buttonState, setButtonState] = useState<'idle' | 'loading' | 'success' | 'error' | 'disabled'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  const userBidCount = getUserBidCount(item, currentBidderId);
  const minNextBid = calculateMinNextBid(item.currentPrice);
  const suggestedBid = item.currentPrice + minNextBid;

  const isDisabled =
    item.status !== 'active' ||
    userBidCount >= MAX_BIDS_PER_USER ||
    buttonState === 'loading' ||
    buttonState === 'success';

  useEffect(() => {
    if (item.status === 'active' && bidAmount === 0) {
      setBidAmount(Math.ceil(suggestedBid / 100) * 100);
    }
  }, [item.id, item.status, suggestedBid, bidAmount]);

  const showWarning = useCallback((message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 1500);
  }, []);

  const handleBid = useCallback(async () => {
    if (isDisabled) return;

    const bid = {
      itemId: item.id,
      bidderId: currentBidderId,
      bidderName: currentBidderName,
      amount: bidAmount
    };

    const validation = validateBid(bid, item, userBidCount);
    if (!validation.valid) {
      setButtonState('error');
      showWarning(validation.message);
      setTimeout(() => setButtonState('idle'), 1500);
      return;
    }

    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 100);

    setButtonState('loading');

    try {
      const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error('WebSocket连接失败'));
      });

      ws.send(JSON.stringify({
        type: 'BID_UPDATE',
        payload: bid
      }));

      ws.close();

      setButtonState('success');
      setTimeout(() => {
        setButtonState('idle');
        setBidAmount(Math.ceil((item.currentPrice + minNextBid) / 100) * 100);
      }, 1000);
    } catch (err) {
      setButtonState('error');
      showWarning('出价失败，请稍后重试');
      setTimeout(() => setButtonState('idle'), 1500);
    }
  }, [item, currentBidderId, currentBidderName, bidAmount, isDisabled, userBidCount, minNextBid, showWarning]);

  const quickBid = (increment: number) => {
    const newAmount = bidAmount + increment;
    setBidAmount(newAmount);
  };

  const getButtonStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: '120px',
      height: '50px',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      fontSize: '15px',
      fontWeight: 'bold',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      transform: isPressed ? 'scale(0.95)' : 'scale(1)',
      transitionProperty: 'transform, background, filter',
      transitionDuration: '0.1s, 0.3s, 0.3s'
    };

    if (buttonState === 'success') {
      return { ...baseStyle, backgroundColor: '#00e676' };
    }

    if (buttonState === 'error' || item.status !== 'active') {
      return { ...baseStyle, backgroundColor: '#757575' };
    }

    if (userBidCount >= MAX_BIDS_PER_USER) {
      return { ...baseStyle, backgroundColor: '#757575' };
    }

    return {
      ...baseStyle,
      background: 'linear-gradient(135deg, #6c63ff 0%, #e040fb 100%)',
      filter: 'brightness(1)'
    };
  };

  const getButtonText = () => {
    if (item.status === 'waiting') return '即将开拍';
    if (item.status === 'sold') return '已成交';
    if (userBidCount >= MAX_BIDS_PER_USER) return '出价次数已达上限';
    if (buttonState === 'loading') return '出价中...';
    if (buttonState === 'success') return '✓ 出价成功';
    return '出价';
  };

  return (
    <div style={{
      backgroundColor: '#16162a',
      padding: '20px',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '14px', margin: 0, color: '#e0e0e0' }}>💰 我的出价</h4>
        <span style={{ fontSize: '12px', color: '#9e9e9e' }}>
          已出价 {userBidCount}/{MAX_BIDS_PER_USER} 次
        </span>
      </div>

      {errorMessage && (
        <div style={{
          backgroundColor: '#ff5252',
          color: 'white',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '13px',
          animation: 'slideIn 0.3s ease'
        }}>
          ⚠️ {errorMessage}
        </div>
      )}

      <div>
        <div style={{ fontSize: '12px', color: '#9e9e9e', marginBottom: '6px' }}>
          最低加价: <span style={{ color: '#00e676' }}>¥{minNextBid.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px', color: '#9e9e9e' }}>¥</span>
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(Number(e.target.value))}
            disabled={item.status !== 'active' || userBidCount >= MAX_BIDS_PER_USER}
            min={suggestedBid}
            style={{
              flex: 1,
              height: '50px',
              backgroundColor: '#2a2a3a',
              border: '1px solid #3a3a5a',
              borderRadius: '8px',
              padding: '0 16px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#e0e0e0',
              outline: 'none',
              transition: 'all 0.3s ease',
              ':focus': {
                borderColor: '#6c63ff'
              },
              ':disabled': {
                backgroundColor: '#1a1a2e',
                cursor: 'not-allowed'
              }
            } as React.CSSProperties}
          />
          <button
            onClick={handleBid}
            disabled={isDisabled}
            style={getButtonStyle()}
            onMouseEnter={(e) => {
              if (!isDisabled && buttonState === 'idle') {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            {getButtonText()}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[100, 500, 1000, 5000].map((amount) => (
          <button
            key={amount}
            onClick={() => quickBid(amount)}
            disabled={item.status !== 'active' || userBidCount >= MAX_BIDS_PER_USER}
            style={{
              flex: 1,
              minWidth: '60px',
              height: '36px',
              backgroundColor: '#2a2a3a',
              border: '1px solid #3a3a5a',
              borderRadius: '6px',
              color: '#b0b0b0',
              fontSize: '12px',
              cursor: item.status !== 'active' || userBidCount >= MAX_BIDS_PER_USER ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: item.status !== 'active' || userBidCount >= MAX_BIDS_PER_USER ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (item.status === 'active' && userBidCount < MAX_BIDS_PER_USER) {
                e.currentTarget.style.backgroundColor = '#3a3a5a';
                e.currentTarget.style.borderColor = '#6c63ff';
                e.currentTarget.style.color = '#e0e0e0';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2a2a3a';
              e.currentTarget.style.borderColor = '#3a3a5a';
              e.currentTarget.style.color = '#b0b0b0';
            }}
          >
            +¥{amount.toLocaleString()}
          </button>
        ))}
      </div>

      <div style={{
        padding: '12px',
        backgroundColor: '#2a2a3a',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#9e9e9e',
        lineHeight: 1.6
      }}>
        <p style={{ margin: 0 }}>
          💡 <strong style={{ color: '#e0e0e0' }}>提示：</strong>
          当前最低出价为 <span style={{ color: '#00e676', fontWeight: 'bold' }}>¥{suggestedBid.toLocaleString()}</span>
          ，每次加价不低于当前价的5%且不少于100元。
        </p>
      </div>
    </div>
  );
};

export default BidPanel;
