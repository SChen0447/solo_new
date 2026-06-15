export interface User {
  id: string;
  name: string;
  color: string;
  roomId: string;
}

export interface DrawEvent {
  id: string;
  type: 'pen' | 'rect' | 'circle' | 'text' | 'delete';
  userId: string;
  userName: string;
  userColor: string;
  timestamp: number;
  data: any;
}

export interface CursorPosition {
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
  timestamp: number;
}

interface Room {
  id: string;
  users: Map<string, User>;
  history: DrawEvent[];
  cursors: Map<string, CursorPosition>;
}

const COLORS = [
  '#e74c3c', '#f39c12', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
  '#795548', '#607d8b', '#2d3436', '#ffffff'
];

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private HISTORY_TTL = 30 * 1000;
  private MAX_USERS_PER_ROOM = 8;

  createRoom(roomId: string): Room {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        users: new Map(),
        history: [],
        cursors: new Map()
      });
    }
    return this.rooms.get(roomId)!;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addUser(roomId: string, userId: string, userName: string): { user: User; history: DrawEvent[] } | null {
    const room = this.createRoom(roomId);
    
    if (room.users.size >= this.MAX_USERS_PER_ROOM) {
      return null;
    }

    const usedColors = Array.from(room.users.values()).map(u => u.color);
    const availableColors = COLORS.filter(c => !usedColors.includes(c));
    const color = availableColors[0] || COLORS[Math.floor(Math.random() * COLORS.length)];

    const user: User = { id: userId, name: userName, color, roomId };
    room.users.set(userId, user);

    const recentHistory = this.cleanupAndGetHistory(roomId);

    return { user, history: recentHistory };
  }

  removeUser(roomId: string, userId: string): User[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    room.users.delete(userId);
    room.cursors.delete(userId);

    if (room.users.size === 0) {
      this.rooms.delete(roomId);
      return [];
    }

    return Array.from(room.users.values());
  }

  getUsers(roomId: string): User[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.values()) : [];
  }

  addDrawEvent(roomId: string, event: DrawEvent): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    event.timestamp = Date.now();
    room.history.push(event);
    this.cleanupAndGetHistory(roomId);
    return true;
  }

  updateCursor(roomId: string, cursor: CursorPosition): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    cursor.timestamp = Date.now();
    room.cursors.set(cursor.userId, cursor);
    return true;
  }

  getCursors(roomId: string): CursorPosition[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.cursors.values()) : [];
  }

  private cleanupAndGetHistory(roomId: string): DrawEvent[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const now = Date.now();
    room.history = room.history.filter(event => now - event.timestamp < this.HISTORY_TTL);
    return [...room.history];
  }
}

export const roomManager = new RoomManager();
