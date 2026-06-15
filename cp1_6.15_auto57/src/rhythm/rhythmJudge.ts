import type { Note, JudgmentType, JudgmentEvent, TrackType } from '../types/game';
import { GAME_CONFIG } from '../utils/constants';

export class RhythmJudge {
  private perfectWindow: number;
  private goodWindow: number;
  private perfectScore: number;
  private goodScore: number;

  constructor() {
    this.perfectWindow = GAME_CONFIG.perfectWindow;
    this.goodWindow = GAME_CONFIG.goodWindow;
    this.perfectScore = GAME_CONFIG.perfectScore;
    this.goodScore = GAME_CONFIG.goodScore;
  }

  judge(
    pressTime: number,
    track: TrackType,
    notes: Note[],
    currentTime: number
  ): JudgmentEvent | null {
    const targetNotes = notes.filter(
      (note) => note.track === track && !note.hit && Math.abs(note.time - currentTime) <= this.goodWindow * 2
    );

    if (targetNotes.length === 0) {
      return null;
    }

    let closestNote: Note | null = null;
    let minDiff = Infinity;

    for (const note of targetNotes) {
      const diff = Math.abs(note.time - pressTime);
      if (diff < minDiff && diff <= this.goodWindow) {
        minDiff = diff;
        closestNote = note;
      }
    }

    if (!closestNote) {
      return null;
    }

    const diff = Math.abs(closestNote.time - pressTime);
    let judgment: JudgmentType;

    if (diff <= this.perfectWindow) {
      judgment = 'perfect';
    } else if (diff <= this.goodWindow) {
      judgment = 'good';
    } else {
      return null;
    }

    return {
      type: judgment,
      track,
      time: pressTime,
      noteId: closestNote.id,
    };
  }

  getScore(judgment: JudgmentType): number {
    switch (judgment) {
      case 'perfect':
        return this.perfectScore;
      case 'good':
        return this.goodScore;
      case 'miss':
        return 0;
      default:
        return 0;
    }
  }

  checkMissedNotes(notes: Note[], currentTime: number): Note[] {
    return notes.filter(
      (note) => !note.hit && note.time < currentTime - this.goodWindow
    );
  }

  getPerfectWindow(): number {
    return this.perfectWindow;
  }

  getGoodWindow(): number {
    return this.goodWindow;
  }
}
