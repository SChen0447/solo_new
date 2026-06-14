import { useMemo } from 'react';
import { useSalonStore } from '../store/useSalonStore';
import './Statistics.css';

function Statistics() {
  const { statistics, appointments } = useSalonStore();

  const serviceData = useMemo(() => {
    if (!statistics) return [];
    const total = Object.values(statistics.serviceStats).reduce((a, b) => a + b, 0);
    return Object.entries(statistics.serviceStats).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  }, [statistics]);

  const statusData = useMemo(() => {
    if (!statistics) return [];
    return [
      { name: '待服务', count: statistics.statusStats.pending, color: '#E8843C' },
      { name: '已完成', count: statistics.statusStats.completed, color: '#4CAF50' },
      { name: '已取消', count: statistics.statusStats.cancelled, color: '#9E9E9E' }
    ];
  }, [statistics]);

  const recentActivity = useMemo(() => {
    return [...appointments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [appointments]);

  const statusLabels: Record<string, { label: string; class: string }> = {
    pending: { label: '待服务', class: 'status-pending' },
    completed: { label: '已完成', class: 'status-completed' },
    cancelled: { label: '已取消', class: 'status-cancelled' }
  };

  const serviceColors: Record<string, string> = {
    剪发: '#E8843C',
    染发: '#9C27B0',
    护理: '#2196F3',
    造型: '#4CAF50'
  };

  return (
    <div className="statistics-page">
      <div className="stats-header">
        <h1>统计看板</h1>
        <p className="subtitle">实时监控预约数据和业务趋势</p>
      </div>

      <div className="stats-overview">
        <div className="overview-card">
          <div className="overview-icon total">📊</div>
          <div className="overview-content">
            <div className="overview-value">{statistics?.total || 0}</div>
            <div className="overview-label">总预约数</div>
          </div>
        </div>
        <div className="overview-card">
          <div className="overview-icon pending">⏳</div>
          <div className="overview-content">
            <div className="overview-value">{statistics?.statusStats.pending || 0}</div>
            <div className="overview-label">待服务</div>
          </div>
        </div>
        <div className="overview-card">
          <div className="overview-icon completed">✅</div>
          <div className="overview-content">
            <div className="overview-value">{statistics?.statusStats.completed || 0}</div>
            <div className="overview-label">已完成</div>
          </div>
        </div>
        <div className="overview-card">
          <div className="overview-icon cancelled">❌</div>
          <div className="overview-content">
            <div className="overview-value">{statistics?.statusStats.cancelled || 0}</div>
            <div className="overview-label">已取消</div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <h2 className="card-title">服务项目分布</h2>
          <div className="service-chart">
            {serviceData.map((item) => (
              <div key={item.name} className="service-bar-item">
                <div className="service-bar-header">
                  <span className="service-name">
                    <span
                      className="service-dot"
                      style={{ backgroundColor: serviceColors[item.name] }}
                    ></span>
                    {item.name}
                  </span>
                  <span className="service-count">
                    {item.count} 次 ({item.percentage}%)
                  </span>
                </div>
                <div className="service-bar-bg">
                  <div
                    className="service-bar-fill"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: serviceColors[item.name]
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-card">
          <h2 className="card-title">状态分布</h2>
          <div className="status-pie">
            <div className="pie-visual">
              {statusData.map((item, index) => {
                const total = statusData.reduce((sum, s) => sum + s.count, 0);
                const percentage = total > 0 ? (item.count / total) * 360 : 0;
                const rotation = statusData
                  .slice(0, index)
                  .reduce((sum, s) => sum + (total > 0 ? (s.count / total) * 360 : 0), 0);
                return (
                  <div
                    key={item.name}
                    className="pie-slice"
                    style={{
                      background: `conic-gradient(${item.color} 0deg, ${item.color} ${percentage}deg, transparent ${percentage}deg)`,
                      transform: `rotate(${rotation}deg)`
                    }}
                  ></div>
                );
              })}
              <div className="pie-center">
                <div className="pie-total">{statistics?.total || 0}</div>
                <div className="pie-label">总计</div>
              </div>
            </div>
            <div className="pie-legend">
              {statusData.map((item) => (
                <div key={item.name} className="legend-item">
                  <span
                    className="legend-color"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="legend-name">{item.name}</span>
                  <span className="legend-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="stats-card">
        <h2 className="card-title">最近预约记录</h2>
        <div className="activity-list">
          {recentActivity.length > 0 ? (
            recentActivity.map((apt) => (
              <div key={apt.id} className="activity-item">
                <div className="activity-main">
                  <span className="activity-customer">{apt.name}</span>
                  <span className="activity-service">{apt.service}</span>
                  <span className={`activity-status ${statusLabels[apt.status].class}`}>
                    {statusLabels[apt.status].label}
                  </span>
                </div>
                <div className="activity-time">
                  {apt.date} {apt.time}
                </div>
              </div>
            ))
          ) : (
            <div className="activity-empty">暂无预约记录</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Statistics;
