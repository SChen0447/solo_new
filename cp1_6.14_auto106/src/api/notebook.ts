import axios from 'axios';
import { Note } from '../store';

const API_BASE = '/api';

export const fetchNotes = async (): Promise<Note[]> => {
  const res = await axios.get(`${API_BASE}/notes`);
  return res.data;
};

export const createNote = async (note: Omit<Note, 'id' | 'createdAt'>): Promise<Note> => {
  const res = await axios.post(`${API_BASE}/notes`, note);
  return res.data;
};

export const updateNote = async (id: string, note: Partial<Note>): Promise<Note> => {
  const res = await axios.put(`${API_BASE}/notes/${id}`, note);
  return res.data;
};

export const deleteNote = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE}/notes/${id}`);
};
