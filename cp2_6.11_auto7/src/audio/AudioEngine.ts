export type AudioEngineEvent =
  | 'loaded'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'ended'
  | 'timeupdate'
  | 'progress';

export interface LoadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;
  private frequencyData: Uint8Array = new Uint8Array();
  private subscribers: Map<AudioEngineEvent, Set<(data?: any) => void>> = new Map();
  private duration: number = 0;
  private currentTime: number = 0;
  private animationFrameId: number | null = null;
  private volume: number = 1;
  private muted: boolean = false;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AC();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.85;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    } catch (e) {
      console.error('Web Audio API 不支持:', e);
    }
  }

  private async ensureContextRunning(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  private emit(event: AudioEngineEvent, data?: any): void {
    const listeners = this.subscribers.get(event);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }

  on(event: AudioEngineEvent, callback: (data?: any) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: AudioEngineEvent, callback: (data?: any) => void): void {
    const listeners = this.subscribers.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  async loadFromArrayBuffer(arrayBuffer: ArrayBuffer, onProgress?: (p: LoadProgress) => void): Promise<void> {
    if (!this.audioContext) throw new Error('AudioContext 未初始化');

    try {
      if (onProgress) {
        const total = arrayBuffer.byteLength;
        let simulated = 0;
        const interval = setInterval(() => {
          simulated += Math.random() * 8192;
          if (simulated >= total * 0.85) {
            simulated = total * 0.85;
            clearInterval(interval);
          }
          onProgress({
            loaded: simulated,
            total,
            percent: Math.round((simulated / total) * 100)
          });
        }, 30);
      }

      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      this.duration = this.audioBuffer.duration;
      this.currentTime = 0;
      this.pauseTime = 0;

      if (onProgress) {
        onProgress({
          loaded: arrayBuffer.byteLength,
          total: arrayBuffer.byteLength,
          percent: 100
        });
      }

      this.emit('loaded', { duration: this.duration });
    } catch (e) {
      console.error('音频解码失败:', e);
      throw e;
    }
  }

  async start(offset?: number): Promise<void> {
    if (!this.audioContext || !this.audioBuffer || !this.analyser || !this.gainNode) {
      throw new Error('音频尚未加载');
    }

    await this.ensureContextRunning();
    this.stop();

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);

    const startOffset = offset ?? this.pauseTime;
    this.source.start(0, startOffset);
    this.startTime = this.audioContext.currentTime - startOffset;
    this.isPlaying = true;

    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pauseTime = 0;
        this.currentTime = this.duration;
        this.stopTimeUpdateLoop();
        this.emit('ended');
        this.emit('stopped');
      }
    };

    this.startTimeUpdateLoop();
    this.emit('playing');
  }

  pause(): void {
    if (!this.isPlaying || !this.audioContext || !this.source) return;

    try {
      this.source.onended = null;
      this.source.stop();
      this.pauseTime = this.audioContext.currentTime - this.startTime;
      this.currentTime = this.pauseTime;
    } catch (e) {
      // ignore
    }

    this.isPlaying = false;
    this.source = null;
    this.stopTimeUpdateLoop();
    this.emit('paused', { currentTime: this.currentTime });
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
      } catch (e) {
        // ignore
      }
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
    this.stopTimeUpdateLoop();
  }

  reset(): void {
    this.stop();
    this.pauseTime = 0;
    this.currentTime = 0;
    this.audioBuffer = null;
    this.duration = 0;
    this.emit('stopped');
  }

  async seek(time: number): Promise<void> {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.pauseTime = Math.max(0, Math.min(time, this.duration));
    this.currentTime = this.pauseTime;
    if (wasPlaying) {
      await this.start(this.pauseTime);
    }
  }

  getFrequencyData(): Uint8Array {
    if (this.analyser) {
      const analyser = this.analyser as AnalyserNode;
      const target = this.frequencyData as unknown as Uint8Array<ArrayBuffer>;
      analyser.getByteFrequencyData(target);
    }
    return this.frequencyData;
  }

  getFrequencyBinCount(): number {
    return this.analyser ? this.analyser.frequencyBinCount : 0;
  }

  private startTimeUpdateLoop(): void {
    this.stopTimeUpdateLoop();
    const update = () => {
      if (!this.isPlaying || !this.audioContext) return;
      this.currentTime = this.audioContext.currentTime - this.startTime;
      if (this.currentTime > this.duration) this.currentTime = this.duration;
      this.emit('timeupdate', {
        currentTime: this.currentTime,
        duration: this.duration,
        percent: this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0
      });
      this.animationFrameId = requestAnimationFrame(update);
    };
    this.animationFrameId = requestAnimationFrame(update);
  }

  private stopTimeUpdateLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gainNode) {
      this.gainNode.gain.value = this.muted ? 0 : this.volume;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.gainNode) {
      this.gainNode.gain.value = m ? 0 : this.volume;
    }
  }

  getMuted(): boolean {
    return this.muted;
  }

  getDuration(): number {
    return this.duration;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getIsLoaded(): boolean {
    return this.audioBuffer !== null;
  }

  destroy(): void {
    this.stop();
    this.subscribers.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.gainNode = null;
    this.audioBuffer = null;
  }
}
