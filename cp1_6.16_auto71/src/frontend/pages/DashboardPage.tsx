import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Category, CATEGORY_LABELS, CATEGORY_COLORS } from '../types';

interface CategoryStats {
  feature: number;
  bug: number;
  ux: number;
  other: number;
}

interface DailyTrendItem {
  date: string;
  count: number;
}

const DashboardPage: React.FC = () => {
  const [categoryStats, setCategoryStats] = useState<CategoryStats | null>(null);
  const [dailyTrend, setDailyTrend] = useState<DailyTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [catRes, trendRes] = await Promise.all([
          axios.get<CategoryStats>('/api/stats/category'),
          axios.get<DailyTrendItem[]>('/api/stats/daily-trend', { params: { days: 7 } })
        ]);
        setCategoryStats(catRes.data);
        setDailyTrend(trendRes.data.map(item => ({
          ...item,
          date: item.date.slice(5)
        })));
      } catch {
        showToast('error', '加载统计数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  const pieData = categoryStats
    ? (Object.keys(categoryStats) as Category[])
        .filter(key => categoryStats[key] > 0)
        .map(key => ({
          name: CATEGORY_LABELS[key],
          value: categoryStats[key],
          color: CATEGORY_COLORS[key]
        }))
    : [];

  const totalCount = categoryStats
    ? Object.values(categoryStats).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div>
      <div className="dashboard-grid">
        <div className="chart-card">
          <h3 className="chart-title">各类别反馈占比（共 {totalCount} 条）</h3>
          <div className="chart-container">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} 条`, '数量']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E0E0E0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-text">暂无数据</div>
              </div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">最近7天每日提交趋势</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#666' }}
                  axisLine={{ stroke: '#E0E0E0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#666' }}
                  axisLine={{ stroke: '#E0E0E0' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value: number) => [`${value} 条`, '提交数']}
                  labelFormatter={(label) => `日期: ${label}`}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E0E0E0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#1976D2"
                  strokeWidth={3}
                  dot={{ fill: '#1976D2', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#FF9800' }}
                  name="提交数"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
