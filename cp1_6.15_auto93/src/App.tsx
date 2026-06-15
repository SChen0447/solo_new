import React, { useState, useRef, useEffect, useCallback } from 'react';
import { startAnimationLoop, stopAnimationLoop, resizeCanvas } from './SpectrumVisualizer';
import { ThemeType, audioEngine } from './AudioEngine';

const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [theme, setTheme] = useState<ThemeType>('aurora');
  const [error, setError] = useState<string | null>(null);

  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDraggingRotationRef = useRef(false);
  const lastMouseXRef = useRef(0);
  const targetRotationRef = useRef(0);
  const currentRotationRef = useRef(0);
  const rotationAnimationRef = useRef<number>(0);
  const waveformAnimationRef = useRef<number>(0);
  const themeRef = useRef<ThemeType>('aurora');

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  const formatTime = (time: number): string => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const validateFile = (file: File): boolean => {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'];
    const maxSize = 20 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      setError('只支持 MP3 或 WAV 格式的音频文件');
      return false;
    }
    if (file.size > maxSize) {
      setError('文件大小不能超过 20MB');
      return false;
    }
    setError(null);
    return true;
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    try {
      setAudioFile(file);
      await audioEngine.start(file);
      setIsPlaying(true);

      const audioEl = audioEngine.getAudioElement();
      if (audioEl) {
        audioEl.addEventListener('timeupdate', () => {
          setCurrentTime(audioEl.currentTime);
        });
        audioEl.addEventListener('loadedmetadata', () => {
          setDuration(audioEl.duration);
        });
        audioEl.addEventListener('ended', () => {
          setIsPlaying(false);
        });
      }
    } catch (err) {
      setError('音频加载失败，请重试');
      console.error(err);
    }
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const togglePlayPause = async () => {
    const audioEl = audioEngine.getAudioElement();
    if (!audioEl) return;

    if (isPlaying) {
      audioEl.pause();
      setIsPlaying(false);
    } else {
      const ctx = audioEngine.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }
      await audioEl.play();
      setIsPlaying(true);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audioEl = audioEngine.getAudioElement();
    if (!audioEl || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioEl.currentTime = percent * duration;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRotationRef.current = true;
    lastMouseXRef.current = e.clientX;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRotationRef.current) return;

    const deltaX = e.clientX - lastMouseXRef.current;
    lastMouseXRef.current = e.clientX;

    targetRotationRef.current += deltaX * 0.2;
    targetRotationRef.current = Math.max(-30, Math.min(30, targetRotationRef.current));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRotationRef.current = false;
  }, []);

  useEffect(() => {
    const updateRotation = () => {
      currentRotationRef.current += (targetRotationRef.current - currentRotationRef.current) * 0.1;
      rotationAnimationRef.current = requestAnimationFrame(updateRotation);
    };
    rotationAnimationRef.current = requestAnimationFrame(updateRotation);

    return () => cancelAnimationFrame(rotationAnimationRef.current);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas || !audioFile) return;

    resizeCanvas(canvas);

    const handleResize = () => {
      if (canvas) {
        resizeCanvas(canvas);
      }
    };
    window.addEventListener('resize', handleResize);

    startAnimationLoop(
      canvas,
      () => themeRef.current,
      () => currentRotationRef.current
    );

    return () => {
      stopAnimationLoop();
      window.removeEventListener('resize', handleResize);
    };
  }, [audioFile]);

  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !isPlaying) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeWaveformCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeWaveformCanvas();
    window.addEventListener('resize', resizeWaveformCanvas);

    const drawWaveform = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, width, height);

      const timeDomainData = audioEngine.getTimeDomainData();
      const sliceWidth = width / timeDomainData.length;

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4a90d9';
      ctx.beginPath();

      let x = 0;
      for (let i = 0; i < timeDomainData.length; i++) {
        const v = timeDomainData[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();

      waveformAnimationRef.current = requestAnimationFrame(drawWaveform);
    };

    drawWaveform();

    return () => {
      cancelAnimationFrame(waveformAnimationRef.current);
      window.removeEventListener('resize', resizeWaveformCanvas);
    };
  }, [isPlaying, audioFile]);

  const themeConfig = {
    fire: {
      gradient: 'radial-gradient(circle, #ff4500 0%, #ff6347 100%)',
      label: '火焰'
    },
    ocean: {
      gradient: 'radial-gradient(circle, #0088cc 0%, #00bfff 100%)',
      label: '海洋'
    },
    aurora: {
      gradient: 'radial-gradient(circle, #00ff7f 0%, #7b68ee 100%)',
      label: '极光'
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0d1a',
      color: '#e0e0e0',
      fontFamily: 'monospace',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      paddingBottom: '100px'
    }}>
      <h1 style={{
        fontSize: '28px',
        marginBottom: '20px',
        letterSpacing: '2px',
        textAlign: 'center'
      }}>
        音乐可视化频谱墙
      </h1>

      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        gap: '12px',
        zIndex: 10
      }}>
        {(Object.keys(themeConfig) as ThemeType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            title={themeConfig[t].label}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: theme === t ? '2px solid #ffffff' : '2px solid transparent',
              background: themeConfig[t].gradient,
              cursor: 'pointer',
              transform: theme === t ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease',
              boxShadow: theme === t ? '0 0 12px rgba(255,255,255,0.5)' : 'none'
            }}
          />
        ))}
      </div>

      {!audioFile && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '360px',
            height: '200px',
            border: isDragging ? '2px solid #00d4aa' : '2px dashed #aaa',
            borderRadius: '12px',
            background: isDragging ? 'rgba(0, 212, 170, 0.1)' : 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            margin: '40px auto'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎵</div>
          <div style={{ fontSize: '16px', textAlign: 'center' }}>
            点击或拖拽上传音频文件
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
            支持 MP3 / WAV，最大 20MB
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/wav,audio/mpeg,audio/x-wav"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {error && (
        <div style={{
          color: '#ff6b6b',
          padding: '12px 20px',
          background: 'rgba(255, 107, 107, 0.1)',
          borderRadius: '8px',
          marginBottom: '20px',
          maxWidth: '360px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {audioFile && (
        <div
          onMouseDown={handleMouseDown}
          style={{
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto',
            position: 'relative',
            userSelect: 'none'
          }}
        >
          <div style={{
            marginBottom: '20px',
            fontSize: '14px',
            color: '#aaa',
            textAlign: 'center'
          }}>
            正在播放: {audioFile.name}
          </div>

          <canvas
            ref={spectrumCanvasRef}
            style={{
              width: '100%',
              height: '500px',
              background: '#0a0a23',
              borderRadius: '8px',
              display: 'block',
              cursor: 'grab',
              transform: `perspective(800px) rotateX(30deg) rotateY(${currentRotationRef.current}deg)`,
              transition: 'transform 0.1s ease-out',
              transformStyle: 'preserve-3d'
            }}
          />

          <div style={{
            fontSize: '12px',
            color: '#666',
            textAlign: 'center',
            marginTop: '12px'
          }}>
            ← 拖拽旋转视角 →
          </div>
        </div>
      )}

      {audioFile && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '120px',
          background: 'rgba(26, 26, 46, 0.9)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: '20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          zIndex: 100
        }}>
          <button
            onClick={togglePlayPause}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(135deg, #00d4aa 0%, #00a085 100%)',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <canvas
              ref={waveformCanvasRef}
              style={{
                width: '100%',
                height: '80px',
                borderRadius: '4px',
                marginBottom: '6px',
                display: 'block'
              }}
            />
            <div
              onClick={handleProgressClick}
              style={{
                height: '6px',
                background: '#2a2a3e',
                borderRadius: '3px',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, #00d4aa 0%, #4a90d9 100%)',
                  borderRadius: '3px',
                  transition: 'width 0.1s linear'
                }}
              />
            </div>
          </div>

          <div style={{
            fontSize: '13px',
            color: '#aaa',
            minWidth: '100px',
            textAlign: 'right',
            flexShrink: 0
          }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
