import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export interface Department {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
}

export interface Doctor {
  id: string;
  departmentId: string;
  name: string;
  title: string;
  avatar: string;
  slots: string[];
}

export interface Appointment {
  id: string;
  doctorId: string;
  departmentId: string;
  patientName: string;
  phone: string;
  slot: string;
  note?: string;
  status: string;
  createdAt: string;
  doctorName?: string;
  doctorTitle?: string;
  departmentName?: string;
}

export interface AppointmentStats {
  today: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  total: number;
}

export const getDepartments = async (): Promise<Department[]> => {
  const response = await api.get('/departments');
  return response.data.departments;
};

export const getDoctors = async (departmentId?: string): Promise<Doctor[]> => {
  const response = await api.get('/doctors', {
    params: departmentId ? { departmentId } : {},
  });
  return response.data.doctors;
};

export interface CreateAppointmentParams {
  doctorId: string;
  departmentId: string;
  patientName: string;
  phone: string;
  slot: string;
  note?: string;
}

export const createAppointment = async (
  params: CreateAppointmentParams
): Promise<Appointment> => {
  const response = await api.post('/appointments', params);
  return response.data.appointment;
};

export const getAppointments = async (
  doctorId?: string,
  status?: string
): Promise<Appointment[]> => {
  const response = await api.get('/appointments', {
    params: {
      ...(doctorId ? { doctorId } : {}),
      ...(status ? { status } : {}),
    },
  });
  return response.data.appointments;
};

export const updateAppointmentStatus = async (
  appointmentId: string,
  status: string
): Promise<Appointment> => {
  const response = await api.patch(`/appointments/${appointmentId}/status`, {
    status,
  });
  return response.data.appointment;
};

export const getAppointmentStats = async (): Promise<AppointmentStats> => {
  const response = await api.get('/appointments/stats');
  return response.data.stats;
};
