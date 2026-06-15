export interface BandEnergy {
  low: number;
  mid: number;
  high: number;
}

export interface AnalysisResult {
  frequencyData: Float32Array;
  volume: number;
  bpm: number;
  bandEnergy: BandEnergy;
}

const FFT_SIZE = 512;
const FREQUENCY_BINS = 256;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private frequencyData: Float32Array;
  private animationId: number | null = null;
  private onAnalyse: ((result: AnalysisResult) => void) | null = null;

  private bpmHistory: number[] = [];
  private lastBeatTime: number = 0;
  private beatThreshold: number = 0.7;
  private bpmSmoothing: number = 0.9;
  private currentBpm: number = 0;

  private audioElement: HTMLAudioElement | null = null;
  private mediaStream: MediaStream | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;
  private duration: number = 0;

  constructor() {
    this.frequencyData = new Float32Array(FREQUENCY_BINS);
  }

  setOnAnalyseCallback(callback: (result: AnalysisResult) => void) {
    this.onAnalyse = callback;
  }

  async startMicrophone(): Promise<void> {
    this.stop();

    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0;

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.source.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.duration = 0;
      this.startTime = this.audioContext.currentTime;
      this.isPlaying = true;

      this.startAnalysisLoop();
    } catch (error) {
      console.error('麦克风启动失败:', error);
      throw error;
    }
  }

  async loadAudioFile(file: File): Promise<number> {
    this.stop();

    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      const arrayBuffer = await file.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.duration = this.audioBuffer.duration;

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1;

      const source = this.audioContext.createBufferSource();
      source.buffer = this.audioBuffer;
      source.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.source = source;
      this.isPlaying = false;
      this.pauseTime = 0;

      return this.duration;
    } catch (error) {
      console.error('音频文件加载失败:', error);
      throw error;
    }
  }

  playFile(offset: number = 0): void {
    if (!this.audioContext || !this.audioBuffer) return;

    if (this.source && this.source instanceof AudioBufferSourceNode) {
      this.source.stop();
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = this.audioBuffer;
    source.connect(this.analyser!);
    source.onended = () => {
      this.isPlaying = false;
    };

    this.source = source;
    this.startTime = this.audioContext.currentTime - offset;
    this.pauseTime = 0;
    source.start(0, offset);
    this.isPlaying = true;

    if (!this.animationId) {
      this.startAnalysisLoop();
    }
  }

  pauseFile(): void {
    if (!this.isPlaying || !this.source || !this.audioContext) return;

    if (this.source instanceof AudioBufferSourceNode) {
      this.pauseTime = this.getCurrentTime();
      this.source.stop();
      this.isPlaying = false;
    }
  }

  resumeFile(): void {
    if (this.isPlaying || !this.audioBuffer) return;
    this.playFile(this.pauseTime);
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) {
      return this.pauseTime;
    }
    return this.audioContext.currentTime - this.startTime;
  }

  getDuration(): number {
    return this.duration;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  seek(time: number): void {
    if (!this.audioBuffer) return;
    
    const clampedTime = Math.max(0, Math.min(time, this.duration));
    
    if (this.isPlaying) {
      this.playFile(clampedTime);
    } else {
      this.pauseTime = clampedTime;
    }
  }

  private startAnalysisLoop(): void {
    const analyze = () => {
      if (!this.analyser) return;

      this.analyser.getFloatFrequencyData(this.frequencyData);

      const normalizedData = new Float32Array(FREQUENCY_BINS);
      for (let i = 0; i < FREQUENCY_BINS; i++) {
        const dbValue = this.frequencyData[i];
        normalizedData[i] = Math.max(0, Math.min(1, (dbValue + 100) / 100));
      }

      const volume = this.calculateVolume(normalizedData);
      const bandEnergy = this.calculateBandEnergy(normalizedData);
      const bpm = this.calculateBPM(bandEnergy.low);

      const result: AnalysisResult = {
        frequencyData: normalizedData,
        volume,
        bpm,
        bandEnergy,
      };

      if (this.onAnalyse) {
        this.onAnalyse(result);
      }

      this.animationId = requestAnimationFrame(analyze);
    };

    analyze();
  }

  private calculateVolume(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const average = sum / data.length;
    return Math.round(Math.min(100, average * 150));
  }

  private calculateBandEnergy(data: Float32Array): BandEnergy {
    const sampleRate = 44100;
    const binFrequency = sampleRate / FFT_SIZE;

    const lowStart = Math.floor(20 / binFrequency);
    const lowEnd = Math.floor(250 / binFrequency);
    const midStart = lowEnd;
    const midEnd = Math.floor(2000 / binFrequency);
    const highStart = midEnd;
    const highEnd = Math.min(FREQUENCY_BINS - 1, Math.floor(20000 / binFrequency));

    const calculateAverage = (start: number, end: number): number => {
      if (start >= end) return 0;
      let sum = 0;
      for (let i = start; i < end; i++) {
        sum += data[i];
      }
      return sum / (end - start);
    };

    return {
      low: calculateAverage(lowStart, lowEnd),
      mid: calculateAverage(midStart, midEnd),
      high: calculateAverage(highStart, highEnd),
    };
  }

  private calculateBPM(lowEnergy: number): number {
    const now = performance.now();

    if (lowEnergy > this.beatThreshold && now - this.lastBeatTime > 300) {
      const interval = now - this.lastBeatTime;
      const instantBpm = 60000 / interval;

      if (instantBpm >= 60 && instantBpm <= 200) {
        this.bpmHistory.push(instantBpm);
        if (this.bpmHistory.length > 10) {
          this.bpmHistory.shift();
        }

        const avgBpm = this.bpmHistory.reduce((a, b) => a + b, 0) / this.bpmHistory.length;
        
        if (this.currentBpm === 0) {
          this.currentBpm = avgBpm;
        } else {
          this.currentBpm = this.currentBpm * this.bpmSmoothing + avgBpm * (1 - this.bpmSmoothing);
        }
      }

      this.lastBeatTime = now;
    }

    if (now - this.lastBeatTime > 3000) {
      this.currentBpm = Math.max(0, this.currentBpm * 0.99);
    }

    return Math.round(this.currentBpm * 10) / 10;
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.source && this.source instanceof AudioBufferSourceNode) {
      try {
        this.source.stop();
      } catch (e) {
        // ignore
      }
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.source = null;
    this.audioBuffer = null;
    this.isPlaying = false;
    this.bpmHistory = [];
    this.currentBpm = 0;
    this.lastBeatTime = 0;
  }

  destroy(): void {
    this.stop();
    this.onAnalyse = null;
  }
}
