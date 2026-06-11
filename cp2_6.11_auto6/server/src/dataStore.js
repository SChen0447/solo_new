const rooms = new Map();

function ensureRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      drawActions: [],
      stickyNotes: new Map(),
      users: new Map(),
      createdAt: Date.now(),
    });
  }
  return rooms.get(roomId);
}

function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

function addDrawAction(roomId, action) {
  const room = ensureRoom(roomId);
  room.drawActions.push(action);
  return action;
}

function getActionsSince(roomId, timestamp) {
  const room = getRoom(roomId);
  if (!room) return [];
  return room.drawActions.filter((a) => a.timestamp > timestamp);
}

function getSnapshot(roomId, timestamp) {
  const room = getRoom(roomId);
  if (!room) return { drawActions: [], stickyNotes: [] };
  const actions = timestamp
    ? room.drawActions.filter((a) => a.timestamp <= timestamp)
    : room.drawActions;
  const notes = [];
  room.stickyNotes.forEach((note) => {
    if (!timestamp || note.timestamp <= timestamp) {
      notes.push(note);
    }
  });
  return { drawActions: actions, stickyNotes: notes };
}

function addStickyNote(roomId, note) {
  const room = ensureRoom(roomId);
  room.stickyNotes.set(note.id, note);
  return note;
}

function updateStickyNote(roomId, note) {
  const room = getRoom(roomId);
  if (!room) return null;
  const existing = room.stickyNotes.get(note.id);
  if (existing) {
    room.stickyNotes.set(note.id, { ...existing, ...note });
    return room.stickyNotes.get(note.id);
  }
  return null;
}

function deleteStickyNote(roomId, noteId) {
  const room = getRoom(roomId);
  if (!room) return false;
  return room.stickyNotes.delete(noteId);
}

function getStickyNotes(roomId) {
  const room = getRoom(roomId);
  if (!room) return [];
  const notes = [];
  room.stickyNotes.forEach((note) => notes.push(note));
  return notes;
}

function addUser(roomId, user) {
  const room = ensureRoom(roomId);
  room.users.set(user.id, user);
  return user;
}

function removeUser(roomId, userId) {
  const room = getRoom(roomId);
  if (!room) return null;
  const user = room.users.get(userId);
  room.users.delete(userId);
  if (room.users.size === 0) {
    rooms.delete(roomId);
  }
  return user;
}

function updateUserCursor(roomId, userId, x, y) {
  const room = getRoom(roomId);
  if (!room) return null;
  const user = room.users.get(userId);
  if (user) {
    user.cursorX = x;
    user.cursorY = y;
  }
  return user;
}

function getUsers(roomId) {
  const room = getRoom(roomId);
  if (!room) return [];
  const users = [];
  room.users.forEach((u) => users.push(u));
  return users;
}

function getTimeline(roomId) {
  const room = getRoom(roomId);
  if (!room) return [];
  return room.drawActions.map((a) => ({
    id: a.id,
    timestamp: a.timestamp,
    type: a.type,
  }));
}

module.exports = {
  ensureRoom,
  getRoom,
  addDrawAction,
  getActionsSince,
  getSnapshot,
  addStickyNote,
  updateStickyNote,
  deleteStickyNote,
  getStickyNotes,
  addUser,
  removeUser,
  updateUserCursor,
  getUsers,
  getTimeline,
};
