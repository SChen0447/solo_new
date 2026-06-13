import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine, NoteEvent } from './AudioEngine';
import ParticleCanvas, { ParticleCanvasHandle } from './ParticleCanvas';

const ROWS = 5;
const COLS = 10;
const TOTAL_CELLS = ROWS * COLS;

const THEMES = [
  { name: '霓虹红', color: '#ff3366', glow: 'rgba(255, 51, 102, 0.6)' },
  { name: '电光青', color: '#00f0ff', glow: 'rgba(0, 240, 255, 0.6)' },
  { name: '梦幻紫', color: '#b44dff', glow: 'rgba(180, 77, 255, 0.6)' }
];

const CELL_BASE_COLOR = 'rgba(50, 80, 140, 0.25)';
const CELL_HOVER_COLOR = 'rgba(80, 130, 220, 0.4)';

export default function App() {
  const audioEngineRef = useRef<AudioEngine>(new AudioEngine());
  const particleRef = useRef<ParticleCanvasHandle>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCellsRef = useRef<Map<number, number>>(new Map());
  const wavePulseRef = useRef<number>(0);
  const animRef = useRef<number>(0);
  const playbackEndRef = useRef<number>(0);

  const [themeIndex, setThemeIndex] = useState(1);
  const theme = THEMES[themeIndex];

  const [activeCells, setActiveCells] = useState<Set<number>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedEvents, setRecordedEvents] = useState<NoteEvent[]>([]);

  const handleCellTrigger = useCallback((noteId: number, clientX?: number, clientY?: number) => {
    const engine = audioEngineRef.current;
    engine.init();
    engine.resume();
    engine.playNote(noteId);

    setActiveCells((prev) => {
      const next = new Set(prev);
      next.add(noteId);
      return next;
    });
    activeCellsRef.current.set(noteId, performance.now());
    wavePulseRef.current = 1;

    const cellEl = document.querySelector<HTMLElement>(`[data-note-id="${noteId}"]`);
    if (cellEl && clientX !== undefined && clientY !== undefined) {
      particleRef.current?.emitParticles(clientX, clientY, theme.color);
    } else if (cellEl) {
      const rect = cellEl.getBoundingClientRect();
      particleRef.current?.emitParticles(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        theme.color
      );
    }

    const expireAt = performance.now() + 500;
    setTimeout(() => {
      setActiveCells((prev) => {
        const next = new Set(prev);
        const t = activeCellsRef.current.get(noteId);
        if (t && performance.now() - t >= 490) {
          next.delete(noteId);
        }
        return next;
      });
      activeCellsRef.current.delete(noteId);
    }, expireAt - performance.now() + 10);
  }, [theme.color]);

  const handleCellClick = useCallback((noteId: number, e: React.MouseEvent) => {
    handleCellTrigger(noteId, e.clientX, e.clientY);
  }, [handleCellTrigger]);

  const toggleRecord = () => {
    const engine = audioEngineRef.current;
    engine.init();
    engine.resume();

    if (isRecording) {
      const events = engine.stopRecording();
      setRecordedEvents(events);
      setIsRecording(false);
    } else {
      if (engine.getIsPlayingBack()) {
        engine.stopPlayback();
        setIsPlaying(false);
      }
      engine.startRecording();
      setIsRecording(true);
      setRecordedEvents([]);
    }
  };

  const togglePlay = () => {
    const engine = audioEngineRef.current;
    engine.init();
    engine.resume();

    if (engine.getIsPlayingBack()) {
      engine.stopPlayback();
      setIsPlaying(false);
      playbackEndRef.current = 0;
      return;
    }

    if (!recordedEvents.length) return;

    if (isRecording) {
      engine.stopRecording();
      setIsRecording(false);
    }

    setIsPlaying(true);
    const lastEvent = recordedEvents[recordedEvents.length - 1];
    playbackEndRef.current = performance.now() + lastEvent.timestamp + 800;

    engine.startPlayback(recordedEvents, (noteId) => {
      handleCellTrigger(noteId);
    });
  };

  useEffect(() => {
    const waveformCanvas = waveformCanvasRef.current;
    if (!waveformCanvas) return;

    const ctx = waveformCanvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = waveformCanvas.getBoundingClientRect();
      waveformCanvas.width = rect.width * dpr;
      waveformCanvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(waveformCanvas);

    const buffer = new Uint8Array(1024);
    let lastFrameTime = performance.now();

    const draw = () => {
      const now = performance.now();
      const dt = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      if (setIsPlaying && playbackEndRef.current && now > playbackEndRef.current && audioEngineRef.current.getIsPlayingBack()) {
        audioEngineRef.current.stopPlayback();
        setIsPlaying(false);
        playbackEndRef.current = 0;
      }

      const w = waveformCanvas.clientWidth;
      const h = waveformCanvas.clientHeight;

      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
      bg.addColorStop(0, 'rgba(20, 30, 60, 0.4)');
      bg.addColorStop(1, 'rgba(10, 10, 26, 0.1)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const engine = audioEngineRef.current;
      engine.getWaveformData(buffer);

      wavePulseRef.current = Math.max(0, wavePulseRef.current - dt * 1.2);

      const midY = h / 2;
      const pulseBoost = wavePulseRef.current;

      const lineGrad = ctx.createLinearGradient(0, 0, w, 0);
      lineGrad.addColorStop(0, '#2a6fff');
      lineGrad.addColorStop(0.5, '#7a5cff');
      lineGrad.addColorStop(1, '#b44dff');

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = lineGrad;
      ctx.shadowColor = 'rgba(120, 100, 255, 0.8)';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      const slice = w / buffer.length;
      for (let i = 0; i < buffer.length; i++) {
        const v = buffer[i] / 128 - 1;
        const amp = (h / 2 - 20) * (0.25 + pulseBoost * 0.75);
        const y = midY + v * amp;
        const x = i * slice;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = lineGrad;
      ctx.beginPath();
      for (let i = 0; i < buffer.length; i++) {
        const v = buffer[i] / 128 - 1;
        const amp = (h / 2 - 20) * (0.15 + pulseBoost * 0.55);
        const y = midY - v * amp - 8;
        const x = i * slice;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      audioEngineRef.current.dispose();
    };
  }, []);

  const themeColors = {
    color: theme.color,
    transition: 'background-color 0.3s ease, box-shadow 0.3s ease, transform 0.12s ease, border-color 0.3s ease, color 0.3s ease'
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0a1a',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 20% 30%, ${theme.glow} 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, ${theme.glow} 0%, transparent 50%)
          `,
          opacity: 0.15,
          transition: 'opacity 0.3s ease, background 0.3s ease',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          zIndex: 5,
          pointerEvents: 'none'
        }}
      >
        {isRecording && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 18px',
              background: 'rgba(255, 51, 102, 0.15)',
              border: '1px solid rgba(255, 51, 102, 0.5)',
              borderRadius: 999,
              backdropFilter: 'blur(8px)',
              animation: 'recordingPulse 1s ease-in-out infinite'
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#ff3366',
                boxShadow: '0 0 12px #ff3366, 0 0 24px rgba(255, 51, 102, 0.6)',
                animation: 'recordingBlink 0.8s ease-in-out infinite'
              }}
            />
            <span style={{ color: '#ff99aa', fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>
              RECORDING
            </span>
          </div>
        )}
        {isPlaying && !isRecording && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 18px',
              background: `rgba(${parseInt(theme.color.slice(1, 3), 16)}, ${parseInt(theme.color.slice(3, 5), 16)}, ${parseInt(theme.color.slice(5, 7), 16)}, 0.15)`,
              border: `1px solid ${theme.glow}`,
              borderRadius: 999,
              backdropFilter: 'blur(8px)'
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: theme.color,
                boxShadow: `0 0 12px ${theme.color}`
              }}
            />
            <span style={{ color: theme.color, fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>
              PLAYING
            </span>
          </div>
        )}
      </div>

      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 8,
          marginBottom: 24,
          background: `linear-gradient(135deg, ${theme.color}, #ffffff)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: `0 0 40px ${theme.glow}`,
          transition: 'background 0.3s ease, text-shadow 0.3s ease',
          zIndex: 2,
          userSelect: 'none'
        }}
      >
        节 奏 律 动 墙
      </h1>

      <div
        style={{
          display: 'flex',
          gap: 32,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          flexWrap: 'wrap',
          maxWidth: '100%'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, 64px)`,
            gridTemplateRows: `repeat(${ROWS}, 64px)`,
            gap: 8,
            padding: 24,
            background: 'rgba(20, 25, 50, 0.5)',
            border: `1px solid ${theme.glow.replace('0.6', '0.15')}`,
            borderRadius: 20,
            backdropFilter: 'blur(12px)',
            boxShadow: `0 0 60px ${theme.glow.replace('0.6', '0.08')}, inset 0 0 40px rgba(0,0,0,0.3)`,
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
          }}
        >
          {Array.from({ length: TOTAL_CELLS }).map((_, idx) => {
            const isActive = activeCells.has(idx);
            const row = Math.floor(idx / COLS);
            return (
              <button
                key={idx}
                data-note-id={idx}
                onClick={(e) => handleCellClick(idx, e)}
                onMouseDown={(e) => e.preventDefault()}
                style={{
                  position: 'relative',
                  width: 64,
                  height: 64,
                  border: '1px solid',
                  borderColor: isActive ? theme.color : 'rgba(80, 120, 200, 0.2)',
                  borderRadius: 10,
                  background: isActive ? theme.color : CELL_BASE_COLOR,
                  cursor: 'pointer',
                  outline: 'none',
                  transform: isActive ? 'scale(1.12)' : 'scale(1)',
                  transition: themeColors.transition,
                  boxShadow: isActive
                    ? `0 0 24px ${theme.color}, 0 0 48px ${theme.glow}, inset 0 0 16px rgba(255,255,255,0.3)`
                    : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                  overflow: 'hidden',
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = CELL_HOVER_COLOR;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `inset 0 0 20px ${theme.glow.replace('0.6', '0.25')}`;
                    (e.currentTarget as HTMLButtonElement).style.borderColor = theme.glow.replace('0.6', '0.35');
                  }
                }}
                onMouseLeave={(e) => {
                  if (!activeCells.has(idx)) {
                    (e.currentTarget as HTMLButtonElement).style.background = CELL_BASE_COLOR;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(80, 120, 200, 0.2)';
                  }
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(135deg, rgba(255,255,255,${isActive ? 0.25 : 0.04}) 0%, transparent 60%)`,
                    borderRadius: 9,
                    pointerEvents: 'none'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 6,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    fontSize: 10,
                    fontWeight: 600,
                    color: isActive ? 'rgba(255,255,255,0.95)' : `rgba(120, 160, 220, 0.55)`,
                    letterSpacing: 0.5,
                    transition: 'color 0.3s ease',
                    userSelect: 'none',
                    pointerEvents: 'none'
                  }}
                >
                  R{row + 1}
                </div>
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            width: 340
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 3,
              color: 'rgba(150, 170, 220, 0.6)',
              textTransform: 'uppercase',
              marginLeft: 4
            }}
          >
            Waveform · 波形
          </div>
          <div
            style={{
              position: 'relative',
              width: 340,
              height: 220,
              border: `1px solid ${theme.glow.replace('0.6', '0.2')}`,
              borderRadius: 16,
              overflow: 'hidden',
              background: 'rgba(8, 12, 30, 0.8)',
              backdropFilter: 'blur(8px)',
              boxShadow: `0 0 30px ${theme.glow.replace('0.6', '0.1')}, inset 0 0 20px rgba(0,0,0,0.3)`,
              transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
            }}
          >
            <canvas
              ref={waveformCanvasRef}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%'
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `
                  linear-gradient(90deg, transparent 0%, transparent calc(100% / 8 * 1), rgba(100,140,220,0.05) calc(100% / 8 * 1), rgba(100,140,220,0.05) calc(100% / 8 * 1 + 1px), transparent calc(100% / 8 * 1 + 1px)),
                  linear-gradient(90deg, transparent 0%, transparent calc(100% / 8 * 3), rgba(100,140,220,0.05) calc(100% / 8 * 3), rgba(100,140,220,0.05) calc(100% / 8 * 3 + 1px), transparent calc(100% / 8 * 3 + 1px)),
                  linear-gradient(90deg, transparent 0%, transparent calc(100% / 8 * 5), rgba(100,140,220,0.05) calc(100% / 8 * 5), rgba(100,140,220,0.05) calc(100% / 8 * 5 + 1px), transparent calc(100% / 8 * 5 + 1px)),
                  linear-gradient(90deg, transparent 0%, transparent calc(100% / 8 * 7), rgba(100,140,220,0.05) calc(100% / 8 * 7), rgba(100,140,220,0.05) calc(100% / 8 * 7 + 1px), transparent calc(100% / 8 * 7 + 1px)),
                  linear-gradient(180deg, transparent 0%, transparent 49.7%, rgba(100,140,220,0.08) 49.7%, rgba(100,140,220,0.08) 50.3%, transparent 50.3%)
                `,
                pointerEvents: 'none'
              }}
            />
          </div>

          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 3,
              color: 'rgba(150, 170, 220, 0.6)',
              textTransform: 'uppercase',
              marginLeft: 4,
              marginTop: 4
            }}
          >
            Theme · 主题
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {THEMES.map((t, i) => (
              <button
                key={t.name}
                onClick={() => setThemeIndex(i)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  border: themeIndex === i ? `2px solid ${t.color}` : '1px solid rgba(80, 120, 200, 0.2)',
                  borderRadius: 10,
                  background: themeIndex === i ? `${t.color}22` : 'rgba(30, 45, 80, 0.3)',
                  color: themeIndex === i ? t.color : 'rgba(150, 170, 220, 0.7)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 1,
                  transition: themeColors.transition,
                  boxShadow: themeIndex === i ? `0 0 16px ${t.glow.replace('0.6', '0.3')}` : 'none',
                  outline: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: t.color,
                      boxShadow: themeIndex === i ? `0 0 8px ${t.color}` : 'none'
                    }}
                  />
                  {t.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 36,
          zIndex: 2,
          alignItems: 'center'
        }}
      >
        <button
          onClick={toggleRecord}
          style={{
            padding: '14px 36px',
            borderStyle: 'solid',
            borderWidth: isRecording ? 0 : 1,
            borderColor: isRecording ? 'transparent' : 'rgba(255, 51, 102, 0.3)',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 3,
            cursor: 'pointer',
            transition: themeColors.transition,
            outline: 'none',
            background: isRecording
              ? 'linear-gradient(135deg, #ff3366, #ff6b4d)'
              : 'rgba(255, 51, 102, 0.12)',
            color: isRecording ? '#fff' : '#ff6b8a',
            boxShadow: isRecording
              ? '0 0 32px rgba(255, 51, 102, 0.6), 0 8px 24px rgba(255, 51, 102, 0.3)'
              : 'inset 0 0 16px rgba(255, 51, 102, 0.05)'
          }}
        >
          {isRecording ? '■ 停止录制' : '● 开始录制'}
        </button>

        <button
          onClick={togglePlay}
          disabled={!recordedEvents.length && !isPlaying}
          style={{
            padding: '14px 36px',
            borderStyle: 'solid',
            borderWidth: isPlaying ? 0 : 1,
            borderColor: isPlaying ? 'transparent' : theme.glow.replace('0.6', '0.3'),
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 3,
            cursor: (!recordedEvents.length && !isPlaying) ? 'not-allowed' : 'pointer',
            transition: themeColors.transition,
            outline: 'none',
            background: isPlaying
              ? `linear-gradient(135deg, ${theme.color}, #ffffff55)`
              : `rgba(${parseInt(theme.color.slice(1, 3), 16)}, ${parseInt(theme.color.slice(3, 5), 16)}, ${parseInt(theme.color.slice(5, 7), 16)}, 0.12)`,
            color: isPlaying ? '#fff' : theme.color,
            boxShadow: isPlaying
              ? `0 0 32px ${theme.glow}, 0 8px 24px ${theme.glow.replace('0.6', '0.2')}`
              : (!recordedEvents.length && !isPlaying) ? 'none' : `inset 0 0 16px ${theme.glow.replace('0.6', '0.05')}`,
            opacity: (!recordedEvents.length && !isPlaying) ? 0.4 : 1
          }}
        >
          {isPlaying ? '❚❚ 停止播放' : '▶ 播放录音'}
        </button>

        <div
          style={{
            padding: '10px 18px',
            borderRadius: 10,
            background: 'rgba(30, 45, 80, 0.3)',
            border: '1px solid rgba(80, 120, 200, 0.15)',
            color: 'rgba(150, 170, 220, 0.7)',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 1,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
          }}
        >
          {recordedEvents.length} notes · {recordedEvents.length ? ((recordedEvents[recordedEvents.length - 1].timestamp) / 1000).toFixed(1) + 's' : '—'}
        </div>
      </div>

      <ParticleCanvas ref={particleRef} themeColor={theme.color} />

      <style>{`
        @keyframes recordingBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes recordingPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 51, 102, 0.2); }
          50% { box-shadow: 0 0 40px rgba(255, 51, 102, 0.4); }
        }
      `}</style>
    </div>
  );
}
