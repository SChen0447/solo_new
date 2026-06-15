import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useFinanceStore } from '../store/useFinanceStore';
import { ASSET_CLASS_COLORS } from '../types';
import type { AssetAllocation } from '../types';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: AssetAllocation }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <div className="tooltip-label">{data.assetClass}</div>
        <div className="tooltip-value">
          ¥{data.value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div
          className="tooltip-percentage"
          style={{ color: ASSET_CLASS_COLORS[data.assetClass] }}
        >
          {data.percentage.toFixed(2)}%
        </div>
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = (props: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="#333"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={500}
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

export const PortfolioChart: React.FC = () => {
  const selectedAccountId = useFinanceStore(
    (state) => state.selectedAccountId
  );
  const calculateAssetAllocations = useFinanceStore(
    (state) => state.calculateAssetAllocations
  );
  const selectedAccount = useFinanceStore((state) =>
    state.getSelectedAccount()
  );

  const allocations = useMemo(
    () => (selectedAccountId ? calculateAssetAllocations(selectedAccountId) : []),
    [selectedAccountId, calculateAssetAllocations]
  );

  const totalAssets = useMemo(
    () => allocations.reduce((sum, a) => sum + a.value, 0),
    [allocations]
  );

  if (!selectedAccount) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">资产配置</h3>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <p>请选择一个账户查看资产配置</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">资产配置 - {selectedAccount.name}</h3>
        <div style={{ fontFamily: 'SF Mono, Monaco, Consolas, monospace', fontWeight: 600 }}>
          总资产: ¥{totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {allocations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>该账户暂无交易记录</p>
        </div>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={allocations}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={120}
                innerRadius={50}
                fill="#8884d8"
                dataKey="value"
                animationBegin={0}
                animationDuration={500}
                animationEasing="ease-out"
                isAnimationActive={true}
              >
                {allocations.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={ASSET_CLASS_COLORS[entry.assetClass]}
                    className="pie-sector"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span style={{ fontSize: 13 }}>{value}</span>
                )}
                payload={allocations.map((a) => ({
                  value: a.assetClass,
                  color: ASSET_CLASS_COLORS[a.assetClass],
                }))}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {allocations.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {allocations.map((allocation) => (
            <div key={allocation.assetClass} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: ASSET_CLASS_COLORS[allocation.assetClass] }}
              />
              <span style={{ flex: 1, fontSize: 14 }}>
                {allocation.assetClass}
              </span>
              <span
                className="amount"
                style={{ marginRight: 16 }}
              >
                ¥{allocation.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: ASSET_CLASS_COLORS[allocation.assetClass],
                  fontFamily: 'SF Mono, Monaco, Consolas, monospace',
                }}
              >
                {allocation.percentage.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
