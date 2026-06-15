export type AudioAnalyzerEvents = {
  onReady: (event: 'ready' | 'play' | 'pause' | 'ended' | 'timeupdate', callback: () => void) => void;
  off: (event: 'ready' | 'play' | 'pause' | 'ended' | 'timeupdate', callback: () => void) => void;
  emit: (event: 'ready' | 'play' | 'pause' | 'ended' | 'timeupdate') => void;
};

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Float32Array;
  private isPlaying = false;
  private startTime = 0;
  private pauseTime = 0;
  private eventListeners: Map<string, Set<() => void>> = new Map();
  private animationFrameId: number | null = null;
  private volume = 0.7;

  constructor() {
    this.frequencyData = new Float32Array(128);
  }

  getFrequencyBinCount(): number {
    return 128;
  }

  getFrequencyData(): Float32Array {
    return this.frequencyData;
  }

  getSampleRate(): number {
    return this.audioContext?.sampleRate ?? 44100;
  }

  isAudioReady(): boolean {
    return this.audioBuffer !== null;
  }

  getDuration(): number {
    return this.audioBuffer?.duration ?? 0;
  }

  getCurrentTime(): number {
    if (!this.isPlaying) {
      return this.pauseTime;
    }
    return (this.audioContext?.currentTime ?? 0) - this.startTime + this.pauseTime;
  }

  getVolume(): number {
    return this.volume;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  on(event: 'ready' | 'play' | 'pause' | 'ended' | 'timeupdate', callback: () => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: 'ready' | 'play' | 'pause' | 'ended' | 'timeupdate', callback: () => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private emit(event: 'ready' | 'play' | 'pause' | 'ended' | 'timeupdate'): void {
    this.eventListeners.get(event)?.forEach((cb) => cb());
  }

  async loadAudioFile(file: File, onProgress?: (progress: number) => void): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(e.loaded / e.total);
        }
      };

      reader.onerror = () => {
        reject(new Error('读取文件失败'));
      };

      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          if (onProgress) onProgress(0.5);
          this.audioBuffer = await this.audioContext!.decodeAudioData(
            arrayBuffer.slice(0),
            () => {
              if (onProgress) onProgress(1.0);
              this.emit('ready');
              resolve();
            },
            (err) => {
              reject(new Error('解码音频失败: ' + (err as Error).message));
            }
          );
          if (onProgress) onProgress(1.0);
          this.emit('ready');
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.readAsArrayBuffer(file);
    });
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer) {
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (this.isPlaying) {
      return;
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.volume;

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pauseTime = 0;
        this.emit('ended');
        this.stopAnimationLoop();
      }
    };

    this.startTime = this.audioContext.currentTime;
    this.source.start(0, this.pauseTime);
    this.isPlaying = true;
    this.emit('play');
    this.startAnimationLoop();
  }

  pause(): void {
    if (this.isPlaying && this.source) {
      this.pauseTime = this.getCurrentTime();
      this.source.stop();
      this.source.disconnect();
      this.source = null;
      this.isPlaying = false;
      this.emit('pause');
      this.stopAnimationLoop();
    }
  }

  stop(): void {
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
    this.pauseTime = 0;
    this.stopAnimationLoop();
  }

  seek(time: number): void {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.pause();
    }
    this.pauseTime = Math.max(0, Math.min(this.getDuration(), time));
    this.emit('timeupdate');
    if (wasPlaying) {
      this.play();
    }
  }

  private startAnimationLoop(): void {
    const update = () => {
      if (this.analyser && this.isPlaying) {
        this.analyser.getFloatFrequencyData(this.frequencyData);
        this.emit('timeupdate');
        this.animationFrameId = requestAnimationFrame(update);
      }
    };
    this.animationFrameId = requestAnimationFrame(update);
  }

  private stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  dispose(): void {
    this.stop();
    this.analyser?.disconnect();
    this.gainNode?.disconnect();
    this.audioContext?.close();
    this.audioBuffer = null;
    this.analyser = null;
    this.source = null;
    this.gainNode = null;
    this.audioContext = null;
  }
}
