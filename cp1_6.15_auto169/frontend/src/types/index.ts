export type ToolStatus = 'available' | 'borrowed' | 'maintenance';

export interface Tool {
  id: string;
  name: string;
  category: string;
  description: string;
  image_url: string;
  qr_code_url?: string;
  status: ToolStatus;
  created_at: string;
  reservations?: Reservation[];
}

export interface TimeSlot {
  slot: string;
  label: string;
  available: boolean;
}

export type ReservationStatus = 'pending' | 'completed' | 'cancelled';

export interface Reservation {
  id: string;
  tool_id: string;
  tool_name: string;
  user_name: string;
  reservation_date: string;
  time_slot: string;
  status: ReservationStatus;
  notified: number;
  created_at: string;
}

export type BorrowStatus = 'borrowed' | 'returned';

export interface BorrowRecord {
  id: string;
  tool_id: string;
  tool_name: string;
  user_name: string;
  borrow_time: string;
  return_time?: string;
  status: BorrowStatus;
}

export interface Stats {
  totalBorrows: number;
  currentBorrows: number;
  popularTools: { name: string; borrow_count: number }[];
  totalTools: number;
  availableTools: number;
  borrowedTools: number;
  maintenanceTools: number;
  totalReservations: number;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
