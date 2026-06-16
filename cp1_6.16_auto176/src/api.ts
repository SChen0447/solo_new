import axios from 'axios';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  RoomStateResponse,
  RoomListItem
} from './types';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000
});

export const createRoom = async (data: CreateRoomRequest): Promise<CreateRoomResponse> => {
  const response = await api.post<CreateRoomResponse>('/rooms', data);
  return response.data;
};

export const joinRoom = async (data: JoinRoomRequest): Promise<JoinRoomResponse> => {
  const response = await api.post<JoinRoomResponse>('/rooms/join', data);
  return response.data;
};

export const startGame = async (roomCode: string, playerId: string): Promise<{ success: boolean }> => {
  const response = await api.post<{ success: boolean }>('/rooms/start', { roomCode, playerId });
  return response.data;
};

export const submitAnswer = async (data: SubmitAnswerRequest): Promise<SubmitAnswerResponse> => {
  const response = await api.post<SubmitAnswerResponse>('/answer', data);
  return response.data;
};

export const fetchRoomState = async (roomCode: string): Promise<RoomStateResponse> => {
  const response = await api.get<RoomStateResponse>(`/rooms/${roomCode}`);
  return response.data;
};

export const fetchRooms = async (): Promise<RoomListItem[]> => {
  const response = await api.get<RoomListItem[]>('/rooms');
  return response.data;
};
