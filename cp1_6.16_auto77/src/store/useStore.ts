import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Track {
  id: string;
  name: string;
  type: 'melody' | 'chord' | 'percussion';
  volume: number;
  muted: boolean;
  solo: boolean;
}

export interface Note {
  id: string;
  trackId: string;
  start: number;
  pitch: number;
  duration: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor: number;
}

export const TRACK_COLORS: Record<string, string> = {
  melody: '#64B5F6',
  chord: '#FFB74D',
  percussion: '#CE93D8',
};

export const TRACK_TYPES = ['melody', 'chord', 'percussion'] as const;

interface StoreState {
  tracks: Track[];
  notes: Note[];
  users: User[];
  selfUserId: string | null;
  roomId: string | null;
  isPlaying: boolean;
  playhead: number;
  totalDuration: number;
  highlightedNoteIds: Set<string>;
  wsConnected: boolean;
  ws: WebSocket | null;

  setWs: (ws: WebSocket | null) => void;
  setWsConnected: (connected: boolean) => void;
  initState: (data: { tracks: Track[]; notes: Note[]; users: User[]; roomId: string; selfUserId: string }) => void;
  syncState: (data: { tracks: Track[]; notes: Note[]; users: User[] }) => void;

  addTrack: (type: 'melody' | 'chord' | 'percussion') => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (track: Track) => void;
  toggleMute: (trackId: string) => void;
  toggleSolo: (trackId: string) => void;
  setVolume: (trackId: string, volume: number) => void;

  addNote: (trackId: string, start: number, pitch: number, duration?: number) => void;
  moveNote: (noteId: string, start: number, pitch: number) => void;
  removeNote: (noteId: string) => void;

  setIsPlaying: (playing: boolean) => void;
  setPlayhead: (pos: number) => void;
  highlightNote: (noteId: string) => void;
  clearHighlight: (noteId: string) => void;

  joinRoom: (roomId?: string, userName?: string) => void;
  sendCursor: (cursor: number) => void;
  exportMIDI: () => void;
}

let audioCtx: AudioContext | null = null;

function playClick() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 800;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

export function playSnapClick() {
  playClick();
}

export function playNote(pitch: number, volume: number, type: string) {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  const ctx = audioCtx;
  const now = ctx.currentTime;

  if (type === 'percussion') {
    const noise = ctx.createBufferSource();
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    noise.buffer = buffer;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200 + (pitch - 35) * 30;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(volume / 100 * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noise.start(now);
    noise.stop(now + 0.15);
  } else {
    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type === 'chord' ? 'triangle' : 'sine';
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume / 100 * 0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);

    if (type === 'chord') {
      [4, 7].forEach((interval) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = freq * Math.pow(2, interval / 12);
        o.type = 'triangle';
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(volume / 100 * 0.25, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        o.start(now);
        o.stop(now + 0.4);
      });
    }
  }
}

const getWs = (): WebSocket | null => {
  const ws = (window as any).__musicWs as WebSocket | undefined;
  return ws ?? null;
};

const sendWs = (type: string, data: any) => {
  const ws = getWs();
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data }));
  }
};

export const useStore = create<StoreState>((set, get) => ({
  tracks: [],
  notes: [],
  users: [],
  selfUserId: null,
  roomId: null,
  isPlaying: false,
  playhead: 0,
  totalDuration: 16 * 64,
  highlightedNoteIds: new Set(),
  wsConnected: false,
  ws: null,

  setWs: (ws) => {
    (window as any).__musicWs = ws;
    set({ ws });
  },

  setWsConnected: (connected) => set({ wsConnected: connected }),

  initState: ({ tracks, notes, users, roomId, selfUserId }) => {
    set({ tracks, notes, users, roomId, selfUserId });
  },

  syncState: ({ tracks, notes, users }) => {
    set({ tracks, notes, users });
  },

  addTrack: (type) => {
    const state = get();
    if (state.tracks.length >= 8) return;
    const count = state.tracks.filter((t) => t.type === type).length + 1;
    const typeNames: Record<string, string> = { melody: '旋律', chord: '和弦', percussion: '打击乐' };
    const track: Track = {
      id: uuidv4(),
      name: `${typeNames[type]} ${count}`,
      type,
      volume: 80,
      muted: false,
      solo: false,
    };
    const newTracks = [...state.tracks, track];
    set({ tracks: newTracks });
    sendWs('addTrack', { track });
  },

  removeTrack: (trackId) => {
    const state = get();
    const newTracks = state.tracks.filter((t) => t.id !== trackId);
    const newNotes = state.notes.filter((n) => n.trackId !== trackId);
    set({ tracks: newTracks, notes: newNotes });
    sendWs('removeTrack', { trackId });
  },

  updateTrack: (track) => {
    const state = get();
    const idx = state.tracks.findIndex((t) => t.id === track.id);
    if (idx === -1) return;
    const newTracks = [...state.tracks];
    newTracks[idx] = track;
    set({ tracks: newTracks });
    sendWs('updateTrack', { track });
  },

  toggleMute: (trackId) => {
    const state = get();
    const track = state.tracks.find((t) => t.id === trackId);
    if (track) {
      get().updateTrack({ ...track, muted: !track.muted });
    }
  },

  toggleSolo: (trackId) => {
    const state = get();
    const hasOtherSolo = state.tracks.some((t) => t.id !== trackId && t.solo);
    const newTracks = state.tracks.map((t) => {
      if (t.id === trackId) {
        return { ...t, solo: !t.solo };
      }
      if (!hasOtherSolo) {
        return t;
      }
      return t;
    });
    set({ tracks: newTracks });
    newTracks.forEach((t) => sendWs('updateTrack', { track: t }));
  },

  setVolume: (trackId, volume) => {
    const state = get();
    const track = state.tracks.find((t) => t.id === trackId);
    if (track) {
      get().updateTrack({ ...track, volume: Math.max(0, Math.min(100, volume)) });
    }
  },

  addNote: (trackId, start, pitch, duration = 16) => {
    const state = get();
    const note: Note = {
      id: uuidv4(),
      trackId,
      start,
      pitch,
      duration,
    };
    set({ notes: [...state.notes, note] });
    const track = state.tracks.find((t) => t.id === trackId);
    if (track) {
      const effectiveVolume = getEffectiveVolume(track, state.tracks);
      playNote(pitch, effectiveVolume, track.type);
    }
    sendWs('addNote', { note });
  },

  moveNote: (noteId, start, pitch) => {
    const state = get();
    const idx = state.notes.findIndex((n) => n.id === noteId);
    if (idx === -1) return;
    const newNotes = [...state.notes];
    newNotes[idx] = { ...newNotes[idx], start, pitch };
    set({ notes: newNotes });
    sendWs('moveNote', { note: newNotes[idx] });
  },

  removeNote: (noteId) => {
    const state = get();
    set({ notes: state.notes.filter((n) => n.id !== noteId) });
    sendWs('removeNote', { noteId });
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlayhead: (pos) => {
    const clamped = Math.max(0, Math.min(pos, get().totalDuration));
    set({ playhead: clamped });
    sendWs('cursor', { cursor: clamped });
  },

  highlightNote: (noteId) => {
    set((s) => {
      const next = new Set(s.highlightedNoteIds);
      next.add(noteId);
      return { highlightedNoteIds: next };
    });
  },

  clearHighlight: (noteId) => {
    set((s) => {
      const next = new Set(s.highlightedNoteIds);
      next.delete(noteId);
      return { highlightedNoteIds: next };
    });
  },

  joinRoom: (roomId, userName) => {
    const ws = getWs();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'join',
        data: { roomId, userName },
      }));
    }
  },

  sendCursor: (cursor) => {
    sendWs('cursor', { cursor });
  },

  exportMIDI: () => {
    const ws = getWs();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'exportMIDI', data: {} }));
    }
  },
}));

export function getEffectiveVolume(track: Track, allTracks: Track[]): number {
  if (track.muted) return 0;
  const hasSolo = allTracks.some((t) => t.solo);
  if (hasSolo && !track.solo) return track.volume * 0.5;
  return track.volume;
}
