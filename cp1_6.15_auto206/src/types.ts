export interface Workspace {
  id: string;
  name: string;
  zone: 'A' | 'B' | 'C';
  x: number;
  y: number;
  status: 'idle' | 'occupied' | 'reserved' | 'maintenance';
}

export interface WorkspaceReservation {
  id: string;
  workspaceId: string;
  date: string;
  startTime: string;
  duration: number;
  memberName: string;
}

export interface Member {
  id: string;
  name: string;
  company: string;
}

export interface Visitor {
  id: string;
  name: string;
  company: string;
  phone: string;
  expectedTime: string;
  memberId: string;
  memberName: string;
  status: 'pending' | 'checked_in';
  qrCode: string;
}

export interface Device {
  id: string;
  name: string;
  roomId: string;
  roomName: string;
  type: 'projector' | 'whiteboard' | 'video_conference';
}

export interface DeviceReservation {
  id: string;
  deviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  memberName: string;
}

export interface Notification {
  id: string;
  memberId: string;
  message: string;
  read: number;
  createdAt: string;
}

export interface DashboardData {
  workspaceOccupancy: number;
  visitorStats: { date: string; count: number }[];
  deviceRanking: { name: string; count: number }[];
}

export type ApiResponse<T> = { success: boolean; data?: T; error?: string };
