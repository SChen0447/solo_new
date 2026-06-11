import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { StickyNote, Viewport, NoteType, TextNote, VoteNote, AnnotationNote, FontSize } from './types';
import { NOTE_COLORS, DEFAULT_NOTE_SIZES } from './types';

const STORAGE_KEY = 'brainstorm-canvas-state';
const SENDER_ID = uuidv4();

interface SyncMessageEnvelope {
  senderId: string;
  type: 'note_add' | 'note_move' | 'note_update' | 'note_vote' | 'note_delete' | 'canvas_clear';
  payload: unknown;
}

interface BrainstormStore {
  notes: StickyNote[];
  viewport: Viewport;
  selectedNoteId: string | null;
  userId: string;
  senderId: string;
}

type Setter = Parameters<typeof create<BrainstormStore>>[0] extends (
  f: infer S,
  ...args: unknown[]
) => unknown
  ? S
  : never;
type Getter = () => BrainstormStore;

export const CHANNEL_NAME = 'brainstorm-sync-v2';

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {
  // BroadcastChannel not supported
}

const userId = uuidv4();

function loadState(): { notes: StickyNote[]; viewport: Viewport } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        notes: (parsed.notes || []) as StickyNote[],
        viewport: parsed.viewport || { x: 0, y: 0, scale: 1 },
      };
    }
  } catch {
    // ignore parse errors
  }
  return { notes: [], viewport: { x: 0, y: 0, scale: 1 } };
}

export function saveState(notes: StickyNote[], viewport: Viewport) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes, viewport }));
  } catch {
    // ignore storage errors
  }
}

const initialState = loadState();

if (initialState.notes.length === 0) {
  const demoNotes: StickyNote[] = [
    {
      id: uuidv4(),
      type: 'text',
      x: -300,
      y: -120,
      width: 200,
      height: 160,
      color: '#FF6B6B',
      createdAt: Date.now(),
      content: '欢迎使用头脑风暴画布！\n\n拖拽移动便签，多标签页打开试试同步效果。',
      fontSize: 'medium',
    } as TextNote,
    {
      id: uuidv4(),
      type: 'vote',
      x: 0,
      y: -100,
      width: 220,
      height: 180,
      color: '#74B9FF',
      createdAt: Date.now(),
      content: '我们今天做哪个方案？\nA方案还是B方案？',
      votes: [],
    } as VoteNote,
    {
      id: uuidv4(),
      type: 'annotation',
      x: 320,
      y: -80,
      width: 260,
      height: 200,
      color: '#B39DDB',
      createdAt: Date.now(),
      content: '这个区域是重点关注区域，大家可以在这里添加相关想法。',
      regionWidth: 260,
      regionHeight: 160,
    } as AnnotationNote,
    {
      id: uuidv4(),
      type: 'text',
      x: -150,
      y: 120,
      width: 180,
      height: 140,
      color: '#FFB347',
      createdAt: Date.now(),
      content: '💡 操作提示：\n\n• 滚轮缩放画布\n• 拖拽空白处平移\n• 点击便签查看详情',
      fontSize: 'small',
    } as TextNote,
  ];
  initialState.notes = demoNotes;
}

function updateNoteById(notes: StickyNote[], id: string, updates: Partial<StickyNote>): StickyNote[] {
  return notes.map((n) => {
    if (n.id !== id) return n;
    if (n.type === 'text') {
      return { ...n, ...updates } as TextNote;
    } else if (n.type === 'vote') {
      return { ...n, ...updates } as VoteNote;
    } else {
      return { ...n, ...updates } as AnnotationNote;
    }
  });
}

export function toggleVoteInNotes(notes: StickyNote[], id: string, voterId: string): StickyNote[] {
  return notes.map((n) => {
    if (n.id !== id || n.type !== 'vote') return n;
    const hasVoted = n.votes.includes(voterId);
    return {
      ...n,
      votes: hasVoted ? n.votes.filter((v) => v !== voterId) : [...n.votes, voterId],
    } as VoteNote;
  });
}

function postMessage(msg: Omit<SyncMessageEnvelope, 'senderId'>) {
  if (!channel) return;
  try {
    const envelope: SyncMessageEnvelope = { senderId: SENDER_ID, ...msg };
    channel.postMessage(envelope);
  } catch {
    // ignore
  }
}

export const useBrainstormStore = create<BrainstormStore>(() => ({
  notes: initialState.notes,
  viewport: initialState.viewport,
  selectedNoteId: null,
  userId,
  senderId: SENDER_ID,
}));

const state = useBrainstormStore;

export function addNoteAction(type: NoteType): StickyNote | null {
  const s = state.getState();
  const colors = NOTE_COLORS[type];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const sizes = DEFAULT_NOTE_SIZES[type];
  const centerX = (window.innerWidth / 2 - s.viewport.x) / s.viewport.scale - sizes.width / 2;
  const centerY = (window.innerHeight / 2 - s.viewport.y) / s.viewport.scale - sizes.height / 2;
  const offsetX = (Math.random() - 0.5) * 100;
  const offsetY = (Math.random() - 0.5) * 100;

  const base = {
    id: uuidv4(),
    type,
    x: centerX + offsetX,
    y: centerY + offsetY,
    width: sizes.width,
    height: sizes.height,
    color,
    createdAt: Date.now(),
  };

  let note: StickyNote;
  if (type === 'text') {
    note = { ...base, type: 'text', content: '', fontSize: 'medium' as FontSize } as TextNote;
  } else if (type === 'vote') {
    note = { ...base, type: 'vote', content: '', votes: [] } as VoteNote;
  } else {
    note = {
      ...base,
      type: 'annotation',
      content: '',
      regionWidth: sizes.width,
      regionHeight: sizes.height,
    } as AnnotationNote;
  }

  const newNotes = [...s.notes, note];
  state.setState({ notes: newNotes });
  saveState(newNotes, s.viewport);
  postMessage({ type: 'note_add', payload: note });
  return note;
}

export function moveNoteAction(id: string, x: number, y: number) {
  const s = state.getState();
  const newNotes = s.notes.map((n) => (n.id === id ? { ...n, x, y } : n));
  state.setState({ notes: newNotes });
  saveState(newNotes, s.viewport);
  postMessage({ type: 'note_move', payload: { id, x, y } });
}

export function updateNoteAction(id: string, updates: Partial<StickyNote>) {
  const s = state.getState();
  const newNotes = updateNoteById(s.notes, id, updates);
  state.setState({ notes: newNotes });
  saveState(newNotes, s.viewport);
  postMessage({ type: 'note_update', payload: { id, updates } });
}

export function deleteNoteAction(id: string) {
  const s = state.getState();
  const newNotes = s.notes.filter((n) => n.id !== id);
  state.setState({ notes: newNotes, selectedNoteId: null });
  saveState(newNotes, s.viewport);
  postMessage({ type: 'note_delete', payload: { id } });
}

export function voteNoteAction(id: string) {
  const s = state.getState();
  const newNotes = toggleVoteInNotes(s.notes, id, s.userId);
  state.setState({ notes: newNotes });
  saveState(newNotes, s.viewport);
  postMessage({ type: 'note_vote', payload: { id, userId: s.userId } });
}

export function clearCanvasAction() {
  const s = state.getState();
  state.setState({ notes: [], selectedNoteId: null });
  saveState([], s.viewport);
  postMessage({ type: 'canvas_clear', payload: null });
}

export function setViewportAction(viewport: Partial<Viewport>) {
  const s = state.getState();
  const newViewport = { ...s.viewport, ...viewport };
  state.setState({ viewport: newViewport });
  saveState(s.notes, newViewport);
}

export function setSelectedNoteIdAction(id: string | null) {
  state.setState({ selectedNoteId: id });
}

export function loadFromStorageAction() {
  const loaded = loadState();
  state.setState({ notes: loaded.notes, viewport: loaded.viewport });
}

if (channel) {
  channel.onmessage = (event: MessageEvent<SyncMessageEnvelope>) => {
    const env = event.data;
    if (!env || env.senderId === SENDER_ID) return;

    const s = state.getState();
    switch (env.type) {
      case 'note_add': {
        const note = env.payload as StickyNote;
        if (!s.notes.find((n) => n.id === note.id)) {
          const newNotes = [...s.notes, note];
          state.setState({ notes: newNotes });
          saveState(newNotes, s.viewport);
        }
        break;
      }
      case 'note_move': {
        const { id, x, y } = env.payload as { id: string; x: number; y: number };
        const newNotes = s.notes.map((n) => (n.id === id ? { ...n, x, y } : n));
        state.setState({ notes: newNotes });
        saveState(newNotes, s.viewport);
        break;
      }
      case 'note_update': {
        const { id, updates } = env.payload as { id: string; updates: Partial<StickyNote> };
        const newNotes = updateNoteById(s.notes, id, updates);
        state.setState({ notes: newNotes });
        saveState(newNotes, s.viewport);
        break;
      }
      case 'note_vote': {
        const { id, userId: voterId } = env.payload as { id: string; userId: string };
        const newNotes = toggleVoteInNotes(s.notes, id, voterId);
        state.setState({ notes: newNotes });
        saveState(newNotes, s.viewport);
        break;
      }
      case 'note_delete': {
        const { id } = env.payload as { id: string };
        const newNotes = s.notes.filter((n) => n.id !== id);
        state.setState({ notes: newNotes });
        saveState(newNotes, s.viewport);
        break;
      }
      case 'canvas_clear': {
        state.setState({ notes: [], selectedNoteId: null });
        saveState([], s.viewport);
        break;
      }
    }
  };
}
