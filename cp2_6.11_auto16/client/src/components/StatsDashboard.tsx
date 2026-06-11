import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { format, zhCN } from 'date-fns';
import {
  Users, Check, HelpCircle, X as XIcon, Sun, Moon,
  Filter, ArrowLeft, Calendar, Tag, RefreshCw, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import type { StatsResponse, VoteStatus } from '@/types';

const STATUS_COLORS = {
  available: '#10b981',
  hesitant: '#f59e0b',
  unavailable: '#6b7280',
};

const STATUS_LABELS = {
  available: '有空',
  hesitant: '犹豫',
  unavailable: '没空',
};

const StatsDashboard: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { state, dispatch } = useAppContext();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const fetchStats = async (showLoading = true) => {
    if (!eventId) return;
    try {
      if (showLoading) setIsRefreshing(true);
      const response = await fetch(`/api/events/${eventId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
      dispatch({ type: 'SET_STATS', payload: data });
    } catch (err) {
      setError('加载统计数据失败');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/events/${eventId}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'initial') {
        if (message.data.stats) {
          setStats(message.data.stats);
          dispatch({ type: 'SET_STATS', payload: message.data.stats });
        }
      } else if (message.type === 'vote_update') {
        if (message.data.stats) {
          setStats(message.data.stats);
          dispatch({ type: 'SET_STATS', payload: message.data.stats });
        }
      }
    };

    websocket.onopen = () => {
      console.log('[Stats] WebSocket connected');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [eventId, dispatch]);

  const barChartData = useMemo(() => {
    if (!stats) return [];
    return stats.timeSlotStats.map((slot) => ({
      name: format(new Date(slot.startTime), 'MM/dd HH:mm', { locale: zhCN }),
      有空: slot.available,
      犹豫: slot.hesitant,
      没空: slot.unavailable,
      candidateTimeId: slot.candidateTimeId,
    }));
  }, [stats]);

  const pieChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: '有空', value: stats.statusDistribution.available, color: STATUS_COLORS.available },
      { name: '犹豫', value: stats.statusDistribution.hesitant, color: STATUS_COLORS.hesitant },
      { name: '没空', value: stats.statusDistribution.unavailable, color: STATUS_COLORS.unavailable },
    ].filter((item) => item.value > 0);
  }, [stats]);

  const bestTimeSlots = useMemo(() => {
    if (!stats) return [];
    return [...stats.timeSlotStats]
      .sort((a, b) => b.available - a.available)
      .slice(0, 3)
      .filter((slot) => slot.available > 0);
  }, [stats]);

  const chartTextColor = state.theme === 'dark' ? '#f1f5f9' : '#1e293b';
  const gridColor = state.theme === 'dark' ? '#334155' : '#e2e8f0';

  if (isLoading && !stats) {
    return (
      <div className="main-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: '3px solid var(--border-color)',
            borderTopColor: 'var(--color-primary)', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          <p style={{ color: 'var(--text-secondary)' }}>加载统计数据中...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="main-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>😕</div>
          <h2 style={{ marginBottom: 8 }}>{error}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>无法加载统计数据</p>
          <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={18} />返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <div className="fade-in-up" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <h1 style={{ fontSize: 36, marginBottom: 8 }}>
              {stats?.event.title || '统计看板'}
            </h1>
            {stats?.event.description && (
              <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
                {stats.event.description}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {stats?.event.tags.map((tag) => (
                <span
                  key={tag}
                  className={`tag ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Tag size={12} />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '8px 12px', minHeight: 40, minWidth: 40 }}
              onClick={() => fetchStats(false)}
              disabled={isRefreshing}
              title="刷新数据"
            >
              <RefreshCw size={18} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '8px 12px', minHeight: 40, minWidth: 40 }}
              onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
              title={state.theme === 'light' ? '切换暗色模式' : '切换亮色模式'}
            >
              {state.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        <div className="card fade-in-up" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Users size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>参与人数</p>
              <p style={{ fontSize: 28, fontWeight: 700 }}>{stats?.totalParticipants || 0}</p>
            </div>
          </div>
        </div>

        <div className="card fade-in-up" style={{ padding: 24, animationDelay: '50ms', opacity: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Check size={24} style={{ color: STATUS_COLORS.available }} />
            </div>
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>有空票数</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: STATUS_COLORS.available }}>
                {stats?.statusDistribution.available || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card fade-in-up" style={{ padding: 24, animationDelay: '100ms', opacity: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <HelpCircle size={24} style={{ color: STATUS_COLORS.hesitant }} />
            </div>
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>犹豫票数</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: STATUS_COLORS.hesitant }}>
                {stats?.statusDistribution.hesitant || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card fade-in-up" style={{ padding: 24, animationDelay: '150ms', opacity: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              backgroundColor: 'rgba(107, 114, 128, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <XIcon size={24} style={{ color: STATUS_COLORS.unavailable }} />
            </div>
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>没空票数</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: STATUS_COLORS.unavailable }}>
                {stats?.statusDistribution.unavailable || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {bestTimeSlots.length > 0 && (
        <div className="card fade-in-up" style={{ padding: 24, marginBottom: 24, animationDelay: '200ms', opacity: 0 }}>
          <h3 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} style={{ color: 'var(--color-accent-dark)' }} />
            推荐最佳时间段
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
            {bestTimeSlots.map((slot, index) => (
              <div
                key={slot.candidateTimeId}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${index === 0 ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)'} 0%, var(--bg-secondary) 100%)`,
                  border: `2px solid ${index === 0 ? 'var(--color-accent-dark)' : 'var(--border-color)'}`,
                  transition: 'all var(--transition-normal)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 15 }}>
                      {format(new Date(slot.startTime), 'MM月dd日 HH:mm', { locale: zhCN })}
                    </p>
                    {index === 0 && (
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: 'var(--color-accent-dark)',
                        color: 'white',
                        display: 'inline-block',
                        marginTop: 4,
                      }}>
                        推荐
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 24, fontWeight: 700, color: STATUS_COLORS.available }}>
                    {slot.available}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>犹豫 {slot.hesitant}</span>
                  <span>没空 {slot.unavailable}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: stats?.timeSlotStats && stats.timeSlotStats.length > 2 ? '2fr 1fr' : '1fr',
        gap: 24,
      }}>
        <div className="card fade-in-up" style={{ padding: 24, animationDelay: '250ms', opacity: 0 }}>
          <h3 style={{ fontSize: 18, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={20} style={{ color: 'var(--color-primary)' }} />
            各时间段投票分布
          </h3>
          <div style={{ width: '100%', height: 350 }}>
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: chartTextColor, fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    axisLine={{ stroke: gridColor }}
                  />
                  <YAxis
                    tick={{ fill: chartTextColor, fontSize: 12 }}
                    allowDecimals={false}
                    axisLine={{ stroke: gridColor }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 12,
                      boxShadow: 'var(--shadow-lg)',
                      color: chartTextColor,
                    }}
                  />
                  <Legend wrapperStyle={{ color: chartTextColor }} />
                  <Bar dataKey="有空" fill={STATUS_COLORS.available} radius={[4, 4, 0, 0]} animationDuration={500} />
                  <Bar dataKey="犹豫" fill={STATUS_COLORS.hesitant} radius={[4, 4, 0, 0]} animationDuration={500} />
                  <Bar dataKey="没空" fill={STATUS_COLORS.unavailable} radius={[4, 4, 0, 0]} animationDuration={500} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                暂无数据
              </div>
            )}
          </div>
        </div>

        <div className="card fade-in-up" style={{ padding: 24, animationDelay: '300ms', opacity: 0 }}>
          <h3 style={{ fontSize: 18, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PieChartIcon size={20} style={{ color: 'var(--color-accent-dark)' }} />
            整体状态分布
          </h3>
          <div style={{ width: '100%', height: 350 }}>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={600}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: chartTextColor }}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        style={{ transition: 'all var(--transition-fast)', cursor: 'pointer' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.transformOrigin = 'center';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 12,
                      boxShadow: 'var(--shadow-lg)',
                      color: chartTextColor,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                暂无数据
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            {pieChartData.map((item) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: item.color }} />
                <span style={{ fontSize: 13 }}>{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
        <Link
          to={`/vote/${eventId}`}
          className="btn btn-secondary"
          style={{ textDecoration: 'none' }}
        >
          <ArrowLeft size={18} />
          返回投票页
        </Link>
        <Link
          to="/"
          className="btn btn-accent"
          style={{ textDecoration: 'none' }}
        >
          <Calendar size={18} />
          创建新投票
        </Link>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .fade-in-up {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default StatsDashboard;
