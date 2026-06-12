import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { VersionMeta } from '../types';

interface TimelineViewProps {
  versions: VersionMeta[];
  onSelectVersion: (id: string) => void;
  selectedId?: string;
}

interface Cluster {
  versions: VersionMeta[];
  x: number;
}

const CLUSTER_BASE_THRESHOLD_MS = 5 * 60 * 1000;
const MIN_SCALE = 0.3;
const MAX_SCALE = 4;

const TimelineView: React.FC<TimelineViewProps> = ({ versions, onSelectVersion, selectedId }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => a.createdAt - b.createdAt);
  }, [versions]);

  const clusters: Cluster[] = useMemo(() => {
    if (sortedVersions.length === 0) return [];

    const clusterThreshold = CLUSTER_BASE_THRESHOLD_MS / scale;

    const result: Cluster[] = [];
    let currentCluster: VersionMeta[] = [sortedVersions[0]];

    for (let i = 1; i < sortedVersions.length; i++) {
      const v = sortedVersions[i];
      const lastInCluster = currentCluster[currentCluster.length - 1];

      if (v.createdAt - lastInCluster.createdAt < clusterThreshold) {
        currentCluster.push(v);
      } else {
        result.push({ versions: [...currentCluster], x: 0 });
        currentCluster = [v];
      }
    }
    result.push({ versions: [...currentCluster], x: 0 });

    const startTime = sortedVersions[0].createdAt;
    const endTime = sortedVersions[sortedVersions.length - 1].createdAt;
    const totalSpan = endTime - startTime || 1;
    const padding = 60;
    const usableWidth = Math.max(sortedVersions.length * 120 * scale, 800) - padding * 2;

    for (const cluster of result) {
      const midTime = (cluster.versions[0].createdAt + cluster.versions[cluster.versions.length - 1].createdAt) / 2;
      cluster.x = padding + (midTime - startTime) / totalSpan * usableWidth;
    }

    return result;
  }, [sortedVersions, scale]);

  const totalWidth = useMemo(() => {
    return Math.max(sortedVersions.length * 120 * scale + 120, 900);
  }, [sortedVersions.length, scale]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.92 : 1.08;
        setScale(prev => Math.min(Math.max(prev * delta, MIN_SCALE), MAX_SCALE));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale(s => Math.min(s + 0.2, MAX_SCALE));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(s => Math.max(s - 0.2, MIN_SCALE));
  }, []);

  const handleZoomReset = useCallback(() => {
    setScale(1);
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
          <span style={styles.hint}>Ctrl + 滚轮缩放 · {Math.round(scale * 100)}%</span>
        </div>
        <div style={styles.zoomControls}>
          <button onClick={handleZoomOut} style={styles.zoomBtn}>−</button>
          <button onClick={handleZoomReset} style={styles.zoomBtnReset}>100%</button>
          <button onClick={handleZoomIn} style={styles.zoomBtn}>+</button>
        </div>
      </div>

      <div ref={scrollRef} style={styles.scrollArea}>
        <div style={{ ...styles.timeline, width: totalWidth }}>
          <div style={styles.axis} />

          {clusters.map((cluster, cIdx) => {
            const isSelected = cluster.versions.some(v => v.id === selectedId);
            const isGroup = cluster.versions.length > 1;
            const nodeSize = isGroup ? 36 : 22;

            return (
              <React.Fragment key={`cluster-${cIdx}`}>
                <div
                  style={{
                    ...styles.node,
                    left: cluster.x,
                    width: nodeSize,
                    height: nodeSize,
                    top: 50 - nodeSize / 2,
                    transform: 'translateX(-50%)',
                    background: isSelected
                      ? 'var(--primary-color)'
                      : isGroup
                      ? 'var(--primary-light)'
                      : 'var(--secondary-color)',
                    boxShadow: isSelected
                      ? '0 0 0 4px rgba(91, 123, 168, 0.25)'
                      : 'var(--shadow-sm)',
                  }}
                  onMouseEnter={() => setHoveredId(cluster.versions[0].id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => {
                    if (!isGroup) {
                      onSelectVersion(cluster.versions[0].id);
                    }
                  }}
                >
                  {isGroup && (
                    <span style={styles.nodeCount}>{cluster.versions.length}</span>
                  )}
                </div>

                <div
                  style={{
                    ...styles.nodeLabel,
                    left: cluster.x,
                    transform: 'translateX(-50%)',
                    opacity: hoveredId === cluster.versions[0].id || scale > 1 ? 1 : 0.65,
                  }}
                >
                  {!isGroup ? (
                    <>
                      <div style={styles.labelTitle}>{cluster.versions[0].label}</div>
                      {cluster.versions[0].comment && (
                        <div style={styles.labelComment} title={cluster.versions[0].comment}>
                          {cluster.versions[0].comment}
                        </div>
                      )}
                      <div style={styles.labelTime}>
                        {format(new Date(cluster.versions[0].createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                      </div>
                    </>
                  ) : (
                    <div style={styles.labelGroup}>
                      {cluster.versions.map((v) => (
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
                          title={v.comment || v.label}
                        >
                          {v.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
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
    height: '130px',
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
    top: '80px',
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
    maxWidth: '140px',
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
