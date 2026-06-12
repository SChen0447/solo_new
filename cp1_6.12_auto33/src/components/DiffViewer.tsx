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

      switch (seg.type) {
        case 'added':
          left.push(
            <span key={key} className="diff-placeholder" />
          );
          right.push(
            <span key={key} className="diff-added">{seg.value}</span>
          );
          break;

        case 'removed':
          left.push(
            <span key={key} className="diff-removed">{seg.value}</span>
          );
          right.push(
            <span key={key} className="diff-placeholder" />
          );
          break;

        case 'modified':
          left.push(
            <span key={`${key}-old`} className="diff-modified-old">{seg.oldValue}</span>
          );
          right.push(
            <span key={`${key}-new`} className="diff-modified-new">{seg.value}</span>
          );
          break;

        case 'unchanged':
        default:
          left.push(<span key={key}>{seg.value}</span>);
          right.push(<span key={key}>{seg.value}</span>);
          break;
      }
    });

    return { leftContent: left, rightContent: right };
  }, [segments]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let modified = 0;

    segments.forEach((seg) => {
      const text = seg.type === 'modified' ? (seg.oldValue || '') + seg.value : seg.value;
      const count = text.trim().split(/\s+/).filter(Boolean).length;
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
            <span className="diff-stat-badge diff-stat-added">+{stats.added} 新增</span>
            <span className="diff-stat-badge diff-stat-removed">-{stats.removed} 删除</span>
            <span className="diff-stat-badge diff-stat-modified">~{stats.modified} 修改</span>
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
          <span className="diff-legend-swatch diff-legend-added" />
          <span style={styles.legendText}>新增（绿色高亮）</span>
        </div>
        <div style={styles.legendItem}>
          <span className="diff-legend-swatch diff-legend-removed" />
          <span style={styles.legendText}>删除（红色 + 删除线）</span>
        </div>
        <div style={styles.legendItem}>
          <span className="diff-legend-swatch diff-legend-modified" />
          <span style={styles.legendText}>修改（黄色背景）</span>
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
