import React, { useRef, useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { VersionMeta } from '../types';

interface TimelineViewProps {
  versions: VersionMeta[];
  onSelectVersion: (id: string) => void;
  selectedId?: string;
}

const TimelineView: React.FC<TimelineViewProps> = ({ versions, onSelectVersion, selectedId }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => a.createdAt - b.createdAt);
  }, [versions]);

  const { clusters, positions } = useMemo(() => {
    if (sortedVersions.length === 0) {
      return { clusters: [] as Array<{ versions: VersionMeta[]; x: number }>, positions: new Map<string, number>() };
    }

    const startTime = sortedVersions[0].createdAt;
    const endTime = sortedVersions[sortedVersions.length - 1].createdAt;
    const totalSpan = endTime - startTime || 1;

    const baseWidth = 100;
    const itemWidth = baseWidth * scale;
    const padding = 60;

    const clusterThreshold = 30 * 60 * 1000 / scale;
    const clusters: Array<{ versions: VersionMeta[]; x: number }> = [];
    const positions = new Map<string, number>();

    let currentCluster: VersionMeta[] = [sortedVersions[0]];

    for (let i = 1; i < sortedVersions.length; i++) {
      const v = sortedVersions[i];
      const lastInCluster = currentCluster[currentCluster.length - 1];

      if (v.createdAt - lastInCluster.createdAt < clusterThreshold) {
        currentCluster.push(v);
      } else {
        const clusterX = padding + ((currentCluster[0].createdAt + currentCluster[currentCluster.length - 1].createdAt) / 2 - startTime) / totalSpan * (Math.max(sortedVersions.length * itemWidth, 800) - padding * 2);
        currentCluster.forEach(cv => positions.set(cv.id, clusterX));
        clusters.push({ versions: [...currentCluster], x: clusterX });
        currentCluster = [v];
      }
    }

    const clusterX = padding + ((currentCluster[0].createdAt + currentCluster[currentCluster.length - 1].createdAt) / 2 - startTime) / totalSpan * (Math.max(sortedVersions.length * itemWidth, 800) - padding * 2);
    currentCluster.forEach(cv => positions.set(cv.id, clusterX));
    clusters.push({ versions: [...currentCluster], x: clusterX });

    return { clusters, positions };
  }, [sortedVersions, scale]);

  const totalWidth = useMemo(() => {
    return Math.max(sortedVersions.length * 100 * scale + 120, 900);
  }, [sortedVersions.length, scale]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(prev => Math.min(Math.max(prev * delta, 0.5), 3));
    }
  }, []);

  if (versions.length === 0) {
    return (
      <div className="fade-in" style={styles.empty}>
        <p style={styles.emptyText}>🕐 时间线上暂无版本</p>
        <p style={styles.emptyHint}>保存版本后将在此展示创作轨迹</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h3 style={styles.title}>📈 版本时间线</h3>
          <span style={styles.hint}>Ctrl + 滚轮 缩放 · 当前: {Math.round(scale * 100)}%</span>
        </div>
        <div style={styles.zoomControls}>
          <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} style={styles.zoomBtn}>−</button>
          <button onClick={() => setScale(1)} style={styles.zoomBtnReset}>100%</button>
          <button onClick={() => setScale(s => Math.min(s + 0.2, 3))} style={styles.zoomBtn}>+</button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onWheel={handleWheel}
        style={styles.scrollArea}
      >
        <div style={{ ...styles.timeline, width: totalWidth }}>
          <div style={styles.axis} />

          {clusters.map((cluster, cIdx) => (
            <React.Fragment key={`cluster-${cIdx}`}>
              <div
                style={{
                  ...styles.node,
                  left: cluster.x,
                  transform: 'translateX(-50%)',
                  width: cluster.versions.length > 1 ? '36px' : '24px',
                  height: cluster.versions.length > 1 ? '36px' : '24px',
                  background: cluster.versions.some(v => v.id === selectedId)
                    ? 'var(--primary-color)'
                    : cluster.versions.length > 1
                    ? 'var(--primary-light)'
                    : 'var(--secondary-color)',
                  boxShadow: cluster.versions.some(v => v.id === selectedId)
                    ? '0 0 0 4px rgba(91, 123, 168, 0.2)'
                    : 'none',
                }}
                onMouseEnter={() => setHoveredId(cluster.versions[0].id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => {
                  if (cluster.versions.length === 1) {
                    onSelectVersion(cluster.versions[0].id);
                  }
                }}
              >
                {cluster.versions.length > 1 && (
                  <span style={styles.nodeCount}>{cluster.versions.length}</span>
                )}
              </div>

              <div
                style={{
                  ...styles.nodeLabel,
                  left: cluster.x,
                  transform: 'translateX(-50%)',
                  opacity: hoveredId === cluster.versions[0].id || scale > 1.2 ? 1 : 0.7,
                }}
              >
                {cluster.versions.length === 1 ? (
                  <>
                    <div style={styles.labelTitle}>{cluster.versions[0].label}</div>
                    {cluster.versions[0].comment && (
                      <div style={styles.labelComment}>{cluster.versions[0].comment}</div>
                    )}
                    <div style={styles.labelTime}>
                      {format(new Date(cluster.versions[0].createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                    </div>
                  </>
                ) : (
                  <div style={styles.labelGroup}>
                    {cluster.versions.map((v, idx) => (
                      <div
                        key={v.id}
                        style={{
                          ...styles.labelGroupItem,
                          background: v.id === selectedId ? 'var(--primary-color)' : 'var(--bg-hover)',
                          color: v.id === selectedId ? 'white' : 'var(--text-primary)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVersion(v.id);
                        }}
                      >
                        {v.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '12px 20px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(to bottom, #fafbfc, #fff)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  hint: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  zoomControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'var(--bg-hover)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px',
  },
  zoomBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  zoomBtnReset: {
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  scrollArea: {
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '20px 20px 32px',
    position: 'relative',
  },
  timeline: {
    position: 'relative',
    height: '120px',
    minWidth: '100%',
  },
  axis: {
    position: 'absolute',
    top: '50px',
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, transparent, var(--border-color) 5%, var(--border-color) 95%, transparent)',
    borderRadius: '1px',
  },
  node: {
    position: 'absolute',
    top: '42px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeCount: {
    color: 'white',
    fontSize: '12px',
    fontWeight: 700,
  },
  nodeLabel: {
    position: 'absolute',
    top: '78px',
    textAlign: 'center',
    transition: 'opacity 0.2s ease',
    zIndex: 1,
    whiteSpace: 'nowrap',
  },
  labelTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '2px',
  },
  labelComment: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    marginBottom: '2px',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  labelTime: {
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  labelGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'center',
  },
  labelGroupItem: {
    padding: '3px 10px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  empty: {
    padding: '28px 20px',
    textAlign: 'center',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
  },
  emptyText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  },
  emptyHint: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
};

export default TimelineView;
