import React, { useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Portfolio } from '../types';
import { getPortfolioValue, getPortfolioCost, getPortfolioPnL, getPortfolioPriceArray } from '../store';
import { calcVolatility, calcMaxDrawdown } from '../utils/simulation';
import KlineChart from './KlineChart';
import RiskGauge from './RiskGauge';

const LINE_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#292F36', '#FF9800', '#9C27B0', '#00BCD4', '#FF5722'];

interface PortfolioCardProps {
  portfolio: Portfolio;
  index: number;
  isExpanded: boolean;
  isHighlighted: boolean;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function PortfolioCard({
  portfolio,
  index,
  isExpanded,
  isHighlighted,
  onToggleExpand,
  onDelete,
}: PortfolioCardProps) {
  const color = LINE_COLORS[index % LINE_COLORS.length];
  const totalValue = getPortfolioValue(portfolio);
  const totalCost = getPortfolioCost(portfolio);
  const pnl = getPortfolioPnL(portfolio);
  const priceArr = getPortfolioPriceArray(portfolio);
  const volatility = calcVolatility(priceArr);
  const maxDrawdown = calcMaxDrawdown(priceArr);

  const allPrices = useMemo(() => {
    const prices: number[] = [];
    const volumes: number[] = [];
    for (const stock of portfolio.stocks) {
      prices.push(...stock.priceHistory);
      volumes.push(...stock.volumeHistory);
    }
    return { prices, volumes };
  }, [portfolio.stocks]);

  const mainStock = portfolio.stocks[0];
  const mainPriceHistory = mainStock?.priceHistory ?? [];
  const mainVolumeHistory = mainStock?.volumeHistory ?? [];

  const handleToggle = useCallback(() => {
    onToggleExpand(portfolio.id);
  }, [onToggleExpand, portfolio.id]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(portfolio.id);
    },
    [onDelete, portfolio.id]
  );

  return (
    <div
      style={{
        background: '#1a1a2e',
        borderRadius: 12,
        borderLeft: isHighlighted ? `4px solid ${color}` : '4px solid transparent',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        transition: 'border-color 0.3s, opacity 0.3s',
        animation: 'fadeIn 0.4s ease-out',
        minWidth: 280,
      }}
    >
      <div
        onClick={handleToggle}
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 600, color: '#e0e0e0' }}>{portfolio.name}</span>
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>总市值</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#e0e0e0' }}>¥{totalValue.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>成本</div>
              <div style={{ fontSize: 14, color: '#aaa' }}>¥{totalCost.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>盈亏</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: pnl.value >= 0 ? '#e53935' : '#43a047',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {pnl.value >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {pnl.value >= 0 ? '+' : ''}¥{pnl.value.toLocaleString()}
                <span style={{ fontSize: 12 }}>({pnl.percent >= 0 ? '+' : ''}{pnl.percent}%)</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#888' }}>
            <span>波动率: <span style={{ color: '#FF9800' }}>{volatility.toFixed(1)}%</span></span>
            <span>回撤: <span style={{ color: '#F44336' }}>{maxDrawdown.toFixed(1)}%</span></span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {isExpanded ? <ChevronUp size={18} color="#888" /> : <ChevronDown size={18} color="#888" />}
          <button
            onClick={handleDelete}
            style={{
              background: 'rgba(244,67,54,0.1)',
              border: 'none',
              borderRadius: 6,
              padding: 4,
              cursor: 'pointer',
              color: '#F44336',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div
          style={{
            borderTop: '1px solid #2a2a4a',
            padding: 16,
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 60%', minWidth: 320 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#888', fontWeight: 500 }}>
                {mainStock?.code ?? 'K线图'} · 价格走势
              </h4>
              <KlineChart
                priceHistory={mainPriceHistory}
                volumeHistory={mainVolumeHistory}
                width={Math.min(560, 560)}
                height={280}
              />
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <h4 style={{ margin: 0, fontSize: 13, color: '#888', fontWeight: 500 }}>风险指标</h4>
              <RiskGauge volatility={volatility} maxDrawdown={maxDrawdown} size={160} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#888', fontWeight: 500 }}>持仓明细</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {portfolio.stocks.map((stock) => {
                const stockPnL = stock.currentPrice - stock.buyPrice;
                const stockPnLPercent = (stockPnL / stock.buyPrice) * 100;
                return (
                  <div
                    key={stock.id}
                    style={{
                      background: '#0f0f23',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: 12,
                      minWidth: 140,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#e0e0e0', marginBottom: 4 }}>{stock.code}</div>
                    <div style={{ color: '#888' }}>
                      买入 ¥{stock.buyPrice.toFixed(2)} × {stock.quantity}
                    </div>
                    <div style={{ color: '#888' }}>
                      现价 <span style={{ color: stockPnL >= 0 ? '#e53935' : '#43a047' }}>¥{stock.currentPrice.toFixed(2)}</span>
                    </div>
                    <div style={{ color: stockPnL >= 0 ? '#e53935' : '#43a047', fontWeight: 500 }}>
                      {stockPnLPercent >= 0 ? '+' : ''}{stockPnLPercent.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
