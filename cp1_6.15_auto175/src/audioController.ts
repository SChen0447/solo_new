export class AudioController {
  private audioContext: AudioContext | null = null;
  private bpm = 120;
  private beatInterval = 60 / this.bpm;
  private beatTime = 0;
  private beatCallbacks: Array<() => void> = [];
  private musicIntervalId: number | null = null;
  private isPlaying = false;

  private melodyPattern: number[] = [
    261.63, 329.63, 392.00, 523.25,
    392.00, 329.63, 261.63, 293.66,
    329.63, 392.00, 440.00, 392.00,
    329.63, 293.66, 261.63, 329.63
  ];
  private melodyIndex = 0;

  constructor() {
    this.beatInterval = 60 / this.bpm;
  }

  public init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public start(): void {
    this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.melodyIndex = 0;
    this.beatTime = 0;
    this.scheduleMusic();
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  private scheduleMusic(): void {
    const playStep = () => {
      if (!this.isPlaying || !this.audioContext) return;
      const freq = this.melodyPattern[this.melodyIndex % this.melodyPattern.length];
      this.playTone(freq, 0.15, 0.15, 'sine', 0.12);
      this.beatTime += this.beatInterval / 2;
      this.beatCallbacks.forEach(cb => cb());
      this.melodyIndex++;
    };
    playStep();
    this.musicIntervalId = window.setInterval(playStep, (this.beatInterval / 2) * 1000);
  }

  public onBeat(callback: () => void): void {
    this.beatCallbacks.push(callback);
  }

  public playCollectSound(): void {
    this.playTone(440, 0.1, 0.05, 'sine', 0.2);
  }

  public playFailSound(): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  }

  private playTone(frequency: number, duration: number, attack: number, type: OscillatorType, volume: number): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  public getBeatProgress(): number {
    return (this.beatTime % this.beatInterval) / this.beatInterval;
  }

  public getBpm(): number {
    return this.bpm;
  }
}
