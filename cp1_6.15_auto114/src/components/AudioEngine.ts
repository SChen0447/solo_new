export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private lowPassFilter: BiquadFilterNode | null = null;
  private initialized = false;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.6;
      
      this.lowPassFilter = this.audioContext.createBiquadFilter();
      this.lowPassFilter.type = 'lowpass';
      this.lowPassFilter.frequency.value = 3000;
      
      this.masterGain.connect(this.lowPassFilter);
      this.lowPassFilter.connect(this.audioContext.destination);
      
      this.initialized = true;
    } catch (e) {
      console.error('Failed to initialize AudioContext:', e);
    }
  }

  public async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public playBell(frequency: number, velocity: number = 1): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) {
      return;
    }

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const gain = velocity * 0.6;

    const partials = [
      { ratio: 1, amplitude: 1.0, decay: 2.5 },
      { ratio: 2, amplitude: 0.6, decay: 1.5 },
      { ratio: 3, amplitude: 0.4, decay: 0.8 },
      { ratio: 4, amplitude: 0.2, decay: 0.4 },
      { ratio: 6, amplitude: 0.1, decay: 0.4 },
    ];

    partials.forEach((partial) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = frequency * partial.ratio;
      
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(gain * partial.amplitude, now + 0.005);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + partial.decay);
      
      osc.connect(oscGain);
      oscGain.connect(this.masterGain!);
      
      osc.start(now);
      osc.stop(now + partial.decay + 0.1);
    });
  }

  public destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.initialized = false;
  }
}
