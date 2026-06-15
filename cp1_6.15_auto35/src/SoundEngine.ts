export interface SoundFeatures {
  frequency: number;
  amplitude: number;
  bpm: number;
  isActive: boolean;
}

type Subscriber = (features: SoundFeatures) => void;

const SKILL_FREQUENCY_MAP: Record<number, { freqMin: number; freqMax: number; amplitude: number }> = {
  0: { freqMin: 800, freqMax: 1000, amplitude: 0.85 },
  1: { freqMin: 200, freqMax: 400, amplitude: 0.6 },
  2: { freqMin: 600, freqMax: 800, amplitude: 0.9 },
  3: { freqMin: 400, freqMax: 600, amplitude: 0.75 },
  4: { freqMin: 100, freqMax: 200, amplitude: 0.7 },
};

export class SoundEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private dataArray: Uint8Array | null = null;
  private frequencyData: Uint8Array | null = null;
  private subscribers: Set<Subscriber> = new Set();
  private animationId: number | null = null;
  private isRunning = false;
  private beatHistory: number[] = [];
  private lastBeatTime = 0;
  private simulatedFeatures: SoundFeatures = {
    frequency: 0,
    amplitude: 0,
    bpm: 0,
    isActive: false,
  };
  private simulationTimer: number | null = null;

  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.6;

      this.microphone.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.fftSize);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

      this.isRunning = true;
      this.analyzeLoop();
    } catch (err) {
      console.error('Failed to start microphone:', err);
      throw err;
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.simulationTimer !== null) {
      window.clearTimeout(this.simulationTimer);
      this.simulationTimer = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.frequencyData = null;
  }

  triggerSimulated(skillIndex: number): void {
    const mapping = SKILL_FREQUENCY_MAP[skillIndex];
    if (!mapping) return;

    const midFreq = (mapping.freqMin + mapping.freqMax) / 2;
    this.simulatedFeatures = {
      frequency: midFreq,
      amplitude: mapping.amplitude,
      bpm: 120,
      isActive: true,
    };

    const startTime = performance.now();
    const duration = 400;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const decay = 1 - progress;

      this.simulatedFeatures.amplitude = mapping.amplitude * decay;
      this.simulatedFeatures.frequency = midFreq * decay;

      this.broadcast();

      if (progress < 1) {
        this.simulationTimer = window.setTimeout(animate, 16);
      } else {
        this.simulatedFeatures = { frequency: 0, amplitude: 0, bpm: 0, isActive: false };
        this.broadcast();
      }
    };

    animate();
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private broadcast(): void {
    for (const sub of this.subscribers) {
      sub(this.simulatedFeatures);
    }
  }

  private analyzeLoop = (): void => {
    if (!this.isRunning || !this.analyser || !this.dataArray || !this.frequencyData) {
      return;
    }

    this.analyser.getByteTimeDomainData(this.dataArray);
    this.analyser.getByteFrequencyData(this.frequencyData);

    const amplitude = this.calculateAmplitude();
    const frequency = this.calculateDominantFrequency();
    const bpm = this.calculateBPM(amplitude);

    this.simulatedFeatures = {
      frequency,
      amplitude,
      bpm,
      isActive: amplitude > 0.05,
    };

    this.broadcast();

    this.animationId = requestAnimationFrame(this.analyzeLoop);
  };

  private calculateAmplitude(): number {
    if (!this.dataArray) return 0;
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const v = (this.dataArray[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    return Math.min(rms * 1.5, 1);
  }

  private calculateDominantFrequency(): number {
    if (!this.frequencyData || !this.analyser || !this.audioContext) return 0;

    let maxIndex = 0;
    let maxValue = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      if (this.frequencyData[i] > maxValue) {
        maxValue = this.frequencyData[i];
        maxIndex = i;
      }
    }

    const nyquist = this.audioContext.sampleRate / 2;
    const binWidth = nyquist / this.frequencyData.length;
    const freq = maxIndex * binWidth;
    return Math.min(freq, 1000);
  }

  private calculateBPM(amplitude: number): number {
    const now = performance.now();
    const threshold = 0.3;

    if (amplitude > threshold && now - this.lastBeatTime > 200) {
      this.beatHistory.push(now);
      this.lastBeatTime = now;

      if (this.beatHistory.length > 10) {
        this.beatHistory.shift();
      }
    }

    if (this.beatHistory.length < 2) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < this.beatHistory.length; i++) {
      intervals.push(this.beatHistory[i] - this.beatHistory[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return Math.round(60000 / avgInterval);
  }

  isRecording(): boolean {
    return this.isRunning;
  }
}

export const soundEngine = new SoundEngine();
