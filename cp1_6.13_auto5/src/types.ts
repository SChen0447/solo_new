export interface User {
  id: string;
  nickname: string;
  color: string;
  cursorPosition: number;
  selectionStart: number;
  selectionEnd: number;
  joinedAt: number;
}

export interface DocumentVersion {
  id: string;
  content: string;
  note: string;
  createdAt: number;
  createdBy: string;
  createdByName: string;
  versionNumber: number;
}

export interface Room {
  id: string;
  content: string;
  version: number;
  users: Map<string, User>;
  versions: DocumentVersion[];
  createdAt: number;
  lastActivityAt: number;
}

export interface ChatMessageItem {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  timestamp: number;
  avatarColor: string;
}

export type WSMessageType =
  | 'join'
  | 'leave'
  | 'content-update'
  | 'cursor-update'
  | 'chat'
  | 'save-version'
  | 'revert-version'
  | 'version-list'
  | 'user-list'
  | 'init'
  | 'error';

export interface WSMessage<T = any> {
  type: WSMessageType;
  roomId: string;
  userId: string;
  payload: T;
}

export interface JoinPayload {
  nickname: string;
}

export interface ContentUpdatePayload {
  content: string;
  version: number;
}

export interface CursorUpdatePayload {
  position: number;
  selectionStart: number;
  selectionEnd: number;
  color: string;
}

export interface ChatPayload {
  messageId: string;
  content: string;
  timestamp: number;
  nickname: string;
  avatarColor: string;
}

export interface SaveVersionPayload {
  note: string;
}

export interface RevertVersionPayload {
  versionId: string;
}

export interface VersionListPayload {
  versions: DocumentVersion[];
}

export interface UserListPayload {
  users: Omit<User, 'joinedAt'>[];
}

export interface InitPayload {
  content: string;
  version: number;
  users: Omit<User, 'joinedAt'>[];
  versions: DocumentVersion[];
}

export const USER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
];

export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function getUserColor(index: number): string {
  return USER_COLORS[index % USER_COLORS.length];
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
