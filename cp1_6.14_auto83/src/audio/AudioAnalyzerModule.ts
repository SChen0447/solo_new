export class AudioAnalyzerModule {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Float32Array;
  private timeDomainData: Float32Array;
  private readonly fftSize = 256;
  private isPlaying = false;
  private startTime = 0;
  private pausedAt = 0;

  constructor() {
    this.frequencyData = new Float32Array(this.fftSize / 2);
    this.timeDomainData = new Float32Array(this.fftSize / 2);
  }

  private ensureContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.75;
      this.gainNode = this.audioContext.createGain();
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    }
  }

  async loadAudioFile(file: File): Promise<void> {
    this.ensureContext();
    this.stop();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.stop();
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser!);
    const offset = this.pausedAt > 0 ? this.pausedAt : 0;
    this.source.start(0, offset);
    this.startTime = this.audioContext.currentTime - offset;
    this.isPlaying = true;
    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pausedAt = 0;
      }
    };
  }

  pause(): void {
    if (!this.audioContext || !this.source || !this.isPlaying) return;
    this.pausedAt = this.audioContext.currentTime - this.startTime;
    (this.source as AudioBufferSourceNode).stop();
    this.source.disconnect();
    this.source = null;
    this.isPlaying = false;
  }

  stop(): void {
    if (this.source) {
      try {
        (this.source as AudioBufferSourceNode).stop();
      } catch (_e) {
        // ignore if already stopped
      }
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  getPlaying(): boolean {
    return this.isPlaying;
  }

  getFrequencyData(): Float32Array {
    if (this.analyser) {
      this.analyser.getFloatFrequencyData(this.frequencyData);
    }
    return this.frequencyData;
  }

  getTimeDomainData(): Float32Array {
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this.timeDomainData);
    }
    return this.timeDomainData;
  }

  getAmplitude(): number {
    const data = this.getTimeDomainData();
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  getLowFrequencyEnergy(): number {
    const data = this.getFrequencyData();
    const len = Math.floor(data.length * 0.2);
    let sum = 0;
    for (let i = 0; i < len; i++) {
      const v = (data[i] + 100) / 100;
      sum += Math.max(0, v);
    }
    return sum / len;
  }

  getMidFrequencyEnergy(): number {
    const data = this.getFrequencyData();
    const start = Math.floor(data.length * 0.2);
    const end = Math.floor(data.length * 0.6);
    let sum = 0;
    for (let i = start; i < end; i++) {
      const v = (data[i] + 100) / 100;
      sum += Math.max(0, v);
    }
    return sum / (end - start);
  }

  getHighFrequencyEnergy(): number {
    const data = this.getFrequencyData();
    const start = Math.floor(data.length * 0.6);
    let sum = 0;
    for (let i = start; i < data.length; i++) {
      const v = (data[i] + 100) / 100;
      sum += Math.max(0, v);
    }
    return sum / (data.length - start);
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
