import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { Card, ReviewSession, Classification } from '../types';

interface StatsDashboardProps {
  cards: Card[];
  sessions: ReviewSession[];
  tags: Classification[];
}

const WARM_COLORS = ['#E8734A', '#F39C12', '#E74C3C', '#FF6B6B', '#FDCB6E'];

const StatsDashboard: React.FC<StatsDashboardProps> = ({ cards, sessions, tags }) => {
  const totalReviews = useMemo(
    () => sessions.reduce((sum, s) => sum + s.records.length, 0),
    [sessions]
  );

  const totalCorrect = useMemo(
    () => sessions.reduce((sum, s) => sum + s.records.filter((r) => r.correct).length, 0),
    [sessions]
  );

  const overallAccuracy = useMemo(
    () => (totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0),
    [totalReviews, totalCorrect]
  );

  const accuracyTrend = useMemo(() => {
    return sessions.map((session, index) => {
      const correct = session.records.filter((r) => r.correct).length;
      const total = session.records.length;
      return {
        name: `第${index + 1}次`,
        正确率: total > 0 ? Math.round((correct / total) * 100) : 0,
      };
    });
  }, [sessions]);

  const tagStats = useMemo(() => {
    const tagMap = new Map<string, { total: number; correct: number }>();
    tags.forEach((t) => tagMap.set(t.name, { total: 0, correct: 0 }));

    cards.forEach((card) => {
      card.tags.forEach((tag) => {
        const stat = tagMap.get(tag);
        if (stat) {
          stat.total += card.reviewCount;
          stat.correct += card.correctCount;
        } else {
          tagMap.set(tag, { total: card.reviewCount, correct: card.correctCount });
        }
      });
    });

    return Array.from(tagMap.entries()).map(([name, stat]) => ({
      name,
      value: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
      total: stat.total,
      color: tags.find((t) => t.name === name)?.color || '#95A5A6',
    }));
  }, [cards, tags]);

  const pieData = useMemo(
    () =>
      cards.reduce<{ name: string; value: number; color: string }[]>((acc, card) => {
        card.tags.forEach((tag) => {
          const existing = acc.find((a) => a.name === tag);
          if (existing) {
            existing.value += 1;
          } else {
            acc.push({
              name: tag,
              value: 1,
              color: tags.find((t) => t.name === tag)?.color || '#95A5A6',
            });
          }
        });
        return acc;
      }, []),
    [cards, tags]
  );

  return (
    <div className="stats-dashboard">
      <h2 className="stats-title">统计看板</h2>

      <div className="stats-summary">
        <div className="stat-card">
          <span className="stat-number">{totalReviews}</span>
          <span className="stat-label">复习总次数</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{overallAccuracy}%</span>
          <span className="stat-label">总正确率</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{cards.length}</span>
          <span className="stat-label">卡片总数</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{sessions.length}</span>
          <span className="stat-label">复习轮次</span>
        </div>
      </div>

      {accuracyTrend.length > 0 && (
        <div className="chart-section">
          <h3 className="chart-title">正确率趋势</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={accuracyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E4E8" />
              <XAxis dataKey="name" tick={{ fill: '#6B7B8D', fontSize: 12 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#6B7B8D', fontSize: 12 }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                formatter={(value: number) => [`${value}%`, '正确率']}
                contentStyle={{
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                }}
              />
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#E8734A" />
                  <stop offset="50%" stopColor="#F39C12" />
                  <stop offset="100%" stopColor="#E74C3C" />
                </linearGradient>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E8734A" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#F39C12" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Line
                type="monotone"
                dataKey="正确率"
                stroke="url(#lineGradient)"
                strokeWidth={3}
                dot={{ fill: '#E8734A', r: 4, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#F39C12' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="chart-section">
        <h3 className="chart-title">各分类掌握进度</h3>
        <div className="tag-progress-list">
          {tagStats.map((stat) => (
            <div key={stat.name} className="tag-progress-item">
              <div className="tag-progress-header">
                <span className="tag-progress-name" style={{ color: stat.color }}>
                  {stat.name}
                </span>
                <span className="tag-progress-percent">{stat.value}%</span>
              </div>
              <div className="tag-progress-bar">
                <div
                  className="tag-progress-fill"
                  style={{
                    width: `${stat.value}%`,
                    backgroundColor: stat.color,
                  }}
                />
              </div>
              <span className="tag-progress-count">已复习 {stat.total} 次</span>
            </div>
          ))}
        </div>
      </div>

      {pieData.length > 0 && (
        <div className="chart-section">
          <h3 className="chart-title">卡片分类分布</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }: { name: string; percent: number }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="stats-empty">
          <p>暂无复习数据</p>
          <p className="stats-empty-sub">完成一次复习后即可查看统计</p>
        </div>
      )}
    </div>
  );
};

export default StatsDashboard;
