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
  const gradientRef = useRef<CanvasGradient | null>(null);

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
      const samples = 500;
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
    if (!canvas || !audioDataRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const data = audioDataRef.current;
    const barWidth = width / data.length;
    const gap = 1;
    const centerY = height / 2;

    if (!gradientRef.current) {
      gradientRef.current = ctx.createLinearGradient(0, 0, width, 0);
      gradientRef.current.addColorStop(0, '#00ffcc');
      gradientRef.current.addColorStop(1, '#0066ff');
    }

    ctx.clearRect(0, 0, width, height);

    const progress = duration > 0 ? currentTime / duration : 0;
    const progressX = width * progress;

    for (let i = 0; i < data.length; i++) {
      const x = i * barWidth;
      const barHeight = Math.max(2, data[i] * height * 0.8);
      const isPlayed = x < progressX;

      ctx.beginPath();
      ctx.roundRect(x + gap / 2, centerY - barHeight / 2, barWidth - gap, barHeight, 2);
      
      if (isPlayed) {
        ctx.fillStyle = gradientRef.current;
        ctx.shadowColor = 'rgba(0, 255, 204, 0.5)';
        ctx.shadowBlur = 4;
      } else {
        ctx.fillStyle = 'rgba(160, 160, 176, 0.3)';
        ctx.shadowBlur = 0;
      }
      
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 255, 204, 0.8)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [currentTime, duration]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration === 0) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const newTime = progress * duration;
    onSeek(newTime);
  }, [duration, onSeek]);

  useEffect(() => {
    analyzeAudio();
  }, [analyzeAudio]);

  useEffect(() => {
    const render = () => {
      drawWaveform();
      animationFrameRef.current = requestAnimationFrame(render);
    };
    animationFrameRef.current = requestAnimationFrame(render);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawWaveform]);

  useEffect(() => {
    const handleResize = () => {
      gradientRef.current = null;
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
          style={{ height: '120px' }}
          onClick={handleCanvasClick}
        />
        <div className="waveform-time">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
