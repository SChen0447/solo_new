import { useState, useMemo, useCallback } from 'react';
import { SubtitleItem, formatTimeDisplay } from '../utils/subtitleParser';

interface SubtitleListProps {
  subtitles: SubtitleItem[];
  selectedSubtitleId: string | null;
  selectedIds: Set<string>;
  onSelectSubtitle: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onUpdateSubtitle: (id: string, updates: Partial<SubtitleItem>) => void;
  onDeleteSubtitle: (id: string) => void;
  onBatchShift: (ms: number) => void;
  onTranslate: (id: string) => Promise<void>;
  onReplaceWithTranslation: (id: string) => void;
}

interface EditingState {
  id: string;
  field: 'text' | 'startTime' | 'endTime';
  value: string;
}

interface FadeState {
  ids: Set<string>;
  phase: 'out' | 'in';
}

export default function SubtitleList({
  subtitles,
  selectedSubtitleId,
  selectedIds,
  onSelectSubtitle,
  onToggleSelect,
  onSelectAll,
  onUpdateSubtitle,
  onDeleteSubtitle,
  onBatchShift,
  onTranslate,
  onReplaceWithTranslation
}: SubtitleListProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchShiftMs, setBatchShiftMs] = useState(100);
  const [fadeState, setFadeState] = useState<FadeState | null>(null);
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [hoveredBtnId, setHoveredBtnId] = useState<string | null>(null);

  const sortedSubtitles = useMemo(
    () => [...subtitles].sort((a, b) => a.startTime - b.startTime),
    [subtitles]
  );

  const allSelected = subtitles.length > 0 && selectedIds.size === subtitles.length;

  const startEditing = useCallback((id: string, field: EditingState['field'], currentValue: number | string) => {
    setEditing({
      id,
      field,
      value: typeof currentValue === 'number' ? formatTimeDisplay(currentValue) : String(currentValue)
    });
  }, []);

  const finishEditing = useCallback(() => {
    if (!editing) return;
    const { id, field, value } = editing;

    if (field === 'text') {
      onUpdateSubtitle(id, { text: value });
    } else {
      const match = value.match(/^(?:(\d+):)?(\d+):(\d+)(?:[.,](\d{1,3}))?$/);
      if (match) {
        const hrs = parseInt(match[1] || '0');
        const mins = parseInt(match[2]);
        const secs = parseInt(match[3]);
        const ms = parseInt((match[4] || '0').padEnd(3, '0'));
        const total = hrs * 3600 + mins * 60 + secs + ms / 1000;
        if (field === 'startTime') {
          const sub = subtitles.find(s => s.id === id);
          onUpdateSubtitle(id, { startTime: Math.max(0, Math.min(sub?.endTime || total + 0.5, total)) });
        } else {
          const sub = subtitles.find(s => s.id === id);
          onUpdateSubtitle(id, { endTime: Math.max((sub?.startTime || 0) + 0.1, total) });
        }
      }
    }
    setEditing(null);
  }, [editing, onUpdateSubtitle, subtitles]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEditing();
    } else if (e.key === 'Escape') {
      setEditing(null);
    }
  }, [finishEditing]);

  const handleBatchShift = useCallback((positive: boolean) => {
    const delta = positive ? Math.abs(batchShiftMs) : -Math.abs(batchShiftMs);
    const idsToAnimate = new Set(selectedIds);

    setFadeState({ ids: idsToAnimate, phase: 'out' });
    setTimeout(() => {
      onBatchShift(delta);
      setFadeState({ ids: idsToAnimate, phase: 'in' });
      setTimeout(() => setFadeState(null), 200);
    }, 200);

    setShowBatchModal(false);
  }, [batchShiftMs, selectedIds, onBatchShift]);

  const handleTranslate = useCallback(async (id: string) => {
    setTranslatingIds(prev => new Set(prev).add(id));
    try {
      await onTranslate(id);
    } finally {
      setTranslatingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [onTranslate]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <label style={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onSelectAll}
              style={styles.checkbox}
            />
          </label>
          <span style={styles.headerTitle}>字幕列表 ({subtitles.length})</span>
        </div>
        <button
          style={{
            ...styles.batchButton,
            opacity: selectedIds.size > 0 ? 1 : 0.5,
            cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed'
          }}
          onClick={() => selectedIds.size > 0 && setShowBatchModal(true)}
          disabled={selectedIds.size === 0}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
          </svg>
          <span>批量平移 ({selectedIds.size})</span>
        </button>
      </div>

      <div style={styles.listContainer}>
        {sortedSubtitles.map((sub, index) => {
          const isSelected = selectedSubtitleId === sub.id;
          const isChecked = selectedIds.has(sub.id);
          const isEditingThis = editing?.id === sub.id;
          const isFading = fadeState?.ids.has(sub.id);
          const isTranslating = translatingIds.has(sub.id);
          const isTranslated = sub.isTranslated && sub.translation;

          return (
            <div
              key={sub.id}
              style={{
                ...styles.listItem,
                backgroundColor: isSelected ? '#37373D' : '#2D2D2D',
                borderLeft: isSelected ? '3px solid #1E90FF' : '3px solid transparent',
                opacity: isFading ? (fadeState?.phase === 'out' ? 0.3 : 1) : 1,
                transition: 'opacity 0.2s ease, background-color 0.15s ease'
              }}
              onClick={() => onSelectSubtitle(sub.id)}
            >
              <div style={styles.itemRow}>
                <label
                  style={styles.checkboxContainer}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleSelect(sub.id)}
                    style={styles.checkbox}
                  />
                </label>

                <span style={styles.indexLabel}>{index + 1}</span>

                <div style={styles.actionsGroup}>
                  <button
                    title="翻译"
                    style={{
                      ...styles.iconButton,
                      color: hoveredBtnId === `translate-${sub.id}` || isTranslating ? '#1E90FF' : '#888',
                      cursor: isTranslating ? 'progress' : 'pointer'
                    }}
                    onMouseEnter={() => setHoveredBtnId(`translate-${sub.id}`)}
                    onMouseLeave={() => setHoveredBtnId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTranslate(sub.id);
                    }}
                    disabled={isTranslating}
                  >
                    {isTranslating ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                      </svg>
                    )}
                  </button>

                  {isTranslated && (
                    <button
                      title="用译文替换"
                      style={{
                        ...styles.iconButton,
                        color: '#4CAF50'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReplaceWithTranslation(sub.id);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </button>
                  )}

                  <button
                    title="删除"
                    style={{
                      ...styles.iconButton,
                      color: hoveredBtnId === `delete-${sub.id}` ? '#FF6B6B' : '#888'
                    }}
                    onMouseEnter={() => setHoveredBtnId(`delete-${sub.id}`)}
                    onMouseLeave={() => setHoveredBtnId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSubtitle(sub.id);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path>
                      <path d="M10 11v6"></path>
                      <path d="M14 11v6"></path>
                      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div style={styles.itemRow}>
                <div style={styles.timeLabel}>开始</div>
                {isEditingThis && editing.field === 'startTime' ? (
                  <input
                    autoFocus
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                    onBlur={finishEditing}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.timeInput}
                  />
                ) : (
                  <span
                    style={styles.timeValue}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEditing(sub.id, 'startTime', sub.startTime);
                    }}
                  >
                    {formatTimeDisplay(sub.startTime)}
                  </span>
                )}

                <div style={styles.timeArrow}>→</div>

                <div style={styles.timeLabel}>结束</div>
                {isEditingThis && editing.field === 'endTime' ? (
                  <input
                    autoFocus
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                    onBlur={finishEditing}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.timeInput}
                  />
                ) : (
                  <span
                    style={styles.timeValue}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEditing(sub.id, 'endTime', sub.endTime);
                    }}
                  >
                    {formatTimeDisplay(sub.endTime)}
                  </span>
                )}
              </div>

              <div style={styles.textContainer}>
                {isEditingThis && editing.field === 'text' ? (
                  <textarea
                    autoFocus
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                    onBlur={finishEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        finishEditing();
                      } else if (e.key === 'Escape') {
                        setEditing(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.textInput}
                    rows={isTranslated ? 3 : 2}
                  />
                ) : (
                  <div
                    style={styles.textDisplay}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEditing(sub.id, 'text', sub.text);
                    }}
                  >
                    {isTranslated ? (
                      <>
                        <div style={styles.originalText}>{sub.text}</div>
                        <div style={styles.translatedText}>{sub.translation}</div>
                      </>
                    ) : (
                      <div style={styles.singleText}>
                        {sub.text || <span style={{ color: '#555', fontStyle: 'italic' }}>双击编辑...</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {subtitles.length > 1 && index < subtitles.length - 1 && (
                <div style={styles.divider} />
              )}
            </div>
          );
        })}

        {subtitles.length === 0 && (
          <div style={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="8" y1="13" x2="16" y2="13"></line>
              <line x1="8" y1="17" x2="13" y2="17"></line>
            </svg>
            <p style={styles.emptyText}>暂无字幕</p>
            <p style={styles.emptyHint}>双击时间轴或点击 "添加字幕" 按钮</p>
          </div>
        )}
      </div>

      {showBatchModal && (
        <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowBatchModal(false)}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>批量平移字幕</h3>
            <p style={styles.modalSubtitle}>
              为选中的 {selectedIds.size} 条字幕统一调整时间
            </p>

            <div style={styles.modalInputGroup}>
              <label style={styles.modalLabel}>偏移量（毫秒）</label>
              <div style={styles.inputWithStepper}>
                <button
                  style={styles.stepperBtn}
                  onClick={() => setBatchShiftMs(Math.max(100, batchShiftMs - 100))}
                >
                  −
                </button>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={batchShiftMs}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 100;
                    setBatchShiftMs(Math.max(100, Math.floor(val / 100) * 100));
                  }}
                  style={styles.modalInput}
                />
                <button
                  style={styles.stepperBtn}
                  onClick={() => setBatchShiftMs(batchShiftMs + 100)}
                >
                  +
                </button>
              </div>
              <div style={styles.stepperPresets}>
                <button style={styles.presetBtn} onClick={() => setBatchShiftMs(100)}>100ms</button>
                <button style={styles.presetBtn} onClick={() => setBatchShiftMs(500)}>500ms</button>
                <button style={styles.presetBtn} onClick={() => setBatchShiftMs(1000)}>1s</button>
                <button style={styles.presetBtn} onClick={() => setBatchShiftMs(5000)}>5s</button>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.shiftBackBtn}
                onClick={() => handleBatchShift(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                提前 {batchShiftMs}ms
              </button>
              <button
                style={styles.shiftForwardBtn}
                onClick={() => handleBatchShift(true)}
              >
                延后 {batchShiftMs}ms
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>

            <button
              style={styles.cancelBtn}
              onClick={() => setShowBatchModal(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#252526',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #3D3D3D',
    backgroundColor: '#2D2D2D',
    gap: '12px',
    flexShrink: 0
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1
  },
  headerTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#E0E0E0'
  },
  batchButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    backgroundColor: '#3D3D3D',
    color: '#E0E0E0',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'background-color 0.2s ease'
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden'
  },
  listItem: {
    padding: '12px 16px 12px 12px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'opacity 0.2s ease, background-color 0.15s ease'
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  checkboxContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#1E90FF'
  },
  indexLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#1E90FF',
    minWidth: '24px'
  },
  actionsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    marginLeft: 'auto'
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '26px',
    height: '26px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'color 0.15s ease, background-color 0.15s ease'
  },
  timeLabel: {
    fontSize: '10px',
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: 600
  },
  timeValue: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#E0E0E0',
    padding: '3px 6px',
    backgroundColor: '#3D3D3D',
    borderRadius: '4px',
    cursor: 'text'
  },
  timeArrow: {
    fontSize: '12px',
    color: '#666'
  },
  timeInput: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#1E90FF',
    backgroundColor: '#1E1E1E',
    border: '1px solid #1E90FF',
    borderRadius: '4px',
    padding: '2px 6px',
    outline: 'none',
    width: '90px'
  },
  textContainer: {
    marginTop: '8px'
  },
  textDisplay: {
    minHeight: '20px',
    padding: '8px 10px',
    backgroundColor: '#1E1E1E',
    borderRadius: '6px',
    cursor: 'text',
    border: '1px solid transparent',
    transition: 'border-color 0.15s ease'
  },
  singleText: {
    fontSize: '13px',
    color: '#E0E0E0',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  originalText: {
    fontSize: '11px',
    color: '#888',
    lineHeight: 1.4,
    wordBreak: 'break-word',
    textDecoration: 'line-through',
    opacity: 0.7
  },
  translatedText: {
    fontSize: '13px',
    color: '#E0E0E0',
    lineHeight: 1.5,
    wordBreak: 'break-word',
    marginTop: '4px',
    fontWeight: 500
  },
  textInput: {
    width: '100%',
    fontSize: '13px',
    color: '#E0E0E0',
    backgroundColor: '#1E1E1E',
    border: '1px solid #1E90FF',
    borderRadius: '6px',
    padding: '8px 10px',
    outline: 'none',
    resize: 'none',
    lineHeight: 1.5,
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  divider: {
    height: '1px',
    backgroundColor: '#3A3A3A',
    marginTop: '12px',
    marginLeft: '28px'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '12px'
  },
  emptyText: {
    fontSize: '14px',
    color: '#888',
    fontWeight: 500
  },
  emptyHint: {
    fontSize: '12px',
    color: '#555'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px'
  },
  modalContent: {
    backgroundColor: '#2D2D2D',
    borderRadius: '12px',
    padding: '24px',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    border: '1px solid #3D3D3D'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#E0E0E0',
    marginBottom: '4px'
  },
  modalSubtitle: {
    fontSize: '13px',
    color: '#888',
    marginBottom: '20px'
  },
  modalInputGroup: {
    marginBottom: '20px'
  },
  modalLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#999',
    marginBottom: '8px',
    textTransform: 'uppercase'
  },
  inputWithStepper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    marginBottom: '10px'
  },
  stepperBtn: {
    width: '40px',
    height: '40px',
    backgroundColor: '#3D3D3D',
    color: '#E0E0E0',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease'
  },
  modalInput: {
    flex: 1,
    height: '40px',
    backgroundColor: '#1E1E1E',
    border: '1px solid #3D3D3D',
    borderLeft: 'none',
    borderRight: 'none',
    color: '#E0E0E0',
    fontSize: '16px',
    fontFamily: 'monospace',
    fontWeight: 600,
    textAlign: 'center',
    outline: 'none',
    padding: '0',
    boxSizing: 'border-box'
  },
  stepperPresets: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  presetBtn: {
    flex: 1,
    minWidth: '60px',
    padding: '6px 8px',
    backgroundColor: '#3D3D3D',
    color: '#CCC',
    border: 'none',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease, color 0.15s ease'
  },
  modalActions: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px'
  },
  shiftBackBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '10px 12px',
    backgroundColor: '#3D3D3D',
    color: '#E0E0E0',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.1s ease'
  },
  shiftForwardBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '10px 12px',
    backgroundColor: '#1E90FF',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.1s ease'
  },
  cancelBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'transparent',
    color: '#888',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'color 0.15s ease, background-color 0.15s ease'
  }
};
