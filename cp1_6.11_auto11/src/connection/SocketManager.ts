import { io, Socket } from 'socket.io-client';
import { DrawCommand, User, ConnectionStatus } from '../types';

export const SERVER_CONFIG = {
  url: 'http://localhost:3001',
  options: {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    autoConnect: false
  }
};

export type CommandHandler = (command: DrawCommand) => void;
export type UsersHandler = (users: User[]) => void;
export type ConnectionHandler = (status: ConnectionStatus) => void;
export type HistoryHandler = (commands: DrawCommand[]) => void;

const HEARTBEAT_INTERVAL = 5000;
const HEARTBEAT_TIMEOUT = 10000;

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
    reconnecting: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: SERVER_CONFIG.options.reconnectionAttempts
  };

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private manualDisconnect = false;
  private pendingCommands: DrawCommand[] = [];
  private reconnectAttempts = 0;

  constructor(userId: string, userName: string) {
    this.userId = userId;
    this.userName = userName;
  }

  connect(): void {
    if (this.socket?.connected) return;

    this.manualDisconnect = false;
    this.updateStatus({
      connected: false,
      reconnecting: true,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: SERVER_CONFIG.options.reconnectionAttempts
    });

    this.socket = io(SERVER_CONFIG.url, {
      ...SERVER_CONFIG.options,
      auth: {
        userId: this.userId,
        userName: this.userName
      }
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.updateStatus({
        connected: true,
        reconnecting: false,
        reconnectAttempts: 0,
        maxReconnectAttempts: SERVER_CONFIG.options.reconnectionAttempts
      });
      this.startHeartbeat();
      this.flushPendingCommands();
    });

    this.socket.on('disconnect', (reason: string) => {
      this.stopHeartbeat();
      if (this.manualDisconnect) {
        this.updateStatus({
          connected: false,
          reconnecting: false,
          reconnectAttempts: 0,
          maxReconnectAttempts: SERVER_CONFIG.options.reconnectionAttempts
        });
      } else {
        this.reconnectAttempts++;
        const shouldReconnect = this.reconnectAttempts < SERVER_CONFIG.options.reconnectionAttempts;
        this.updateStatus({
          connected: false,
          reconnecting: shouldReconnect,
          reconnectAttempts: this.reconnectAttempts,
          maxReconnectAttempts: SERVER_CONFIG.options.reconnectionAttempts,
          lastError: reason
        });
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      this.reconnectAttempts++;
      const shouldReconnect = this.reconnectAttempts < SERVER_CONFIG.options.reconnectionAttempts;
      this.updateStatus({
        connected: false,
        reconnecting: shouldReconnect,
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: SERVER_CONFIG.options.reconnectionAttempts,
        lastError: error.message
      });
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      this.reconnectAttempts = attemptNumber;
      this.updateStatus({
        connected: false,
        reconnecting: true,
        reconnectAttempts: attemptNumber,
        maxReconnectAttempts: SERVER_CONFIG.options.reconnectionAttempts
      });
    });

    this.socket.on('reconnect_failed', () => {
      this.updateStatus({
        connected: false,
        reconnecting: false,
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: SERVER_CONFIG.options.reconnectionAttempts,
        lastError: '达到最大重连次数'
      });
    });

    this.socket.on('ping', () => {
      this.resetHeartbeatTimeout();
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
    this.manualDisconnect = true;
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateStatus({
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: SERVER_CONFIG.options.reconnectionAttempts
    });
  }

  reconnect(): void {
    this.manualDisconnect = false;
    this.reconnectAttempts = 0;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connect();
  }

  sendCommand(command: DrawCommand): void {
    if (this.socket?.connected) {
      this.socket.emit('draw:command', command);
    } else {
      this.pendingCommands.push(command);
      if (this.pendingCommands.length > 500) {
        this.pendingCommands.shift();
      }
    }
  }

  private flushPendingCommands(): void {
    while (this.pendingCommands.length > 0 && this.socket?.connected) {
      const cmd = this.pendingCommands.shift();
      if (cmd) {
        this.socket.emit('draw:command', cmd);
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
        this.resetHeartbeatTimeout();
      }
    }, HEARTBEAT_INTERVAL);
  }

  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
    }
    this.heartbeatTimeoutTimer = setTimeout(() => {
      if (this.socket?.connected && !this.manualDisconnect) {
        this.socket.disconnect();
      }
    }, HEARTBEAT_TIMEOUT);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
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
    this.status = { ...status };
    this.connectionHandlers.forEach(handler => handler({ ...this.status }));
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.status };
  }

  isConnected(): boolean {
    return this.status.connected;
  }

  isReconnecting(): boolean {
    return this.status.reconnecting;
  }

  getReconnectAttempts(): number {
    return this.status.reconnectAttempts ?? 0;
  }

  getMaxReconnectAttempts(): number {
    return this.status.maxReconnectAttempts ?? SERVER_CONFIG.options.reconnectionAttempts;
  }

  canRetry(): boolean {
    return !this.status.connected &&
      (this.status.reconnectAttempts ?? 0) < (this.status.maxReconnectAttempts ?? SERVER_CONFIG.options.reconnectionAttempts);
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
