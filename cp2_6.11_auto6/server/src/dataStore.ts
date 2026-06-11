import { DrawAction, StickyNoteData, UserInfo, RoomStore } from './types';

const rooms = new Map<string, RoomStore>();

export function ensureRoom(roomId: string): RoomStore {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      drawActions: [],
      stickyNotes: new Map<string, StickyNoteData>(),
      users: new Map<string, UserInfo>(),
      createdAt: Date.now(),
    });
  }
  return rooms.get(roomId) as RoomStore;
}

export function getRoom(roomId: string): RoomStore | null {
  return rooms.get(roomId) || null;
}

export function addDrawAction(roomId: string, action: DrawAction): DrawAction {
  const room = ensureRoom(roomId);
  room.drawActions.push(action);
  return action;
}

export function getActionsSince(roomId: string, timestamp: number): DrawAction[] {
  const room = getRoom(roomId);
  if (!room) return [];
  return room.drawActions.filter((a) => a.timestamp > timestamp);
}

export function getSnapshot(
  roomId: string,
  timestamp?: number
): { drawActions: DrawAction[]; stickyNotes: StickyNoteData[] } {
  const room = getRoom(roomId);
  if (!room) return { drawActions: [], stickyNotes: [] };
  const actions = timestamp
    ? room.drawActions.filter((a) => a.timestamp <= timestamp)
    : room.drawActions;
  const notes: StickyNoteData[] = [];
  room.stickyNotes.forEach((note) => {
    if (!timestamp || note.timestamp <= timestamp) {
      notes.push(note);
    }
  });
  return { drawActions: actions, stickyNotes: notes };
}

export function addStickyNote(roomId: string, note: StickyNoteData): StickyNoteData {
  const room = ensureRoom(roomId);
  room.stickyNotes.set(note.id, note);
  return note;
}

export function updateStickyNote(
  roomId: string,
  note: Partial<StickyNoteData> & { id: string }
): StickyNoteData | null {
  const room = getRoom(roomId);
  if (!room) return null;
  const existing = room.stickyNotes.get(note.id);
  if (existing) {
    const merged: StickyNoteData = { ...existing, ...note };
    room.stickyNotes.set(note.id, merged);
    return merged;
  }
  return null;
}

export function deleteStickyNote(roomId: string, noteId: string): boolean {
  const room = getRoom(roomId);
  if (!room) return false;
  return room.stickyNotes.delete(noteId);
}

export function getStickyNotes(roomId: string): StickyNoteData[] {
  const room = getRoom(roomId);
  if (!room) return [];
  const notes: StickyNoteData[] = [];
  room.stickyNotes.forEach((note) => notes.push(note));
  return notes;
}

export function addUser(roomId: string, user: UserInfo): UserInfo {
  const room = ensureRoom(roomId);
  room.users.set(user.id, user);
  return user;
}

export function removeUser(roomId: string, userId: string): UserInfo | null {
  const room = getRoom(roomId);
  if (!room) return null;
  const user = room.users.get(userId) || null;
  room.users.delete(userId);
  if (room.users.size === 0) {
    rooms.delete(roomId);
  }
  return user;
}

export function updateUserCursor(
  roomId: string,
  userId: string,
  x: number,
  y: number
): UserInfo | null {
  const room = getRoom(roomId);
  if (!room) return null;
  const user = room.users.get(userId);
  if (user) {
    user.cursorX = x;
    user.cursorY = y;
  }
  return user || null;
}

export function getUsers(roomId: string): UserInfo[] {
  const room = getRoom(roomId);
  if (!room) return [];
  const users: UserInfo[] = [];
  room.users.forEach((u) => users.push(u));
  return users;
}

export function getTimeline(roomId: string): { id: string; timestamp: number; type: string }[] {
  const room = getRoom(roomId);
  if (!room) return [];
  return room.drawActions.map((a) => ({
    id: a.id,
    timestamp: a.timestamp,
    type: a.type,
  }));
}
