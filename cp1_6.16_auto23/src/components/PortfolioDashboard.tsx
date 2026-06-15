import React, { useMemo, useState } from 'react';
import { usePortfolio, Position, TradeRecord } from '../store/portfolioStore';
import { stockData } from '../data/stockData';

interface PositionRowData extends Position {
  currentPrice: number;
  change: number;
  marketValue: number;
  pnl: number;
  pnlPct: number;
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(22, 33, 62, 0.6)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: '16px',
  padding: '20px',
};

function formatCurrency(n: number): string {
  return n.toLocaleString('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(n: number, digits = 2): string {
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const PortfolioDashboard: React.FC = () => {
  const {
    state,
    dispatch,
    totalAssets,
    marketValue,
    dailyPnL,
    dailyPnLPct,
    totalPnL,
    totalPnLPct,
  } = usePortfolio();

  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const enrichedPositions: PositionRowData[] = useMemo(() => {
    return state.positions.map((pos) => {
      const s = stockData.find((x) => x.code === pos.code);
      const cp = s?.currentPrice ?? 0;
      const ch = s?.change ?? 0;
      const mv = +(cp * pos.shares).toFixed(2);
      const cost = pos.avgCost * pos.shares;
      const pnl = +(mv - cost).toFixed(2);
      const pnlPct = cost > 0 ? +((pnl / cost) * 100).toFixed(2) : 0;
      return {
        ...pos,
        currentPrice: cp,
        change: ch,
        marketValue: mv,
        pnl,
        pnlPct,
      };
    });
  }, [state.positions]);

  const tradesByCode = useMemo(() => {
    const m = new Map<string, TradeRecord[]>();
    for (const t of state.trades) {
      if (!m.has(t.code)) m.set(t.code, []);
      m.get(t.code)!.push(t);
    }
    return m;
  }, [state.trades]);

  const up = dailyPnL >= 0;
  const totalUp = totalPnL >= 0;

  const handleRowClick = (code: string) => {
    setExpandedCode((prev) => (prev === code ? null : code));
    dispatch({ type: 'SELECT_STOCK', payload: code });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div style={{ ...cardStyle }}>
          <div style={{ color: '#a0aec0', fontSize: '13px', marginBottom: '8px' }}>
            总资产
          </div>
          <div
            style={{
              color: '#fff',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            {formatCurrency(totalAssets)}
          </div>
          <div
            style={{
              marginTop: '8px',
              color: '#718096',
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>现金 {formatCurrency(state.cash)}</span>
            <span>市值 {formatCurrency(marketValue)}</span>
          </div>
        </div>

        <div style={{ ...cardStyle }}>
          <div style={{ color: '#a0aec0', fontSize: '13px', marginBottom: '8px' }}>
            当日盈亏
          </div>
          <div
            style={{
              color: up ? '#00c853' : '#ff1744',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            {up ? '+' : ''}
            {formatCurrency(dailyPnL)}
          </div>
          <div
            style={{
              marginTop: '8px',
              color: up ? '#00c853' : '#ff1744',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {up ? '▲' : '▼'} {Math.abs(dailyPnLPct).toFixed(2)}%
          </div>
        </div>

        <div style={{ ...cardStyle }}>
          <div style={{ color: '#a0aec0', fontSize: '13px', marginBottom: '8px' }}>
            累计盈亏
          </div>
          <div
            style={{
              color: totalUp ? '#00c853' : '#ff1744',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            {totalUp ? '+' : ''}
            {formatCurrency(totalPnL)}
          </div>
          <div
            style={{
              marginTop: '8px',
              color: totalUp ? '#00c853' : '#ff1744',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {totalUp ? '▲' : '▼'} {Math.abs(totalPnLPct).toFixed(2)}%
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            持仓列表
          </div>
          <div style={{ color: '#718096', fontSize: '12px' }}>
            {enrichedPositions.length} 只持仓
          </div>
        </div>

        {enrichedPositions.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: '#718096',
              fontSize: '14px',
            }}
          >
            暂无持仓，快去买入您的第一只股票吧
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                minWidth: '680px',
              }}
            >
              <thead>
                <tr style={{ color: '#718096' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 20px',
                      fontWeight: 500,
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    股票
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '12px 20px',
                      fontWeight: 500,
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    持股数
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '12px 20px',
                      fontWeight: 500,
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    平均成本
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '12px 20px',
                      fontWeight: 500,
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    现价
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '12px 20px',
                      fontWeight: 500,
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    市值
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '12px 20px',
                      fontWeight: 500,
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    盈亏
                  </th>
                </tr>
              </thead>
              <tbody>
                {enrichedPositions.map((pos) => {
                  const pUp = pos.pnl >= 0;
                  const expanded = expandedCode === pos.code;
                  const trades = tradesByCode.get(pos.code) || [];
                  return (
                    <React.Fragment key={pos.code}>
                      <tr
                        onClick={() => handleRowClick(pos.code)}
                        style={{
                          cursor: 'pointer',
                          background: pUp
                            ? 'rgba(0, 200, 83, 0.07)'
                            : 'rgba(255, 23, 68, 0.07)',
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background = pUp
                            ? 'rgba(0, 200, 83, 0.13)'
                            : 'rgba(255, 23, 68, 0.13)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background = pUp
                            ? 'rgba(0, 200, 83, 0.07)'
                            : 'rgba(255, 23, 68, 0.07)';
                        }}
                      >
                        <td style={{ padding: '14px 20px', borderBottom: expanded ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: pos.change >= 0 ? '#00c853' : '#ff1744',
                                flexShrink: 0,
                              }}
                            />
                            <div>
                              <div style={{ color: '#fff', fontWeight: 600 }}>
                                {pos.code}
                              </div>
                              <div style={{ color: '#718096', fontSize: '12px', marginTop: '2px' }}>
                                {pos.name}
                              </div>
                            </div>
                            <span
                              style={{
                                marginLeft: '4px',
                                color: '#a0aec0',
                                fontSize: '14px',
                                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                              }}
                            >
                              ▾
                            </span>
                          </div>
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            padding: '14px 20px',
                            color: '#fff',
                            fontFamily: 'JetBrains Mono, Menlo, monospace',
                            borderBottom: expanded ? 'none' : '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          {pos.shares.toLocaleString()}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            padding: '14px 20px',
                            color: '#cbd5e0',
                            fontFamily: 'JetBrains Mono, Menlo, monospace',
                            borderBottom: expanded ? 'none' : '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          {formatNumber(pos.avgCost)}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            padding: '14px 20px',
                            color: pos.change >= 0 ? '#00c853' : '#ff1744',
                            fontFamily: 'JetBrains Mono, Menlo, monospace',
                            fontWeight: 600,
                            borderBottom: expanded ? 'none' : '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          {formatNumber(pos.currentPrice)}
                          <div style={{ fontSize: '11px', marginTop: '2px' }}>
                            {pos.change >= 0 ? '+' : ''}
                            {pos.change.toFixed(2)}%
                          </div>
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            padding: '14px 20px',
                            color: '#fff',
                            fontFamily: 'JetBrains Mono, Menlo, monospace',
                            fontWeight: 600,
                            borderBottom: expanded ? 'none' : '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          {formatCurrency(pos.marketValue)}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            padding: '14px 20px',
                            color: pUp ? '#00c853' : '#ff1744',
                            fontFamily: 'JetBrains Mono, Menlo, monospace',
                            fontWeight: 700,
                            borderBottom: expanded ? 'none' : '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          {pUp ? '+' : ''}
                          {formatCurrency(pos.pnl)}
                          <div style={{ fontSize: '11px', marginTop: '2px' }}>
                            {pUp ? '+' : ''}
                            {pos.pnlPct.toFixed(2)}%
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={6} style={{ padding: 0 }}>
                            <div
                              style={{
                                background: 'rgba(0,0,0,0.25)',
                                padding: '12px 20px 20px',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                              }}
                            >
                              <div
                                style={{
                                  color: '#a0aec0',
                                  fontSize: '12px',
                                  marginBottom: '10px',
                                }}
                              >
                                历史交易记录
                              </div>
                              {trades.length === 0 ? (
                                <div style={{ color: '#718096', fontSize: '12px' }}>
                                  暂无交易记录
                                </div>
                              ) : (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                  }}
                                >
                                  {trades.map((t) => (
                                    <div
                                      key={t.id}
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: '80px 1fr 120px 140px',
                                        gap: '12px',
                                        alignItems: 'center',
                                        padding: '8px 12px',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      <span
                                        style={{
                                          color: t.type === 'buy' ? '#00c853' : '#ff1744',
                                          fontWeight: 600,
                                          textTransform: 'uppercase',
                                        }}
                                      >
                                        {t.type === 'buy' ? '买入' : '卖出'}
                                      </span>
                                      <span style={{ color: '#718096' }}>
                                        {formatTime(t.timestamp)}
                                      </span>
                                      <span
                                        style={{
                                          color: '#cbd5e0',
                                          fontFamily:
                                            'JetBrains Mono, Menlo, monospace',
                                        }}
                                      >
                                        {t.shares} × {formatNumber(t.price)}
                                      </span>
                                      <span
                                        style={{
                                          color: '#fff',
                                          fontFamily:
                                            'JetBrains Mono, Menlo, monospace',
                                          fontWeight: 600,
                                          textAlign: 'right',
                                        }}
                                      >
                                        {formatCurrency(t.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioDashboard;
