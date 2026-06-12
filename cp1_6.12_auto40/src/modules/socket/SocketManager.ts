import { io, Socket } from 'socket.io-client';
import type { OnlineUser, ChatMessage } from '../../types';

type Listener = (...args: any[]) => void;

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] connection error:', err.message);
    });

    for (const [event, handlers] of this.listeners) {
      for (const handler of handlers) {
        this.socket.on(event, handler);
      }
    }

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinDoc(docId: string, user: OnlineUser): void {
    this.socket?.emit('join-doc', { docId, user });
  }

  sendDocUpdate(docId: string, update: ArrayBuffer): void {
    this.socket?.emit('doc-update', { docId, update });
  }

  sendCursorUpdate(docId: string, userId: string, cursor: any): void {
    this.socket?.emit('cursor-update', { docId, userId, cursor });
  }

  sendChatMessage(docId: string, message: ChatMessage): void {
    this.socket?.emit('chat-message', { docId, message });
  }

  on(event: string, handler: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    this.socket?.on(event, handler);
  }

  off(event: string, handler: Listener): void {
    this.listeners.get(event)?.delete(handler);
    this.socket?.off(event, handler);
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

const socketManager = new SocketManager();
export default socketManager;
