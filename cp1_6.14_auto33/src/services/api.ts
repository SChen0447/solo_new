import axios from 'axios';
import type { Storyboard } from '../types';

const api = axios.create({ baseURL: '/api' });

export async function getAllStoryboards(): Promise<Storyboard[]> {
  const res = await api.get('/storyboards');
  return res.data;
}

export async function getStoryboard(id: string): Promise<Storyboard> {
  const res = await api.get(`/storyboards/${id}`);
  return res.data;
}

export async function saveStoryboard(storyboard: Storyboard): Promise<Storyboard> {
  const res = await api.put(`/storyboards/${storyboard.id}`, storyboard);
  return res.data;
}

export async function createStoryboard(name: string): Promise<Storyboard> {
  const res = await api.post('/storyboards', { name });
  return res.data;
}

export async function deleteStoryboard(id: string): Promise<void> {
  await api.delete(`/storyboards/${id}`);
}
