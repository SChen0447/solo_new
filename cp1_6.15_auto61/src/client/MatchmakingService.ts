import { io, Socket } from 'socket.io-client';

type EventCallback = (...args: unknown[]) => void;

class MatchmakingService {
  private static instance: MatchmakingService;
  private socket: Socket | null = null;
  private callbacks: Map<string, EventCallback[]> = new Map();

  private constructor() {}

  static getInstance(): MatchmakingService {
    if (!MatchmakingService.instance) {
      MatchmakingService.instance = new MatchmakingService();
    }
    return MatchmakingService.instance;
  }

  connect(token: string): void {
    if (this.socket?.connected) return;

    this.socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      this.emitLocal('connect', {});
    });

    this.socket.on('disconnect', (reason) => {
      this.emitLocal('disconnect', { reason });
    });

    this.socket.on('match:waiting', (data) => {
      this.emitLocal('match:waiting', data);
    });

    this.socket.on('match:found', (data) => {
      this.emitLocal('match:found', data);
    });

    this.socket.on('match:countdown', (data) => {
      this.emitLocal('match:countdown', data);
    });

    this.socket.on('match:start', (data) => {
      this.emitLocal('match:start', data);
    });

    this.socket.on('opponent:editing', (data) => {
      this.emitLocal('opponent:editing', data);
    });

    this.socket.on('battle:result', (data) => {
      this.emitLocal('battle:result', data);
    });

    this.socket.on('battle:end', (data) => {
      this.emitLocal('battle:end', data);
    });

    this.socket.on('battle:time', (data) => {
      this.emitLocal('battle:time', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks.clear();
  }

  on(event: string, callback: EventCallback): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const cbs = this.callbacks.get(event);
    if (cbs) {
      this.callbacks.set(
        event,
        cbs.filter((cb) => cb !== callback)
      );
    }
  }

  private emitLocal(event: string, data: unknown): void {
    const cbs = this.callbacks.get(event);
    if (cbs) {
      cbs.forEach((cb) => cb(data));
    }
  }

  joinMatch(): void {
    this.socket?.emit('match:join');
  }

  cancelMatch(): void {
    this.socket?.emit('match:cancel');
  }

  submitCode(code: string): void {
    this.socket?.emit('battle:submit', { code });
  }

  syncEditRange(range: { startLine: number; endLine: number }): void {
    this.socket?.emit('code:sync', { range });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const matchmakingService = MatchmakingService.getInstance();
