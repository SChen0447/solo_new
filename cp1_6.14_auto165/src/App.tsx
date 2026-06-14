import React, { useRef, useEffect, useState, useCallback } from 'react';
import audioAnalyzer, { getAudioData, AudioData } from './audioAnalyzer';
import {
  createParticleScene,
  updateParticles,
  resetParticles,
  destroyParticleScene,
  ParticleScene,
  VisualStyle,
} from './particleSystem';
import { useAppStore } from './store';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const particleSceneRef = useRef<ParticleScene | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    visualStyle,
    isRecording,
    audioLoaded,
    fileName,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    setVisualStyle,
    setIsRecording,
    setAudioLoaded,
    setFileName,
  } = useAppStore();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.includes('audio/mp3') && !file.type.includes('audio/wav') && !file.type.includes('audio/mpeg') && !file.type.includes('audio/x-wav')) {
      alert('请上传 MP3 或 WAV 格式的音频文件');
      return;
    }

    try {
      const duration = await audioAnalyzer.loadAudioFile(file);
      setDuration(duration);
      setFileName(file.name);
      setAudioLoaded(true);
      audioAnalyzer.setVolume(volume);
      audioAnalyzer.play(() => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
      setIsPlaying(true);
    } catch (error) {
      console.error('音频加载失败:', error);
      alert('音频加载失败，请重试');
    }
  }, [volume, setDuration, setFileName, setAudioLoaded, setIsPlaying, setCurrentTime]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const togglePlayPause = () => {
    if (!audioLoaded) return;
    if (isPlaying) {
      audioAnalyzer.pause();
      setIsPlaying(false);
    } else {
      audioAnalyzer.play(() => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    audioAnalyzer.seek(time);
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    audioAnalyzer.setVolume(vol);
  };

  const handleStyleChange = (style: VisualStyle) => {
    if (style === visualStyle || isTransitioning) return;
    setIsTransitioning(true);
    setVisualStyle(style);
    if (particleSceneRef.current) {
      resetParticles(particleSceneRef.current, style);
    }
    setTimeout(() => setIsTransitioning(false), 400);
  };

  const startRecording = async () => {
    if (!canvasRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 60,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });

      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTracks = [
        ...stream.getAudioTracks(),
        ...audioStream.getAudioTracks()
      ];
      
      const combinedStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...audioTracks
      ]);

      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

      mediaRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 8000000,
      });

      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setShowDownload(true);
        stream.getTracks().forEach(track => track.stop());
        audioStream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('录制失败:', error);
      alert('录制失败，请确保已授权屏幕录制权限');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `music-visualizer-${Date.now()}.webm`;
    a.click();
  };

  const closeDownloadModal = () => {
    setShowDownload(false);
    URL.revokeObjectURL(downloadUrl);
    setDownloadUrl('');
  };

  const drawWaveform = useCallback((audioData: AudioData) => {
    const canvas = waveformRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { timeDomainData, frequencyData } = audioData;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const barCount = 128;
    const barWidth = width / barCount;
    const freqStep = Math.floor(frequencyData.length / barCount);

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < freqStep; j++) {
        const val = frequencyData[i * freqStep + j];
        sum += Math.max(0, Math.min(1, (val + 100) / 90));
      }
      const avg = sum / freqStep;
      const barHeight = avg * height * 0.8;

      const ratio = i / barCount;
      let hue: number;
      if (ratio < 0.33) {
        hue = 240 - (ratio / 0.33) * 60;
      } else if (ratio < 0.66) {
        hue = 180 - ((ratio - 0.33) / 0.33) * 90;
      } else {
        hue = 90 - ((ratio - 0.66) / 0.34) * 90;
      }

      ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
      ctx.fillRect(
        i * barWidth,
        height - barHeight,
        barWidth - 1,
        barHeight
      );
    }

    ctx.beginPath();
    ctx.lineWidth = 2;
    const sliceWidth = width / timeDomainData.length;
    let x = 0;

    for (let i = 0; i < timeDomainData.length; i++) {
      const v = timeDomainData[i];
      const y = height / 2 + v * height * 0.4;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'rgba(0, 150, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 150, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 100, 100, 0.8)');
    ctx.strokeStyle = gradient;
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    particleSceneRef.current = createParticleScene(canvasRef.current, visualStyle);
    lastTimeRef.current = performance.now();

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const currentTime = performance.now();
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      const audioData = getAudioData();
      
      if (particleSceneRef.current) {
        updateParticles(particleSceneRef.current, audioData, deltaTime);
      }

      if (audioLoaded && waveformRef.current) {
        drawWaveform(audioData);
      }

      if (audioLoaded) {
        const currentAudioTime = audioAnalyzer.getCurrentTime();
        setCurrentTime(currentAudioTime);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      if (particleSceneRef.current) {
        destroyParticleScene(particleSceneRef.current);
      }
      audioAnalyzer.destroy();
    };
  }, []);

  useEffect(() => {
    if (waveformRef.current) {
      waveformRef.current.width = waveformRef.current.offsetWidth;
      waveformRef.current.height = waveformRef.current.offsetHeight;
    }
  }, [audioLoaded]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="app-container">
      <div 
        ref={canvasRef} 
        className={`canvas-container ${isTransitioning ? 'transitioning' : ''}`}
      />

      {!audioLoaded && (
        <div
          className={`upload-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <div className="upload-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <p className="upload-text">拖拽或点击上传音频</p>
          <p className="upload-subtext">支持 MP3、WAV 格式</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {audioLoaded && (
        <div className="controls-panel">
          <div className="file-info">
            <span className="file-name">{fileName}</span>
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <div className="progress-container">
            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ width: `${progressPercent}%` }}
              />
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.01"
                value={currentTime}
                onChange={handleSeek}
                className="progress-slider"
                style={{ 
                  background: `linear-gradient(to right, 
                    #6366f1 ${progressPercent}%, 
                    rgba(255,255,255,0.2) ${progressPercent}%)` 
                }}
              />
            </div>
          </div>

          <div className="controls-row">
            <button 
              className="play-button"
              onClick={togglePlayPause}
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

            <div className="volume-control">
              <svg viewBox="0 0 24 24" fill="currentColor" className="volume-icon">
                <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5" />
                <path d="M15.54,8.46a5,5 0 0,1 0,7.07" />
                <path d="M19.07,4.93a10,10 0 0,1 0,14.14" />
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
            </div>
          </div>

          <canvas ref={waveformRef} className="waveform-canvas" />
        </div>
      )}

      <div className="style-panel">
        <div className="style-buttons">
          <button
            className={`style-button galaxy ${visualStyle === 'galaxy' ? 'active' : ''}`}
            onClick={() => handleStyleChange('galaxy')}
            title="星空风格"
          >
            <span className="style-tooltip">星空</span>
          </button>
          <button
            className={`style-button fire ${visualStyle === 'fire' ? 'active' : ''}`}
            onClick={() => handleStyleChange('fire')}
            title="火焰风格"
          >
            <span className="style-tooltip">火焰</span>
          </button>
          <button
            className={`style-button water ${visualStyle === 'water' ? 'active' : ''}`}
            onClick={() => handleStyleChange('water')}
            title="水波风格"
          >
            <span className="style-tooltip">水波</span>
          </button>
        </div>

        <button
          className={`record-button ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? '停止录制' : '开始录制'}
        >
          <span className="record-dot" />
        </button>
      </div>

      {showDownload && (
        <div className="modal-overlay" onClick={closeDownloadModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>录制完成</h3>
            <p>视频已准备好，是否下载？</p>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={closeDownloadModal}>取消</button>
              <button className="btn-download" onClick={handleDownload}>下载视频</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
