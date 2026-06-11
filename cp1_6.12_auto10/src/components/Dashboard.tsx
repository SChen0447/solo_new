import { useEffect, useState, useMemo } from 'react';
import type { Statistics, ExerciseType } from '../types';
import { getStatistics } from '../api/exerciseApi';

interface Props {
  onBack: () => void;
}

const TYPE_LABELS: Record<ExerciseType, string> = {
  choice: '选择题',
  short: '简答题',
  code: '编码题',
};

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}

function getWeekday(iso: string): string {
  const d = new Date(iso);
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
}

export default function Dashboard({ onBack }: Props) {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const s = await getStatistics();
      if (!cancelled) {
        setStats(s);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const heatmapMax = useMemo(() => {
    if (!stats) return 1;
    const m = Math.max(1, ...stats.dailyHeatmap.map((h) => h.count));
    return m;
  }, [stats]);

  const avgMax = useMemo(() => {
    if (!stats) return 10;
    const m = Math.max(10, ...stats.typeAverages.map((a) => a.averageScore));
    return m;
  }, [stats]);

  return (
    <div className="dashboard-layout">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          📊 学习统计看板
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          ← 返回列表
        </button>
      </div>

      {loading ? (
        <div className="empty-state card">
          <div className="empty-icon">⏳</div>
          <div className="empty-text">加载统计中...</div>
        </div>
      ) : !stats ? null : (
        <>
          <div className="stats-overview">
            <div className="card stat-card">
              <div className="stat-label">练习总数</div>
              <div>
                <span className="stat-value">{stats.totalExercises}</span>
                <span className="stat-unit">道</span>
              </div>
            </div>
            <div className="card stat-card accent">
              <div className="stat-label">累计作答次数</div>
              <div>
                <span className="stat-value">{stats.totalAttempts}</span>
                <span className="stat-unit">次</span>
              </div>
            </div>
            <div className="card stat-card success">
              <div className="stat-label">整体正确率</div>
              <div>
                <span className="stat-value">{stats.overallAccuracy}</span>
                <span className="stat-unit">%</span>
              </div>
            </div>
            <div className="card stat-card purple">
              <div className="stat-label">近7天练习日数</div>
              <div>
                <span className="stat-value">
                  {stats.dailyHeatmap.filter((h) => h.count > 0).length}
                </span>
                <span className="stat-unit">天</span>
              </div>
            </div>
          </div>

          <div className="card chart-card">
            <div className="chart-header">
              <div className="chart-title">🔥 最近7天练习热度图</div>
              <div style={{ fontSize: 13, color: '#616161' }}>
                总练习次数：
                <strong style={{ color: 'var(--color-accent)' }}>
                  {stats.dailyHeatmap.reduce((s, h) => s + h.count, 0)}
                </strong>{' '}
                次
              </div>
            </div>
            <div className="heatmap-row">
              {stats.dailyHeatmap.map((h) => {
                const heightPct =
                  heatmapMax === 0 ? 0 : (h.count / heatmapMax) * 100;
                return (
                  <div key={h.date} className="heatmap-col">
                    <div className="heatmap-bar-wrap">
                      <div
                        className="heatmap-bar"
                        style={{ height: `${Math.max(heightPct, h.count > 0 ? 8 : 0)}%` }}
                      >
                        <div className="heatmap-value">{h.count} 次</div>
                      </div>
                    </div>
                    <div className="heatmap-label">
                      <div>{formatShortDate(h.date)}</div>
                      <div style={{ opacity: 0.7, fontSize: 10 }}>
                        周{getWeekday(h.date)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card chart-card">
            <div className="chart-header">
              <div className="chart-title">📈 各类题型平均得分</div>
              <div className="legend">
                <span className="legend-item">
                  <span className="legend-dot choice" />
                  选择题
                </span>
                <span className="legend-item">
                  <span className="legend-dot short" />
                  简答题
                </span>
                <span className="legend-item">
                  <span className="legend-dot code" />
                  编码题
                </span>
              </div>
            </div>

            <div className="bars-row">
              {stats.typeAverages.map((a) => {
                const heightPct =
                  avgMax === 0 ? 0 : (a.averageScore / avgMax) * 100;
                return (
                  <div key={a.type} className="bar-col">
                    <div className="bar-wrap">
                      <div
                        className={`bar ${a.type}`}
                        style={{ height: `${Math.max(heightPct, a.averageScore > 0 ? 6 : 0)}%` }}
                      >
                        <div className="bar-value">{a.averageScore.toFixed(1)}</div>
                      </div>
                    </div>
                    <div className="bar-label">
                      <div className={`bar-label-type ${a.type}`}>
                        {TYPE_LABELS[a.type]}
                      </div>
                      <div className="bar-label-sub">共 {a.totalAttempts} 次作答</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div className="chart-title" style={{ marginBottom: 16 }}>
              📋 统计规则说明
            </div>
            <ul style={{ fontSize: 14, color: '#424242', lineHeight: 2, paddingLeft: 20 }}>
              <li>
                <strong>选择题正确率：</strong>按系统自动判定的正确 / 总作答次数计算；
              </li>
              <li>
                <strong>简答题正确率：</strong>按 1-5 自我评分 ≥ 4 视为正确，同时折算为加权得分（分数 × 自评/5）；
              </li>
              <li>
                <strong>编码题正确率：</strong>按掌握程度「熟悉」视为正确，得分权重分别为熟悉100% / 一般60% / 不熟悉20%；
              </li>
              <li>
                <strong>整体正确率：</strong>三类题型综合判定的正确次数 ÷ 总作答次数 × 100%；
              </li>
              <li>
                <strong>平均得分：</strong>每类题型下所有作答记录得分的算术平均值。
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
