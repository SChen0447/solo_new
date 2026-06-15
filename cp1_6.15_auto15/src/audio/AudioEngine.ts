export interface AudioFeatures {
  pitch: number;
  volume: number;
  bpm: number;
  onset: boolean;
  timestamp: number;
  waveform: Float32Array;
  frequencyData: Uint8Array;
}

type AudioFeatureCallback = (features: AudioFeatures) => void;

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animationFrame: number = 0;
  private isRunning: boolean = false;
  private callback: AudioFeatureCallback | null = null;
  private lastAnalyzeTime: number = 0;
  private analyzeInterval: number = 100;
  private onsetThreshold: number = 0.35;
  private previousEnergy: number = 0;
  private beatTimes: number[] = [];
  private bufferSize: number = 2048;
  private timeBuffer = new Float32Array(2048) as Float32Array<ArrayBuffer>;
  private freqBuffer = new Uint8Array(0) as Uint8Array<ArrayBuffer>;

  async init(callback: AudioFeatureCallback): Promise<boolean> {
    this.callback = callback;
    try {
      this.audioContext = new AudioContext({ sampleRate: 44100 });
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3;
      this.source.connect(this.analyser);
      this.freqBuffer = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      return true;
    } catch {
      console.warn('Microphone not available, use keyboard simulation');
      return false;
    }
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastAnalyzeTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  destroy(): void {
    this.stop();
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  injectSimulated(pitch: number, volume: number): void {
    if (!this.callback) return;
    const now = performance.now();
    const jitter = (Math.random() - 0.5) * 20;
    const volJitter = (Math.random() - 0.5) * 0.1;
    this.callback({
      pitch: Math.max(50, Math.min(1000, pitch + jitter)),
      volume: Math.max(0, Math.min(1, volume + volJitter)),
      bpm: this.estimateBpmFromPitch(pitch),
      onset: Math.random() > 0.4,
      timestamp: now,
      waveform: new Float32Array(128),
      frequencyData: new Uint8Array(128),
    });
  }

  private loop = (): void => {
    if (!this.isRunning || !this.analyser || !this.callback) return;
    this.animationFrame = requestAnimationFrame(this.loop);
    const now = performance.now();
    if (now - this.lastAnalyzeTime < this.analyzeInterval) return;
    this.lastAnalyzeTime = now;
    this.analyser!.getFloatTimeDomainData(this.timeBuffer);
    this.analyser!.getByteFrequencyData(this.freqBuffer);
    const volume = this.computeRMS(this.timeBuffer);
    const pitch = this.detectPitch(this.timeBuffer);
    const onset = this.detectOnset(this.freqBuffer);
    const bpm = this.estimateBPM(onset, now);
    this.callback({
      pitch,
      volume,
      bpm,
      onset,
      timestamp: now,
      waveform: this.timeBuffer.slice(0, 128),
      frequencyData: this.freqBuffer.slice(0, 128),
    });
  };

  private computeRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  private detectPitch(buffer: Float32Array): number {
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const halfLen = Math.floor(buffer.length / 2);
    let bestOffset = -1;
    let bestCorrelation = 0;
    let foundGoodCorrelation = false;
    const correlations = new Float32Array(halfLen);
    const rms = this.computeRMS(buffer);
    if (rms < 0.01) return 0;
    let lastCorrelation = 1;
    for (let offset = 0; offset < halfLen; offset++) {
      let correlation = 0;
      for (let i = 0; i < halfLen; i++) {
        correlation += Math.abs(buffer[i] - buffer[i + offset]);
      }
      correlation = 1 - correlation / halfLen;
      correlations[offset] = correlation;
      if (correlation > 0.9 && correlation > lastCorrelation) {
        foundGoodCorrelation = true;
        if (correlation > bestCorrelation) {
          bestCorrelation = correlation;
          bestOffset = offset;
        }
      } else if (foundGoodCorrelation) {
        const shift =
          bestOffset > 0 && bestOffset < halfLen - 1
            ? (correlations[bestOffset + 1] - correlations[bestOffset - 1]) /
              (2 * (2 * correlations[bestOffset] - correlations[bestOffset - 1] - correlations[bestOffset + 1]))
            : 0;
        return sampleRate / (bestOffset + (shift || 0));
      }
      lastCorrelation = correlation;
    }
    if (bestCorrelation > 0.01 && bestOffset > 0) {
      return sampleRate / bestOffset;
    }
    return 0;
  }

  private detectOnset(freqData: Uint8Array): boolean {
    let energy = 0;
    for (let i = 0; i < freqData.length; i++) {
      energy += freqData[i];
    }
    energy /= freqData.length;
    const isOnset = energy > this.previousEnergy * (1 + this.onsetThreshold) && energy > 30;
    this.previousEnergy = energy;
    return isOnset;
  }

  private estimateBPM(onset: boolean, now: number): number {
    if (onset) {
      this.beatTimes.push(now);
    }
    const cutoff = now - 5000;
    this.beatTimes = this.beatTimes.filter((t) => t > cutoff);
    if (this.beatTimes.length < 2) return 0;
    const intervals: number[] = [];
    for (let i = 1; i < this.beatTimes.length; i++) {
      intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
    }
    if (intervals.length === 0) return 0;
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (avgInterval < 200) return 0;
    const bpm = 60000 / avgInterval;
    return Math.min(180, Math.max(60, bpm));
  }

  private estimateBpmFromPitch(pitch: number): number {
    if (pitch < 200) return 60 + Math.random() * 40;
    if (pitch < 500) return 90 + Math.random() * 40;
    return 120 + Math.random() * 40;
  }
}
