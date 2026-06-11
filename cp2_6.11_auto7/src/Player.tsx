import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AudioEngine, LoadProgress } from './audio/AudioEngine';
import { FileUpload } from './FileUpload';
import { Visualizer } from './Visualizer';
import { Controls } from './Controls';
import './styles.css';

export const Player: React.FC = () => {
  const engineRef = useRef<AudioEngine | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [songName, setSongName] = useState('');
  const [loadProgress, setLoadProgress] = useState<LoadProgress>({ loaded: 0, total: 0, percent: 0 });
  const [hasUploaded, setHasUploaded] = useState(false);

  useEffect(() => {
    const engine = new AudioEngine();
    engineRef.current = engine;

    const cleanupLoaded = engine.on('loaded', (data: any) => {
      setDuration(data?.duration ?? 0);
      setIsLoaded(true);
      setIsPlaying(false);
      engine.start().catch(e => console.error('自动播放失败:', e));
    });

    const cleanupPlaying = engine.on('playing', () => setIsPlaying(true));
    const cleanupPaused = engine.on('paused', () => setIsPlaying(false));
    const cleanupStopped = engine.on('stopped', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    const cleanupEnded = engine.on('ended', () => {
      setIsPlaying(false);
      setCurrentTime(engine.getDuration());
    });
    const cleanupTime = engine.on('timeupdate', (data: any) => {
      setCurrentTime(data?.currentTime ?? 0);
    });

    return () => {
      cleanupLoaded();
      cleanupPlaying();
      cleanupPaused();
      cleanupStopped();
      cleanupEnded();
      cleanupTime();
      engine.destroy();
    };
  }, []);

  const handleFileLoaded = useCallback(async (buffer: ArrayBuffer, name: string) => {
    const engine = engineRef.current;
    if (!engine) return;

    setSongName(name);
    setHasUploaded(true);
    setIsLoaded(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    engine.reset();

    try {
      await engine.loadFromArrayBuffer(buffer, (p) => setLoadProgress(p));
    } catch (e) {
      console.error('加载失败:', e);
      setIsLoaded(false);
    }
  }, []);

  const handleProgress = useCallback((p: LoadProgress) => {
    setLoadProgress(p);
  }, []);

  const handlePlayPause = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || !engine.getIsLoaded()) return;
    try {
      if (engine.getIsPlaying()) {
        engine.pause();
      } else {
        await engine.start();
      }
    } catch (e) {
      console.error('播放控制失败:', e);
    }
  }, []);

  const handleSeek = useCallback(async (time: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    try { await engine.seek(time); }
    catch (e) { console.error('跳转失败:', e); }
  }, []);

  const handleVolumeChange = useCallback((v: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setVolume(v);
    setVolume(v);
    if (v > 0 && muted) {
      engine.setMuted(false);
      setMuted(false);
    }
  }, [muted]);

  const handleToggleMute = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const newMuted = !muted;
    engine.setMuted(newMuted);
    setMuted(newMuted);
  }, [muted]);

  const getFrequencyData = useCallback((): Uint8Array => {
    return engineRef.current?.getFrequencyData() ?? new Uint8Array();
  }, []);

  return (
    <div className="app-root">
      <div className="app-bg-glow glow-1" />
      <div className="app-bg-glow glow-2" />
      <div className="app-bg-glow glow-3" />

      <div className="player-container">
        <header className="player-header">
          <div className="brand">
            <div className="brand-icon">
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <path
                  d="M10 26 C10 21 13 19 16 19 C19 19 22 21 22 26 M16 6 L16 18 M20 9 L20 21 M12 8 L12 20"
                  fill="none"
                  stroke="url(#brandGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="brand-title">MusicViz</h1>
          </div>
          <div className="header-tag">
            <span className="tag-dot" />
            <span>Audio Reactive Visualizer</span>
          </div>
        </header>

        {!hasUploaded ? (
          <div className="upload-panel">
            <FileUpload
              onFileLoaded={handleFileLoaded}
              onProgress={handleProgress}
            />
            <div className="upload-hints">
              <div className="hint-item">
                <span className="hint-icon bar" />
                <span>频谱条形图 · 64 频段实时分析</span>
              </div>
              <div className="hint-item">
                <span className="hint-icon dot" />
                <span>圆形粒子系统 · 550+ 粒子 · 低频绿 中频蓝 高频红</span>
              </div>
              <div className="hint-item">
                <span className="hint-icon ring" />
                <span>60 FPS · requestAnimationFrame · 页面不可见自动暂停</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="player-body">
            <div className="visualizer-panel">
              <Visualizer
                getFrequencyData={getFrequencyData}
                isPlaying={isPlaying}
                isLoaded={isLoaded}
              />
            </div>
            <div className="controls-panel">
              <Controls
                isPlaying={isPlaying}
                isLoaded={isLoaded}
                songName={songName}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                muted={muted}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                onVolumeChange={handleVolumeChange}
                onToggleMute={handleToggleMute}
              />
            </div>
            <div className="reupload-row">
              <button
                type="button"
                className="btn-ripple reupload-btn"
                onClick={() => {
                  setHasUploaded(false);
                  setIsLoaded(false);
                  setIsPlaying(false);
                  setSongName('');
                  setCurrentTime(0);
                  setDuration(0);
                  setLoadProgress({ loaded: 0, total: 0, percent: 0 });
                  engineRef.current?.reset();
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    d="M21 12a9 9 0 1 1-3-6.7 L21 8 M21 3 L21 8 L16 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>重新选择歌曲</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
