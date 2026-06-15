import React, { useMemo } from 'react';
import { useInventoryStore } from '../../stores/inventoryStore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const InventoryStats: React.FC = () => {
  const { items, trendData } = useInventoryStore();

  const statsData = useMemo(() => {
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    const lowStockCount = items.filter(
      (i) => i.initial_quantity > 0 && i.quantity < i.initial_quantity * 0.1
    ).length;
    return { totalItems, totalQuantity, lowStockCount };
  }, [items]);

  const chartData = useMemo(() => {
    if (!trendData || trendData.length === 0) return [];

    const dates = [...new Set(trendData.map((t) => t.date))].sort();

    const materialIds = [...new Set(trendData.map((t) => t.inventory_id))];

    const nameMap: Record<string, string> = {};
    items.forEach((i) => {
      nameMap[i.id] = i.name;
    });

    return dates.map((date) => {
      const point: Record<string, any> = { date };
      materialIds.forEach((id) => {
        const record = trendData.find((t) => t.date === date && t.inventory_id === id);
        point[nameMap[id] || id.slice(0, 8)] = record ? record.total_consumed : 0;
      });
      return point;
    });
  }, [trendData, items]);

  const COLORS = ['#c75b39', '#8d6e63', '#a1887f', '#d7ccc8', '#bcaaa4', '#795548'];

  return (
    <div className="stats-section fade-in">
      <h3>库存统计</h3>

      <div className="stats-cards">
        <div className="stat-card card">
          <div className="stat-value">{statsData.totalItems}</div>
          <div className="stat-label">材料种类</div>
        </div>
        <div className="stat-card card">
          <div className="stat-value">{statsData.totalQuantity.toFixed(1)}</div>
          <div className="stat-label">总库存量</div>
        </div>
        <div className="stat-card card">
          <div className="stat-value text-danger">{statsData.lowStockCount}</div>
          <div className="stat-label">库存不足</div>
        </div>
      </div>

      <div className="chart-container card">
        <h4>近一周消耗趋势</h4>
        {chartData.length === 0 ? (
          <div className="chart-placeholder">暂无消耗数据</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0d5cc" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#8d6e63" />
              <YAxis tick={{ fontSize: 12 }} stroke="#8d6e63" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#faf0e6',
                  border: '1px solid #d7ccc8',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {Object.keys(chartData[0] || {})
                .filter((k) => k !== 'date')
                .map((key, idx) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default InventoryStats;
