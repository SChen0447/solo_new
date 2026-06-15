import type { Note, TrackType } from '../types/game';
import { GAME_CONFIG } from '../utils/constants';

export class AudioEngine {
  private bpm: number;
  private bars: number;
  private beatsPerBar: number;
  private beatDuration: number;
  private barDuration: number;
  private notes: Note[] = [];
  private startTime: number = 0;
  private isPlaying: boolean = false;
  private audioContext: AudioContext | null = null;

  constructor(bpm: number = GAME_CONFIG.bpm, bars: number = GAME_CONFIG.bars) {
    this.bpm = bpm;
    this.bars = bars;
    this.beatsPerBar = GAME_CONFIG.beatsPerBar;
    this.beatDuration = 60000 / bpm;
    this.barDuration = this.beatDuration * this.beatsPerBar;
  }

  init(): void {
    this.notes = this.generateNotePattern();
  }

  private generateNotePattern(): Note[] {
    const notes: Note[] = [];
    let noteId = 0;
    const totalBeats = this.bars * this.beatsPerBar;

    for (let beat = 0; beat < totalBeats; beat++) {
      const barIndex = Math.floor(beat / this.beatsPerBar);
      const beatInBar = beat % this.beatsPerBar;
      const time = beat * this.beatDuration;

      if (barIndex < 2) {
        if (beatInBar === 0) {
          notes.push(this.createNote(noteId++, time, 'left'));
        }
        if (beatInBar === 2) {
          notes.push(this.createNote(noteId++, time, 'right'));
        }
      } else if (barIndex < 4) {
        if (beatInBar === 0 || beatInBar === 2) {
          notes.push(this.createNote(noteId++, time, 'left'));
        }
        if (beatInBar === 1 || beatInBar === 3) {
          notes.push(this.createNote(noteId++, time, 'right'));
        }
      } else if (barIndex < 6) {
        notes.push(this.createNote(noteId++, time, beat % 2 === 0 ? 'left' : 'right'));
        if (beatInBar === 1 || beatInBar === 3) {
          const offsetTime = time + this.beatDuration * 0.5;
          notes.push(this.createNote(noteId++, offsetTime, beat % 2 === 0 ? 'right' : 'left'));
        }
      } else if (barIndex < 10) {
        notes.push(this.createNote(noteId++, time, 'left'));
        notes.push(this.createNote(noteId++, time, 'right'));
        if (beatInBar === 1 || beatInBar === 3) {
          const offsetTime = time + this.beatDuration * 0.5;
          notes.push(this.createNote(noteId++, offsetTime, 'left'));
          notes.push(this.createNote(noteId++, offsetTime, 'right'));
        }
      } else if (barIndex < 14) {
        notes.push(this.createNote(noteId++, time, 'left'));
        if (beatInBar % 2 === 1) {
          notes.push(this.createNote(noteId++, time, 'right'));
        }
        if (beatInBar === 2) {
          const offsetTime = time + this.beatDuration * 0.5;
          notes.push(this.createNote(noteId++, offsetTime, 'right'));
        }
      } else {
        notes.push(this.createNote(noteId++, time, 'left'));
        notes.push(this.createNote(noteId++, time, 'right'));
      }
    }

    return notes.sort((a, b) => a.time - b.time);
  }

  private createNote(id: number, time: number, track: TrackType): Note {
    return {
      id: `note-${id}`,
      time,
      track,
      hit: false,
    };
  }

  start(): void {
    this.startTime = performance.now();
    this.isPlaying = true;
    this.initAudio();
  }

  private initAudio(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  playBeat(frequency: number = 440, duration: number = 0.1): void {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  getCurrentTime(): number {
    if (!this.isPlaying) return 0;
    return performance.now() - this.startTime;
  }

  getProgress(): number {
    const duration = this.getDuration();
    if (duration === 0) return 0;
    return Math.min(1, this.getCurrentTime() / duration);
  }

  getDuration(): number {
    return this.bars * this.barDuration;
  }

  getNotes(): Note[] {
    return [...this.notes];
  }

  getActiveNotes(currentTime: number, lookAhead: number = 2000): Note[] {
    return this.notes.filter(
      (note) => !note.hit && note.time >= currentTime - 100 && note.time <= currentTime + lookAhead
    );
  }

  getBeatDuration(): number {
    return this.beatDuration;
  }

  getBarDuration(): number {
    return this.barDuration;
  }

  getCurrentBar(currentTime: number): number {
    return Math.floor(currentTime / this.barDuration);
  }

  getCurrentBeat(currentTime: number): number {
    return Math.floor(currentTime / this.beatDuration);
  }

  stop(): void {
    this.isPlaying = false;
  }

  reset(): void {
    this.isPlaying = false;
    this.startTime = 0;
    this.notes = this.generateNotePattern();
  }

  isGameOver(currentTime: number): boolean {
    return currentTime >= this.getDuration();
  }
}
