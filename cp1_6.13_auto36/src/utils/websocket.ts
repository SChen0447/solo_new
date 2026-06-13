import type { GameState } from './gameLogic';

export interface ChatMessage {
  type: 'chat';
  player_id: string;
  player_name: string;
  avatar_index: number;
  content: string;
}

export interface WebSocketMessage {
  type: string;
  state?: GameState;
  player_id?: string;
  player_name?: string;
  content?: string;
  avatar_index?: number;
  result?: string;
  winner?: string;
  action?: string;
}

type MessageHandler = (message: WebSocketMessage) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private roomId: string = '';
  private playerId: string = '';
  private handlers: Set<MessageHandler> = new Set();
  private heartbeatInterval: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  connect(roomId: string, playerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.roomId = roomId;
      this.playerId = playerId;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/${roomId}/${playerId}`;

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (error) {
        reject(error);
        return;
      }

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.stopHeartbeat();
        this.attemptReconnect();
      };
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    setTimeout(() => {
      console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
      this.connect(this.roomId, this.playerId).catch(() => {
        console.log('Reconnect failed');
      });
    }, delay);
  }

  private startHeartbeat() {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'heartbeat' });
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  send(message: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  sendChatMessage(content: string) {
    this.send({
      type: 'chat',
      content,
    });
  }

  startGame() {
    this.send({
      type: 'start_game',
    });
  }

  vote(targetId: string) {
    this.send({
      type: 'vote',
      target_id: targetId,
    });
  }

  nightAction(action: string, targetId?: string) {
    this.send({
      type: 'night_action',
      action,
      target_id: targetId,
    });
  }

  nextPhase() {
    this.send({
      type: 'next_phase',
    });
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  disconnect() {
    this.stopHeartbeat();
    this.reconnectAttempts = this.maxReconnectAttempts;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WebSocketClient();
