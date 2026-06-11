import { v4 as uuidv4 } from 'uuid';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface DrawCommand {
  id: string;
  type: 'pen' | 'rectangle' | 'circle' | 'sticky' | 'image';
  userId: string;
  points?: Point[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  fillColor: string;
  strokeWidth: number;
  text?: string;
  imageData?: string;
  rotation?: number;
  collapsed?: boolean;
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
}

interface CursorPosition {
  userId: string;
  position: Point;
}

interface ChatMessage {
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

const MAX_HISTORY = 50;

export class DrawEngine {
  private commands: DrawCommand[] = [];
  private undoStack: DrawCommand[] = [];
  private redoStack: DrawCommand[] = [];
  private listeners: Set<() => void> = new Set();
  private cursorPositions: Map<string, Point> = new Map();
  private chatMessages: ChatMessage[] = [];
  private currentUserId: string = '';

  setCurrentUserId(userId: string) {
    this.currentUserId = userId;
  }

  getCurrentUserId(): string {
    return this.currentUserId;
  }

  getCommands(): DrawCommand[] {
    return this.commands;
  }

  setCommands(commands: DrawCommand[]) {
    this.commands = commands;
    this.notifyListeners();
  }

  addCommand(command: DrawCommand): void {
    this.commands.push(command);
    
    if (command.userId === this.currentUserId) {
      this.undoStack.push(command);
      if (this.undoStack.length > MAX_HISTORY) {
        this.undoStack.shift();
      }
      this.redoStack = [];
    }
    
    this.notifyListeners();
  }

  addCommands(commands: DrawCommand[]): void {
    const userCommands = commands.filter(c => c.userId === this.currentUserId);
    if (userCommands.length > 0) {
      this.undoStack.push(...userCommands);
      if (this.undoStack.length > MAX_HISTORY) {
        this.undoStack = this.undoStack.slice(-MAX_HISTORY);
      }
      this.redoStack = [];
    }
    
    this.commands.push(...commands);
    this.notifyListeners();
  }

  undo(): DrawCommand | null {
    if (this.undoStack.length === 0) return null;
    
    const command = this.undoStack.pop()!;
    this.redoStack.push(command);
    
    const index = this.commands.findIndex(c => c.id === command.id);
    if (index > -1) {
      this.commands.splice(index, 1);
    }
    
    this.notifyListeners();
    return command;
  }

  redo(): DrawCommand | null {
    if (this.redoStack.length === 0) return null;
    
    const command = this.redoStack.pop()!;
    this.undoStack.push(command);
    this.commands.push(command);
    
    this.notifyListeners();
    return command;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  removeCommand(commandId: string): void {
    const index = this.commands.findIndex(c => c.id === commandId);
    if (index > -1) {
      this.commands.splice(index, 1);
      this.notifyListeners();
    }
  }

  updateCommand(updatedCommand: DrawCommand): void {
    const index = this.commands.findIndex(c => c.id === updatedCommand.id);
    if (index > -1) {
      this.commands[index] = updatedCommand;
      this.notifyListeners();
    }
  }

  setCursorPosition(userId: string, position: Point): void {
    this.cursorPositions.set(userId, position);
    this.notifyListeners();
  }

  removeCursor(userId: string): void {
    this.cursorPositions.delete(userId);
    this.notifyListeners();
  }

  getCursorPositions(): Map<string, Point> {
    return this.cursorPositions;
  }

  addChatMessage(message: ChatMessage): void {
    this.chatMessages.push(message);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }
    this.notifyListeners();
  }

  getChatMessages(): ChatMessage[] {
    return this.chatMessages;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  generatePenPath(points: Point[]): string {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      const cpy = (prev.y + curr.y) / 2;
      path += ` Q ${prev.x} ${prev.y} ${cpx} ${cpy}`;
    }
    
    const last = points[points.length - 1];
    path += ` L ${last.x} ${last.y}`;
    
    return path;
  }

  getPenStrokeWidth(points: Point[], baseWidth: number): number {
    if (points.length < 2) return baseWidth;
    
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    
    const avgSpeed = totalDistance / points.length;
    const pressureFactor = Math.max(0.5, Math.min(1.5, 1.2 - avgSpeed / 50));
    
    return baseWidth * pressureFactor;
  }

  async exportToPNG(svgElement: SVGSVGElement, width: number = 1920, height: number = 1080): Promise<string> {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        const scale = Math.min(width / svgElement.viewBox.baseVal.width, height / svgElement.viewBox.baseVal.height);
        const scaledWidth = svgElement.viewBox.baseVal.width * scale;
        const scaledHeight = svgElement.viewBox.baseVal.height * scale;
        const offsetX = (width - scaledWidth) / 2;
        const offsetY = (height - scaledHeight) / 2;
        
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        URL.revokeObjectURL(url);
        
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG image'));
      };
      
      img.src = url;
    });
  }

  downloadPNG(dataUrl: string, filename: string = 'whiteboard.png'): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  createCommand(type: DrawCommand['type'], options: Partial<DrawCommand>): DrawCommand {
    return {
      id: uuidv4(),
      type,
      userId: this.currentUserId,
      color: options.color || '#000000',
      fillColor: options.fillColor || 'transparent',
      strokeWidth: options.strokeWidth || 2,
      timestamp: Date.now(),
      ...options
    };
  }

  clear(): void {
    this.commands = [];
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners();
  }
}

export const drawEngine = new DrawEngine();
