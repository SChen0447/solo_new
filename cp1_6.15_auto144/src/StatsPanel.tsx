import React, { useMemo } from 'react';
import { WeeklyStats } from './types';
import { PodcastManager } from './PodcastManager';

interface StatsPanelProps {
  refreshKey: number;
  isOpen: boolean;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function formatWeekLabel(weekKey: string): string {
  const parts = weekKey.split('-');
  if (parts.length !== 3) return weekKey;
  return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日 起`;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ refreshKey, isOpen }) => {
  const stats = useMemo<WeeklyStats>(() => {
    return PodcastManager.getWeeklyStats();
  }, [refreshKey]);

  const tagCloudData = useMemo(() => {
    const entries = Object.entries(stats.categoryMinutes).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return [];
    const maxMin = Math.max(...entries.map(([, m]) => m), 1);
    return entries.slice(0, 15).map(([tag, minutes]) => ({
      tag,
      minutes,
      size: 12 + (minutes / maxMin) * 20,
      colorT: Math.min(1, minutes / maxMin),
    }));
  }, [stats.categoryMinutes]);

  const summary = useMemo(() => {
    const totalMin = stats.totalMinutes;
    const completed = stats.completedEpisodes;
    const entries = Object.entries(stats.categoryMinutes);
    const topCategory = entries.length > 0
      ? entries.sort((a, b) => b[1] - a[1])[0]
      : null;
    const daysListened = Object.keys(stats.dailyMinutes).length;
    const avgPerDay = daysListened > 0 ? Math.round(totalMin / daysListened) : 0;

    const parts: string[] = [];

    if (totalMin === 0) {
      return '本周还没有收听记录，选择一期喜欢的节目开始你的播客之旅吧！🎧';
    }

    if (topCategory && topCategory[1] >= totalMin * 0.3) {
      parts.push(`你这周偏爱${topCategory[0]}类内容`);
    }

    if (avgPerDay > 0) {
      parts.push(`平均每天收听${avgPerDay}分钟`);
    }

    if (completed > 0) {
      parts.push(`已完成${completed}期节目`);
    }

    if (totalMin >= 300) {
      parts.push('真是播客爱好者！💪');
    } else if (totalMin >= 60) {
      parts.push('保持得不错！✨');
    }

    if (parts.length === 0) {
      parts.push(`本周共收听${totalMin}分钟播客`);
    }

    return parts.join('，') + '。';
  }, [stats]);

  const dailyBars = useMemo(() => {
    const days = ['一', '二', '三', '四', '五', '六', '日'];
    const maxMin = Math.max(...Object.values(stats.dailyMinutes), 1);
    return days.map((d, i) => ({
      label: d,
      minutes: stats.dailyMinutes[i] || 0,
      heightPct: stats.dailyMinutes[i] ? (stats.dailyMinutes[i] / maxMin) * 100 : 0,
    }));
  }, [stats.dailyMinutes]);

  const topPodcasts = useMemo(() => {
    return Object.entries(stats.podcastMinutes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [stats.podcastMinutes]);

  return (
    <aside className={`stats-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="stats-header">
        <h2>📊 每周统计</h2>
        <div className="stats-week-label">本周 · {formatWeekLabel(stats.weekKey)}</div>
      </div>

      <div className="stats-card">
        <h3>⏱ 本周总时长</h3>
        <span className="big-number">{stats.totalMinutes}</span>
        <span className="big-number-unit">分钟</span>
        {totalHoursDisplay(stats.totalMinutes)}
      </div>

      <div className="stats-card">
        <h3>✅ 已完成节目</h3>
        <span className="small-number">{stats.completedEpisodes}</span>
        <span className="big-number-unit">期</span>
      </div>

      {topPodcasts.length > 0 && (
        <div className="stats-card">
          <h3>🎧 最常收听</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topPodcasts.map(([name, mins], idx) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                  {idx + 1}. {name}
                </span>
                <span style={{ color: '#00c9a7', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>
                  {Math.round(mins)}分
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stats-card">
        <h3>📈 每日收听</h3>
        <div className="daily-chart">
          {dailyBars.map((d) => (
            <div key={d.label} className="daily-bar-wrap" title={`${d.minutes.toFixed(0)} 分钟`}>
              <div
                className="daily-bar"
                style={{ height: `${Math.max(d.heightPct, d.minutes > 0 ? 5 : 0)}%` }}
              />
              <span className="daily-bar-label">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="stats-card">
        <h3>🏷 标签云</h3>
        {tagCloudData.length === 0 ? (
          <div style={{ fontSize: 12, color: '#aaa', padding: '10px 0', textAlign: 'center' }}>
            暂无数据
          </div>
        ) : (
          <div className="tag-cloud">
            {tagCloudData.map((t) => (
              <span
                key={t.tag}
                className="tag-item"
                style={{
                  fontSize: `${t.size}px`,
                  color: lerpColor('#4a90d9', '#e94e77', t.colorT),
                }}
                title={`${t.minutes.toFixed(1)} 分钟`}
              >
                {t.tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="stats-card">
        <h3>💡 收听洞察</h3>
        <div className="summary-text">{summary}</div>
      </div>
    </aside>
  );
};

function totalHoursDisplay(minutes: number): React.ReactNode {
  if (minutes < 60) return null;
  const hours = (minutes / 60).toFixed(1);
  return (
    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
      约 {hours} 小时
    </div>
  );
}
