import { Note, VoteType } from '../types';

type MessageHandler = (data: any) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private url: string = '';

  connect(url: string): void {
    this.url = url;
    this.attemptConnect();
  }

  private attemptConnect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connected', null);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.payload);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.emit('disconnected', null);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.attemptConnect(), delay);
    }
  }

  send(type: string, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', type);
    }
  }

  on(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  off(type: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(type: string, payload: any): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => handler(payload));
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  addNote(note: Partial<Note> & { x: number; y: number }): void {
    this.send('add-note', note);
  }

  moveNote(id: string, x: number, y: number): void {
    this.send('move-note', { id, x, y });
  }

  updateNote(id: string, updates: { text?: string; color?: string }): void {
    this.send('update-note', { id, ...updates });
  }

  deleteNote(id: string): void {
    this.send('delete-note', { id });
  }

  vote(noteId: string, voteType: VoteType): void {
    this.send('vote', { noteId, voteType });
  }

  mergeNotes(sourceId: string, targetId: string, mergedText: string): void {
    this.send('merge-notes', { sourceId, targetId, mergedText });
  }

  clearAll(): void {
    this.send('clear-all', {});
  }
}

export const wsManager = new WebSocketManager();
export default wsManager;
