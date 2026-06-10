import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Recording, getMoodConfig, MoodConfig } from '../types';

interface TimelineProps {
  recordings: Recording[];
  playingRecording: Recording | null;
  setPlayingRecording: (r: Recording | null) => void;
  onDelete: (id: string) => void;
}

interface WaveformData {
  [key: string]: number[];
}

const generateWaveform = (seed: number, length: number = 200): number[] => {
  const arr: number[] = [];
  let s = seed;
  for (let i = 0; i < length; i++) {
    s = (s * 9301 + 49297) % 233280;
    const rnd = s / 233280;
    const base = 0.3 + Math.sin(i * 0.1) * 0.15;
    arr.push(base + rnd * 0.5);
  }
  return arr;
};

const Timeline: React.FC<TimelineProps> = ({
  recordings,
  playingRecording,
  setPlayingRecording,
  onDelete,
}) => {
  const [waveformData] = useState<WaveformData>({});
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const [panelVisible, setPanelVisible] = useState(false);
  const [panelClosing, setPanelClosing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [draggingProgress, setDraggingProgress] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const cardCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const getWaveform = useCallback(
    (id: string): number[] => {
      if (!waveformData[id]) {
        const seed = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        waveformData[id] = generateWaveform(seed);
      }
      return waveformData[id];
    },
    [waveformData]
  );

  useEffect(() => {
    if (playingRecording) {
      setPanelClosing(false);
      setPanelVisible(true);
      setCurrentTime(0);
      setIsPlaying(false);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    }
  }, [playingRecording]);

  useEffect(() => {
    const timer = setTimeout(() => {
      cardCanvasesRef.current.forEach((canvas, id) => {
        const rec = recordings.find((r) => r.id === id);
        if (rec) {
          const mood = getMoodConfig(rec.mood);
          drawCardWaveform(canvas, getWaveform(id), mood);
        }
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [recordings, getWaveform]);

  useEffect(() => {
    if (!panelVisible) return;
    if (!playingRecording || !playingRecording.url) return;

    const audio = new Audio(playingRecording.url);
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration || playingRecording.duration);
    });

    audio.addEventListener('timeupdate', () => {
      if (!draggingProgress) {
        setCurrentTime(audio.currentTime);
      }
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      cancelAnimationFrame(animationRef.current);
    });

    audio.addEventListener('play', () => {
      try {
        if (!audioContextRef.current) {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          audioContextRef.current = new AudioCtx();
        }
        const ctx = audioContextRef.current!;
        if (!analyserRef.current) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          const source = ctx.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(ctx.destination);
          analyserRef.current = analyser;
        }
      } catch (e) {
        // ignore
      }
    });

    return () => {
      audio.pause();
    };
  }, [playingRecording, panelVisible, draggingProgress]);

  useEffect(() => {
    if (!panelVisible || !isPlaying) return;
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mood = playingRecording ? getMoodConfig(playingRecording.mood) : null;
    if (!mood) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const analyser = analyserRef.current;
      const bufferLength = 128;
      const dataArray = analyser ? new Uint8Array(bufferLength) : null;

      if (analyser && dataArray) {
        try {
          analyser.getByteFrequencyData(dataArray);
        } catch (e) {
          // ignore
        }
      }

      const barWidth = canvas.width / bufferLength;
      const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
      grad.addColorStop(0, mood.gradient[0]);
      grad.addColorStop(1, mood.gradient[1]);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray ? dataArray[i] / 255 : Math.random() * 0.5 + 0.2;
        const y = canvas.height / 2 - (v - 0.5) * canvas.height * 0.7;
        if (i === 0) ctx.moveTo(i * barWidth, y);
        else ctx.lineTo(i * barWidth, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationRef.current);
  }, [panelVisible, isPlaying, playingRecording]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
    } else {
      try {
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        await audio.play();
        setIsPlaying(true);
      } catch (e) {
        console.error('Play failed:', e);
      }
    }
  };

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    setDraggingProgress(true);
    updateProgress(e);
  };

  const updateProgress = (e: React.MouseEvent | MouseEvent) => {
    const el = progressRef.current;
    if (!el || !audioRef.current) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = ratio * duration;
    setCurrentTime(t);
    audioRef.current.currentTime = t;
  };

  useEffect(() => {
    if (!draggingProgress) return;
    const handleMove = (e: MouseEvent) => updateProgress(e);
    const handleUp = () => setDraggingProgress(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [draggingProgress, duration]);

  const closePanel = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    cancelAnimationFrame(animationRef.current);
    setPanelClosing(true);
    setTimeout(() => {
      setPanelVisible(false);
      setPanelClosing(false);
      setPlayingRecording(null);
    }, 200);
  };

  const handleCardClick = (rec: Recording) => {
    setPlayingRecording(rec);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const groups: { [key: string]: Recording[] } = {};
  recordings.forEach((r) => {
    const key = formatDate(r.timestamp);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  const drawCardWaveform = (
    canvas: HTMLCanvasElement,
    data: number[],
    mood: MoodConfig
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = 18;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const step = Math.max(1, Math.floor(data.length / canvas.width));
    const pts: number[] = [];
    for (let i = 0; i < canvas.width; i++) {
      let sum = 0,
        cnt = 0;
      for (let j = i * step; j < (i + 1) * step && j < data.length; j++) {
        sum += data[j];
        cnt++;
      }
      pts.push(cnt > 0 ? sum / cnt : 0.1);
    }
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, mood.gradient[0]);
    grad.addColorStop(1, mood.gradient[1]);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const y = canvas.height / 2 - (p - 0.5) * canvas.height * 0.8;
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    });
    ctx.stroke();
  };

  return (
    <div
      style={{
        background: 'rgba(30, 30, 46, 0.8)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 24,
        position: 'relative',
        minHeight: 480,
        maxHeight: 'calc(100vh - 160px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>
          📅 我的音频日记
        </h2>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          共 {recordings.length} 条记录
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: 8,
          marginRight: -8,
        }}
      >
        {recordings.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 300,
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
            <p style={{ fontSize: 14 }}>还没有记录</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>点击左侧按钮开始录制你的第一条声音记忆</p>
          </div>
        ) : (
          Object.entries(groups).map(([date, recs]) => (
            <div key={date} style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.5)',
                  marginBottom: 12,
                  paddingLeft: 4,
                  fontWeight: 500,
                }}
              >
                {date}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  overflowX: 'auto',
                  paddingBottom: 8,
                }}
              >
                {recs.map((rec) => {
                  const mood = getMoodConfig(rec.mood);
                  const isHovered = hoveredCard === rec.id;
                  const isActive = playingRecording?.id === rec.id;
                  return (
                    <div
                      key={rec.id}
                      onClick={() => handleCardClick(rec)}
                      onMouseEnter={() => setHoveredCard(rec.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        width: 220,
                        minWidth: 220,
                        height: 140,
                        borderRadius: 12,
                        background:
                          'linear-gradient(180deg, #1e1e2e 0%, #2a2a3e 100%)',
                        border: isActive
                          ? `1px solid ${mood.color}`
                          : '1px solid rgba(255,255,255,0.08)',
                        padding: 16,
                        cursor: 'pointer',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        transform: isHovered
                          ? 'translateY(-4px)'
                          : 'translateY(0)',
                        transition: 'all 0.2s ease-out',
                        boxShadow: isHovered
                          ? `0 8px 24px rgba(0,0,0,0.4), 0 0 20px ${mood.color}33`
                          : '0 2px 8px rgba(0,0,0,0.2)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            background: `linear-gradient(135deg, ${mood.gradient[0]}, ${mood.gradient[1]})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                          }}
                        >
                          {mood.icon}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('确定删除这条记录吗？')) {
                              onDelete(rec.id);
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.3)',
                            cursor: 'pointer',
                            fontSize: 14,
                            padding: 2,
                            transition: 'color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLButtonElement).style.color =
                              '#ff6b6b';
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLButtonElement).style.color =
                              'rgba(255,255,255,0.3)';
                          }}
                        >
                          🗑️
                        </button>
                      </div>

                      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <canvas
                          ref={(el) => {
                            if (el) {
                              cardCanvasesRef.current.set(rec.id, el);
                            } else {
                              cardCanvasesRef.current.delete(rec.id);
                            }
                          }}
                          style={{ width: '100%', height: 18 }}
                        />
                      </div>

                      <div style={{ marginTop: 8 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: mood.color,
                              fontWeight: 500,
                            }}
                          >
                            {mood.label}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: 'rgba(255,255,255,0.5)',
                            }}
                          >
                            {formatTime(rec.timestamp)} · {rec.duration.toFixed(1)}s
                          </span>
                        </div>
                        {rec.note && (
                          <p
                            style={{
                              fontSize: 12,
                              color: 'rgba(255,255,255,0.7)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {rec.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {panelVisible && playingRecording && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 180,
            background: 'rgba(26, 26, 46, 0.9)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px 20px 0 0',
            padding: '20px 24px',
            animation: panelClosing ? 'slide-down 0.2s ease-in forwards' : 'slide-up 0.3s ease-out',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${getMoodConfig(playingRecording.mood).gradient[0]}, ${getMoodConfig(playingRecording.mood).gradient[1]})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                flexShrink: 0,
                boxShadow: `0 4px 16px ${getMoodConfig(playingRecording.mood).color}55`,
              }}
            >
              {getMoodConfig(playingRecording.mood).icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      marginBottom: 2,
                      color: getMoodConfig(playingRecording.mood).color,
                    }}
                  >
                    {getMoodConfig(playingRecording.mood).label}
                  </h3>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                    {formatTime(playingRecording.timestamp)} ·{' '}
                    {formatDuration(playingRecording.duration)}
                    {playingRecording.note && ` · ${playingRecording.note}`}
                  </p>
                </div>
                <button
                  onClick={closePanel}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <canvas
            ref={waveCanvasRef}
            width={600}
            height={50}
            style={{ width: '100%', height: 50, marginBottom: 12, borderRadius: 8 }}
          />

          <div
            ref={progressRef}
            onMouseDown={handleProgressMouseDown}
            style={{
              height: 4,
              background: '#555555',
              borderRadius: 2,
              position: 'relative',
              cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                height: '100%',
                width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                background: `linear-gradient(90deg, ${getMoodConfig(playingRecording.mood).gradient[0]}, ${getMoodConfig(playingRecording.mood).gradient[1]})`,
                borderRadius: 2,
                transition: draggingProgress ? 'none' : 'width 0.1s linear',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                transform: 'translate(-50%, -50%)',
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: `0 0 8px ${getMoodConfig(playingRecording.mood).color}`,
                transition: draggingProgress ? 'none' : 'left 0.1s linear',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>
              {formatDuration(currentTime)}
            </span>
            <button
              onClick={togglePlay}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${getMoodConfig(playingRecording.mood).gradient[0]}, ${getMoodConfig(playingRecording.mood).gradient[1]})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                boxShadow: `0 4px 16px ${getMoodConfig(playingRecording.mood).color}66`,
                transition: 'transform 0.2s',
                transform: isPlaying ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>
              {formatDuration(duration || playingRecording.duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;
