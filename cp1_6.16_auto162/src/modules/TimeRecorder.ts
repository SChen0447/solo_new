import { v4 as uuidv4 } from 'uuid';

export interface RecordingSnapshot {
  id: string;
  text: string;
  timestamp: number;
  cursorPosition: number;
  type: 'input' | 'delete' | 'paste' | 'initial';
}

export interface RecordingSession {
  id: string;
  title: string;
  startTime: number;
  endTime: number | null;
  snapshots: RecordingSnapshot[];
  editCount: number;
}

export interface HistoryItem {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  editCount: number;
  recordings: RecordingSession[];
}

class TimeRecorder {
  private isRecording: boolean = false;
  private currentSession: RecordingSession | null = null;
  private lastSnapshot: RecordingSnapshot | null = null;
  private history: HistoryItem[] = [];
  private currentHistoryId: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  startRecording(initialText: string, cursorPosition: number = 0): void {
    if (this.isRecording) return;

    this.isRecording = true;

    const initialSnapshot: RecordingSnapshot = {
      id: uuidv4(),
      text: initialText,
      timestamp: Date.now(),
      cursorPosition,
      type: 'initial',
    };

    this.currentSession = {
      id: uuidv4(),
      title: this.generateTitle(initialText),
      startTime: Date.now(),
      endTime: null,
      snapshots: [initialSnapshot],
      editCount: 0,
    };

    this.lastSnapshot = initialSnapshot;
    this.notifyListeners();
  }

  stopRecording(): RecordingSession | null {
    if (!this.isRecording || !this.currentSession) return null;

    this.isRecording = false;
    this.currentSession.endTime = Date.now();

    const session = this.currentSession;

    this.saveToHistory(session);

    this.currentSession = null;
    this.lastSnapshot = null;
    this.notifyListeners();

    return session;
  }

  recordChange(text: string, cursorPosition: number, type: 'input' | 'delete' | 'paste' = 'input'): void {
    if (!this.isRecording || !this.currentSession) return;

    const now = Date.now();
    const timeSinceLast = this.lastSnapshot ? now - this.lastSnapshot.timestamp : Infinity;

    if (timeSinceLast < 100 && type === 'input' && this.lastSnapshot) {
      this.lastSnapshot.text = text;
      this.lastSnapshot.cursorPosition = cursorPosition;
      this.lastSnapshot.timestamp = now;
      this.lastSnapshot.type = type;
    } else {
      const snapshot: RecordingSnapshot = {
        id: uuidv4(),
        text,
        timestamp: now,
        cursorPosition,
        type,
      };

      this.currentSession.snapshots.push(snapshot);
      this.lastSnapshot = snapshot;
    }

    this.notifyListeners();
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getCurrentSession(): RecordingSession | null {
    return this.currentSession;
  }

  getRecordingDuration(): number {
    if (!this.currentSession) return 0;
    return Date.now() - this.currentSession.startTime;
  }

  getSnapshots(): RecordingSnapshot[] {
    return this.currentSession?.snapshots || [];
  }

  getHistory(): HistoryItem[] {
    return [...this.history].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getHistoryItem(id: string): HistoryItem | undefined {
    return this.history.find((h) => h.id === id);
  }

  loadHistoryItem(id: string): HistoryItem | undefined {
    const item = this.history.find((h) => h.id === id);
    if (item) {
      this.currentHistoryId = id;
    }
    return item;
  }

  incrementEditCount(id: string): void {
    const item = this.history.find((h) => h.id === id);
    if (item) {
      item.editCount += 1;
      item.updatedAt = Date.now();
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  getCurrentHistoryId(): string | null {
    return this.currentHistoryId;
  }

  saveCurrentContent(content: string): void {
    if (this.currentHistoryId) {
      const item = this.history.find((h) => h.id === this.currentHistoryId);
      if (item) {
        item.content = content;
        item.updatedAt = Date.now();
        item.title = this.generateTitle(content);
        this.saveToStorage();
        this.notifyListeners();
      }
    }
  }

  createNewHistory(content: string = ''): HistoryItem {
    const newItem: HistoryItem = {
      id: uuidv4(),
      title: this.generateTitle(content),
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      editCount: 0,
      recordings: [],
    };

    this.history.push(newItem);
    this.currentHistoryId = newItem.id;
    this.saveToStorage();
    this.notifyListeners();

    return newItem;
  }

  deleteHistory(id: string): void {
    this.history = this.history.filter((h) => h.id !== id);
    if (this.currentHistoryId === id) {
      this.currentHistoryId = null;
    }
    this.saveToStorage();
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  private saveToHistory(session: RecordingSession): void {
    const finalText = session.snapshots[session.snapshots.length - 1]?.text || '';

    if (this.currentHistoryId) {
      const item = this.history.find((h) => h.id === this.currentHistoryId);
      if (item) {
        item.recordings.push(session);
        item.content = finalText;
        item.updatedAt = Date.now();
        item.title = this.generateTitle(finalText);
      }
    } else {
      const newItem: HistoryItem = {
        id: uuidv4(),
        title: this.generateTitle(finalText),
        content: finalText,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        editCount: 0,
        recordings: [session],
      };
      this.history.push(newItem);
      this.currentHistoryId = newItem.id;
    }

    this.saveToStorage();
  }

  private generateTitle(text: string): string {
    const trimmed = text.trim();
    if (trimmed.length === 0) return '无题';
    const firstLine = trimmed.split('\n')[0].trim();
    return firstLine.slice(0, 10) + (firstLine.length > 10 ? '...' : '');
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('poetry-history', JSON.stringify(this.history));
    } catch (e) {
      console.error('Failed to save history to localStorage', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('poetry-history');
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load history from localStorage', e);
      this.history = [];
    }
  }
}

export const timeRecorder = new TimeRecorder();
