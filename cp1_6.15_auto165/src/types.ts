export type NoteType = 'whole' | 'half' | 'quarter' | 'eighth';

export interface Note {
  id: string;
  type: NoteType;
  pitch: string;
  beatIndex: number;
  dotted: boolean;
}

export interface StaffConfig {
  width: number;
  height: number;
  lineSpacing: number;
  lineColor: string;
  bgColor: string;
  noteColor: string;
  highlightColor: string;
  selectedColor: string;
}

export const NOTE_DURATIONS: Record<NoteType, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
};

export const PITCH_SEMITONES: Record<string, number> = {
  'C4': 60, 'C#4': 61, 'D4': 62, 'D#4': 63, 'E4': 64, 'F4': 65,
  'F#4': 66, 'G4': 67, 'G#4': 68, 'A4': 69, 'A#4': 70, 'B4': 71,
  'C5': 72, 'C#5': 73, 'D5': 74, 'D#5': 75, 'E5': 76, 'F5': 77,
  'F#5': 78, 'G5': 79, 'G#5': 80, 'A5': 81, 'A#5': 82, 'B5': 83,
  'C6': 84,
};

export const PITCH_LIST = [
  'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
  'C6',
];

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  whole: '全音符',
  half: '二分音符',
  quarter: '四分音符',
  eighth: '八分音符',
};

export const BEAT_WIDTH = 40;
