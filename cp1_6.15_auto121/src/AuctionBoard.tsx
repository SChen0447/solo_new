import { useState, useMemo } from 'react';
import type { AuctionItem } from './types';

interface AuctionBoardProps {
  item: AuctionItem;
  remainingTime: number;
  formatTime: (ms: number) => string;
  getStatusLabel: (status: AuctionItem['status']) => { text: string; style: string };
}

const PAGE_SIZE = 20;

const AuctionBoard = ({ item, remainingTime, formatTime, getStatusLabel }: AuctionBoardProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const statusLabel = getStatusLabel(item.status);

  const paginatedHistory = useMemo(() => {
    if (item.bidHistory.length <= 100) {
      return item.bidHistory;
    }
    const start = (currentPage - 1) * PAGE_SIZE;
    return item.bidHistory.slice(start, start + PAGE_SIZE);
  }, [item.bidHistory, currentPage]);

  const totalPages = useMemo(() => {
    if (item.bidHistory.length <= 100) return 1;
    return Math.ceil(item.bidHistory.length / PAGE_SIZE);
  }, [item.bidHistory.length]);

  const exportRecord = () => {
    const report = [
      '========================================',
      '           拍卖成交报告',
      '========================================',
      '',
      `拍品名称: ${item.title}`,
      `拍品状态: ${statusLabel.text}`,
      `起拍价格: ¥${item.startingPrice.toLocaleString()}`,
      `成交价格: ¥${item.currentPrice.toLocaleString()}`,
      `总出价次数: ${item.bidCount}`,
      '',
      '----------------------------------------',
      '            出价记录明细',
      '----------------------------------------',
      '',
      ...item.bidHistory.map((bid, index) => 
        `${index + 1}. ${bid.bidderName} - ¥${bid.amount.toLocaleString()} - ${new Date(bid.timestamp).toLocaleString()}`
      ),
      '',
      '----------------------------------------',
      '            出价者统计',
      '----------------------------------------',
      '',
      ...Array.from(
        item.bidHistory.reduce((acc, bid) => {
          const existing = acc.get(bid.bidderName) || { name: bid.bidderName, count: 0, maxBid: 0 };
          acc.set(bid.bidderName, {
            ...existing,
            count: existing.count + 1,
            maxBid: Math.max(existing.maxBid, bid.amount)
          });
          return acc;
        }, new Map<string, { name: string; count: number; maxBid: number }>())
      ).map(([_, data]) => 
        `${data.name}: 出价${data.count}次，最高出价 ¥${data.maxBid.toLocaleString()}`
      ),
      '',
      item.winner ? `🎉 成交买家: ${item.winner}` : '⏳ 拍卖进行中',
      '',
      '========================================',
      `报告生成时间: ${new Date().toLocaleString()}`,
      '========================================'
    ].join('\n');

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `拍卖记录_${item.title}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getTimeLabel = () => {
    if (item.status === 'waiting') return '距离开拍';
    if (item.status === 'active') return '剩余时间';
    return '拍卖已结束';
  };

  const getTimeColor = () => {
    if (item.status === 'active' && remainingTime < 10000) return '#ff5252';
    if (item.status === 'active') return '#00e676';
    if (item.status === 'waiting') return '#ffd700';
    return '#757575';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '24px', margin: 0 }}>{item.title}</h2>
            <span style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              color: item.status === 'sold' ? '#1a1a2e' : 'white',
              ...(statusLabel.style as React.CSSProperties)
            }}>
              {statusLabel.text}
            </span>
          </div>
          {item.winner && (
            <p style={{ color: '#ffd700', fontSize: '14px', margin: 0 }}>
              🏆 恭喜 {item.winner} 拍得此拍品！
            </p>
          )}
        </div>
        <div style={{
          backgroundColor: '#16162a',
          padding: '16px 24px',
          borderRadius: '12px',
          textAlign: 'right'
        }}>
          <div style={{ fontSize: '12px', color: '#9e9e9e', marginBottom: '4px' }}>
            {getTimeLabel()}
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            color: getTimeColor(),
            ...(item.status === 'active' && remainingTime < 10000
              ? { animation: 'blinkRed 1s infinite' }
              : {})
          } as React.CSSProperties}>
            {formatTime(remainingTime)}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <img
          src={item.image}
          alt={item.title}
          style={{
            width: '600px',
            height: '400px',
            objectFit: 'cover',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}
        />
        {item.status === 'sold' && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: 'rgba(255, 215, 0, 0.95)',
            color: '#1a1a2e',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            transform: 'rotate(15deg)'
          }}>
            已成交 ¥{item.currentPrice.toLocaleString()}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{
          flex: 1,
          backgroundColor: '#16162a',
          padding: '20px',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '12px', color: '#9e9e9e', marginBottom: '8px' }}>当前最高价</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#00e676' }}>
            ¥{item.currentPrice.toLocaleString()}
          </div>
        </div>
        <div style={{
          flex: 1,
          backgroundColor: '#16162a',
          padding: '20px',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '12px', color: '#9e9e9e', marginBottom: '8px' }}>出价次数</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#6c63ff' }}>
            {item.bidCount} 次
          </div>
        </div>
        <div style={{
          flex: 1,
          backgroundColor: '#16162a',
          padding: '20px',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '12px', color: '#9e9e9e', marginBottom: '8px' }}>起拍价</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#9e9e9e' }}>
            ¥{item.startingPrice.toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: '#16162a',
        padding: '24px',
        borderRadius: '12px'
      }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#e0e0e0' }}>📝 拍品详情</h3>
        <p style={{
          fontSize: '14px',
          lineHeight: 1.8,
          color: '#b0b0b0',
          margin: 0
        }}>
          {item.description}
        </p>
      </div>

      {item.bidHistory.length > 100 && (
        <div style={{
          backgroundColor: '#16162a',
          padding: '16px',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', margin: 0 }}>📜 历史出价记录（分页）</h3>
            <span style={{ fontSize: '13px', color: '#9e9e9e' }}>
              共 {item.bidHistory.length} 条记录，第 {currentPage}/{totalPages} 页
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 16px',
                backgroundColor: currentPage === 1 ? '#3a3a5a' : '#6c63ff',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              上一页
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: pageNum === currentPage ? '#6c63ff' : '#3a3a5a',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontWeight: pageNum === currentPage ? 'bold' : 'normal'
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 16px',
                backgroundColor: currentPage === totalPages ? '#3a3a5a' : '#6c63ff',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              下一页
            </button>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '16px' }}>
            {paginatedHistory.map((bid, index) => (
              <div key={bid.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderBottom: '1px solid #3a3a5a',
                fontSize: '13px'
              }}>
                <span style={{ color: '#9e9e9e' }}>
                  #{(currentPage - 1) * PAGE_SIZE + index + 1} {bid.bidderName}
                </span>
                <span style={{ color: '#00e676', fontWeight: 'bold' }}>
                  ¥{bid.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={exportRecord}
        style={{
          width: '160px',
          height: '40px',
          backgroundColor: '#37474f',
          border: 'none',
          borderRadius: '6px',
          color: 'white',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#455a64';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#37474f';
        }}
      >
        📥 导出记录
      </button>
    </div>
  );
};

export default AuctionBoard;
