export async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';

    audio.onloadedmetadata = () => {
      window.URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      reject(new Error('无法解析音频文件'));
    };

    audio.src = URL.createObjectURL(file);
  });
}

export async function decodeAudioData(file: File): Promise<AudioBuffer> {
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  return audioContext.decodeAudioData(arrayBuffer);
}

export function generateWaveformData(audioBuffer: AudioBuffer, samples: number = 1000): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / samples);
  const waveform: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[start + j]);
    }
    waveform.push(sum / blockSize);
  }

  const max = Math.max(...waveform);
  return waveform.map((v) => (max > 0 ? v / max : 0));
}

export function drawWaveform(
  canvas: HTMLCanvasElement,
  waveformData: number[],
  options: {
    color?: string;
    backgroundColor?: string;
    barWidth?: number;
    gap?: number;
  } = {}
): void {
  const {
    color = '#e94560',
    backgroundColor = '#16213e',
    barWidth = 2,
    gap = 1,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  const centerY = height / 2;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const totalBars = Math.floor(width / (barWidth + gap));
  const step = Math.ceil(waveformData.length / totalBars);

  ctx.fillStyle = color;

  for (let i = 0; i < totalBars; i++) {
    const dataIndex = Math.min(i * step, waveformData.length - 1);
    const value = waveformData[dataIndex] || 0;
    const barHeight = Math.max(2, value * (height - 20));
    const x = i * (barWidth + gap);
    const y = centerY - barHeight / 2;

    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 1);
    ctx.fill();
  }
}

export function drawSelection(
  canvas: HTMLCanvasElement,
  startTime: number,
  endTime: number,
  duration: number,
  color: string = '#3498db66'
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  const startX = (startTime / duration) * width;
  const endX = (endTime / duration) * width;
  const selectionWidth = Math.max(1, endX - startX);

  ctx.fillStyle = color;
  ctx.fillRect(startX, 0, selectionWidth, height);
}

export function drawPlayhead(
  canvas: HTMLCanvasElement,
  currentTime: number,
  duration: number,
  color: string = '#ffffff'
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  const x = (currentTime / duration) * width;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function timeToX(time: number, duration: number, width: number): number {
  return (time / duration) * width;
}

export function xToTime(x: number, duration: number, width: number): number {
  return Math.max(0, Math.min(duration, (x / width) * duration));
}
