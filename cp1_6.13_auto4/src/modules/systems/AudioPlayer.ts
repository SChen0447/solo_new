import { eventBus } from '../core/EventBus';

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private engineOscillator: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineRunning: boolean = false;
  private initialized: boolean = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('crystalCollected', () => {
      this.playCollectSound();
    });

    eventBus.on('stormWarning', () => {
      this.playAlarmSound();
    });

    eventBus.on('shipEngineStart', () => {
      this.startEngineSound();
    });

    eventBus.on('shipEngineStop', () => {
      this.stopEngineSound();
    });

    eventBus.on('gameOver', () => {
      this.stopEngineSound();
    });

    eventBus.on('gameRestart', () => {
      this.stopEngineSound();
    });
  }

  private initContext(): void {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  public playCollectSound(): void {
    this.initContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }

  public playAlarmSound(): void {
    this.initContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;

    for (let i = 0; i < 3; i++) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, ctx.currentTime + i * 0.3);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + i * 0.3 + 0.1);
      oscillator.frequency.setValueAtTime(440, ctx.currentTime + i * 0.3 + 0.2);

      gainNode.gain.setValueAtTime(0, ctx.currentTime + i * 0.3);
      gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.3 + 0.02);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.3 + 0.18);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.3 + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime + i * 0.3);
      oscillator.stop(ctx.currentTime + i * 0.3 + 0.3);
    }
  }

  public startEngineSound(): void {
    this.initContext();
    if (!this.audioContext || this.engineRunning) return;

    const ctx = this.audioContext;

    this.engineOscillator = ctx.createOscillator();
    this.engineGain = ctx.createGain();

    this.engineOscillator.type = 'sawtooth';
    this.engineOscillator.frequency.setValueAtTime(80, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);

    this.engineGain.gain.setValueAtTime(0, ctx.currentTime);
    this.engineGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.1);

    this.engineOscillator.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(ctx.destination);

    this.engineOscillator.start(ctx.currentTime);
    this.engineRunning = true;
  }

  public stopEngineSound(): void {
    if (!this.audioContext || !this.engineRunning || !this.engineOscillator || !this.engineGain) return;

    const ctx = this.audioContext;
    const oscillator = this.engineOscillator;
    const gain = this.engineGain;

    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);

    setTimeout(() => {
      try {
        oscillator.stop();
        oscillator.disconnect();
        gain.disconnect();
      } catch (e) {
      }
    }, 150);

    this.engineOscillator = null;
    this.engineGain = null;
    this.engineRunning = false;
  }

  public setEngineIntensity(intensity: number): void {
    if (!this.audioContext || !this.engineGain || !this.engineOscillator || !this.engineRunning) return;

    const ctx = this.audioContext;
    const clampedIntensity = Math.max(0, Math.min(1, intensity));

    this.engineGain.gain.setTargetAtTime(0.02 + clampedIntensity * 0.08, ctx.currentTime, 0.05);
    this.engineOscillator.frequency.setTargetAtTime(60 + clampedIntensity * 80, ctx.currentTime, 0.05);
  }

  public resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public destroy(): void {
    this.stopEngineSound();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const audioPlayer = new AudioPlayer();
