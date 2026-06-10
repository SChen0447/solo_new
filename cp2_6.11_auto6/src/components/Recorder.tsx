import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Recording,
  MoodType,
  MOOD_CONFIGS,
  getMoodConfig,
  MOOD_ORDER,
} from '../types';

interface RecorderProps {
  onRecordingAdded: (recording: Recording) => void;
  recordings: Recording[];
}

const MAX_DURATION = 15;

const Recorder: React.FC<RecorderProps> = ({ onRecordingAdded, recordings }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [showMoodPanel, setShowMoodPanel] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number>(0);
  const timerRef = useRef<number>(0);
  const dbSumRef = useRef<number>(0);
  const dbCountRef = useRef<number>(0);
  const audioDataRef = useRef<number[]>([]);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const analyser = analyserRef.current;
      const bufferLength = 128;
      const dataArray = analyser ? new Uint8Array(bufferLength) : null;

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / (bufferLength || 32);
      let barHeight;
      let x = 0;

      for (let i = 0; i < (bufferLength || 32); i++) {
        barHeight = dataArray
          ? (dataArray[i] / 255) * canvas.height * 0.8
          : Math.random() * canvas.height * 0.3;

        if (analyser && dataArray) {
          const db = 20 * Math.log10((dataArray[i] + 1) / 255);
          dbSumRef.current += Math.max(db, -60) + 60;
          dbCountRef.current++;
          audioDataRef.current.push((dataArray[i] / 255) * 0.8 + 0.1);
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#a78bfa');
        gradient.addColorStop(1, '#6c63ff');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }

      if (isRecording || isPlayingPreview) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    draw();
  }, [isRecording, isPlayingPreview]);

  useEffect(() => {
    if (isRecording || isPlayingPreview) {
      drawWaveform();
    } else {
      cancelAnimationFrame(animationRef.current);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [isRecording, isPlayingPreview, drawWaveform]);

  const drawThumbnailWaveform = useCallback(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas || audioDataRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const data = audioDataRef.current;
    const step = Math.max(1, Math.floor(data.length / canvas.width));
    const points: number[] = [];

    for (let i = 0; i < canvas.width; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i * step; j < (i + 1) * step && j < data.length; j++) {
        sum += data[j];
        count++;
      }
      points.push(count > 0 ? sum / count : 0.1);
    }

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    const moodColor = selectedMood
      ? getMoodConfig(selectedMood).gradient
      : ['#6c63ff', '#a78bfa'];
    gradient.addColorStop(0, moodColor[0]);
    gradient.addColorStop(1, moodColor[1]);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const y = canvas.height / 2 - (p - 0.5) * canvas.height * 0.8;
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    });
    ctx.stroke();
  }, [selectedMood]);

  useEffect(() => {
    if (showMoodPanel) {
      drawThumbnailWaveform();
    }
  }, [showMoodPanel, selectedMood, drawThumbnailWaveform]);

  const startRecording = useCallback(async () => {
    try {
      audioDataRef.current = [];
      dbSumRef.current = 0;
      dbCountRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        cleanupStream();

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlayingPreview(false);
          cancelAnimationFrame(animationRef.current);
          setShowMoodPanel(true);
        };
        setIsPlayingPreview(true);

        const tempCtx = audioContextRef.current;
        if (tempCtx) {
          const tempAnalyser = tempCtx.createAnalyser();
          tempAnalyser.fftSize = 256;
          const tempSource = tempCtx.createMediaElementSource(audio);
          tempSource.connect(tempAnalyser);
          tempAnalyser.connect(tempCtx.destination);
          analyserRef.current = tempAnalyser;
        }

        audio.play().catch(() => {
          setIsPlayingPreview(false);
          setShowMoodPanel(true);
        });
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingTime(elapsed);
        if (elapsed >= MAX_DURATION) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [cleanupStream]);

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const handleButtonMouseDown = () => {
    setIsPressed(true);
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 300);
  };

  const handleButtonMouseUp = () => {
    setIsPressed(false);
  };

  const handleButtonClick = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      setRecordedBlob(null);
      setSelectedMood(null);
      setNote('');
      setShowMoodPanel(false);
      await startRecording();
    }
  };

  const uploadRecording = useCallback(
    async (blob: Blob, mood: MoodType) => {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('mood', mood);
      formData.append('note', note.slice(0, 30));
      formData.append('duration', recordingTime.toFixed(2));
      formData.append(
        'avgDb',
        (dbCountRef.current > 0 ? dbSumRef.current / dbCountRef.current : 30).toFixed(2)
      );
      formData.append('timestamp', new Date().toISOString());

      try {
        const res = await fetch('/api/recordings', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        onRecordingAdded(data);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    },
    [note, recordingTime, onRecordingAdded]
  );

  const handleMoodSelect = async (mood: MoodType) => {
    setSelectedMood(mood);
  };

  const handleSave = async () => {
    if (!recordedBlob || !selectedMood) return;
    await uploadRecording(recordedBlob, selectedMood);
    setShowMoodPanel(false);
    setRecordedBlob(null);
    setSelectedMood(null);
    setNote('');
    audioDataRef.current = [];
  };

  const handleCancel = () => {
    setShowMoodPanel(false);
    setRecordedBlob(null);
    setSelectedMood(null);
    setNote('');
    audioDataRef.current = [];
  };

  const todayRecordings = recordings.filter((r) => {
    const d = new Date(r.timestamp);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  });

  const getPointSize = (duration: number) => {
    const min = 5;
    const max = 20;
    const ratio = Math.min(duration / MAX_DURATION, 1);
    return min + ratio * (max - min);
  };

  const getTimeX = (timestamp: string, width: number) => {
    const d = new Date(timestamp);
    const startOfDay = new Date(d);
    startOfDay.setHours(6, 0, 0, 0);
    const endOfDay = new Date(d);
    endOfDay.setHours(22, 0, 0, 0);
    const total = endOfDay.getTime() - startOfDay.getTime();
    const elapsed = d.getTime() - startOfDay.getTime();
    const ratio = Math.max(0, Math.min(1, elapsed / total));
    return 40 + ratio * (width - 80);
  };

  const getMoodY = (mood: MoodType, height: number) => {
    const index = MOOD_ORDER.indexOf(mood);
    const ratio = index / (MOOD_ORDER.length - 1);
    return 40 + ratio * (height - 80);
  };

  const moodColors = selectedMood ? getMoodConfig(selectedMood).gradient : null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 120px',
        gap: 20,
        position: 'relative',
      }}
      className="recorder-grid"
    >
      <div
        style={{
          background: 'rgba(30, 30, 46, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          minHeight: 480,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <span
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: 2,
            }}
          >
            {isRecording ? '正在录制...' : isPlayingPreview ? '预览回放中' : '点击录制'}
          </span>
        </div>

        <div style={{ position: 'relative', marginBottom: 24 }}>
          <button
            onClick={handleButtonClick}
            onMouseDown={handleButtonMouseDown}
            onMouseUp={handleButtonMouseUp}
            onMouseLeave={handleButtonMouseUp}
            onTouchStart={handleButtonMouseDown}
            onTouchEnd={handleButtonMouseUp}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(180deg, #6c63ff 0%, #a78bfa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              transform: isPressed ? 'scale(0.92)' : 'scale(1)',
              transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
              boxShadow: isRecording
                ? '0 0 0 0 rgba(255, 59, 48, 0.7)'
                : '0 8px 30px rgba(108, 99, 255, 0.4)',
              animation: isRecording ? 'pulse-ring 1s infinite' : 'none',
              overflow: 'visible',
            }}
          >
            <span style={{ fontSize: 28, zIndex: 1 }}>
              {isRecording ? '🔴' : '🎤'}
            </span>
            {isRecording && (
              <div
                style={{
                  position: 'absolute',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#ff3b30',
                  animation: 'pulse-ring 1s infinite',
                }}
              />
            )}
          </button>

          {showRipple && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(108, 99, 255, 0.4)',
                animation: 'ripple 0.3s ease-out forwards',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 4,
            fontVariantNumeric: 'tabular-nums',
            color: isRecording ? '#ff6b6b' : '#fff',
          }}
        >
          {recordingTime.toFixed(1)}s
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
            {' '}
            / {MAX_DURATION}s
          </span>
        </div>

        <div style={{ width: '100%', marginTop: 20, marginBottom: 20 }}>
          <canvas
            ref={canvasRef}
            width={320}
            height={60}
            style={{ width: '100%', height: 60, display: 'block' }}
          />
        </div>

        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
            marginTop: 'auto',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          💡 录制环境音，然后选择合适的情绪标签记录此刻感受
        </div>

        {showMoodPanel && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(30, 30, 46, 0.98)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: 24,
              animation: 'slide-up 0.4s ease-out',
              zIndex: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>选择此刻的情绪</h3>
              <button
                onClick={handleCancel}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: 20,
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            <canvas
              ref={waveCanvasRef}
              width={320}
              height={18}
              style={{ width: '100%', height: 18, marginBottom: 16 }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {MOOD_CONFIGS.map((mood) => (
                <button
                  key={mood.type}
                  onClick={() => handleMoodSelect(mood.type)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    background: `linear-gradient(135deg, ${mood.gradient[0]}, ${mood.gradient[1]})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    justifySelf: 'center',
                    transform:
                      selectedMood === mood.type ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.3s ease-out',
                    boxShadow:
                      selectedMood === mood.type
                        ? `0 0 12px 4px ${mood.color}66`
                        : '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                  title={mood.label}
                >
                  {mood.icon}
                </button>
              ))}
            </div>

            {selectedMood && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: moodColors ? moodColors[0] : '#fff',
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  {getMoodConfig(selectedMood).icon} {getMoodConfig(selectedMood).label} · 添加备注
                </div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 30))}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="记录此刻的想法..."
                  maxLength={30}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${moodColors ? moodColors[0] : 'rgba(255,255,255,0.2)'}`,
                    borderRadius: 10,
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'all 0.2s ease-out',
                    boxShadow: inputFocused
                      ? `0 0 0 3px ${moodColors ? moodColors[0] : '#6c63ff'}44`
                      : 'none',
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 4,
                    textAlign: 'right',
                  }}
                >
                  {note.length}/30
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleCancel}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease-out',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!selectedMood}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background:
                    selectedMood && moodColors
                      ? `linear-gradient(135deg, ${moodColors[0]}, ${moodColors[1]})`
                      : 'rgba(255,255,255,0.1)',
                  color: selectedMood ? '#fff' : 'rgba(255,255,255,0.3)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: selectedMood ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease-out',
                  boxShadow: selectedMood
                    ? `0 4px 15px ${
                        moodColors ? moodColors[0] : '#6c63ff'
                      }55`
                    : 'none',
                }}
              >
                保存记录
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          background: 'rgba(30, 30, 46, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: 16,
          position: 'relative',
          minHeight: 480,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
            marginBottom: 8,
            letterSpacing: 1,
          }}
        >
          听觉情绪轴
        </div>

        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 'calc(100% - 24px)',
          }}
        >
          <svg
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
            viewBox="0 0 120 440"
            preserveAspectRatio="none"
          >
            <defs>
              {MOOD_CONFIGS.map((m) => (
                <linearGradient
                  key={m.type}
                  id={`line-${m.type}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor={m.gradient[0]} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={m.gradient[1]} stopOpacity="0.6" />
                </linearGradient>
              ))}
            </defs>

            <line
              x1="60"
              y1="20"
              x2="60"
              y2="420"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />

            {MOOD_ORDER.map((mtype, idx) => {
              const y = 40 + (idx / (MOOD_ORDER.length - 1)) * 360;
              const m = getMoodConfig(mtype);
              return (
                <g key={mtype}>
                  <circle cx="60" cy={y} r="3" fill={m.color} opacity="0.4" />
                  <text
                    x="8"
                    y={y + 4}
                    fontSize="9"
                    fill="rgba(255,255,255,0.5)"
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}

            {todayRecordings.length >= 2 &&
              todayRecordings
                .slice()
                .sort(
                  (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime()
                )
                .slice(0, -1)
                .map((r, i) => {
                  const sorted = todayRecordings
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(a.timestamp).getTime() -
                        new Date(b.timestamp).getTime()
                    );
                  const a = sorted[i];
                  const b = sorted[i + 1];
                  const x1 = getTimeX(a.timestamp, 120);
                  const y1 = getMoodY(a.mood, 440);
                  const x2 = getTimeX(b.timestamp, 120);
                  const y2 = getMoodY(b.mood, 440);
                  const mx = (x1 + x2) / 2;
                  return (
                    <path
                      key={`curve-${i}`}
                      d={`M ${x1} ${y1} Q ${mx} ${(y1 + y2) / 2} ${x2} ${y2}`}
                      stroke={`url(#line-${a.mood})`}
                      strokeWidth="2"
                      fill="none"
                      opacity="0.4"
                    />
                  );
                })}

            {todayRecordings.map((r, i) => {
              const x = getTimeX(r.timestamp, 120);
              const y = getMoodY(r.mood, 440);
              const size = getPointSize(r.duration);
              const m = getMoodConfig(r.mood);
              return (
                <circle
                  key={r.id}
                  cx={x}
                  cy={y}
                  r={size / 2}
                  fill={m.color}
                  stroke="#fff"
                  strokeWidth="1"
                  opacity="0.95"
                  style={{
                    animation: `fly-in-right 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${
                      i * 0.05
                    }s both`,
                  }}
                />
              );
            })}
          </svg>

          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 8,
              color: 'rgba(255,255,255,0.3)',
              padding: '0 8px',
            }}
          >
            <span>早</span>
            <span>晚</span>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1200px) {
          .recorder-grid {
            grid-template-columns: 1fr 120px !important;
          }
        }
        @media (max-width: 500px) {
          .recorder-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Recorder;
