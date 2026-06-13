export interface FrequencyData {
  lowFrequency: number;
  midFrequency: number;
  highFrequency: number;
  totalVolume: number;
  spectrum: Float32Array;
  isBeat: boolean;
}

type EventCallback = (data: FrequencyData) => void;

class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, data: FrequencyData): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }
}

export class AudioModule extends EventEmitter {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isPlayingFlag: boolean = false;
  private frequencyData: Uint8Array;
  private floatSpectrum: Float32Array;
  private beatHistory: number[] = [];
  private beatCooldown: number = 0;
  private lastUpdateTime: number = 0;
  private animationFrameId: number | null = null;

  constructor() {
    super();
    this.frequencyData = new Uint8Array(32);
    this.floatSpectrum = new Float32Array(32);
  }

  async loadAudioFile(file: File): Promise<void> {
    this.stop();

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.7;

    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.floatSpectrum = new Float32Array(this.analyser.frequencyBinCount);

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    this.beatHistory = [];
    this.beatCooldown = 0;
  }

  play(): void {
    if (!this.audioContext || !this.analyser || !this.audioBuffer) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.stopSource();

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.source.onended = () => {
      this.isPlayingFlag = false;
    };
    this.source.start(0);
    this.isPlayingFlag = true;
    this.startAnalysis();
  }

  pause(): void {
    if (this.source) {
      this.source.stop();
      this.source = null;
    }
    this.isPlayingFlag = false;
    this.stopAnalysis();
  }

  stop(): void {
    this.stopSource();
    this.isPlayingFlag = false;
    this.stopAnalysis();
    this.beatHistory = [];
    this.beatCooldown = 0;
  }

  private stopSource(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {}
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  }

  private startAnalysis(): void {
    this.stopAnalysis();
    this.lastUpdateTime = performance.now();
    this.analyzeLoop();
  }

  private stopAnalysis(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private analyzeLoop = (): void => {
    if (!this.analyser) return;

    const now = performance.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    this.analyser.getByteFrequencyData(this.frequencyData);

    for (let i = 0; i < this.frequencyData.length; i++) {
      this.floatSpectrum[i] = this.frequencyData[i] / 255;
    }

    const lowFreq = this.calculateBandEnergy(0, 10);
    const midFreq = this.calculateBandEnergy(10, 22);
    const highFreq = this.calculateBandEnergy(22, 32);
    const totalVol = this.calculateTotalVolume();

    const isBeat = this.detectBeat(lowFreq, deltaTime);

    if (this.beatCooldown > 0) {
      this.beatCooldown -= deltaTime;
    }

    const data: FrequencyData = {
      lowFrequency: lowFreq,
      midFrequency: midFreq,
      highFrequency: highFreq,
      totalVolume: totalVol,
      spectrum: this.floatSpectrum,
      isBeat: isBeat
    };

    this.emit('frequency', data);

    if (this.isPlayingFlag) {
      this.animationFrameId = requestAnimationFrame(this.analyzeLoop);
    }
  };

  private calculateBandEnergy(start: number, end: number): number {
    let sum = 0;
    const count = end - start;
    for (let i = start; i < end && i < this.floatSpectrum.length; i++) {
      sum += this.floatSpectrum[i];
    }
    return sum / count;
  }

  private calculateTotalVolume(): number {
    let sum = 0;
    for (let i = 0; i < this.floatSpectrum.length; i++) {
      sum += this.floatSpectrum[i];
    }
    return Math.min(1, sum / this.floatSpectrum.length);
  }

  private detectBeat(lowFreq: number, deltaTime: number): boolean {
    this.beatHistory.push(lowFreq);
    if (this.beatHistory.length > 60) {
      this.beatHistory.shift();
    }

    if (this.beatCooldown > 0) return false;

    const avg = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
    const threshold = avg * 1.5;
    const isBeat = lowFreq > threshold && lowFreq > 0.25;

    if (isBeat) {
      this.beatCooldown = 0.15;
    }

    return isBeat;
  }

  getFrequencyData(): FrequencyData {
    const lowFreq = this.calculateBandEnergy(0, 10);
    const midFreq = this.calculateBandEnergy(10, 22);
    const highFreq = this.calculateBandEnergy(22, 32);
    const totalVol = this.calculateTotalVolume();

    return {
      lowFrequency: lowFreq,
      midFrequency: midFreq,
      highFrequency: highFreq,
      totalVolume: totalVol,
      spectrum: this.floatSpectrum,
      isBeat: false
    };
  }

  isPlaying(): boolean {
    return this.isPlayingFlag;
  }

  hasAudioLoaded(): boolean {
    return this.audioBuffer !== null;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  dispose(): void {
    this.stop();
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioBuffer = null;
  }
}
