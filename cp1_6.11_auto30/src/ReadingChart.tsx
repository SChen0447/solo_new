import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import type { ReadingRecord } from './types';

interface ReadingChartProps {
  records: ReadingRecord[];
}

const ReadingChart: React.FC<ReadingChartProps> = ({ records }) => {
  const [range, setRange] = useState<'7' | '30' | 'all'>('all');

  const chartData = useMemo(() => {
    if (records.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = [...records];

    if (range !== 'all') {
      const daysAgo = parseInt(range, 10);
      const cutoffDate = new Date(today);
      cutoffDate.setDate(today.getDate() - daysAgo);
      filtered = filtered.filter(r => new Date(r.date) >= cutoffDate);
    }

    const sorted = filtered.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sorted.map(r => ({
      date: r.date,
      pages: r.pages,
      displayDate: r.date.slice(5)
    }));
  }, [records, range]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: 'white',
            padding: '10px 14px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <p style={{ color: '#2c3e50', fontWeight: 600, marginBottom: '4px' }}>
            {label}
          </p>
          <p style={{ color: '#e67e22', fontWeight: 500 }}>
            {payload[0].value} 页
          </p>
        </div>
      );
    }
    return null;
  };

  const gradientId = useMemo(() => `colorPages-${Date.now()}`, []);

  if (chartData.length === 0) {
    return (
      <div className="chart-section">
        <div className="chart-header">
          <h2>📈 阅读趋势</h2>
          <select
            className="range-select"
            value={range}
            onChange={e => setRange(e.target.value as '7' | '30' | 'all')}
          >
            <option value="7">最近 7 天</option>
            <option value="30">最近 30 天</option>
            <option value="all">全部数据</option>
          </select>
        </div>
        <div className="empty-state">
          <p>暂无阅读记录</p>
          <p style={{ marginTop: '8px' }}>开始记录你的阅读进度吧</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-section">
      <div className="chart-header">
        <h2>📈 阅读趋势</h2>
        <select
          className="range-select"
          value={range}
          onChange={e => setRange(e.target.value as '7' | '30' | 'all')}
        >
          <option value="7">最近 7 天</option>
          <option value="30">最近 30 天</option>
          <option value="all">全部数据</option>
        </select>
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e67e22" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#e67e22" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0eb" />
            <XAxis
              dataKey="displayDate"
              stroke="#95a5a6"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis
              stroke="#95a5a6"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="pages"
              stroke="#e67e22"
              strokeWidth={3}
              fill={`url(#${gradientId})`}
              dot={{ fill: '#e67e22', strokeWidth: 2, r: 4, stroke: '#fff' }}
              activeDot={{ r: 6, stroke: '#e67e22', strokeWidth: 2, fill: '#fff' }}
              isAnimationActive={chartData.length <= 200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default React.memo(ReadingChart, (prev, next) => {
  return prev.records === next.records;
});
