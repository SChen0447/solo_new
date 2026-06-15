import { useRef } from 'react';
import { useAppStore } from '../store';
import './AudioBar.css';

interface AudioBarProps {
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onUploadFile: (file: File) => void;
  audioAnalyzerRef: React.MutableRefObject<{
    getCurrentTime: () => number;
    getDuration: () => number;
    getIsPlaying: () => boolean;
  } | null>;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function AudioBar({
  onTogglePlay,
  onSeek,
  onStartRecording,
  onStopRecording,
  onUploadFile,
  audioAnalyzerRef,
}: AudioBarProps) {
  const { isRecording, isPlaying, volume, currentTime, duration, audioFile } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * duration;
    onSeek(time);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'audio/wav' || file.type === 'audio/mpeg' || file.type === 'audio/mp3')) {
      if (file.size <= 20 * 1024 * 1024) {
        onUploadFile(file);
      } else {
        alert('文件大小不能超过20MB');
      }
    }
    e.target.value = '';
  };

  const handleRecordClick = () => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="audio-bar">
      <div className="audio-controls">
        <button
          className={`record-btn ${isRecording ? 'recording' : ''}`}
          onClick={handleRecordClick}
          title={isRecording ? '停止录制' : '开始录制'}
        >
          <span className="record-dot" />
          {isRecording && <span className="record-pulse" />}
        </button>

        <button
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
          title="上传音频文件"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          上传
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3,audio/wav,audio/mpeg"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>

      <div className="progress-section">
        <button
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={onTogglePlay}
          disabled={!audioFile && !isRecording}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <div className="progress-container">
          <div
            ref={progressRef}
            className="progress-bar"
            onClick={handleProgressClick}
          >
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="progress-thumb"
              style={{ left: `${progressPercent}%` }}
            />
          </div>
          <div className="time-display">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <div className="volume-section">
        <svg className="volume-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
        <div className="volume-bar">
          <div
            className="volume-fill"
            style={{ width: `${volume}%` }}
          />
        </div>
        <span className="volume-value">{volume}</span>
      </div>
    </div>
  );
}
