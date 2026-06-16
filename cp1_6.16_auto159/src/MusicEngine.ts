import {
  Note,
  getFrequencyFromMidi,
  DURATION_TO_BEATS,
  MAX_COLUMNS,
} from './ScoreData';

export type PlaybackState = 'stopped' | 'playing' | 'paused';

export interface MusicEngineCallbacks {
  onColumnChange?: (column: number) => void;
  onStateChange?: (state: PlaybackState) => void;
}

export class MusicEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private notes: Note[] = [];
  private bpm: number = 120;
  private state: PlaybackState = 'stopped';
  private startTime: number = 0;
  private pauseTime: number = 0;
  private currentColumn: number = -1;
  private scheduledEvents: Array<{ oscillator: OscillatorNode; gain: GainNode }> = [];
  private animationFrameId: number | null = null;
  private callbacks: MusicEngineCallbacks;
  private scheduledStop: number = 0;

  constructor(callbacks: MusicEngineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  private initAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public setNotes(notes: Note[]): void {
    this.notes = [...notes];
  }

  public setBPM(bpm: number): void {
    this.bpm = bpm;
  }

  public getState(): PlaybackState {
    return this.state;
  }

  private getSecondsPerEighth(): number {
    return 60 / this.bpm / 2;
  }

  private playNoteAt(
    note: Note,
    when: number,
    durationSeconds: number
  ): void {
    if (!this.audioContext || !this.masterGain) return;

    const frequency = getFrequencyFromMidi(note.pitch);
    const partials = [1, 2, 3, 4];
    const gains = [1.0, 0.5, 0.25, 0.125];

    const noteGain = this.audioContext.createGain();
    noteGain.connect(this.masterGain);

    const attackTime = 0.01;
    const decayTime = 0.1;
    const sustainLevel = 0.6;
    const releaseTime = 0.2;

    noteGain.gain.setValueAtTime(0, when);
    noteGain.gain.linearRampToValueAtTime(0.8, when + attackTime);
    noteGain.gain.linearRampToValueAtTime(
      0.8 * sustainLevel,
      when + attackTime + decayTime
    );
    noteGain.gain.setValueAtTime(
      0.8 * sustainLevel,
      when + durationSeconds
    );
    noteGain.gain.linearRampToValueAtTime(
      0,
      when + durationSeconds + releaseTime
    );

    partials.forEach((partial, i) => {
      const osc = this.audioContext!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency * partial;

      const partialGain = this.audioContext!.createGain();
      partialGain.gain.value = gains[i] / partials.length;
      osc.connect(partialGain);
      partialGain.connect(noteGain);

      osc.start(when);
      osc.stop(when + durationSeconds + releaseTime + 0.05);

      this.scheduledEvents.push({ oscillator: osc, gain: partialGain });
    });

    this.scheduledEvents.push({ oscillator: {} as OscillatorNode, gain: noteGain });
  }

  private startColumnTracker(offsetSeconds: number): void {
    const secondsPerEighth = this.getSecondsPerEighth();

    const track = () => {
      if (this.state !== 'playing' || !this.audioContext) return;

      const elapsed = this.audioContext.currentTime - this.startTime + offsetSeconds;
      const column = Math.floor(elapsed / secondsPerEighth);

      if (column !== this.currentColumn) {
        if (column >= MAX_COLUMNS) {
          this.stop();
          return;
        }
        this.currentColumn = column;
        this.callbacks.onColumnChange?.(column);
      }

      this.animationFrameId = requestAnimationFrame(track);
    };

    this.animationFrameId = requestAnimationFrame(track);
  }

  public play(): void {
    this.initAudioContext();
    if (!this.audioContext) return;

    if (this.state === 'paused') {
      const offset = this.pauseTime;
      this.startTime = this.audioContext.currentTime;
      this.scheduleFromOffset(offset);
      this.state = 'playing';
      this.callbacks.onStateChange?.(this.state);
      this.startColumnTracker(offset);
      return;
    }

    this.stop(true);
    this.state = 'playing';
    this.callbacks.onStateChange?.(this.state);
    this.startTime = this.audioContext.currentTime;
    this.currentColumn = -1;
    this.scheduleFromOffset(0);
    this.startColumnTracker(0);

    const totalDuration = MAX_COLUMNS * this.getSecondsPerEighth();
    this.scheduledStop = window.setTimeout(() => {
      if (this.state === 'playing') {
        this.stop();
      }
    }, totalDuration * 1000 + 500);
  }

  private scheduleFromOffset(offsetSeconds: number): void {
    if (!this.audioContext) return;

    const secondsPerEighth = this.getSecondsPerEighth();

    this.notes.forEach((note) => {
      const noteStartTime = note.startTime * secondsPerEighth;
      if (noteStartTime + 0.001 < offsetSeconds) return;

      const durationBeats = DURATION_TO_BEATS[note.duration];
      const durationSeconds = (durationBeats * 60) / this.bpm;

      const when =
        this.audioContext!.currentTime + (noteStartTime - offsetSeconds);
      this.playNoteAt(note, when, durationSeconds);
    });
  }

  public pause(): void {
    if (this.state !== 'playing' || !this.audioContext) return;

    this.pauseTime =
      this.audioContext.currentTime - this.startTime + this.pauseTime;
    this.state = 'paused';
    this.callbacks.onStateChange?.(this.state);

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.scheduledStop) {
      clearTimeout(this.scheduledStop);
      this.scheduledStop = 0;
    }

    this.scheduledEvents.forEach(({ oscillator, gain }) => {
      try {
        if (oscillator.stop) oscillator.stop();
      } catch (e) {}
      try {
        gain.disconnect();
      } catch (e) {}
    });
    this.scheduledEvents = [];
  }

  public stop(silent: boolean = false): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.scheduledStop) {
      clearTimeout(this.scheduledStop);
      this.scheduledStop = 0;
    }

    this.scheduledEvents.forEach(({ oscillator, gain }) => {
      try {
        if (oscillator.stop) oscillator.stop();
      } catch (e) {}
      try {
        gain.disconnect();
      } catch (e) {}
    });
    this.scheduledEvents = [];

    this.state = 'stopped';
    this.pauseTime = 0;
    this.currentColumn = -1;
    if (!silent) {
      this.callbacks.onStateChange?.(this.state);
      this.callbacks.onColumnChange?.(-1);
    }
  }

  public dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
