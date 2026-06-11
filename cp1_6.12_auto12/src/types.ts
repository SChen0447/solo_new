export type NoteType = 'text' | 'vote' | 'annotation';
export type FontSize = 'small' | 'medium' | 'large';

export interface BaseNote {
  id: string;
  type: NoteType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  createdAt: number;
}

export interface TextNote extends BaseNote {
  type: 'text';
  content: string;
  fontSize: FontSize;
}

export interface VoteNote extends BaseNote {
  type: 'vote';
  content: string;
  votes: string[];
}

export interface AnnotationNote extends BaseNote {
  type: 'annotation';
  content: string;
  regionWidth: number;
  regionHeight: number;
}

export type StickyNote = TextNote | VoteNote | AnnotationNote;

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface CanvasState {
  notes: StickyNote[];
  viewport: Viewport;
}

export const NOTE_COLORS: Record<NoteType, string[]> = {
  text: ['#FF6B6B', '#FFA8A8', '#FF8E72', '#FFB347'],
  vote: ['#74B9FF', '#A8D8FF', '#81ECEC', '#55EFC4'],
  annotation: ['#B39DDB', '#D4B8E8', '#DDA0DD', '#E8A0BF'],
};

export const DEFAULT_NOTE_SIZES: Record<NoteType, { width: number; height: number }> = {
  text: { width: 200, height: 160 },
  vote: { width: 220, height: 180 },
  annotation: { width: 280, height: 200 },
};

export const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
};
