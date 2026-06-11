import { io, Socket } from 'socket.io-client';
import { DrawCommand, User, ConnectionStatus } from '../types';

export const SERVER_CONFIG = {
  url: 'http://localhost:3001',
  options: {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000
  }
};

export type CommandHandler = (command: DrawCommand) => void;
export type UsersHandler = (users: User[]) => void;
export type ConnectionHandler = (status: ConnectionStatus) => void;
export type HistoryHandler = (commands: DrawCommand[]) => void;

export class SocketManager {
  private socket: Socket | null = null;
  private userId: string;
  private userName: string;
  private commandHandlers: Set<CommandHandler> = new Set();
  private usersHandlers: Set<UsersHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private historyHandlers: Set<HistoryHandler> = new Set();
  private status: ConnectionStatus = {
    connected: false,
    reconnecting: false
  };

  constructor(userId: string, userName: string) {
    this.userId = userId;
    this.userName = userName;
  }

  connect(): void {
    if (this.socket?.connected) return;

    this.updateStatus({ connected: false, reconnecting: true });

    this.socket = io(SERVER_CONFIG.url, {
      ...SERVER_CONFIG.options,
      auth: {
        userId: this.userId,
        userName: this.userName
      }
    });

    this.socket.on('connect', () => {
      this.updateStatus({ connected: true, reconnecting: false });
    });

    this.socket.on('disconnect', () => {
      this.updateStatus({ connected: false, reconnecting: true });
    });

    this.socket.on('connect_error', (error: Error) => {
      this.updateStatus({
        connected: false,
        reconnecting: true,
        lastError: error.message
      });
    });

    this.socket.on('reconnect_attempt', () => {
      this.updateStatus({ connected: false, reconnecting: true });
    });

    this.socket.on('draw:command', (command: DrawCommand) => {
      this.commandHandlers.forEach(handler => handler(command));
    });

    this.socket.on('users:update', (users: User[]) => {
      this.usersHandlers.forEach(handler => handler(users));
    });

    this.socket.on('history:load', (commands: DrawCommand[]) => {
      this.historyHandlers.forEach(handler => handler(commands));
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateStatus({ connected: false, reconnecting: false });
  }

  sendCommand(command: DrawCommand): void {
    if (this.socket?.connected) {
      this.socket.emit('draw:command', command);
    }
  }

  onCommand(handler: CommandHandler): () => void {
    this.commandHandlers.add(handler);
    return () => this.commandHandlers.delete(handler);
  }

  onUsersUpdate(handler: UsersHandler): () => void {
    this.usersHandlers.add(handler);
    return () => this.usersHandlers.delete(handler);
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    handler(this.status);
    return () => this.connectionHandlers.delete(handler);
  }

  onHistoryLoad(handler: HistoryHandler): () => void {
    this.historyHandlers.add(handler);
    return () => this.historyHandlers.delete(handler);
  }

  requestHistory(): void {
    if (this.socket?.connected) {
      this.socket.emit('history:request');
    }
  }

  private updateStatus(status: ConnectionStatus): void {
    this.status = status;
    this.connectionHandlers.forEach(handler => handler(status));
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.status };
  }

  isConnected(): boolean {
    return this.status.connected;
  }
}

let socketManagerInstance: SocketManager | null = null;

export function initSocketManager(userId: string, userName: string): SocketManager {
  if (socketManagerInstance) {
    socketManagerInstance.disconnect();
  }
  socketManagerInstance = new SocketManager(userId, userName);
  return socketManagerInstance;
}

export function getSocketManager(): SocketManager | null {
  return socketManagerInstance;
}
