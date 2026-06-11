import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

export interface PlayerState {
  id: string;
  name: string;
  color: number;
  x: number;
  y: number;
  connected: boolean;
  reconnecting?: boolean;
  disconnectedAt?: number;
  lastUpdate: number;
}

export interface RoomState {
  id: string;
  players: PlayerState[];
  maxPlayers: number;
  createdAt: number;
}

export interface ButtonState {
  id: string;
  pressed: boolean;
  pressedBy: string | null;
  pressedAt: number;
}

export interface DoorState {
  id: string;
  open: boolean;
  requiredButtons: string[];
  openProgress: number;
}

export interface GameState {
  buttons: Record<string, ButtonState>;
  doors: Record<string, DoorState>;
  exitReady: Record<string, boolean>;
  victory: boolean;
  victoryTime: number | null;
  startTime: number;
}

export type SocketCallback<T = unknown> = (data: T) => void;

type MockRoom = {
  state: RoomState;
  gameState: GameState;
  clients: Map<string, Map<string, SocketCallback[]>>;
};

export class GameSocket {
  private socket: Socket | null = null;
  private useMock: boolean = true;
  private mockRoomId: string | null = null;
  private mockPlayerId: string = uuidv4();
  private listeners: Map<string, SocketCallback[]> = new Map();
  private static mockRooms: Map<string, MockRoom> = new Map();
  private reconnectTimer: number | null = null;

  constructor() {
    this.mockPlayerId = uuidv4();
  }

  public connect(url?: string): Promise<void> {
    return new Promise((resolve) => {
      if (url) {
        this.socket = io(url, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
          this.useMock = false;
          resolve();
        });

        this.socket.on('connect_error', () => {
          this.socket?.disconnect();
          this.socket = null;
          this.useMock = true;
          resolve();
        });
      } else {
        this.useMock = true;
        setTimeout(() => resolve(), 100);
      }
    });
  }

  public getPlayerId(): string {
    return this.mockPlayerId;
  }

  public createRoom(playerName: string): Promise<{ roomId: string; playerId: string; state: RoomState }> {
    if (this.useMock) {
      return new Promise((resolve) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const color = this.pickColor(0);
        const player: PlayerState = {
          id: this.mockPlayerId,
          name: playerName,
          color,
          x: 80,
          y: 280,
          connected: true,
          lastUpdate: Date.now()
        };

        const gameState = this.createInitialGameState();

        const room: MockRoom = {
          state: {
            id: roomId,
            players: [player],
            maxPlayers: 3,
            createdAt: Date.now()
          },
          gameState,
          clients: new Map()
        };
        room.clients.set(this.mockPlayerId, new Map());
        GameSocket.mockRooms.set(roomId, room);
        this.mockRoomId = roomId;

        setTimeout(() => {
          resolve({
            roomId,
            playerId: this.mockPlayerId,
            state: room.state
          });
        }, 50);
      });
    }
    return this.emitAsync('create-room', { playerName });
  }

  public joinRoom(roomId: string, playerName: string): Promise<{ success: boolean; playerId: string; state: RoomState; message?: string }> {
    if (this.useMock) {
      return new Promise((resolve) => {
        const room = GameSocket.mockRooms.get(roomId);
        if (!room) {
          setTimeout(() => resolve({ success: false, playerId: this.mockPlayerId, state: {} as RoomState, message: '房间不存在' }), 50);
          return;
        }
        if (room.state.players.filter(p => p.connected).length >= room.state.maxPlayers) {
          setTimeout(() => resolve({ success: false, playerId: this.mockPlayerId, state: {} as RoomState, message: '房间已满' }), 50);
          return;
        }

        const colorIdx = room.state.players.length % 3;
        const color = this.pickColor(colorIdx);
        const spawnPositions = [[80, 280], [80, 320], [80, 360]];
        const spawn = spawnPositions[room.state.players.length] || [80, 280];

        const player: PlayerState = {
          id: this.mockPlayerId,
          name: playerName,
          color,
          x: spawn[0],
          y: spawn[1],
          connected: true,
          lastUpdate: Date.now()
        };

        room.state.players.push(player);
        room.clients.set(this.mockPlayerId, new Map());
        this.mockRoomId = roomId;

        this.mockBroadcast(roomId, 'player-joined', player);

        setTimeout(() => {
          resolve({
            success: true,
            playerId: this.mockPlayerId,
            state: JSON.parse(JSON.stringify(room.state))
          });
        }, 50);
      });
    }
    return this.emitAsync('join-room', { roomId, playerName });
  }

  public leaveRoom(): void {
    if (this.useMock && this.mockRoomId) {
      const room = GameSocket.mockRooms.get(this.mockRoomId);
      if (room) {
        const idx = room.state.players.findIndex(p => p.id === this.mockPlayerId);
        if (idx !== -1) {
          room.state.players.splice(idx, 1);
        }
        room.clients.delete(this.mockPlayerId);

        if (room.state.players.length === 0) {
          GameSocket.mockRooms.delete(this.mockRoomId);
        } else {
          this.mockBroadcast(this.mockRoomId, 'player-left', { playerId: this.mockPlayerId });
        }
      }
      this.mockRoomId = null;
    } else {
      this.emit('leave-room', {});
    }
  }

  public sendMove(x: number, y: number): void {
    const data = { playerId: this.mockPlayerId, x, y, timestamp: Date.now() };
    if (this.useMock && this.mockRoomId) {
      const room = GameSocket.mockRooms.get(this.mockRoomId);
      if (room) {
        const player = room.state.players.find(p => p.id === this.mockPlayerId);
        if (player) {
          player.x = x;
          player.y = y;
          player.lastUpdate = data.timestamp;
        }
        this.mockBroadcastToOthers(this.mockRoomId, 'player-moved', data);
      }
    } else {
      this.emit('player-move', data);
    }
  }

  public pressButton(buttonId: string): void {
    const data = { playerId: this.mockPlayerId, buttonId, timestamp: Date.now() };
    if (this.useMock && this.mockRoomId) {
      const room = GameSocket.mockRooms.get(this.mockRoomId);
      if (room) {
        const button = room.gameState.buttons[buttonId];
        if (button) {
          button.pressed = true;
          button.pressedBy = this.mockPlayerId;
          button.pressedAt = data.timestamp;
          this.checkDoors(room.gameState);
        }
        this.mockBroadcast(this.mockRoomId, 'button-pressed', data);
        this.mockBroadcast(this.mockRoomId, 'game-state', JSON.parse(JSON.stringify(room.gameState)));
      }
    } else {
      this.emit('press-button', data);
    }
  }

  public releaseButton(buttonId: string): void {
    const data = { playerId: this.mockPlayerId, buttonId, timestamp: Date.now() };
    if (this.useMock && this.mockRoomId) {
      const room = GameSocket.mockRooms.get(this.mockRoomId);
      if (room) {
        const button = room.gameState.buttons[buttonId];
        if (button && button.pressedBy === this.mockPlayerId) {
          button.pressed = false;
          button.pressedBy = null;
          this.checkDoors(room.gameState);
        }
        this.mockBroadcast(this.mockRoomId, 'button-released', data);
        this.mockBroadcast(this.mockRoomId, 'game-state', JSON.parse(JSON.stringify(room.gameState)));
      }
    } else {
      this.emit('release-button', data);
    }
  }

  public toggleExit(active: boolean): void {
    const data = { playerId: this.mockPlayerId, active, timestamp: Date.now() };
    if (this.useMock && this.mockRoomId) {
      const room = GameSocket.mockRooms.get(this.mockRoomId);
      if (room) {
        room.gameState.exitReady[this.mockPlayerId] = active;
        const allReady = room.state.players
          .filter(p => p.connected)
          .every(p => room.gameState.exitReady[p.id]);

        if (allReady && !room.gameState.victory) {
          room.gameState.victory = true;
          room.gameState.victoryTime = Date.now() - room.gameState.startTime;
          this.mockBroadcast(this.mockRoomId, 'victory', { time: room.gameState.victoryTime });
        }
        this.mockBroadcast(this.mockRoomId, 'exit-toggled', data);
      }
    } else {
      this.emit('toggle-exit', data);
    }
  }

  public requestReconnect(roomId: string, playerId: string): Promise<{ success: boolean; state: RoomState; gameState: GameState }> {
    if (this.useMock) {
      return new Promise((resolve) => {
        const room = GameSocket.mockRooms.get(roomId);
        if (!room) {
          resolve({ success: false, state: {} as RoomState, gameState: {} as GameState });
          return;
        }
        const player = room.state.players.find(p => p.id === playerId);
        if (!player) {
          resolve({ success: false, state: {} as RoomState, gameState: {} as GameState });
          return;
        }
        const now = Date.now();
        const timeout = (player.disconnectedAt || 0) + 10000;
        if (now > timeout) {
          resolve({ success: false, state: {} as RoomState, gameState: {} as GameState });
          return;
        }
        player.connected = true;
        player.reconnecting = false;
        player.disconnectedAt = undefined;
        this.mockBroadcast(roomId, 'player-reconnected', { playerId });
        this.mockRoomId = roomId;
        resolve({
          success: true,
          state: JSON.parse(JSON.stringify(room.state)),
          gameState: JSON.parse(JSON.stringify(room.gameState))
        });
      });
    }
    return this.emitAsync('reconnect', { roomId, playerId });
  }

  public simulateDisconnect(): void {
    if (this.useMock && this.mockRoomId) {
      const room = GameSocket.mockRooms.get(this.mockRoomId);
      if (room) {
        const player = room.state.players.find(p => p.id === this.mockPlayerId);
        if (player) {
          player.connected = false;
          player.reconnecting = true;
          player.disconnectedAt = Date.now();
          this.mockBroadcast(this.mockRoomId, 'player-disconnected', { playerId: this.mockPlayerId });
        }
      }
    }
  }

  public on<T = unknown>(event: string, callback: SocketCallback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback as SocketCallback);

    if (!this.useMock && this.socket) {
      this.socket.on(event, callback as (...args: unknown[]) => void);
    }

    if (this.useMock && this.mockRoomId) {
      const room = GameSocket.mockRooms.get(this.mockRoomId);
      if (room) {
        const playerListeners = room.clients.get(this.mockPlayerId);
        if (playerListeners) {
          if (!playerListeners.has(event)) {
            playerListeners.set(event, []);
          }
          playerListeners.get(event)!.push(callback as SocketCallback);
        }
      }
    }
  }

  public off(event: string): void {
    this.listeners.delete(event);
    if (!this.useMock && this.socket) {
      this.socket.off(event);
    }
  }

  public getRoomState(): RoomState | null {
    if (this.useMock && this.mockRoomId) {
      const room = GameSocket.mockRooms.get(this.mockRoomId);
      return room ? JSON.parse(JSON.stringify(room.state)) : null;
    }
    return null;
  }

  public getGameState(): GameState | null {
    if (this.useMock && this.mockRoomId) {
      const room = GameSocket.mockRooms.get(this.mockRoomId);
      return room ? JSON.parse(JSON.stringify(room.gameState)) : null;
    }
    return null;
  }

  private emit(event: string, data: unknown): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  private emitAsync<T>(event: string, data: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.socket.emit(event, data, (response: T | { error: string }) => {
          if (response && typeof response === 'object' && 'error' in response) {
            reject(new Error(response.error));
          } else {
            resolve(response as T);
          }
        });
      } else {
        reject(new Error('No socket connection'));
      }
    });
  }

  private mockBroadcast(roomId: string, event: string, data: unknown): void {
    const room = GameSocket.mockRooms.get(roomId);
    if (!room) return;

    room.clients.forEach((playerListeners) => {
      const callbacks = playerListeners.get(event);
      if (callbacks) {
        setTimeout(() => {
          callbacks.forEach(cb => cb(data));
        }, 20 + Math.random() * 40);
      }
    });

    const globalCallbacks = this.listeners.get(event);
    if (globalCallbacks) {
      setTimeout(() => {
        globalCallbacks.forEach(cb => cb(data));
      }, 20 + Math.random() * 40);
    }
  }

  private mockBroadcastToOthers(roomId: string, event: string, data: unknown): void {
    const room = GameSocket.mockRooms.get(roomId);
    if (!room) return;

    room.clients.forEach((playerListeners, pid) => {
      if (pid === this.mockPlayerId) return;
      const callbacks = playerListeners.get(event);
      if (callbacks) {
        setTimeout(() => {
          callbacks.forEach(cb => cb(data));
        }, 20 + Math.random() * 40);
      }
    });
  }

  private checkDoors(gameState: GameState): void {
    Object.values(gameState.doors).forEach(door => {
      const allPressed = door.requiredButtons.every(btnId => {
        const btn = gameState.buttons[btnId];
        return btn && btn.pressed;
      });
      door.open = allPressed;
    });
  }

  private createInitialGameState(): GameState {
    return {
      buttons: {
        btn_a: { id: 'btn_a', pressed: false, pressedBy: null, pressedAt: 0 },
        btn_b: { id: 'btn_b', pressed: false, pressedBy: null, pressedAt: 0 }
      },
      doors: {
        door_1: { id: 'door_1', open: false, requiredButtons: ['btn_a', 'btn_b'], openProgress: 0 }
      },
      exitReady: {},
      victory: false,
      victoryTime: null,
      startTime: Date.now()
    };
  }

  private pickColor(index: number): number {
    const colors = [0xff6b6b, 0x51cf66, 0x339af0];
    return colors[index % colors.length] || 0xffffff;
  }

  public destroy(): void {
    this.leaveRoom();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.listeners.clear();
  }
}
