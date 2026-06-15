import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { LyricLine, RemoteUser } from './App';

interface TimelineProps {
  lyrics: LyricLine[];
  users: RemoteUser[];
}

interface TimelineBlock {
  lineId: string;
  text: string;
  color: string;
  startSec: number;
  endSec: number;
  bpm: number;
  duration: number;
}

function computeTimeline(lyrics: LyricLine[], users: RemoteUser[]): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];
  let currentTime = 0;
  const colorMap: Record<string, string> = {};
  users.forEach((u) => (colorMap[u.userId] = u.color));

  for (const line of lyrics) {
    if (!line.beat || !line.text.trim()) continue;
    const { bpm, duration } = line.beat;
    const beatDurationSec = 60 / bpm;
    const lineDurationSec = duration * beatDurationSec;
    const userColor = Object.values(colorMap)[0] || '#4A9EFF';
    blocks.push({
      lineId: line.id,
      text: line.text,
      color: userColor,
      startSec: currentTime,
      endSec: currentTime + lineDurationSec,
      bpm,
      duration,
    });
    currentTime += lineDurationSec;
  }
  return blocks;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}

function formatLRC(blocks: TimelineBlock[]): string {
  return blocks
    .map((b) => {
      const start = formatTime(b.startSec);
      const end = formatTime(b.endSec);
      return `[${start}]${b.text}[${end}]`;
    })
    .join('\n');
}

function formatJSON(blocks: TimelineBlock[]): string {
  const data = blocks.map((b) => ({
    text: b.text,
    start: Math.round(b.startSec * 100) / 100,
    end: Math.round(b.endSec * 100) / 100,
    bpm: b.bpm,
  }));
  return JSON.stringify(data, null, 2);
}

export default function Timeline({ lyrics, users }: TimelineProps) {
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [hoverBlock, setHoverBlock] = useState<TimelineBlock | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showExport, setShowExport] = useState(false);
  const [exportTab, setExportTab] = useState<'lrc' | 'json'>('lrc');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(0);
  const [panStartOffset, setPanStartOffset] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const lastRenderRef = useRef(0);

  const blocks = useMemo(() => computeTimeline(lyrics, users), [lyrics, users]);

  const totalDuration = useMemo(() => {
    if (blocks.length === 0) return 10;
    return blocks[blocks.length - 1].endSec;
  }, [blocks]);

  const pxPerSec = 100 * zoom;

  const hasUnannotated = lyrics.some((l) => l.text.trim() && !l.beat);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setCollapsed(isMobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsPanning(true);
      setPanStart(e.clientX);
      setPanStartOffset(panOffset);
    },
    [panOffset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const delta = e.clientX - panStart;
        setPanOffset(panStartOffset + delta);
      }
      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + panOffset;
        const sec = x / pxPerSec;
        const found = blocks.find((b) => sec >= b.startSec && sec <= b.endSec);
        if (found) {
          setHoverBlock(found);
          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top - 50 });
        } else {
          setHoverBlock(null);
        }
      }
    },
    [isPanning, panStart, panStartOffset, pxPerSec, blocks, panOffset]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    const onUp = () => setIsPanning(false);
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  const handleZoom = useCallback((val: number) => {
    setZoom(val);
  }, []);

  const handleExport = useCallback(() => {
    if (hasUnannotated) return;
    setShowExport(true);
    setExportTab('lrc');
  }, [hasUnannotated]);

  const lrcContent = useMemo(() => formatLRC(blocks), [blocks]);
  const jsonContent = useMemo(() => formatJSON(blocks), [blocks]);

  const handleDownload = useCallback(
    (type: 'lrc' | 'json') => {
      const content = type === 'lrc' ? lrcContent : jsonContent;
      const ext = type === 'lrc' ? 'lrc' : 'json';
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lyrics.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [lrcContent, jsonContent]
  );

  const gridMarks = useMemo(() => {
    const marks: number[] = [];
    const step = zoom >= 2 ? 1 : zoom >= 1 ? 2 : 5;
    for (let s = 0; s <= totalDuration; s += step) {
      marks.push(s);
    }
    return marks;
  }, [totalDuration, zoom]);

  if (collapsed) {
    return (
      <div style={styles.collapsedContainer}>
        <button style={styles.expandBtn} onClick={() => setCollapsed(false)}>
          ▲ 展开时间轴
        </button>
        {showExport && (
          <ExportModal
            lrcContent={lrcContent}
            jsonContent={jsonContent}
            exportTab={exportTab}
            setExportTab={setExportTab}
            onDownload={handleDownload}
            onClose={() => setShowExport(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.controls}>
        <div style={styles.zoomControl}>
          <span style={styles.zoomLabel}>缩放</span>
          <input
            type="range"
            style={styles.zoomSlider}
            min={0.5}
            max={4}
            step={0.1}
            value={zoom}
            onChange={(e) => handleZoom(Number(e.target.value))}
          />
          <span style={styles.zoomValue}>{zoom.toFixed(1)}x</span>
        </div>
        <button style={styles.panResetBtn} onClick={() => setPanOffset(0)}>
          重置平移
        </button>
        <button
          style={{
            ...styles.exportBtn,
            opacity: hasUnannotated ? 0.5 : 1,
            cursor: hasUnannotated ? 'not-allowed' : 'pointer',
          }}
          onClick={handleExport}
          title={hasUnannotated ? '存在未标注节拍的歌词行' : '导出歌词文件'}
        >
          导出
        </button>
        {hasUnannotated && (
          <span style={styles.warnText}>⚠ 有未标注行</span>
        )}
        <button style={styles.collapseBtn} onClick={() => setCollapsed(true)}>
          ▼ 折叠
        </button>
      </div>
      <div
        ref={timelineRef}
        style={styles.timeline}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setHoverBlock(null); setIsPanning(false); }}
      >
        <div
          style={{
            ...styles.track,
            width: totalDuration * pxPerSec,
            transform: `translateX(${-panOffset}px)`,
            transition: isPanning ? 'none' : 'transform 0.3s ease',
          }}
        >
          {gridMarks.map((s) => (
            <div
              key={s}
              style={{
                ...styles.gridMark,
                left: s * pxPerSec,
              }}
            >
              <div style={styles.gridLine} />
              <span style={styles.gridLabel}>{formatTime(s)}</span>
            </div>
          ))}
          {blocks.map((block, i) => (
            <div
              key={block.lineId}
              style={{
                ...styles.block,
                left: block.startSec * pxPerSec,
                width: (block.endSec - block.startSec) * pxPerSec,
                background: block.color,
                opacity: 0.8,
              }}
              onMouseEnter={() => setHoverBlock(block)}
              onMouseLeave={() => setHoverBlock(null)}
            >
              <span style={styles.blockText}>
                {block.text.substring(0, 20)}
                {block.text.length > 20 ? '...' : ''}
              </span>
            </div>
          ))}
        </div>
        {hoverBlock && (
          <div
            style={{
              ...styles.tooltip,
              left: tooltipPos.x,
              top: tooltipPos.y,
            }}
          >
            <div style={styles.tooltipText}>{hoverBlock.text}</div>
            <div style={styles.tooltipMeta}>
              BPM: {hoverBlock.bpm} | {hoverBlock.duration}拍 |{' '}
              {formatTime(hoverBlock.startSec)} → {formatTime(hoverBlock.endSec)}
            </div>
          </div>
        )}
      </div>
      {blocks.length === 0 && (
        <div style={styles.empty}>标注节拍后，时间轴将在此显示</div>
      )}
      {showExport && (
        <ExportModal
          lrcContent={lrcContent}
          jsonContent={jsonContent}
          exportTab={exportTab}
          setExportTab={setExportTab}
          onDownload={handleDownload}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}

interface ExportModalProps {
  lrcContent: string;
  jsonContent: string;
  exportTab: 'lrc' | 'json';
  setExportTab: (tab: 'lrc' | 'json') => void;
  onDownload: (type: 'lrc' | 'json') => void;
  onClose: () => void;
}

function ExportModal({
  lrcContent,
  jsonContent,
  exportTab,
  setExportTab,
  onDownload,
  onClose,
}: ExportModalProps) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>导出歌词文件</h2>
          <button style={styles.modalClose} onClick={onClose}>×</button>
        </div>
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              background: exportTab === 'lrc' ? '#4A9EFF' : '#0F3460',
              color: exportTab === 'lrc' ? '#fff' : '#aaa',
            }}
            onClick={() => setExportTab('lrc')}
          >
            LRC 格式
          </button>
          <button
            style={{
              ...styles.tab,
              background: exportTab === 'json' ? '#4A9EFF' : '#0F3460',
              color: exportTab === 'json' ? '#fff' : '#aaa',
            }}
            onClick={() => setExportTab('json')}
          >
            JSON 格式
          </button>
        </div>
        <textarea
          style={styles.previewArea}
          value={exportTab === 'lrc' ? lrcContent : jsonContent}
          readOnly
        />
        <div style={styles.modalActions}>
          <button
            style={styles.downloadBtn}
            onClick={() => onDownload(exportTab)}
          >
            下载 {exportTab.toUpperCase()} 文件
          </button>
          <button style={styles.cancelBtnModal} onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#16213E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderBottom: '1px solid #0F3460',
    flexWrap: 'wrap' as const,
  },
  zoomControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  zoomLabel: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: "'Fira Code', monospace",
  },
  zoomSlider: {
    width: 100,
    accentColor: '#4A9EFF',
  },
  zoomValue: {
    fontSize: 12,
    color: '#E0E0E0',
    fontFamily: "'Fira Code', monospace",
    width: 36,
  },
  panResetBtn: {
    background: '#0F3460',
    color: '#aaa',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 12,
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  exportBtn: {
    background: '#51CF66',
    color: '#1A1A2E',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  warnText: {
    color: '#FF6B6B',
    fontSize: 11,
    fontFamily: "'Fira Code', monospace",
  },
  collapseBtn: {
    background: 'transparent',
    border: '1px solid #555',
    color: '#888',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 12,
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  timeline: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative' as const,
    cursor: 'grab',
    minHeight: 180,
  },
  track: {
    position: 'relative',
    height: '100%',
    minHeight: 160,
  },
  gridMark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  gridLine: {
    width: 1,
    height: '100%',
    background: 'rgba(255,255,255,0.06)',
  },
  gridLabel: {
    position: 'absolute',
    top: 4,
    left: 4,
    fontSize: 10,
    color: '#555',
    fontFamily: "'Fira Code', monospace",
  },
  block: {
    position: 'absolute',
    top: 28,
    height: 40,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 8,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
  },
  blockText: {
    fontSize: 11,
    color: '#1A1A2E',
    fontFamily: "'Fira Code', monospace",
    fontWeight: 600,
    textShadow: '0 1px 2px rgba(255,255,255,0.3)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  tooltip: {
    position: 'absolute',
    background: '#0F3460',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '8px 12px',
    pointerEvents: 'none',
    zIndex: 20,
    maxWidth: 300,
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
  },
  tooltipText: {
    fontSize: 13,
    color: '#E0E0E0',
    fontFamily: "'Fira Code', monospace",
    marginBottom: 4,
  },
  tooltipMeta: {
    fontSize: 11,
    color: '#888',
    fontFamily: "'Fira Code', monospace",
  },
  empty: {
    textAlign: 'center' as const,
    color: '#555',
    padding: 32,
    fontSize: 13,
    fontFamily: "'Fira Code', monospace",
  },
  collapsedContainer: {
    background: '#16213E',
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  expandBtn: {
    background: '#0F3460',
    color: '#aaa',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 12,
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: '#16213E',
    borderRadius: 8,
    padding: 24,
    width: '90%',
    maxWidth: 640,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    color: '#E0E0E0',
    fontFamily: "'Fira Code', monospace",
  },
  modalClose: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: 24,
    cursor: 'pointer',
    lineHeight: 1,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    border: 'none',
    borderRadius: 4,
    padding: '6px 16px',
    fontSize: 12,
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  previewArea: {
    flex: 1,
    minHeight: 200,
    background: '#0F3460',
    border: '1px solid #333',
    borderRadius: 8,
    color: '#E0E0E0',
    padding: 12,
    fontSize: 12,
    fontFamily: "'Fira Code', monospace",
    lineHeight: 1.6,
    resize: 'none' as const,
    outline: 'none',
    marginBottom: 16,
  },
  modalActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end' as const,
  },
  downloadBtn: {
    background: '#51CF66',
    color: '#1A1A2E',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontSize: 13,
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cancelBtnModal: {
    background: 'transparent',
    color: '#888',
    border: '1px solid #555',
    borderRadius: 8,
    padding: '10px 20px',
    fontSize: 13,
    fontFamily: "'Fira Code', monospace",
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
};
