import type { AudioState } from '../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/webm', 'audio/ogg'];

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array;

  private startTime = 0;
  private pauseTime = 0;
  private _isPlaying = false;
  private _isLoaded = false;
  private _volume = 0.8;

  constructor(fftSize: number = 1024) {
    this.frequencyData = new Uint8Array(fftSize / 2);
  }

  async loadFile(file: File): Promise<void> {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    if (!ACCEPTED_TYPES.includes(file.type) && !/\.(mp3|wav)$/i.test(file.name)) {
      throw new Error('仅支持 MP3 或 WAV 格式音频');
    }

    this.stop();

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.frequencyData.length * 2;
      this.analyser.smoothingTimeConstant = 0.8;
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this._volume;
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));

    this.audioBuffer = audioBuffer;
    this._isLoaded = true;
    this.pauseTime = 0;
    this._isPlaying = false;
  }

  play(): void {
    if (!this._isLoaded || !this.audioContext || !this.analyser || !this.audioBuffer) return;
    if (this._isPlaying) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.loop = true;
    this.source.connect(this.analyser);

    const offset = this.pauseTime % this.audioBuffer.duration;
    const now = this.audioContext.currentTime;
    this.source.start(0, offset);
    this.startTime = now - offset;
    this._isPlaying = true;

    this.source.onended = () => {
      if (this.source && this.source.buffer) {
        this.pauseTime = 0;
        this._isPlaying = false;
      }
    };
  }

  pause(): void {
    if (!this._isPlaying || !this.source || !this.audioContext) return;
    this.pauseTime = this.getCurrentTime();
    this.source.onended = null;
    try {
      this.source.stop();
    } catch (_e) { /* noop */ }
    this.source.disconnect();
    this.source = null;
    this._isPlaying = false;
  }

  stop(): void {
    if (this.source) {
      this.source.onended = null;
      try { this.source.stop(); } catch (_e) { /* noop */ }
      this.source.disconnect();
      this.source = null;
    }
    this.pauseTime = 0;
    this._isPlaying = false;
  }

  seek(time: number): void {
    if (!this.audioBuffer) return;
    const clamped = Math.max(0, Math.min(time, this.audioBuffer.duration));
    this.pauseTime = clamped;
    if (this._isPlaying) {
      const wasPlaying = this._isPlaying;
      this.pause();
      if (wasPlaying) this.play();
    }
  }

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setTargetAtTime(this._volume, this.audioContext.currentTime, 0.01);
    }
  }

  getFrequencyData(dest: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(dest as Uint8Array<ArrayBuffer>);
    } else {
      dest.fill(0);
    }
  }

  getCurrentTime(): number {
    if (!this.audioBuffer) return 0;
    if (this._isPlaying && this.audioContext) {
      return (this.audioContext.currentTime - this.startTime) % this.audioBuffer.duration;
    }
    return this.pauseTime;
  }

  getState(): AudioState {
    return {
      isPlaying: this._isPlaying,
      isLoaded: this._isLoaded,
      currentTime: this.getCurrentTime(),
      duration: this.audioBuffer?.duration ?? 0,
      volume: this._volume
    };
  }

  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.gainNode = null;
    this.audioBuffer = null;
  }
}
