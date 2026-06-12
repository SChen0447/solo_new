import React, { useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { VersionMeta } from '../types';

interface VersionSidebarProps {
  versions: VersionMeta[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onCompare: () => void;
  onLoadVersion: (id: string) => void;
  onUpdateVersion: (id: string, data: { label?: string; comment?: string }) => void;
}

const VersionSidebar: React.FC<VersionSidebarProps> = ({
  versions,
  selectedIds,
  onToggleSelect,
  onCompare,
  onLoadVersion,
  onUpdateVersion,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editComment, setEditComment] = useState('');

  const startEdit = (v: VersionMeta) => {
    setEditingId(v.id);
    setEditLabel(v.label);
    setEditComment(v.comment);
  };

  const saveEdit = () => {
    if (editingId) {
      onUpdateVersion(editingId, { label: editLabel, comment: editComment });
      setEditingId(null);
    }
  };

  return (
    <div className="fade-in" style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>📚 版本历史</h2>
        <button
          onClick={onCompare}
          disabled={selectedIds.length !== 2}
          style={{
            ...styles.compareBtn,
            opacity: selectedIds.length === 2 ? 1 : 0.5,
          }}
        >
          对比差异 ({selectedIds.length}/2)
        </button>
      </div>

      <div style={styles.list}>
        {versions.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>暂无版本</p>
            <p style={styles.emptyHint}>点击"保存为新版本"创建第一个版本</p>
          </div>
        ) : (
          versions.map((v, idx) => (
            <div
              key={v.id}
              className="fade-in"
              style={{
                ...styles.item,
                opacity: 1,
                animationDelay: `${idx * 0.05}s`,
                borderLeft: selectedIds.includes(v.id)
                  ? '3px solid var(--primary-color)'
                  : '3px solid transparent',
                background: selectedIds.includes(v.id)
                  ? 'var(--bg-hover)'
                  : 'transparent',
              }}
            >
              {editingId === v.id ? (
                <div style={styles.editForm}>
                  <input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    style={styles.editInput}
                    placeholder="版本标签"
                  />
                  <textarea
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    style={{ ...styles.editInput, ...styles.editTextarea }}
                    placeholder="版本评论"
                  />
                  <div style={styles.editActions}>
                    <button onClick={() => setEditingId(null)} style={styles.editCancel}>
                      取消
                    </button>
                    <button onClick={saveEdit} style={styles.editSave}>
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={styles.itemTop}>
                    <label style={styles.checkboxWrap}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(v.id)}
                        onChange={() => onToggleSelect(v.id)}
                        style={styles.checkbox}
                      />
                    </label>
                    <div style={styles.itemContent}>
                      <div style={styles.label}>{v.label}</div>
                      <div style={styles.time}>
                        {format(new Date(v.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                      </div>
                      {v.comment && (
                        <div style={styles.comment}>"{v.comment}"</div>
                      )}
                    </div>
                  </div>
                  <div style={styles.itemActions}>
                    <button
                      onClick={() => onLoadVersion(v.id)}
                      title="加载此版本"
                      style={styles.actionBtn}
                    >
                      📝
                    </button>
                    <button
                      onClick={() => startEdit(v)}
                      title="编辑标签/评论"
                      style={styles.actionBtn}
                    >
                      ✏️
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(to bottom, #fafbfc, #fff)',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  compareBtn: {
    padding: '8px 16px',
    background: 'var(--primary-color)',
    color: 'white',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: 500,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
  },
  emptyHint: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  item: {
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    marginBottom: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  },
  itemTop: {
    display: 'flex',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  checkboxWrap: {
    display: 'flex',
    alignItems: 'flex-start',
    paddingTop: '2px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: 'var(--primary-color)',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  time: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginBottom: '6px',
  },
  comment: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    padding: '4px 8px',
    background: 'var(--bg-hover)',
    borderRadius: 'var(--radius-sm)',
    display: 'inline-block',
  },
  itemActions: {
    display: 'flex',
    gap: '4px',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  actionBtn: {
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
  },
  editForm: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  editInput: {
    padding: '8px 10px',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'var(--font-sans)',
  },
  editTextarea: {
    minHeight: '60px',
    resize: 'vertical',
    fontFamily: 'var(--font-serif)',
  },
  editActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  editCancel: {
    padding: '6px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    background: 'var(--bg-hover)',
  },
  editSave: {
    padding: '6px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12px',
    fontWeight: 500,
    color: 'white',
    background: 'var(--primary-color)',
  },
};

export default VersionSidebar;
