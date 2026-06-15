import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { SubtitleItem, formatTimeDisplay, roundToTenth } from '../utils/subtitleParser';

interface TimelineEditorProps {
  videoDuration: number;
  currentTime: number;
  subtitles: SubtitleItem[];
  selectedSubtitleId: string | null;
  highlightId: string | null;
  zoomLevel: number;
  onSeek: (time: number) => void;
  onPlayPause: () => void;
  isPlaying: boolean;
  onUpdateSubtitle: (id: string, updates: Partial<SubtitleItem>) => void;
  onSelectSubtitle: (id: string | null) => void;
  onSplitSubtitle: (id: string, splitTime: number) => void;
  onAddSubtitle: (startTime?: number, endTime?: number) => void;
}

type DragMode = 'none' | 'start' | 'end' | 'move';

interface DragState {
  mode: DragMode;
  subtitleId: string;
  startX: number;
  originalStart: number;
  originalEnd: number;
  startTime: number;
  endTime: number;
}

const PIXELS_PER_SECOND_BASE = 100;
const WAVEFORM_HEIGHT = 60;
const RULER_HEIGHT = 30;
const SUBTITLE_BLOCK_HEIGHT = 40;

export default function TimelineEditor({
  videoDuration,
  currentTime,
  subtitles,
  selectedSubtitleId,
  highlightId,
  zoomLevel,
  onSeek,
  onPlayPause,
  isPlaying,
  onUpdateSubtitle,
  onSelectSubtitle,
  onSplitSubtitle,
  onAddSubtitle
}: TimelineEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; time: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const pixelsPerSecond = PIXELS_PER_SECOND_BASE * zoomLevel;
  const totalWidth = Math.max(containerWidth, videoDuration * pixelsPerSecond + 100);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', updateWidth);
      observer.disconnect();
    };
  }, []);

  const waveformData = useMemo(() => {
    const samples = Math.min(2000, Math.floor(videoDuration * 50));
    const data: number[] = [];
    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      const base = 0.3 + Math.sin(t * Math.PI * 4) * 0.1;
      const variation = Math.random() * 0.4;
      const pulse = Math.sin(t * 50) * Math.exp(-t * 2) * 0.3;
      data.push(Math.min(1, Math.max(0.05, base + variation + pulse)));
    }
    return data;
  }, [videoDuration]);

  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalWidth * dpr;
    canvas.height = WAVEFORM_HEIGHT * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${WAVEFORM_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, totalWidth, WAVEFORM_HEIGHT);

    const sampleCount = waveformData.length;
    const barWidth = Math.max(1, totalWidth / sampleCount);
    const centerY = WAVEFORM_HEIGHT / 2;

    for (let i = 0; i < sampleCount; i++) {
      const x = (i / sampleCount) * totalWidth;
      const amplitude = waveformData[i];
      const barHeight = amplitude * (WAVEFORM_HEIGHT - 10);

      const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
      gradient.addColorStop(0, '#4A90D9');
      gradient.addColorStop(0.5, '#5BA3E8');
      gradient.addColorStop(1, '#4A90D9');
      ctx.fillStyle = gradient;

      ctx.fillRect(
        x,
        centerY - barHeight / 2,
        barWidth * 0.8,
        barHeight
      );
    }

    const progressX = currentTime * pixelsPerSecond;
    ctx.fillStyle = 'rgba(30, 144, 255, 0.15)';
    ctx.fillRect(0, 0, progressX, WAVEFORM_HEIGHT);
  }, [waveformData, totalWidth, currentTime, pixelsPerSecond]);

  useEffect(() => {
    if (selectedSubtitleId && scrollRef.current) {
      const sub = subtitles.find(s => s.id === selectedSubtitleId);
      if (sub) {
        const blockCenter = (sub.startTime + sub.endTime) / 2 * pixelsPerSecond;
        const viewportCenter = scrollRef.current.clientWidth / 2;
        const targetScroll = Math.max(0, blockCenter - viewportCenter);
        scrollRef.current.scrollTo({
          left: targetScroll,
          behavior: 'smooth'
        });
      }
    }
  }, [selectedSubtitleId, subtitles, pixelsPerSecond]);

  const timeToX = useCallback((time: number) => time * pixelsPerSecond, [pixelsPerSecond]);
  const xToTime = useCallback((x: number) => Math.max(0, x / pixelsPerSecond), [pixelsPerSecond]);

  const getMouseX = useCallback((e: React.MouseEvent | MouseEvent) => {
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return (e.clientX - rect.left) + (scrollRef.current?.scrollLeft || 0);
  }, []);

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    mode: DragMode,
    subtitle: SubtitleItem
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectSubtitle(subtitle.id);

    const startX = getMouseX(e);
    setDragState({
      mode,
      subtitleId: subtitle.id,
      startX,
      originalStart: subtitle.startTime,
      originalEnd: subtitle.endTime,
      startTime: subtitle.startTime,
      endTime: subtitle.endTime
    });
  }, [getMouseX, onSelectSubtitle]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !scrollRef.current) return;

    const currentX = getMouseX(e);
    const deltaTime = xToTime(currentX - dragState.startX);
    const roundedDelta = roundToTenth(deltaTime);

    let newStart = dragState.originalStart;
    let newEnd = dragState.originalEnd;

    switch (dragState.mode) {
      case 'start':
        newStart = Math.max(0, Math.min(dragState.originalEnd - 0.1, dragState.originalStart + roundedDelta));
        break;
      case 'end':
        newEnd = Math.max(dragState.originalStart + 0.1, dragState.originalEnd + roundedDelta);
        break;
      case 'move': {
        const duration = dragState.originalEnd - dragState.originalStart;
        newStart = Math.max(0, dragState.originalStart + roundedDelta);
        newEnd = newStart + duration;
        break;
      }
    }

    setDragState(prev => prev ? { ...prev, startTime: newStart, endTime: newEnd } : null);
    setTooltip({ x: e.clientX, time: (dragState.mode === 'start' ? newStart : newEnd) });
    onUpdateSubtitle(dragState.subtitleId, { startTime: newStart, endTime: newEnd });
  }, [dragState, getMouseX, xToTime, onUpdateSubtitle]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
    setTooltip(null);
  }, []);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0);
    const time = xToTime(x);
    onSeek(time);
    onSelectSubtitle(null);
  }, [xToTime, onSeek, onSelectSubtitle]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0);
    const time = xToTime(x);

    const clickedSub = subtitles.find(sub =>
      time >= sub.startTime && time <= sub.endTime &&
      e.clientY - rect.top > RULER_HEIGHT + WAVEFORM_HEIGHT
    );

    if (clickedSub) {
      onSplitSubtitle(clickedSub.id, time);
    } else {
      onAddSubtitle(time, time + 2);
    }
  }, [subtitles, xToTime, onSplitSubtitle, onAddSubtitle]);

  const renderRuler = () => {
    const markers: JSX.Element[] = [];
    const step = zoomLevel >= 2 ? 1 : (zoomLevel >= 1 ? 2 : 5);
    for (let t = 0; t <= videoDuration; t += step) {
      const x = timeToX(t);
      const isMajor = t % (step * 5) === 0 || step <= 1;
      markers.push(
        <div key={t} style={{
          position: 'absolute',
          left: x,
          top: 0,
          height: RULER_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          pointerEvents: 'none'
        }}>
          <div style={{
            width: 1,
            height: isMajor ? 16 : 8,
            backgroundColor: isMajor ? '#666' : '#444',
            marginLeft: 0
          }} />
          {isMajor && (
            <span style={{
              fontSize: '10px',
              color: '#888',
              paddingLeft: 4,
              whiteSpace: 'nowrap',
              marginTop: 2
            }}>
              {formatTimeDisplay(t)}
            </span>
          )}
        </div>
      );
    }
    return markers;
  };

  const sortedSubtitles = useMemo(
    () => [...subtitles].sort((a, b) => a.startTime - b.startTime),
    [subtitles]
  );

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.controlsRow}>
        <button style={styles.playPauseBtn} onClick={onPlayPause}>
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
        <div style={styles.timeDisplay}>
          <span style={styles.currentTime}>{formatTimeDisplay(currentTime)}</span>
          <span style={styles.timeSeparator}> / </span>
          <span style={styles.duration}>{formatTimeDisplay(videoDuration)}</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        style={styles.scrollContainer}
        onClick={handleTimelineClick}
        onDoubleClick={handleDoubleClick}
      >
        <div style={{ ...styles.content, width: totalWidth }}>
          <div style={styles.ruler}>
            {renderRuler()}
          </div>

          <div style={styles.waveformContainer}>
            <canvas
              ref={waveformCanvasRef}
              style={{ display: 'block' }}
            />
          </div>

          <div style={styles.trackContainer}>
            {sortedSubtitles.map((sub, index) => {
              const left = timeToX(sub.startTime);
              const width = timeToX(sub.endTime - sub.startTime);
              const isSelected = selectedSubtitleId === sub.id;
              const isHighlighted = highlightId === sub.id;
              const isTranslated = sub.isTranslated && sub.translation;

              return (
                <div
                  key={sub.id}
                  style={{
                    ...styles.subtitleBlock,
                    left,
                    width: Math.max(10, width),
                    backgroundColor: isSelected ? '#FF8C00' : isTranslated ? '#90EE9050' : '#1E90FF40',
                    borderColor: isSelected ? '#FFA500' : isTranslated ? '#90EE90' : '#1E90FF80',
                    boxShadow: isSelected ? '0 0 0 2px rgba(255, 140, 0, 0.4)' : 'none',
                    animation: isHighlighted ? 'highlight 0.3s ease' : 'none'
                  }}
                  onMouseDown={(e) => handleMouseDown(e, 'move', sub)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSubtitle(sub.id);
                  }}
                  title={`字幕 ${index + 1}: ${sub.text}`}
                >
                  <div
                    style={styles.resizeHandleLeft}
                    onMouseDown={(e) => handleMouseDown(e, 'start', sub)}
                  />

                  <div style={styles.subtitleContent}>
                    <span style={styles.subtitleIndex}>#{index + 1}</span>
                    <span style={styles.subtitleText}>
                      {isTranslated ? (sub.translation || sub.text) : sub.text}
                    </span>
                  </div>

                  <div
                    style={styles.resizeHandleRight}
                    onMouseDown={(e) => handleMouseDown(e, 'end', sub)}
                  />
                </div>
              );
            })}
          </div>

          <div
            style={{
              ...styles.playhead,
              left: timeToX(currentTime)
            }}
          >
            <div style={styles.playheadLine} />
            <div style={styles.playheadHandle} />
          </div>
        </div>
      </div>

      {tooltip && (
        <div style={{
          ...styles.tooltip,
          left: tooltip.x + 12
        }}>
          {formatTimeDisplay(tooltip.time)}
        </div>
      )}

      <style>{`
        @keyframes highlight {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; box-shadow: 0 0 20px rgba(30, 144, 255, 0.8); }
        }
        * {
          user-select: none;
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#252526',
    height: '100%',
    minHeight: '200px',
    position: 'relative',
    overflow: 'hidden'
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    borderBottom: '1px solid #3D3D3D',
    backgroundColor: '#2D2D2D'
  },
  playPauseBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    backgroundColor: '#1E90FF',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.1s ease'
  },
  timeDisplay: {
    display: 'flex',
    alignItems: 'center',
    fontFamily: 'monospace',
    fontSize: '13px'
  },
  currentTime: {
    color: '#1E90FF',
    fontWeight: 600
  },
  timeSeparator: {
    color: '#666'
  },
  duration: {
    color: '#888'
  },
  scrollContainer: {
    flex: 1,
    overflowX: 'auto',
    overflowY: 'hidden',
    cursor: 'pointer',
    position: 'relative'
  },
  content: {
    position: 'relative',
    height: '100%',
    minHeight: RULER_HEIGHT + WAVEFORM_HEIGHT + SUBTITLE_BLOCK_HEIGHT + 20
  },
  ruler: {
    position: 'relative',
    height: RULER_HEIGHT,
    backgroundColor: '#1E1E1E',
    borderBottom: '1px solid #3D3D3D'
  },
  waveformContainer: {
    position: 'relative',
    height: WAVEFORM_HEIGHT,
    backgroundColor: '#1A1A1A',
    borderBottom: '1px solid #3D3D3D',
    overflow: 'hidden'
  },
  trackContainer: {
    position: 'relative',
    height: SUBTITLE_BLOCK_HEIGHT + 20,
    padding: '10px 0'
  },
  subtitleBlock: {
    position: 'absolute',
    height: SUBTITLE_BLOCK_HEIGHT,
    borderRadius: '6px',
    border: '2px solid',
    cursor: 'grab',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    transition: 'box-shadow 0.15s ease, transform 0.15s ease',
    boxSizing: 'border-box'
  },
  resizeHandleLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '6px',
    cursor: 'ew-resize',
    backgroundColor: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  resizeHandleRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '6px',
    cursor: 'ew-resize',
    backgroundColor: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  subtitleContent: {
    flex: 1,
    padding: '4px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflow: 'hidden'
  },
  subtitleIndex: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 600,
    flexShrink: 0
  },
  subtitleText: {
    fontSize: '12px',
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '2px',
    pointerEvents: 'none',
    zIndex: 100
  },
  playheadLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '-1px',
    width: '2px',
    backgroundColor: '#FF4444',
    boxShadow: '0 0 4px rgba(255, 68, 68, 0.6)'
  },
  playheadHandle: {
    position: 'absolute',
    top: -2,
    left: '-6px',
    width: '14px',
    height: '14px',
    backgroundColor: '#FF4444',
    borderRadius: '0 0 50% 50%',
    transform: 'rotate(180deg)',
    clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
  },
  tooltip: {
    position: 'fixed',
    top: '50%',
    transform: 'translateY(-50%)',
    padding: '4px 10px',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    color: '#fff',
    fontSize: '12px',
    fontFamily: 'monospace',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: 1000,
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
  }
};
