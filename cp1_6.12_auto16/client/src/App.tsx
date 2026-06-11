import { useState, useEffect, useRef, useCallback } from 'react';
import type { AudioFile, LyricsTrack, LyricLine, ViewMode } from './types';
import {
  createTrack,
  getTrackByAudioId,
  addLine,
  updateLine,
  deleteLine
} from './utils/db';
import Waveform from './components/Waveform';
import LyricsDisplay from './components/LyricsDisplay';
import LyricsEditor from './components/LyricsEditor';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('viewMode') as ViewMode;
    return saved || 'player';
  });

  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [currentAudio, setCurrentAudio] = useState<AudioFile | null>(null);
  const [currentTrack, setCurrentTrack] = useState<LyricsTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('volume');
    return saved ? parseFloat(saved) : 0.8;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateProgress = useCallback(() => {
    if (audioRef.current && !isDragging) {
      setCurrentTime(audioRef.current.currentTime);
    }
    rafRef.current = requestAnimationFrame(updateProgress);
  }, [isDragging]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateProgress);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updateProgress]);

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('volume', volume.toString());
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    fetch('/api/files')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAudioFiles(data.data);
          if (data.data.length > 0 && !currentAudio) {
            const savedId = localStorage.getItem('currentAudioId');
            const found = savedId ? data.data.find((f: AudioFile) => f.id === savedId) : null;
            const target = found || data.data[0];
            loadAudio(target);
          }
        }
      })
      .catch(err => console.error('Failed to load files:', err));
  }, []);

  const loadAudio = async (audio: AudioFile) => {
    setCurrentAudio(audio);
    localStorage.setItem('currentAudioId', audio.id);
    setCurrentTime(0);
    setIsPlaying(false);

    const track = await getTrackByAudioId(audio.id);
    if (track) {
      setCurrentTrack(track);
    } else {
      const newTrack = await createTrack(audio.id, audio.name.replace('.mp3', ''));
      setCurrentTrack(newTrack);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.type.includes('audio') && !file.name.endsWith('.mp3')) {
      alert('请上传 MP3 格式的音频文件');
      return;
    }

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setAudioFiles(prev => [data.data, ...prev]);
        await loadAudio(data.data);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleAddLine = async (time: number, text: string) => {
    if (!currentTrack) return;
    const newLine = await addLine(currentTrack.id, time, text);
    setCurrentTrack(prev => {
      if (!prev) return prev;
      const newLines = [...prev.lines, newLine].sort((a, b) => a.time - b.time);
      return { ...prev, lines: newLines };
    });
  };

  const handleUpdateLine = async (line: LyricLine) => {
    await updateLine(line);
    setCurrentTrack(prev => {
      if (!prev) return prev;
      const newLines = prev.lines
        .map(l => l.id === line.id ? line : l)
        .sort((a, b) => a.time - b.time);
      return { ...prev, lines: newLines };
    });
  };

  const handleDeleteLine = async (lineId: string) => {
    if (!currentTrack) return;
    await deleteLine(lineId, currentTrack.id);
    setCurrentTrack(prev => {
      if (!prev) return prev;
      return { ...prev, lines: prev.lines.filter(l => l.id !== lineId) };
    });
  };

  const handleImportLRC = async (lines: Omit<LyricLine, 'id' | 'trackId'>[]) => {
    if (!currentTrack) return;
    for (const line of lines) {
      await addLine(currentTrack.id, line.time, line.text);
    }
    const track = await getTrackByAudioId(currentTrack.audioFileId);
    if (track) setCurrentTrack(track);
  };

  const handleLineTimeChange = async (lineId: string, newTime: number) => {
    if (!currentTrack) return;
    const line = currentTrack.lines.find(l => l.id === lineId);
    if (!line) return;
    await handleUpdateLine({ ...line, time: newTime });
  };

  const handleAudioLoaded = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      audioRef.current.volume = volume;
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const progress = (e.clientX - rect.left) / rect.width;
    handleSeek(progress * duration);
  };

  const skipBackward = () => {
    handleSeek(Math.max(0, currentTime - 10));
  };

  const skipForward = () => {
    handleSeek(Math.min(duration, currentTime + 10));
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">🎵 LYRIC SYNC</div>
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'player' ? 'active' : ''}`}
            onClick={() => setViewMode('player')}
          >
            播放器
          </button>
          <button
            className={`view-btn ${viewMode === 'editor' ? 'active' : ''}`}
            onClick={() => setViewMode('editor')}
          >
            编辑器
          </button>
        </div>
      </header>

      <main className="main-content">
        {viewMode === 'player' ? (
          <div className="player-view">
            {!currentAudio ? (
              <div className="upload-section">
                <div
                  className={`upload-area ${dragOver ? 'dragover' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <div className="upload-icon">🎧</div>
                  <p className="upload-text">点击或拖拽上传 MP3 音频文件</p>
                  <p className="upload-hint">支持 MP3 格式，最大 50MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,audio/*"
                  className="hidden-input"
                  onChange={handleFileInput}
                />
                {audioFiles.length > 0 && (
                  <div className="file-list" style={{ width: '100%', maxWidth: 600 }}>
                    {audioFiles.map(file => (
                      <div
                        key={file.id}
                        className={`file-item ${currentAudio?.id === file.id ? 'active' : ''}`}
                        onClick={() => loadAudio(file)}
                      >
                        <span className="file-name">{file.name}</span>
                        <span className="file-duration">{formatTime(file.duration)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <Waveform
                  audioUrl={currentAudio.url}
                  currentTime={currentTime}
                  duration={duration || currentAudio.duration}
                  onSeek={handleSeek}
                />

                <LyricsDisplay
                  lines={currentTrack?.lines || []}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                  onLineTimeChange={handleLineTimeChange}
                />

                <div className="controls-container">
                  <div
                    className="progress-bar"
                    onClick={handleProgressBarClick}
                  >
                    <div
                      className="progress-fill"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="controls">
                    <div className="volume-control">
                      <span style={{ fontSize: 18 }}>🔊</span>
                      <input
                        type="range"
                        className="volume-slider"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                      />
                    </div>
                    <button className="control-btn" onClick={skipBackward} title="后退10秒">
                      ⏪
                    </button>
                    <button className="control-btn play-btn" onClick={togglePlay}>
                      {isPlaying ? '⏸' : '▶'}
                    </button>
                    <button className="control-btn" onClick={skipForward} title="前进10秒">
                      ⏩
                    </button>
                    <button
                      className="control-btn"
                      onClick={() => fileInputRef.current?.click()}
                      title="切换歌曲"
                    >
                      🔄
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".mp3,audio/*"
                      className="hidden-input"
                      onChange={handleFileInput}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <LyricsEditor
            track={currentTrack}
            onAddLine={handleAddLine}
            onUpdateLine={handleUpdateLine}
            onDeleteLine={handleDeleteLine}
            onImportLRC={handleImportLRC}
          />
        )}
      </main>

      {currentAudio && (
        <audio
          ref={audioRef}
          src={currentAudio.url}
          onLoadedMetadata={handleAudioLoaded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
        />
      )}
    </div>
  );
}
