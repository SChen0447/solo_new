export type ToolType = 'pencil' | 'highlighter' | 'line' | 'rect' | 'circle' | 'text';

export interface DrawAction {
  id: string;
  type: ToolType;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  fontSize?: number;
  text?: string;
  userId: string;
  timestamp: number;
}

export interface StickyNoteData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  content: string;
  userId: string;
  timestamp: number;
}

export interface UserInfo {
  id: string;
  name: string;
  color: string;
  cursorX: number;
  cursorY: number;
}

export interface RoomStore {
  drawActions: DrawAction[];
  stickyNotes: Map<string, StickyNoteData>;
  users: Map<string, UserInfo>;
  createdAt: number;
}
