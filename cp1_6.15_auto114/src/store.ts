import { create } from 'zustand';
import { Bell, PlaybackSpeed, PlayEvent } from './types';

const NOTES = [
  { note: 'C4', frequency: 261.63 },
  { note: 'D4', frequency: 293.66 },
  { note: 'E4', frequency: 329.63 },
  { note: 'F4', frequency: 349.23 },
  { note: 'G4', frequency: 392.00 },
  { note: 'A4', frequency: 440.00 },
  { note: 'B4', frequency: 493.88 },
  { note: 'C5', frequency: 523.25 },
  { note: 'D5', frequency: 587.33 },
  { note: 'E5', frequency: 659.25 },
  { note: 'F5', frequency: 698.46 },
  { note: 'G5', frequency: 783.99 },
];

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function generateBells(): Bell[] {
  const bells: Bell[] = [];
  
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const diameter = 100 - (row * 15 + col * 5);
    const colorRatio = i / 11;
    
    const rStart = Math.round(255 - colorRatio * 73);
    const gStart = Math.round(215 - colorRatio * 80);
    const bStart = Math.round(0 + colorRatio * 51);
    
    const rEnd = Math.round(184 - colorRatio * 40);
    const gEnd = Math.round(115 - colorRatio * 40);
    const bEnd = Math.round(51 + colorRatio * 10);
    
    bells.push({
      id: `bell-${i}`,
      note: NOTES[i].note,
      frequency: NOTES[i].frequency,
      diameter: Math.max(40, Math.min(100, diameter)),
      row,
      col,
      key: KEYS[i],
      colorStart: `rgb(${rStart}, ${gStart}, ${bStart})`,
      colorEnd: `rgb(${rEnd}, ${gEnd}, ${bEnd})`,
    });
  }
  
  return bells;
}

interface AppStore {
  bells: Bell[];
  activeBellIds: Set<string>;
  isRecording: boolean;
  isPlaying: boolean;
  savedRecording: { events: PlayEvent[]; duration: number } | null;
  playbackSpeed: PlaybackSpeed;
  
  setActiveBell: (bellId: string, active: boolean) => void;
  setRecording: (recording: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setSavedRecording: (recording: { events: PlayEvent[]; duration: number } | null) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  bells: generateBells(),
  activeBellIds: new Set(),
  isRecording: false,
  isPlaying: false,
  savedRecording: null,
  playbackSpeed: 1,
  
  setActiveBell: (bellId, active) =>
    set((state) => {
      const newSet = new Set(state.activeBellIds);
      if (active) {
        newSet.add(bellId);
      } else {
        newSet.delete(bellId);
      }
      return { activeBellIds: newSet };
    }),
  
  setRecording: (recording) => set({ isRecording: recording }),
  
  setPlaying: (playing) => set({ isPlaying: playing }),
  
  setSavedRecording: (recording) => set({ savedRecording: recording }),
  
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
}));
