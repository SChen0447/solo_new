import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PortfolioProvider, usePortfolio } from './store/portfolioStore';
import { PortfolioDashboard } from './components/PortfolioDashboard';
import { StockChart } from './components/StockChart';
import { Stock, stockData } from './data/stockData';

const appStyle: React.CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(ellipse at top left, #1e2a55 0%, #1a1a2e 40%, #16213e 100%)',
  color: '#fff',
  fontFamily:
    '"Segoe UI", -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  padding: '24px 28px 40px',
  boxSizing: 'border-box',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '24px',
  flexWrap: 'wrap',
  gap: '12px',
};

const logoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const searchPanelStyle: React.CSSProperties = {
  background: 'rgba(22, 33, 62, 0.6)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '24px',
};

const searchWrapStyle: React.CSSProperties = {
  position: 'relative',
  maxWidth: '560px',
  marginBottom: '16px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '46px',
  padding: '0 16px 0 44px',
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
  transition: 'all 0.2s ease',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  right: 0,
  maxHeight: '260px',
  overflowY: 'auto',
  background: '#16213e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  zIndex: 100,
  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
};

const numInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: '44px',
  padding: '0 14px',
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
  transition: 'all 0.2s ease',
  fontFamily: 'JetBrains Mono, Menlo, monospace',
  boxSizing: 'border-box',
};

const baseBtn: React.CSSProperties = {
  height: '44px',
  padding: '0 24px',
  border: 'none',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
  transition:
    'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
  color: '#fff',
  fontFamily: 'inherit',
  letterSpacing: '0.5px',
  minWidth: '100px',
};

const buyBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'linear-gradient(135deg, #00e676 0%, #00c853 55%, #00a844 100%)',
  boxShadow: '0 4px 16px rgba(0, 200, 83, 0.25)',
};

const sellBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'linear-gradient(135deg, #ff5252 0%, #ff1744 55%, #d50000 100%)',
  boxShadow: '0 4px 16px rgba(255, 23, 68, 0.25)',
};

const tagStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: '20px',
  background: 'rgba(0, 188, 212, 0.12)',
  color: '#26c6da',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.5px',
  border: '1px solid rgba(0, 188, 212, 0.25)',
};

const AppInner: React.FC = () => {
  const {
    state,
    dispatch,
    filteredStocks,
    selectedStock,
  } = usePortfolio();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tradeQty, setTradeQty] = useState<string>('100');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = useCallback((msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    dispatch({ type: 'SET_SEARCH_QUERY', payload: v });
    setDropdownOpen(v.trim().length > 0);
  };

  const handleSelectStock = useCallback(
    (s: Stock) => {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: s.code });
      dispatch({ type: 'SELECT_STOCK', payload: s.code });
      setDropdownOpen(false);
    },
    [dispatch]
  );

  const qtyNum = useMemo(() => {
    const n = parseInt(tradeQty, 10);
    return Number.isFinite(n) ? n : 0;
  }, [tradeQty]);

  const activeStock: Stock | null = useMemo(() => {
    if (selectedStock) return selectedStock;
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.trim().toUpperCase();
      return (
        stockData.find(
          (s) => s.code === q || s.name.toUpperCase() === q
        ) || null
      );
    }
    return null;
  }, [selectedStock, state.searchQuery]);

  const estimatedAmount = useMemo(
    () => (activeStock && qtyNum > 0 ? +(activeStock.currentPrice * qtyNum).toFixed(2) : 0),
    [activeStock, qtyNum]
  );

  const positionShares = useMemo(() => {
    if (!activeStock) return 0;
    return state.positions.find((p) => p.code === activeStock.code)?.shares ?? 0;
  }, [activeStock, state.positions]);

  const canBuy = activeStock && qtyNum > 0 && estimatedAmount <= state.cash;
  const canSell = activeStock && qtyNum > 0 && qtyNum <= positionShares;

  const handleBuy = () => {
    if (!activeStock) {
      showToast('请先选择股票', 'err');
      return;
    }
    if (qtyNum <= 0) {
      showToast('请输入有效数量', 'err');
      return;
    }
    if (estimatedAmount > state.cash) {
      showToast('现金余额不足', 'err');
      return;
    }
    dispatch({ type: 'BUY_STOCK', payload: { code: activeStock.code, shares: qtyNum } });
    showToast(`成功买入 ${activeStock.code} × ${qtyNum}`, 'ok');
  };

  const handleSell = () => {
    if (!activeStock) {
      showToast('请先选择股票', 'err');
      return;
    }
    if (qtyNum <= 0) {
      showToast('请输入有效数量', 'err');
      return;
    }
    if (qtyNum > positionShares) {
      showToast('持仓数量不足', 'err');
      return;
    }
    dispatch({ type: 'SELL_STOCK', payload: { code: activeStock.code, shares: qtyNum } });
    showToast(`成功卖出 ${activeStock.code} × ${qtyNum}`, 'ok');
  };

  return (
    <div style={appStyle}>
      <style>{`
        input:focus {
          border-color: rgba(0, 188, 212, 0.45) !important;
          box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.12);
        }
        .trade-btn:hover {
          transform: scale(1.05);
        }
        .trade-btn:active {
          transform: scale(0.98);
        }
        .stock-item:hover {
          background: rgba(0, 188, 212, 0.08) !important;
        }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .toast-anim { animation: slideIn 0.2s ease; }
        @media (max-width: 767px) {
          .main-grid { grid-template-columns: 1fr !important; }
          .trade-row { flex-direction: column; align-items: stretch !important; }
          .trade-row > div { width: 100%; }
        }
      `}</style>

      <header style={headerStyle}>
        <div style={logoStyle}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background:
                'linear-gradient(135deg, #00bcd4 0%, #ff4081 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 900,
              color: '#fff',
              boxShadow: '0 8px 24px rgba(0, 188, 212, 0.25)',
            }}
          >
            ¥
          </div>
          <div>
            <div
              style={{
                color: '#fff',
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '0.3px',
              }}
            >
              模拟投资组合
            </div>
            <div style={{ color: '#718096', fontSize: '12px', marginTop: '2px' }}>
              Simulated Stock Portfolio · 零风险练手
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={tagStyle}>初始资金 ¥100,000</span>
          <span
            style={{
              ...tagStyle,
              background: 'rgba(255, 64, 129, 0.12)',
              color: '#f06292',
              borderColor: 'rgba(255, 64, 129, 0.25)',
            }}
          >
            共 {stockData.length} 只股票
          </span>
        </div>
      </header>

      <div ref={searchRef} style={searchPanelStyle}>
        <div style={searchWrapStyle}>
          <div
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#718096',
              fontSize: '16px',
              pointerEvents: 'none',
            }}
          >
            🔍
          </div>
          <input
            style={inputStyle}
            type="text"
            placeholder="搜索股票代码或名称（如 AAPL、TSLA、苹果）"
            value={state.searchQuery}
            onChange={handleSearchChange}
            onFocus={() => {
              if (state.searchQuery.trim()) setDropdownOpen(true);
            }}
          />
          {dropdownOpen && (
            <div style={dropdownStyle}>
              {filteredStocks.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#718096',
                    fontSize: '13px',
                  }}
                >
                  未找到匹配的股票
                </div>
              ) : (
                filteredStocks.slice(0, 10).map((s) => {
                  const up = s.change >= 0;
                  return (
                    <div
                      key={s.code}
                      onClick={() => handleSelectStock(s)}
                      className="stock-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '14px',
                            minWidth: '64px',
                          }}
                        >
                          {s.code}
                        </span>
                        <span style={{ color: '#a0aec0', fontSize: '13px' }}>
                          {s.name}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            color: '#fff',
                            fontFamily: 'JetBrains Mono, Menlo, monospace',
                            fontWeight: 600,
                            fontSize: '13px',
                          }}
                        >
                          ¥{s.currentPrice.toFixed(2)}
                        </div>
                        <div
                          style={{
                            color: up ? '#00c853' : '#ff1744',
                            fontSize: '11px',
                            marginTop: '2px',
                            fontWeight: 600,
                          }}
                        >
                          {up ? '+' : ''}
                          {s.change.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div
          className="trade-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: '1 1 260px',
              minWidth: 0,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flex: '1 1 200px',
                minWidth: 0,
              }}
            >
              <input
                style={numInputStyle}
                type="number"
                min="1"
                step="1"
                value={tradeQty}
                onChange={(e) => setTradeQty(e.target.value)}
                placeholder="输入股数"
              />
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                {[100, 500, 1000].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTradeQty(String(n))}
                    style={{
                      height: '44px',
                      padding: '0 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      color: '#cbd5e0',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'rgba(0, 188, 212, 0.12)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        'rgba(0, 188, 212, 0.3)';
                      (e.currentTarget as HTMLButtonElement).style.color =
                        '#26c6da';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'rgba(255,255,255,0.04)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        'rgba(255,255,255,0.08)';
                      (e.currentTarget as HTMLButtonElement).style.color =
                        '#cbd5e0';
                    }}
                  >
                    {n}股
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0,
            }}
          >
            {activeStock && (
              <div
                style={{
                  padding: '8px 14px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#a0aec0',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                预估金额{' '}
                <span
                  style={{
                    color: '#fff',
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono, Menlo, monospace',
                    marginLeft: '4px',
                  }}
                >
                  ¥{estimatedAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <button
              className="trade-btn"
              style={buyBtn}
              onClick={handleBuy}
              disabled={!canBuy}
              onMouseEnter={(e) => {
                if (canBuy) {
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    'scale(1.05)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    '0 8px 24px rgba(0, 200, 83, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  'scale(1)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 4px 16px rgba(0, 200, 83, 0.25)';
              }}
            >
              买入
            </button>
            <button
              className="trade-btn"
              style={sellBtn}
              onClick={handleSell}
              disabled={!canSell}
              onMouseEnter={(e) => {
                if (canSell) {
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    'scale(1.05)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    '0 8px 24px rgba(255, 23, 68, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  'scale(1)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 4px 16px rgba(255, 23, 68, 0.25)';
              }}
            >
              卖出
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            flexWrap: 'wrap',
            fontSize: '12px',
            color: '#718096',
          }}
        >
          <div>
            可用现金：
            <span
              style={{
                color: '#26c6da',
                fontWeight: 700,
                fontFamily: 'JetBrains Mono, Menlo, monospace',
              }}
            >
              ¥
              {state.cash.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          {activeStock && (
            <div>
              当前选中：
              <span style={{ color: '#fff', fontWeight: 600 }}>
                {activeStock.code}
              </span>
              <span style={{ margin: '0 6px' }}>·</span>
              <span>可卖：</span>
              <span
                style={{
                  color: positionShares > 0 ? '#ffd54f' : '#718096',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, Menlo, monospace',
                }}
              >
                {positionShares.toLocaleString()} 股
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        className="main-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        <PortfolioDashboard />
        <StockChart stock={activeStock} />
      </div>

      {toast && (
        <div
          className="toast-anim"
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            background:
              toast.type === 'ok'
                ? 'linear-gradient(135deg, rgba(0, 200, 83, 0.95), rgba(0, 168, 68, 0.95))'
                : 'linear-gradient(135deg, rgba(255, 23, 68, 0.95), rgba(213, 0, 0, 0.95))',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '12px',
            zIndex: 9999,
            boxShadow:
              toast.type === 'ok'
                ? '0 8px 32px rgba(0, 200, 83, 0.35)'
                : '0 8px 32px rgba(255, 23, 68, 0.35)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <PortfolioProvider>
      <AppInner />
    </PortfolioProvider>
  );
};

export default App;
