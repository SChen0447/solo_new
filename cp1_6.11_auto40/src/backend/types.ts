export interface KeyResult {
  id: string;
  description: string;
  currentValue: number;
  targetValue: number;
}

export interface OKR {
  id: string;
  title: string;
  quarter: string;
  owner: string;
  ownerAvatar: string;
  keyResults: KeyResult[];
  createdAt: number;
  updatedAt: number;
}

export interface Notification {
  id: string;
  type: 'edit' | 'progress';
  message: string;
  okrId: string;
  okrTitle: string;
  timestamp: number;
  read: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
}
