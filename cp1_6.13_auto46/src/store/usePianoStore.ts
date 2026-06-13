import { create } from 'zustand';
import type { SongNote } from '@/data/songs';

export type ThemeName = 'classic' | 'cosmic' | 'sunset';
export type FeedbackType = 'correct' | 'wrong' | null;

export interface RecordedNote {
  note: string;
  timestamp: number;
}

interface PianoState {
  currentNote: string | null;
  activeNotes: Set<string>;
  learningMode: boolean;
  currentSongIndex: number;
  currentNoteIndex: number;
  feedbackType: FeedbackType;
  isRecording: boolean;
  recording: RecordedNote[];
  recordStartTime: number | null;
  isPlayingBack: boolean;
  playbackSpeed: number;
  theme: ThemeName;

  setCurrentNote: (note: string | null) => void;
  addActiveNote: (note: string) => void;
  removeActiveNote: (note: string) => void;
  setLearningMode: (mode: boolean) => void;
  setCurrentSongIndex: (index: number) => void;
  setCurrentNoteIndex: (index: number) => void;
  setFeedbackType: (type: FeedbackType) => void;
  startRecording: () => void;
  stopRecording: () => void;
  addRecordedNote: (note: string) => void;
  clearRecording: () => void;
  setPlayingBack: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setTheme: (theme: ThemeName) => void;
  handleNotePlayed: (note: string, songNotes: SongNote[]) => void;
}

const savedTheme = (typeof window !== 'undefined' && localStorage.getItem('piano-theme')) as ThemeName || 'classic';

export const usePianoStore = create<PianoState>((set, get) => ({
  currentNote: null,
  activeNotes: new Set<string>(),
  learningMode: false,
  currentSongIndex: 0,
  currentNoteIndex: 0,
  feedbackType: null,
  isRecording: false,
  recording: [],
  recordStartTime: null,
  isPlayingBack: false,
  playbackSpeed: 1,
  theme: savedTheme,

  setCurrentNote: (note) => set({ currentNote: note }),
  addActiveNote: (note) => set((state) => {
    const next = new Set(state.activeNotes);
    next.add(note);
    return { activeNotes: next, currentNote: note };
  }),
  removeActiveNote: (note) => set((state) => {
    const next = new Set(state.activeNotes);
    next.delete(note);
    return { activeNotes: next, currentNote: next.size > 0 ? [...next][next.size - 1] : null };
  }),
  setLearningMode: (mode) => set({ learningMode: mode, currentNoteIndex: 0, feedbackType: null }),
  setCurrentSongIndex: (index) => set({ currentSongIndex: index, currentNoteIndex: 0, feedbackType: null }),
  setCurrentNoteIndex: (index) => set({ currentNoteIndex: index }),
  setFeedbackType: (type) => set({ feedbackType: type }),
  startRecording: () => set({ isRecording: true, recording: [], recordStartTime: Date.now() }),
  stopRecording: () => set({ isRecording: false, recordStartTime: null }),
  addRecordedNote: (note) => set((state) => {
    if (!state.isRecording || !state.recordStartTime) return {};
    const elapsed = Date.now() - state.recordStartTime;
    if (elapsed > 60000) {
      return { isRecording: false, recordStartTime: null };
    }
    return { recording: [...state.recording, { note, timestamp: elapsed }] };
  }),
  clearRecording: () => set({ recording: [], isRecording: false, recordStartTime: null }),
  setPlayingBack: (playing) => set({ isPlayingBack: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setTheme: (theme) => {
    localStorage.setItem('piano-theme', theme);
    set({ theme });
  },
  handleNotePlayed: (note, songNotes) => {
    const state = get();
    if (!state.learningMode) return;
    const expected = songNotes[state.currentNoteIndex];
    if (!expected) return;
    if (note === expected.note) {
      set({ feedbackType: 'correct' });
      setTimeout(() => {
        const s = get();
        if (s.feedbackType === 'correct') {
          set({ feedbackType: null });
        }
      }, 300);
      const nextIndex = s_currentNoteIndex(state.currentNoteIndex, songNotes.length);
      set({ currentNoteIndex: nextIndex });
    } else {
      set({ feedbackType: 'wrong' });
      setTimeout(() => {
        const s = get();
        if (s.feedbackType === 'wrong') {
          set({ feedbackType: null });
        }
      }, 500);
    }
  },
}));

function s_currentNoteIndex(current: number, total: number): number {
  if (current + 1 >= total) return 0;
  return current + 1;
}
