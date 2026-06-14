import axios from 'axios';
import { Event, Room, Member } from '../store';

const API_BASE = '/api';

export const fetchRooms = async (): Promise<Room[]> => {
  const res = await axios.get(`${API_BASE}/rooms`);
  return res.data;
};

export const createRoom = async (room: Omit<Room, 'id'>): Promise<Room> => {
  const res = await axios.post(`${API_BASE}/rooms`, room);
  return res.data;
};

export const fetchMembers = async (): Promise<Member[]> => {
  const res = await axios.get(`${API_BASE}/members`);
  return res.data;
};

export const fetchEvents = async (): Promise<Event[]> => {
  const res = await axios.get(`${API_BASE}/events`);
  return res.data;
};

export const createEvent = async (event: Omit<Event, 'id'>): Promise<Event> => {
  const res = await axios.post(`${API_BASE}/events`, event);
  return res.data;
};

export const updateEvent = async (id: string, event: Partial<Event>): Promise<Event> => {
  const res = await axios.put(`${API_BASE}/events/${id}`, event);
  return res.data;
};

export const deleteEvent = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE}/events/${id}`);
};
