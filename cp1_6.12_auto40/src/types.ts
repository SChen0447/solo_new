export interface User {
  id: string;
  name: string;
  password: string;
}

export interface DocMeta {
  id: string;
  title: string;
  ownerId: string;
  collaboratorIds: string[];
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export interface OnlineUser {
  id: string;
  name: string;
  color: string;
}
