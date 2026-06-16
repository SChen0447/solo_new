import { v4 as uuidv4 } from 'uuid';

export type NoteDuration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

export interface Note {
  id: string;
  pitch: number;
  duration: NoteDuration;
  startTime: number;
}

export interface ScoreData {
  notes: Note[];
  bpm: number;
}

export const MIN_PITCH = 48;
export const MAX_PITCH = 72;
export const MAX_COLUMNS = 64;

export const DURATION_TO_BEATS: Record<NoteDuration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

export const DURATION_TO_EIGHTHS: Record<NoteDuration, number> = {
  whole: 8,
  half: 4,
  quarter: 2,
  eighth: 1,
  sixteenth: 0.5,
};

export const DURATION_LABELS: Record<NoteDuration, string> = {
  whole: '全音符',
  half: '二分音符',
  quarter: '四分音符',
  eighth: '八分音符',
  sixteenth: '十六分音符',
};

export function createNote(
  pitch: number,
  duration: NoteDuration,
  startTime: number
): Note {
  return {
    id: uuidv4(),
    pitch,
    duration,
    startTime,
  };
}

export function getFrequencyFromMidi(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function serializeScore(score: ScoreData): string {
  return JSON.stringify(score);
}

export function deserializeScore(json: string): ScoreData {
  return JSON.parse(json) as ScoreData;
}

export function getPitchName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return names[midi % 12] + octave;
}

export function isBlackKey(midi: number): boolean {
  const pitchClass = midi % 12;
  return [1, 3, 6, 8, 10].includes(pitchClass);
}
