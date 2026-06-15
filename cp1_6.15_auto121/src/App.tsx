import { useEffect, useState, useCallback } from 'react';
import { useAuctionStore } from './store';
import AuctionBoard from './AuctionBoard';
import BidPanel from './BidPanel';
import type { AuctionItem, BidRecord, WebSocketMessage } from './types';

const App = () => {
  const {
    items,
    selectedItemId,
    currentBidderId,
    currentBidderName,
    serverTimeOffset,
    isSidebarOpen,
    setItems,
    updateItem,
    addBidToItem,
    setSelectedItemId,
    setServerTimeOffset,
    toggleSidebar,
    setSidebarOpen
  } = useAuctionStore();

  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setSidebarOpen]);

  const selectedItem = items.find((item) => item.id === selectedItemId) || null;

  const syncServerTime = useCallback(async () => {
    try {
      const response = await fetch('/api/time');
      const data = await response.json();
      const offset = data.serverTime - Date.now();
      setServerTimeOffset(offset);
    } catch (err) {
      console.error('Failed to sync server time:', err);
    }
  }, [setServerTimeOffset]);

  useEffect(() => {
    syncServerTime();
    const interval = setInterval(syncServerTime, 60000);
    return () => clearInterval(interval);
  }, [syncServerTime]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/items');
        const data = (await response.json()) as AuctionItem[];
        setItems(data);
      } catch (err) {
        console.error('Failed to fetch items:', err);
      }
    };
    fetchItems();
  }, [setItems]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
      setWsError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        
        switch (message.type) {
          case 'CONNECTED': {
            const payload = message.payload as { items: AuctionItem[]; serverTime: number };
            setItems(payload.items);
            setServerTimeOffset(payload.serverTime - Date.now());
            break;
          }
          case 'BID_UPDATE': {
            const payload = message.payload as { itemId: string; bid: BidRecord; item: AuctionItem };
            addBidToItem(payload.itemId, payload.bid, payload.item);
            break;
          }
          case 'ITEM_UPDATE': {
            const payload = message.payload as { item: AuctionItem };
            updateItem(payload.item);
            break;
          }
          case 'TIME_SYNC': {
            const payload = message.payload as { serverTime: number; items: AuctionItem[] };
            setServerTimeOffset(payload.serverTime - Date.now());
            payload.items.forEach(item => {
              const existingItem = items.find(i => i.id === item.id);
              if (existingItem && existingItem.status !== item.status) {
                updateItem(item);
              }
            });
            break;
          }
          case 'ERROR': {
            const payload = message.payload as { message: string };
            setWsError(payload.message);
            setTimeout(() => setWsError(null), 3000);
            break;
          }
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = () => {
      setWsError('WebSocket连接错误');
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [setItems, setServerTimeOffset, addBidToItem, updateItem, items]);

  const getRemainingTime = (item: AuctionItem): number => {
    const now = Date.now() + serverTimeOffset;
    if (item.status === 'active') {
      return Math.max(0, item.endTime - now);
    }
    if (item.status === 'waiting') {
      return Math.max(0, item.startTime - now);
    }
    return 0;
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingTime = selectedItem ? getRemainingTime(selectedItem) : 0;
  const showUrgentBanner = selectedItem?.status === 'active' && remainingTime > 0 && remainingTime < 10000;

  const getStatusLabel = (status: AuctionItem['status']) => {
    switch (status) {
      case 'waiting':
        return { text: '即将开拍', style: 'background: #757575;' };
      case 'active':
        return { text: '正在竞拍', style: 'background: #00e676; animation: blink 0.5s infinite;' };
      case 'sold':
        return { text: '已成交', style: 'background: #ffd700; color: #1a1a2e;' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1a1a2e', color: '#e0e0e0' }}>
      {showUrgentBanner && (
        <div
          style={{
            padding: '12px 24px',
            textAlign: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px',
            animation: 'blinkRed 1s infinite'
          }}
        >
          ⚠️ 拍卖即将结束！剩余 {formatTime(remainingTime)}，抓紧出价！
        </div>
      )}

      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid #3a3a5a',
        backgroundColor: '#16162a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={toggleSidebar}
            style={{
              display: isMobile ? 'block' : 'none',
              padding: '8px 12px',
              backgroundColor: '#3a3a5a',
              border: 'none',
              borderRadius: '6px',
              color: '#e0e0e0',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ☰
          </button>
          <h1 style={{ fontSize: '20px', color: '#6c63ff', margin: 0 }}>🎨 画廊拍卖实时竞价看板</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#9e9e9e' }}>
            竞拍者: <strong style={{ color: '#e0e0e0' }}>{currentBidderName}</strong>
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: wsConnected ? '#00e676' : '#ff5252'
            }} />
            {wsConnected ? '实时连接' : '连接断开'}
          </span>
        </div>
      </header>

      {wsError && (
        <div style={{
          padding: '12px 24px',
          backgroundColor: '#ff5252',
          color: 'white',
          textAlign: 'center',
          fontSize: '14px'
        }}>
          {wsError}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside
          style={{
            width: '300px',
            borderRight: '1px solid #3a3a5a',
            overflowY: 'auto',
            backgroundColor: '#16162a',
            ...(isMobile ? {
              position: 'absolute',
              top: '65px',
              left: 0,
              height: 'calc(100vh - 65px)',
              zIndex: 100,
              transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s ease',
              boxShadow: '4px 0 20px rgba(0,0,0,0.5)'
            } : {})
          }}
        >
          <div style={{ padding: '16px' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '16px', color: '#9e9e9e' }}>拍品列表</h2>
            {items.map((item) => {
              const isSelected = item.id === selectedItemId;
              const statusLabel = getStatusLabel(item.status);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedItemId(item.id);
                    if (window.innerWidth < 900) {
                      toggleSidebar();
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    height: '60px',
                    padding: '8px 12px',
                    marginBottom: '8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    backgroundColor: isSelected ? '#3a3a5a' : 'transparent',
                    borderLeft: isSelected ? '3px solid #6c63ff' : '3px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#2a2a3a';
                      e.currentTarget.style.borderLeftColor = '#6c63ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderLeftColor = 'transparent';
                    }
                  }}
                >
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    style={{
                      width: '100px',
                      height: '60px',
                      objectFit: 'cover',
                      borderRadius: '4px'
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <h3 style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.title}
                      </h3>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        color: 'white',
                        ...(item.status === 'sold' ? { color: '#1a1a2e' } : {})
                      } as React.CSSProperties}>
                        <span style={statusLabel.style as React.CSSProperties}>{statusLabel.text}</span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#9e9e9e' }}>起拍: ¥{item.startingPrice.toLocaleString()}</span>
                      <span style={{ color: '#00e676', fontWeight: 'bold' }}>¥{item.currentPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <section style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {selectedItem && (
              <AuctionBoard
                item={selectedItem}
                remainingTime={remainingTime}
                formatTime={formatTime}
                getStatusLabel={getStatusLabel}
              />
            )}
          </section>

          <div style={{
            width: '2px',
            backgroundColor: '#3a3a5a',
            margin: '16px 0'
          }} />

          <aside style={{
            width: '360px',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
            position: 'relative'
          }}>
            <div>
              <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#e0e0e0' }}>📊 实时竞价动态</h3>
              <div style={{
                width: '100%',
                height: '300px',
                backgroundColor: '#2a2a3a',
                padding: '16px',
                borderRadius: '8px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column-reverse'
              }}>
                {selectedItem && selectedItem.bidHistory.length === 0 ? (
                  <div style={{
                    color: '#757575',
                    textAlign: 'center',
                    marginTop: '100px',
                    fontSize: '14px'
                  }}>
                    暂无出价记录，成为第一个出价者吧！
                  </div>
                ) : (
                  selectedItem?.bidHistory.map((bid, index) => (
                    <div
                      key={bid.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 0',
                        borderBottom: index < selectedItem.bidHistory.length - 1 ? '1px solid #3a3a5a' : 'none',
                        animation: 'slideIn 0.3s ease',
                        opacity: 1,
                        transform: 'translateX(0)'
                      }}
                    >
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: bid.avatarColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        flexShrink: 0
                      }}>
                        {bid.bidderName.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>{bid.bidderName}</span>
                          <span style={{ color: '#00e676', fontWeight: 'bold', fontSize: '14px' }}>
                            ¥{bid.amount.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#757575', marginTop: '2px' }}>
                          {new Date(bid.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedItem && (
              <div style={{
                position: 'sticky',
                bottom: 0,
                paddingTop: '16px',
                animation: 'slideUp 0.4s ease-out'
              }}>
                <BidPanel
                  item={selectedItem}
                  currentBidderId={currentBidderId}
                  currentBidderName={currentBidderName}
                />
              </div>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
};

export default App;
