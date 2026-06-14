import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAppStore } from '../store';
import type { MemberStats } from '../types';

export default function StatsPanel() {
  const { memberStats, fetchStats } = useAppStore();
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const sortedStats = [...memberStats].sort((a, b) => b.totalPagesRead - a.totalPagesRead);
  const maxPages = Math.max(...sortedStats.map((s) => s.totalPagesRead), 1);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await axios.get('/api/stats/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reading-club-report.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const getBarColor = (index: number) => {
    if (index === 0) return 'var(--gold)';
    if (index === 1) return 'var(--silver)';
    if (index === 2) return 'var(--bronze)';
    return 'var(--primary-color)';
  };

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '';
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700 }}>数据统计与导出</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
            {exporting ? '导出中...' : '📥 导出报告 (JSON)'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '20px' }}>📊 成员阅读排行榜</h3>
        {sortedStats.length === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>
            暂无统计数据
          </div>
        ) : (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '300px', justifyContent: 'center' }}>
              {sortedStats.map((stat, index) => {
                const heightPercent = (stat.totalPagesRead / maxPages) * 100;
                const barHeight = Math.max(heightPercent, 5);
                return (
                  <div key={stat.memberId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: '80px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-color)' }}>
                      {stat.totalPagesRead}页
                    </div>
                    <div style={{
                      width: '100%',
                      height: `${barHeight}%`,
                      background: `linear-gradient(to top, ${getBarColor(index)}, ${getBarColor(index)}dd)`,
                      borderRadius: '8px 8px 0 0',
                      minHeight: '20px',
                      transition: 'height 0.5s ease',
                      position: 'relative',
                    }}>
                      {index < 3 && (
                        <div style={{ position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)', fontSize: '18px' }}>
                          {getMedal(index)}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: index < 3 ? 600 : 400,
                      marginTop: '8px',
                      color: index < 3 ? getBarColor(index) : 'var(--text-color)',
                      textAlign: 'center',
                    }}>
                      {stat.memberName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '16px' }}>📋 详细统计</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <thead>
              <tr style={{ background: 'var(--primary-color)', color: 'white' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px' }}>排名</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px' }}>成员</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px' }}>已读页数</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px' }}>平均每本阅读天数</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px' }}>参与讨论会次数</th>
              </tr>
            </thead>
            <tbody>
              {sortedStats.map((stat, index) => (
                <tr key={stat.memberId} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f9f9f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                    {index < 3 ? getMedal(index) : `${index + 1}`}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: index < 3 ? 600 : 400 }}>{stat.memberName}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>{stat.totalPagesRead}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>{stat.avgDaysPerBook}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>{stat.meetingCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
