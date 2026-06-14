export type ServiceType = '剪发' | '染发' | '护理' | '造型';
export type AppointmentStatus = 'pending' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  name: string;
  phone: string;
  service: ServiceType;
  date: string;
  time: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface AppointmentFormData {
  name: string;
  phone: string;
  service: ServiceType;
  date: string;
  time: string;
}

export interface ServiceStats {
  剪发: number;
  染发: number;
  护理: number;
  造型: number;
}

export interface StatusStats {
  pending: number;
  completed: number;
  cancelled: number;
}

export interface Statistics {
  serviceStats: ServiceStats;
  statusStats: StatusStats;
  total: number;
}

export interface FilterOptions {
  search: string;
  service: ServiceType | 'all';
  status: AppointmentStatus | 'all';
}
