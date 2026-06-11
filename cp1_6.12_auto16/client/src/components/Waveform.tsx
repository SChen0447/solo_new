import { useEffect, useRef, useCallback } from 'react';

interface WaveformProps {
  audioUrl: string;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export default function Waveform({ audioUrl, currentTime, duration, onSeek }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioDataRef = useRef<Float32Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gradientPlayedRef = useRef<CanvasGradient | null>(null);
  const gradientUnplayedRef = useRef<CanvasGradient | null>(null);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);

  currentTimeRef.current = currentTime;
  durationRef.current = duration;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const analyzeAudio = useCallback(async () => {
    if (!audioUrl) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const rawData = audioBuffer.getChannelData(0);
      const samples = 1000;
      const blockSize = Math.floor(rawData.length / samples);
      const filteredData = new Float32Array(samples);

      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[i * blockSize + j]);
        }
        filteredData[i] = sum / blockSize;
      }

      const maxVal = Math.max(...filteredData);
      for (let i = 0; i < filteredData.length; i++) {
        filteredData[i] = filteredData[i] / maxVal;
      }

      audioDataRef.current = filteredData;
      audioContext.close();
    } catch (error) {
      console.error('Error analyzing audio:', error);
    }
  }, [audioUrl]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      gradientPlayedRef.current = null;
      gradientUnplayedRef.current = null;
    }
    
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = rect.width;
    const height = rect.height;
    const data = audioDataRef.current;
    const currentDur = durationRef.current;
    const currentT = currentTimeRef.current;

    ctx.clearRect(0, 0, width, height);

    if (!data) {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
      return;
    }

    const barWidth = width / data.length;
    const gap = Math.max(0.5, barWidth * 0.2);
    const centerY = height / 2;
    const progress = currentDur > 0 ? currentT / currentDur : 0;
    const progressX = width * progress;

    if (!gradientPlayedRef.current) {
      gradientPlayedRef.current = ctx.createLinearGradient(0, 0, width, 0);
      gradientPlayedRef.current.addColorStop(0, '#00ffcc');
      gradientPlayedRef.current.addColorStop(1, '#0066ff');
    }

    if (!gradientUnplayedRef.current) {
      gradientUnplayedRef.current = ctx.createLinearGradient(0, 0, width, 0);
      gradientUnplayedRef.current.addColorStop(0, 'rgba(100, 100, 120, 0.5)');
      gradientUnplayedRef.current.addColorStop(1, 'rgba(60, 60, 80, 0.5)');
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, progressX, height);
    ctx.clip();
    
    for (let i = 0; i < data.length; i++) {
      const x = i * barWidth;
      const barHeight = Math.max(1, data[i] * height * 0.85);
      ctx.fillStyle = gradientPlayedRef.current;
      ctx.shadowColor = 'rgba(0, 255, 204, 0.6)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(x + gap / 2, centerY - barHeight / 2, barWidth - gap, barHeight, 1.5);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(progressX, 0, width - progressX, height);
    ctx.clip();
    
    for (let i = 0; i < data.length; i++) {
      const x = i * barWidth;
      const barHeight = Math.max(1, data[i] * height * 0.85);
      ctx.fillStyle = gradientUnplayedRef.current;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.roundRect(x + gap / 2, centerY - barHeight / 2, barWidth - gap, barHeight, 1.5);
      ctx.fill();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 255, 204, 0.9)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const lineGrad = ctx.createLinearGradient(progressX - 15, 0, progressX + 15, 0);
    lineGrad.addColorStop(0, 'rgba(0, 255, 204, 0)');
    lineGrad.addColorStop(0.5, 'rgba(0, 255, 204, 0.15)');
    lineGrad.addColorStop(1, 'rgba(0, 255, 204, 0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(progressX - 15, 0, 30, height);

    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || durationRef.current === 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progressRatio = Math.max(0, Math.min(1, x / rect.width));
    const newTime = progressRatio * durationRef.current;
    onSeek(newTime);
  }, [onSeek]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const isSeeking = true;
    
    const handleMouseMove = (ev: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || durationRef.current === 0 || !isSeeking) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const progressRatio = Math.max(0, Math.min(1, x / rect.width));
      const newTime = progressRatio * durationRef.current;
      onSeek(newTime);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    handleCanvasClick(e);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [onSeek, handleCanvasClick]);

  useEffect(() => {
    analyzeAudio();
  }, [analyzeAudio]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(drawWaveform);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawWaveform]);

  useEffect(() => {
    const handleResize = () => {
      gradientPlayedRef.current = null;
      gradientUnplayedRef.current = null;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="waveform-container">
      <div className="waveform-wrapper">
        <canvas
          ref={canvasRef}
          className="waveform-canvas"
          style={{ height: '140px' }}
          onMouseDown={handleMouseDown}
        />
        <div className="waveform-time">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
