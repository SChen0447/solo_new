export interface PerformanceData {
  fps: number;
  cpu: number;
  memory: number;
  network: number;
  frameTime: number;
  gpu: number;
}

interface Snapshot {
  timestamp: number;
  data: PerformanceData;
}

export type MetricKey = keyof PerformanceData;

export const METRIC_KEYS: MetricKey[] = ['fps', 'cpu', 'memory', 'network', 'frameTime', 'gpu'];

const BUFFER_SIZE = 60;
const EMA_ALPHA = 0.3;

const ringBuffer: Snapshot[] = [];
let writeIndex = 0;
let isPaused = false;
let lastFrameTime = performance.now();
let lastFPSUpdate = performance.now();
let frameCount = 0;
let smoothedData: PerformanceData = {
  fps: 60, cpu: 30, memory: 40, network: 80, frameTime: 16, gpu: 35
};
let rawData: PerformanceData = {
  fps: 60, cpu: 30, memory: 40, network: 80, frameTime: 16, gpu: 35
};

function ema(prev: number, current: number, alpha: number = EMA_ALPHA): number {
  return alpha * current + (1 - alpha) * prev;
}

function calculateFPS(): number {
  const now = performance.now();
  frameCount++;
  
  if (now - lastFPSUpdate >= 1000) {
    const elapsed = (now - lastFPSUpdate) / 1000;
    const fps = Math.round(frameCount / elapsed);
    frameCount = 0;
    lastFPSUpdate = now;
    return Math.min(120, Math.max(0, fps));
  }
  return -1;
}

function estimateCPU(frameDelta: number): number {
  const cores = navigator.hardwareConcurrency || 4;
  const busyRatio = Math.min(1, frameDelta / 16.67);
  const baseLoad = 20 + Math.sin(Date.now() / 8000) * 10;
  const estimated = baseLoad + busyRatio * (100 / cores) * 3;
  return Math.min(100, Math.max(0, estimated));
}

function getMemoryUsage(): number {
  const perf = performance as any;
  if (perf.memory && perf.memory.jsHeapSizeLimit) {
    const usage = (perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit) * 100;
    return Math.min(100, Math.max(0, usage));
  }
  return 35 + Math.sin(Date.now() / 6000) * 15 + (Math.random() - 0.5) * 5;
}

function getNetworkLatency(): number {
  try {
    const resources = performance.getEntriesByType('resource');
    if (resources.length > 0) {
      const recent = resources.slice(-10);
      const latencies = recent.map(r => {
        if ('responseEnd' in r && 'requestStart' in r) {
          return (r as PerformanceResourceTiming).responseEnd - (r as PerformanceResourceTiming).requestStart;
        }
        return 0;
      }).filter(v => v > 0);
      if (latencies.length > 0) {
        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        return Math.min(500, Math.max(0, avg));
      }
    }
  } catch (e) {
    // ignore
  }
  return 60 + Math.sin(Date.now() / 4000) * 40 + (Math.random() - 0.5) * 15;
}

function getFrameTime(delta: number): number {
  return Math.min(50, Math.max(0, delta));
}

function estimateGPU(): number {
  return 30 + Math.sin(Date.now() / 7000) * 20 + (Math.random() - 0.5) * 10;
}

function collectRawData(): PerformanceData {
  const now = performance.now();
  const delta = now - lastFrameTime;
  lastFrameTime = now;

  const fps = calculateFPS();
  if (fps >= 0) {
    rawData.fps = fps;
  }
  
  rawData.cpu = estimateCPU(delta);
  rawData.memory = getMemoryUsage();
  rawData.network = getNetworkLatency();
  rawData.frameTime = getFrameTime(delta);
  rawData.gpu = estimateGPU();

  return { ...rawData };
}

function smoothData(raw: PerformanceData): PerformanceData {
  smoothedData.fps = ema(smoothedData.fps, raw.fps);
  smoothedData.cpu = ema(smoothedData.cpu, raw.cpu);
  smoothedData.memory = ema(smoothedData.memory, raw.memory);
  smoothedData.network = ema(smoothedData.network, raw.network);
  smoothedData.frameTime = ema(smoothedData.frameTime, raw.frameTime);
  smoothedData.gpu = ema(smoothedData.gpu, raw.gpu);
  return { ...smoothedData };
}

function writeToBuffer(data: PerformanceData): void {
  const snapshot: Snapshot = {
    timestamp: Date.now(),
    data: { ...data }
  };
  
  if (ringBuffer.length < BUFFER_SIZE) {
    ringBuffer.push(snapshot);
  } else {
    ringBuffer[writeIndex] = snapshot;
  }
  writeIndex = (writeIndex + 1) % BUFFER_SIZE;
}

export function startDataCollection(): void {
  for (let i = 0; i < BUFFER_SIZE; i++) {
    const initialData: PerformanceData = {
      fps: 60, cpu: 30, memory: 40, network: 80, frameTime: 16, gpu: 35
    };
    ringBuffer.push({
      timestamp: Date.now() - (BUFFER_SIZE - i) * 1000,
      data: initialData
    });
  }
}

export function updateData(): PerformanceData {
  if (isPaused) {
    return getCurrentData();
  }

  const raw = collectRawData();
  const smoothed = smoothData(raw);
  writeToBuffer(smoothed);
  return smoothed;
}

export function getCurrentData(): PerformanceData {
  if (ringBuffer.length === 0) {
    return { ...smoothedData };
  }
  const readIndex = writeIndex === 0 ? ringBuffer.length - 1 : writeIndex - 1;
  return { ...ringBuffer[readIndex].data };
}

export function getSnapshot(offset: number): PerformanceData | null {
  if (ringBuffer.length === 0) return null;
  
  const normalizedOffset = Math.max(0, Math.min(BUFFER_SIZE - 1, Math.floor(offset)));
  const readIndex = (writeIndex - 1 - normalizedOffset + BUFFER_SIZE) % BUFFER_SIZE;
  
  if (readIndex >= 0 && readIndex < ringBuffer.length && ringBuffer[readIndex]) {
    return { ...ringBuffer[readIndex].data };
  }
  return null;
}

export function getHistoryRange(startOffset: number, endOffset: number): PerformanceData[] {
  const result: PerformanceData[] = [];
  for (let i = startOffset; i <= endOffset; i++) {
    const snapshot = getSnapshot(i);
    if (snapshot) {
      result.push(snapshot);
    }
  }
  return result;
}

export function pauseUpdates(): void {
  isPaused = true;
}

export function resumeUpdates(): void {
  isPaused = false;
}

export function isUpdatePaused(): boolean {
  return isPaused;
}

export function getBufferSize(): number {
  return BUFFER_SIZE;
}
