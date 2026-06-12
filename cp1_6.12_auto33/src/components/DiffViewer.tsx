import React, { useMemo } from 'react';
import type { DiffSegment, VersionMeta } from '../types';

interface DiffViewerProps {
  oldVersion: VersionMeta | null;
  newVersion: VersionMeta | null;
  segments: DiffSegment[];
  onApplyNew: () => void;
  onClose: () => void;
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  oldVersion,
  newVersion,
  segments,
  onApplyNew,
  onClose,
}) => {
  const { leftContent, rightContent } = useMemo(() => {
    const left: React.ReactNode[] = [];
    const right: React.ReactNode[] = [];

    segments.forEach((seg, idx) => {
      const key = `seg-${idx}`;
      if (seg.type === 'added') {
        left.push(<span key={key} />);
        right.push(
          <span
            key={key}
            style={{
              background: 'var(--added-bg)',
              color: 'var(--added-color)',
              padding: '0 2px',
              borderRadius: '2px',
            }}
          >
            {seg.value}
          </span>
        );
      } else if (seg.type === 'removed') {
        left.push(
          <span
            key={key}
            style={{
              background: 'var(--removed-bg)',
              color: 'var(--removed-color)',
              textDecoration: 'line-through',
              padding: '0 2px',
              borderRadius: '2px',
            }}
          >
            {seg.value}
          </span>
        );
        right.push(<span key={key} />);
      } else if (seg.type === 'modified') {
        left.push(
          <span
            key={`${key}-old`}
            style={{
              background: 'var(--modified-bg)',
              color: 'var(--removed-color)',
              textDecoration: 'line-through',
              padding: '0 2px',
              borderRadius: '2px',
            }}
          >
            {seg.oldValue}
          </span>
        );
        right.push(
          <span
            key={`${key}-new`}
            style={{
              background: 'var(--modified-bg)',
              color: 'var(--added-color)',
              padding: '0 2px',
              borderRadius: '2px',
            }}
          >
            {seg.value}
          </span>
        );
      } else {
        left.push(<span key={key}>{seg.value}</span>);
        right.push(<span key={key}>{seg.value}</span>);
      }
    });

    return { leftContent: left, rightContent: right };
  }, [segments]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let modified = 0;

    segments.forEach((seg) => {
      const count = seg.value.trim().split(/\s+/).filter(Boolean).length;
      if (seg.type === 'added') added += count;
      else if (seg.type === 'removed') removed += count;
      else if (seg.type === 'modified') modified += count;
    });

    return { added, removed, modified };
  }, [segments]);

  return (
    <div className="fade-in" style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h3 style={styles.title}>🔍 差异对比</h3>
          <div style={styles.stats}>
            <span style={{ ...styles.statBadge, background: 'var(--added-bg)', color: 'var(--added-color)' }}>
              +{stats.added} 新增
            </span>
            <span style={{ ...styles.statBadge, background: 'var(--removed-bg)', color: 'var(--removed-color)' }}>
              -{stats.removed} 删除
            </span>
            <span style={{ ...styles.statBadge, background: 'var(--modified-bg)', color: 'var(--modified-color)' }}>
              ~{stats.modified} 修改
            </span>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button onClick={onApplyNew} style={styles.applyBtn}>
            ✨ 应用新版本到编辑区
          </button>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>
      </div>

      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendColor, background: 'var(--added-bg)', border: '1px solid var(--added-color)' }} />
          <span style={styles.legendText}>新增</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendColor, background: 'var(--removed-bg)', border: '1px solid var(--removed-color)' }} />
          <span style={styles.legendText}>删除（带删除线）</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendColor, background: 'var(--modified-bg)', border: '1px solid var(--modified-color)' }} />
          <span style={styles.legendText}>修改</span>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.column}>
          <div style={styles.columnHeader}>
            <span style={styles.columnTag}>旧版本</span>
            <span style={styles.columnLabel}>{oldVersion?.label || '未选择'}</span>
          </div>
          <div style={styles.columnContent}>
            <pre style={styles.pre}>{leftContent}</pre>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.column}>
          <div style={styles.columnHeader}>
            <span style={{ ...styles.columnTag, background: 'var(--primary-color)', color: 'white' }}>新版本</span>
            <span style={styles.columnLabel}>{newVersion?.label || '未选择'}</span>
          </div>
          <div style={styles.columnContent}>
            <pre style={styles.pre}>{rightContent}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden',
    height: '100%',
  },
  header: {
    padding: '16px 20px',
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
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  stats: {
    display: 'flex',
    gap: '8px',
  },
  statBadge: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  applyBtn: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, var(--primary-color), var(--primary-light))',
    color: 'white',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: 500,
    boxShadow: 'var(--shadow-sm)',
  },
  closeBtn: {
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  legend: {
    display: 'flex',
    gap: '20px',
    padding: '10px 20px',
    borderBottom: '1px solid var(--border-color)',
    background: '#fafbfc',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  legendColor: {
    width: '16px',
    height: '16px',
    borderRadius: '3px',
  },
  legendText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  container: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
  },
  column: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  columnHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#fafbfc',
  },
  columnTag: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    background: 'var(--text-muted)',
    color: 'white',
  },
  columnLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  columnContent: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 20px',
  },
  pre: {
    margin: 0,
    fontFamily: 'var(--font-serif)',
    fontSize: '15px',
    lineHeight: '1.8',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    color: 'var(--text-primary)',
  },
  divider: {
    width: '1px',
    background: 'var(--border-color)',
  },
};

export default DiffViewer;
