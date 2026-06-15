export interface Note {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  createdAt?: number;
  createdBy?: string;
  originalColors?: string[];
}

export type VoteType = 'up' | 'down' | null;

export interface AppState {
  notes: Map<string, Note>;
  clientId: string | null;
  isConnected: boolean;
  showVotePanel: boolean;
}

export type Action =
  | { type: 'INIT'; payload: { notes: Note[]; clientId: string } }
  | { type: 'NOTE_ADDED'; payload: Note }
  | { type: 'NOTE_MOVED'; payload: { id: string; x: number; y: number } }
  | { type: 'NOTE_UPDATED'; payload: { id: string; text?: string; color?: string } }
  | { type: 'NOTE_DELETED'; payload: { id: string } }
  | { type: 'VOTE_UPDATED'; payload: { noteId: string; upvotes: number; downvotes: number; voterId: string; voteType: VoteType } }
  | { type: 'NOTES_MERGED'; payload: { sourceId: string; targetId: string; mergedText: string; upvotes: number; downvotes: number } }
  | { type: 'ALL_CLEARED' }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'TOGGLE_VOTE_PANEL' }
  | { type: 'SET_USER_VOTE'; payload: { noteId: string; voteType: VoteType } };

export const PRESET_COLORS = [
  '#FFB6C1',
  '#FFDAB9',
  '#FFFACD',
  '#E6E6FA',
  '#B0E0E6',
  '#98FB98',
  '#90EE90',
  '#98FF98',
];

export const NOTE_SIZE = 160;
export const NOTE_SIZE_MOBILE = 120;
export const MERGE_DISTANCE = 30;
export const MAX_USERS = 10;
