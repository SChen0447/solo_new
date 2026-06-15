import { Note, NOTE_DURATIONS, PITCH_SEMITONES } from './types';

export type PlaybackState = 'idle' | 'playing' | 'paused';

interface ScheduledNote {
  oscillator: OscillatorNode[];
  gainNode: GainNode;
  startTime: number;
  duration: number;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private scheduledNotes: ScheduledNote[] = [];
  private playbackState: PlaybackState = 'idle';
  private startTime = 0;
  private pauseTime = 0;
  private currentBpm = 120;
  private onNoteChange: ((index: number) => void) | null = null;
  private noteTimers: number[] = [];

  constructor() {}

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setOnNoteChange(callback: (index: number) => void) {
    this.onNoteChange = callback;
  }

  semitoneToFrequency(semitone: number): number {
    return 440 * Math.pow(2, (semitone - 69) / 12);
  }

  playNote(pitch: string, duration: number, startTime?: number): void {
    const ctx = this.ensureContext();
    const semitone = PITCH_SEMITONES[pitch];
    if (semitone === undefined) return;

    const frequency = this.semitoneToFrequency(semitone);
    const actualStart = startTime ?? ctx.currentTime;
    const actualDuration = duration * 0.95;

    const oscillators: OscillatorNode[] = [];
    const gainNode = ctx.createGain();
    gainNode.connect(this.masterGain!);

    const fundamental = ctx.createOscillator();
    fundamental.type = 'triangle';
    fundamental.frequency.value = frequency;
    fundamental.connect(gainNode);
    oscillators.push(fundamental);

    const harmonic2 = ctx.createOscillator();
    harmonic2.type = 'sine';
    harmonic2.frequency.value = frequency * 2;
    harmonic2.connect(gainNode);
    oscillators.push(harmonic2);

    const harmonic3 = ctx.createOscillator();
    harmonic3.type = 'sine';
    harmonic3.frequency.value = frequency * 3;
    harmonic3.connect(gainNode);
    oscillators.push(harmonic3);

    const attack = 0.01;
    const decay = 0.1;
    const sustain = 0.7;
    const release = 0.2;

    gainNode.gain.setValueAtTime(0, actualStart);
    gainNode.gain.linearRampToValueAtTime(0.3, actualStart + attack);
    gainNode.gain.linearRampToValueAtTime(0.3 * sustain, actualStart + attack + decay);
    gainNode.gain.setValueAtTime(0.3 * sustain, actualStart + actualDuration);
    gainNode.gain.linearRampToValueAtTime(0, actualStart + actualDuration + release);

    const harmonicGain = ctx.createGain();
    harmonicGain.gain.value = 0.15;
    harmonic2.connect(harmonicGain);
    harmonicGain.connect(gainNode);

    const harmonic3Gain = ctx.createGain();
    harmonic3Gain.gain.value = 0.08;
    harmonic3.connect(harmonic3Gain);
    harmonic3Gain.connect(gainNode);

    oscillators.forEach(osc => {
      osc.start(actualStart);
      osc.stop(actualStart + actualDuration + release + 0.05);
    });

    this.scheduledNotes.push({
      oscillator: oscillators,
      gainNode,
      startTime: actualStart,
      duration: actualDuration + release,
    });
  }

  playSequence(notes: Note[], bpm: number): void {
    this.stop();
    this.ensureContext();
    this.currentBpm = bpm;
    this.playbackState = 'playing';
    this.startTime = this.audioContext!.currentTime;

    const beatDuration = 60 / bpm;
    let currentBeat = 0;

    const sortedNotes = [...notes].sort((a, b) => a.beatIndex - b.beatIndex);

    sortedNotes.forEach((note, index) => {
      const noteDuration = NOTE_DURATIONS[note.type] * beatDuration;
      const adjustedDuration = note.dotted ? noteDuration * 1.5 : noteDuration;
      const noteStartTime = this.startTime + note.beatIndex * beatDuration;

      this.playNote(note.pitch, adjustedDuration, noteStartTime);

      const timerId = window.setTimeout(() => {
        if (this.onNoteChange && this.playbackState === 'playing') {
          this.onNoteChange(index);
        }
      }, (note.beatIndex * beatDuration) * 1000);
      this.noteTimers.push(timerId);
    });

    const totalDuration = sortedNotes.length > 0
      ? (sortedNotes[sortedNotes.length - 1].beatIndex + NOTE_DURATIONS[sortedNotes[sortedNotes.length - 1].type]) * beatDuration
      : 0;

    const endTimer = window.setTimeout(() => {
      if (this.playbackState === 'playing') {
        this.playbackState = 'idle';
        if (this.onNoteChange) {
          this.onNoteChange(-1);
        }
      }
    }, totalDuration * 1000 + 500);
    this.noteTimers.push(endTimer);
  }

  pause(): void {
    if (this.playbackState !== 'playing' || !this.audioContext) return;

    this.pauseTime = this.audioContext.currentTime;
    this.playbackState = 'paused';
    this.audioContext.suspend();

    this.noteTimers.forEach(id => clearTimeout(id));
    this.noteTimers = [];
  }

  resume(): void {
    if (this.playbackState !== 'paused' || !this.audioContext) return;

    const pausedDuration = this.pauseTime - this.startTime;
    this.startTime = this.audioContext.currentTime - pausedDuration;
    this.audioContext.resume();
    this.playbackState = 'playing';
  }

  stop(): void {
    this.noteTimers.forEach(id => clearTimeout(id));
    this.noteTimers = [];

    this.scheduledNotes.forEach(({ oscillator, gainNode }) => {
      oscillator.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {}
      });
      try {
        gainNode.disconnect();
      } catch (e) {}
    });
    this.scheduledNotes = [];

    this.playbackState = 'idle';
    this.startTime = 0;
    this.pauseTime = 0;

    if (this.onNoteChange) {
      this.onNoteChange(-1);
    }
  }

  getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  getCurrentTime(): number {
    if (!this.audioContext || this.playbackState === 'idle') return 0;
    if (this.playbackState === 'paused') return this.pauseTime - this.startTime;
    return this.audioContext.currentTime - this.startTime;
  }

  getTotalDuration(notes: Note[]): number {
    if (notes.length === 0) return 0;
    const sortedNotes = [...notes].sort((a, b) => a.beatIndex - b.beatIndex);
    const lastNote = sortedNotes[sortedNotes.length - 1];
    const beatDuration = 60 / this.currentBpm;
    return (lastNote.beatIndex + NOTE_DURATIONS[lastNote.type]) * beatDuration;
  }
}

export const audioEngine = new AudioEngine();
