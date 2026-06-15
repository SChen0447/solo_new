import { io, Socket } from 'socket.io-client';
import type { User, WhiteboardElement } from '../store/useWhiteboardStore';

interface JoinedData {
  userId: string;
  userColor: string;
  isHost: boolean;
  sessionId: string;
  elements: WhiteboardElement[];
  users: User[];
}

export class NetworkClient {
  private socket: Socket | null = null;
  public onJoined: ((data: JoinedData) => void) | null = null;
  public onUserJoined: ((user: User) => void) | null = null;
  public onUserLeft: ((data: { userId: string }) => void) | null = null;
  public onUserKicked: ((data: { userId: string }) => void) | null = null;
  public onAction: ((action: { type: string; payload: any }) => void) | null = null;
  public onKicked: (() => void) | null = null;
  public onError: ((error: { message: string }) => void) | null = null;

  connect() {
    if (this.socket) return;
    this.socket = io({
      transports: ['websocket', 'polling']
    });

    this.socket.on('joined', (data: JoinedData) => {
      this.onJoined?.(data);
    });

    this.socket.on('userJoined', (user: User) => {
      this.onUserJoined?.(user);
    });

    this.socket.on('userLeft', (data: { userId: string }) => {
      this.onUserLeft?.(data);
    });

    this.socket.on('userKicked', (data: { userId: string }) => {
      this.onUserKicked?.(data);
    });

    this.socket.on('kicked', () => {
      this.onKicked?.();
    });

    this.socket.on('action', (action: { type: string; payload: any }) => {
      this.onAction?.(action);
    });

    this.socket.on('error', (error: { message: string }) => {
      this.onError?.(error);
    });

    this.socket.on('connect_error', () => {
      console.warn('Socket connection failed, will retry...');
    });
  }

  join(sessionId: string, userName: string, hostId?: string) {
    if (!this.socket) {
      this.connect();
    }
    setTimeout(() => {
      this.socket?.emit('join', { sessionId, userName, hostId });
    }, 100);
  }

  sendAction(type: string, payload: any) {
    if (!this.socket) return;
    this.socket.emit('action', { type, payload });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}
