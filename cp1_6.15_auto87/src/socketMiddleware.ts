import { io, Socket } from 'socket.io-client';
import { useStore } from './store';
import { DrawEvent, CursorPosition, User, CanvasElement } from './types';

class SocketMiddleware {
  private socket: Socket | null = null;
  private cursorThrottleTimer: number | null = null;
  private lastCursorSendTime = 0;
  private readonly CURSOR_THROTTLE_INTERVAL = 100;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io({
          transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          useStore.getState().setIsConnected(true);
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
          useStore.getState().setIsConnected(false);
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          useStore.getState().setIsConnected(false);
          reject(error);
        });

        this.setupEventListeners();
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('draw', (event: DrawEvent) => {
      const currentUser = useStore.getState().currentUser;
      if (currentUser && event.userId !== currentUser.id) {
        useStore.getState().handleRemoteDrawEvent(event);
      }
    });

    this.socket.on('cursor-move', (cursor: CursorPosition) => {
      const currentUser = useStore.getState().currentUser;
      if (currentUser && cursor.userId !== currentUser.id) {
        useStore.getState().updateCursor(cursor);
      }
    });

    this.socket.on('user-joined', (data: { user: User; users: User[] }) => {
      useStore.getState().setUsers(data.users);
    });

    this.socket.on('user-left', (data: { userId: string; users: User[] }) => {
      useStore.getState().setUsers(data.users);
      useStore.getState().removeCursor(data.userId);
    });
  }

  joinRoom(roomId: string, userName: string): Promise<{ success: boolean; user?: User; history?: DrawEvent[]; users?: User[]; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: '未连接到服务器' });
        return;
      }

      this.socket.emit('join-room', { roomId, userName }, (response: any) => {
        if (response.success) {
          useStore.getState().setCurrentUser(response.user);
          useStore.getState().setUsers(response.users);
          useStore.getState().setRoomId(roomId);
          if (response.history && response.history.length > 0) {
            useStore.getState().loadHistory(response.history);
          }
        }
        resolve(response);
      });
    });
  }

  leaveRoom(): void {
    if (!this.socket) return;
    this.socket.emit('leave-room');
    useStore.getState().resetCanvas();
  }

  sendDrawEvent(type: DrawEvent['type'], element: CanvasElement | { id: string }): void {
    if (!this.socket) return;

    const currentUser = useStore.getState().currentUser;
    if (!currentUser) return;

    const event: Omit<DrawEvent, 'timestamp'> = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      userId: currentUser.id,
      userName: currentUser.name,
      userColor: currentUser.color,
      data: element
    };

    this.socket.emit('draw', event);
  }

  sendCursorPosition(x: number, y: number): void {
    if (!this.socket) return;

    const now = Date.now();
    if (now - this.lastCursorSendTime < this.CURSOR_THROTTLE_INTERVAL) {
      if (this.cursorThrottleTimer) {
        window.clearTimeout(this.cursorThrottleTimer);
      }
      this.cursorThrottleTimer = window.setTimeout(() => {
        this.sendCursorPositionInternal(x, y);
      }, this.CURSOR_THROTTLE_INTERVAL - (now - this.lastCursorSendTime));
      return;
    }

    this.sendCursorPositionInternal(x, y);
  }

  private sendCursorPositionInternal(x: number, y: number): void {
    if (!this.socket) return;

    const currentUser = useStore.getState().currentUser;
    if (!currentUser) return;

    const cursor: Omit<CursorPosition, 'timestamp'> = {
      userId: currentUser.id,
      userName: currentUser.name,
      userColor: currentUser.color,
      x,
      y
    };

    this.socket.emit('cursor-move', cursor);
    this.lastCursorSendTime = Date.now();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.cursorThrottleTimer) {
      window.clearTimeout(this.cursorThrottleTimer);
      this.cursorThrottleTimer = null;
    }
  }
}

export const socketMiddleware = new SocketMiddleware();
