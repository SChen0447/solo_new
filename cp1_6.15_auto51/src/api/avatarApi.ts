import axios from 'axios';
import { AvatarComponents, Avatar, Comment } from '../store/avatarStore';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('avatar_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function login(nickname: string, password: string) {
  const res = await api.post('/auth/login', { nickname, password });
  return res.data as { token: string; user: { id: string; nickname: string } };
}

export async function verifyToken() {
  const res = await api.post('/auth/verify');
  return res.data;
}

export async function saveAvatar(components: AvatarComponents, author: string) {
  const res = await api.post('/avatars', { components, author });
  return res.data as Avatar;
}

export async function getAvatars(page: number = 1, limit: number = 12) {
  const res = await api.get('/avatars', { params: { page, limit } });
  return res.data as { avatars: Avatar[]; total: number; page: number; limit: number };
}

export async function getAvatar(id: string) {
  const res = await api.get(`/avatars/${id}`);
  return res.data as Avatar;
}

export async function updateAvatar(id: string, components: AvatarComponents) {
  const res = await api.put(`/avatars/${id}`, { components });
  return res.data as Avatar;
}

export async function deleteAvatar(id: string) {
  const res = await api.delete(`/avatars/${id}`);
  return res.data;
}

export async function toggleLike(id: string) {
  const res = await api.post(`/avatars/${id}/like`);
  return res.data as { likes: number; liked: boolean };
}

export async function addComment(id: string, content: string) {
  const res = await api.post(`/avatars/${id}/comments`, { content });
  return res.data as Comment;
}

export async function getUserAvatars(userId: string) {
  const res = await api.get(`/users/${userId}/avatars`);
  return res.data as Avatar[];
}
