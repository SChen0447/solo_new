import axios from 'axios';
import type { Venue, TimeSlot, Equipment, Reservation } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000
});

export const venueApi = {
  getVenues: (type?: string, search?: string) => 
    api.get<Venue[]>('/venues', { params: { type, search } }).then(res => res.data),
  
  getVenue: (id: string) =>
    api.get<Venue>(`/venues/${id}`).then(res => res.data),
  
  getSlots: (id: string, date: string) =>
    api.get<TimeSlot[]>(`/venues/${id}/slots`, { params: { date } }).then(res => res.data)
};

export const equipmentApi = {
  getEquipment: () =>
    api.get<Equipment[]>('/equipment').then(res => res.data)
};

export const reservationApi = {
  checkConflict: (data: { venueId: string; date: string; startTime: string; endTime: string }) =>
    api.post<{ hasConflict: boolean }>('/reservations/check', data).then(res => res.data),
  
  createReservation: (data: Omit<Reservation, 'id' | 'status' | 'createdAt'>) =>
    api.post<Reservation>('/reservations', data).then(res => res.data),
  
  getUserReservations: (userId: string) =>
    api.get<Reservation[]>(`/reservations/user/${userId}`).then(res => res.data),
  
  cancelReservation: (id: string) =>
    api.delete(`/reservations/${id}`).then(res => res.data),
  
  submitReview: (id: string, data: { rating: number; comment: string }) =>
    api.post(`/reservations/${id}/review`, data).then(res => res.data)
};

export const calculateApi = {
  calculateDeposit: (data: { equipment: { equipmentId: string; quantity: number }[]; hours: number }) =>
    api.post<{ totalDeposit: number; totalRental: number }>('/calculate-deposit', data).then(res => res.data)
};
