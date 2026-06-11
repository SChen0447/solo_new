import React, { useState, useRef, useCallback } from 'react';
import type { LoadProgress } from './audio/AudioEngine';

interface FileUploadProps {
  onFileLoaded: (arrayBuffer: ArrayBuffer, fileName: string) => void;
  onProgress?: (progress: LoadProgress) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileLoaded, onProgress }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<LoadProgress>({ loaded: 0, total: 0, percent: 0 });
  const [isReading, setIsReading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleProgress = useCallback((p: LoadProgress) => {
    setProgress(p);
    if (onProgress) onProgress(p);
  }, [onProgress]);

  const handleFile = useCallback((file: File) => {
    if (!file) return;

    const validTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/flac',
      'audio/aac',
      'audio/mp4',
      'audio/x-m4a'
    ];

    const isAudio = validTypes.includes(file.type) || /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(file.name);
    if (!isAudio) {
      setError('请上传有效的音频文件 (MP3, WAV, OGG, FLAC 等)');
      return;
    }

    setError(null);
    setFileName(file.name);
    setIsReading(true);
    handleProgress({ loaded: 0, total: file.size, percent: 0 });

    const reader = new FileReader();

    reader.onprogress = (e: ProgressEvent<FileReader>) => {
      if (e.lengthComputable && typeof e.total === 'number' && e.total > 0) {
        const ratio = e.loaded / e.total;
        const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
        handleProgress({
          loaded: e.loaded,
          total: e.total,
          percent
        });
      } else if (e.lengthComputable && e.total === 0) {
        handleProgress({
          loaded: e.loaded,
          total: e.total,
          percent: e.loaded > 0 ? 100 : 0
        });
      }
    };

    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        handleProgress({ loaded: file.size, total: file.size, percent: 100 });
        setTimeout(() => {
          onFileLoaded(buffer, file.name);
        }, 250);
      }
    };

    reader.onerror = () => {
      setError('文件读取失败，请重试');
      setIsReading(false);
    };

    reader.readAsArrayBuffer(file);
  }, [handleProgress, onFileLoaded]);

  const resetState = useCallback(() => {
    setFileName('');
    setIsReading(false);
    setProgress({ loaded: 0, total: 0, percent: 0 });
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="file-upload-wrapper">
      <div
        className={`file-upload-area ${isDragging ? 'dragging' : ''} ${isReading ? 'reading' : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="file-input"
          onChange={handleInputChange}
        />

        {!isReading ? (
          <div className="upload-content">
            <div className="upload-icon">
              <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="uploadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <path
                  d="M32 8 L52 20 L52 48 L12 48 L12 20 Z"
                  fill="none"
                  stroke="url(#uploadGrad)"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <path
                  d="M32 20 L32 40 M24 28 L32 20 L40 28"
                  fill="none"
                  stroke="url(#uploadGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M22 48 C22 42 26 40 32 40 C38 40 42 42 42 48"
                  fill="none"
                  stroke="url(#uploadGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="upload-text">
              <h3>上传音乐文件</h3>
              <p>点击选择 或 将文件拖放到此处</p>
              <span className="upload-hint">支持 MP3, WAV, OGG, FLAC, AAC 等格式</span>
            </div>
          </div>
        ) : (
          <div className="reading-content">
            <div className="progress-ring">
              <svg viewBox="0 0 120 120" className="progress-ring-svg">
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="rgba(139,92,246,0.12)"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="url(#ringGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress.percent / 100)}`}
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dashoffset 0.25s ease' }}
                />
                <defs>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="progress-percent">{progress.percent}%</div>
            </div>
            <div className="progress-info">
              <div className="progress-filename" title={fileName}>
                {fileName}
              </div>
              <div className="progress-sizes">
                <span>{formatSize(progress.loaded)}</span>
                <span className="progress-sep">/</span>
                <span>{formatSize(progress.total)}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="upload-error">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                d="M12 2 L2 22 L22 22 Z M12 10 L12 16 M12 18 L12 18.01"
                fill="#f87171"
                stroke="#f87171"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            {error}
          </div>
        )}
      </div>

      {(isReading || fileName) && !error && (
        <button
          type="button"
          className={`btn-ripple clear-btn ${isReading ? 'disabled' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!isReading) resetState();
          }}
          disabled={isReading}
        >
          清除
        </button>
      )}
    </div>
  );
};
