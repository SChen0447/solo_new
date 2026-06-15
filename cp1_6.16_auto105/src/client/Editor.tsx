import React, { useState, useRef, useCallback, useEffect } from 'react';
import { LyricLine, RemoteUser } from './App';

interface EditorProps {
  lyrics: LyricLine[];
  users: RemoteUser[];
  myUserId: string;
  myColor: string;
  onLyricsChange: (lyrics: LyricLine[]) => void;
  onCursorMove: (line: number, col: number) => void;
  onBeatChange: (lineId: string, beat: { bpm: number; duration: number } | null) => void;
  onBatchBeatChange: (lineIds: string[], beat: { bpm: number; duration: number }) => void;
}

const DURATION_OPTIONS = [
  { label: '1/4', value: 1 },
  { label: '1/8', value: 0.5 },
  { label: '1/16', value: 0.25 },
];

let idCounter = 0;
function genId(): string {
  return `line-${Date.now()}-${++idCounter}`;
}

export default function Editor({
  lyrics,
  users,
  myUserId,
  myColor,
  onLyricsChange,
  onCursorMove,
  onBeatChange,
  onBatchBeatChange,
}: EditorProps) {
  const [expandedLine, setExpandedLine] = useState<string | null>(null);
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [batchBpm, setBatchBpm] = useState(120);
  const [batchDuration, setBatchDuration] = useState(1);
  const editorRef = useRef<HTMLDivElement>(null);
  const cursorSentRef = useRef(0);

  const addLine = useCallback(() => {
    const newLine: LyricLine = { id: genId(), text: '', beat: null };
    onLyricsChange([...lyrics, newLine]);
  }, [lyrics, onLyricsChange]);

  const removeLine = useCallback(
    (id: string) => {
      onLyricsChange(lyrics.filter((l) => l.id !== id));
      if (expandedLine === id) setExpandedLine(null);
    },
    [lyrics, onLyricsChange, expandedLine]
  );

  const updateLineText = useCallback(
    (id: string, text: string) => {
      onLyricsChange(lyrics.map((l) => (l.id === id ? { ...l, text } : l)));
    },
    [lyrics, onLyricsChange]
  );

  const toggleExpand = useCallback(
    (id: string) => {
      setExpandedLine(expandedLine === id ? null : id);
    },
    [expandedLine]
  );

  const handleBeatSave = useCallback(
    (lineId: string, bpm: number, duration: number) => {
      onBeatChange(lineId, { bpm, duration });
      setExpandedLine(null);
    },
    [onBeatChange]
  );

  const toggleSelectLine = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBatchApply = useCallback(() => {
    if (selectedLines.size === 0) return;
    onBatchBeatChange(Array.from(selectedLines), { bpm: batchBpm, duration: batchDuration });
    setSelectedLines(new Set());
  }, [selectedLines, batchBpm, batchDuration, onBatchBeatChange]);

  const handleInput = useCallback(
    (lineIdx: number, id: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateLineText(id, e.target.value);
      const now = Date.now();
      if (now - cursorSentRef.current > 30) {
        cursorSentRef.current = now;
        const ta = e.target;
        const pos = ta.selectionStart || 0;
        const linesBefore = ta.value.substring(0, pos).split('\n').length - 1;
        onCursorMove(lineIdx + linesBefore, pos);
      }
    },
    [updateLineText, onCursorMove]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, lineIdx: number) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const newLine: LyricLine = { id: genId(), text: '', beat: null };
        const next = [...lyrics];
        next.splice(lineIdx + 1, 0, newLine);
        onLyricsChange(next);
      }
    },
    [lyrics, onLyricsChange]
  );

  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current) {
        const isMobile = window.innerWidth < 768;
        editorRef.current.style.flexDirection = isMobile ? 'column' : 'row';
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const remoteUsers = users.filter((u) => u.userId !== myUserId);

  return (
    <div style={styles.editorContainer}>
      <div style={styles.toolbar}>
        <button style={styles.addBtn} onClick={addLine}>
          + 添加歌词行
        </button>
        {selectedLines.size > 0 && (
          <div style={styles.batchBar}>
            <span style={styles.batchLabel}>批量标注 ({selectedLines.size}行)</span>
            <input
              type="number"
              style={styles.batchInput}
              value={batchBpm}
              min={40}
              max={240}
              onChange={(e) => setBatchBpm(Number(e.target.value))}
            />
            <input
              type="range"
              style={styles.batchSlider}
              min={0}
              max={2}
              step={1}
              value={DURATION_OPTIONS.findIndex((d) => d.value === batchDuration)}
              onChange={(e) => setBatchDuration(DURATION_OPTIONS[Number(e.target.value)].value)}
            />
            <span style={styles.batchDurLabel}>
              {DURATION_OPTIONS.find((d) => d.value === batchDuration)?.label}拍
            </span>
            <button style={styles.applyBtn} onClick={handleBatchApply}>
              应用
            </button>
            <button
              style={styles.cancelBtn}
              onClick={() => setSelectedLines(new Set())}
            >
              取消
            </button>
          </div>
        )}
      </div>
      <div style={styles.linesContainer}>
        {lyrics.map((line, idx) => (
          <div
            key={line.id}
            style={{
              ...styles.lineRow,
              background: line.beat ? '#E3F2FD' : 'transparent',
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <div style={styles.lineLeft}>
              <div
                style={styles.selectBox}
                onClick={(e) => toggleSelectLine(line.id, e)}
              >
                {selectedLines.has(line.id) && <span style={styles.checkMark}>✓</span>}
              </div>
              <div
                style={{
                  ...styles.beatDot,
                  background: line.beat ? '#51CF66' : 'transparent',
                  border: line.beat ? '2px solid #51CF66' : '2px solid #555',
                  cursor: 'pointer',
                }}
                onClick={() => toggleExpand(line.id)}
                title="点击标注节拍"
              />
            </div>
            <div style={styles.lineContent}>
              <div style={styles.lineInputWrapper}>
                <textarea
                  style={styles.lineInput}
                  value={line.text}
                  placeholder={`第 ${idx + 1} 行歌词...`}
                  rows={1}
                  onChange={(e) => handleInput(idx, line.id, e)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  onFocus={() => onCursorMove(idx, 0)}
                />
                {remoteUsers
                  .filter((u) => u.cursor.line === idx)
                  .map((u) => (
                    <div
                      key={u.userId}
                      style={{
                        ...styles.remoteCursor,
                        background: u.color,
                      }}
                    />
                  ))}
              </div>
              {!line.beat && line.text && (
                <span style={styles.warnIcon} title="未标注节拍">
                  ⚠
                </span>
              )}
              <button
                style={styles.removeBtn}
                onClick={() => removeLine(line.id)}
                title="删除此行"
              >
                ×
              </button>
            </div>
            {expandedLine === line.id && (
              <BeatEditor
                lineId={line.id}
                initialBpm={line.beat?.bpm ?? 120}
                initialDuration={line.beat?.duration ?? 1}
                onSave={handleBeatSave}
                onCancel={() => setExpandedLine(null)}
              />
            )}
          </div>
        ))}
        {lyrics.length === 0 && (
          <div style={styles.empty}>
            点击"添加歌词行"开始创作
          </div>
        )}
      </div>
    </div>
  );
}

interface BeatEditorProps {
  lineId: string;
  initialBpm: number;
  initialDuration: number;
  onSave: (lineId: string, bpm: number, duration: number) => void;
  onCancel: () => void;
}

function BeatEditor({ lineId, initialBpm, initialDuration, onSave, onCancel }: BeatEditorProps) {
  const [bpm, setBpm] = useState(initialBpm);
  const [duration, setDuration] = useState(initialDuration);

  return (
    <div style={styles.beatEditor}>
      <div style={styles.beatRow}>
        <label style={styles.beatLabel}>BPM</label>
        <input
          type="number"
          style={styles.bpmInput}
          value={bpm}
          min={40}
          max={240}
          onChange={(e) => setBpm(Math.min(240, Math.max(40, Number(e.target.value))))}
        />
      </div>
      <div style={styles.beatRow}>
        <label style={styles.beatLabel}>时长</label>
        <div style={styles.durBtns}>
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              style={{
                ...styles.durBtn,
                background: duration === opt.value ? '#4A9EFF' : '#0F3460',
                color: duration === opt.value ? '#fff' : '#aaa',
              }}
              onClick={() => setDuration(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          type="range"
          style={styles.durSlider}
          min={0.25}
          max={2}
          step={0.25}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
        <span style={styles.durValue}>{duration}拍</span>
      </div>
      <div style={styles.beatActions}>
        <button style={styles.saveBtn} onClick={() => onSave(lineId, bpm, duration)}>
          确定
        </button>
        <button style={styles.cancelBtn} onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  editorContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#16213E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderBottom: '1px solid #0F3460',
    flexWrap: 'wrap' as const,
  },
  addBtn: {
    background: '#4A9EFF',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  batchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#0F3460',
    borderRadius: 8,
    padding: '6px 12px',
  },
  batchLabel: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: "'Fira Code', monospace",
  },
  batchInput: {
    width: 56,
    background: '#1A1A2E',
    border: '1px solid #333',
    borderRadius: 4,
    color: '#E0E0E0',
    padding: '4px 6px',
    fontSize: 12,
    fontFamily: "'Fira Code', monospace",
    textAlign: 'center' as const,
  },
  batchSlider: {
    width: 60,
    accentColor: '#4A9EFF',
  },
  batchDurLabel: {
    fontSize: 12,
    color: '#E0E0E0',
    fontFamily: "'Fira Code', monospace",
  },
  applyBtn: {
    background: '#51CF66',
    color: '#1A1A2E',
    border: 'none',
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 12,
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  cancelBtn: {
    background: 'transparent',
    color: '#FF6B6B',
    border: '1px solid #FF6B6B',
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 12,
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  linesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: 16,
  },
  lineRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '8px 12px',
    transition: 'background 0.2s',
  },
  lineLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  selectBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    border: '1px solid #555',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  checkMark: {
    color: '#51CF66',
    fontSize: 12,
    fontWeight: 700,
  },
  beatDot: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
  lineContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  lineInputWrapper: {
    flex: 1,
    position: 'relative' as const,
  },
  lineInput: {
    width: '100%',
    background: '#0F3460',
    border: '1px solid #333',
    borderRadius: 8,
    color: '#E0E0E0',
    padding: '8px 12px',
    fontSize: 14,
    fontFamily: "'Fira Code', monospace",
    lineHeight: 1.8,
    resize: 'none' as const,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  remoteCursor: {
    position: 'absolute' as const,
    width: 2,
    height: 24,
    top: 8,
    left: 12,
    animation: 'blink 0.5s infinite',
    borderRadius: 1,
    zIndex: 10,
  },
  warnIcon: {
    color: '#FF6B6B',
    fontSize: 16,
    flexShrink: 0,
  },
  removeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#555',
    fontSize: 18,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'color 0.2s',
    lineHeight: 1,
  },
  empty: {
    textAlign: 'center' as const,
    color: '#555',
    padding: 48,
    fontSize: 14,
    fontFamily: "'Fira Code', monospace",
  },
  beatEditor: {
    marginTop: 8,
    padding: 12,
    background: '#0F3460',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  beatRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  beatLabel: {
    fontSize: 12,
    color: '#aaa',
    width: 36,
    fontFamily: "'Fira Code', monospace",
  },
  bpmInput: {
    width: 64,
    background: '#1A1A2E',
    border: '1px solid #333',
    borderRadius: 4,
    color: '#E0E0E0',
    padding: '4px 8px',
    fontSize: 13,
    fontFamily: "'Fira Code', monospace",
    textAlign: 'center' as const,
  },
  durBtns: {
    display: 'flex',
    gap: 4,
  },
  durBtn: {
    border: 'none',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 11,
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  durSlider: {
    flex: 1,
    accentColor: '#4A9EFF',
  },
  durValue: {
    fontSize: 12,
    color: '#E0E0E0',
    width: 48,
    textAlign: 'right' as const,
    fontFamily: "'Fira Code', monospace",
  },
  beatActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end' as const,
    marginTop: 4,
  },
  saveBtn: {
    background: '#51CF66',
    color: '#1A1A2E',
    border: 'none',
    borderRadius: 4,
    padding: '6px 14px',
    fontSize: 12,
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
};
