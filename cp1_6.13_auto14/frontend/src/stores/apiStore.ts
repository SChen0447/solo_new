import axios from 'axios';
import { Shop, Slot, Appointment, Pet } from '../types';

const api = axios.create({
  baseURL: '/api',
});

let petsData: Pet[] = [
  { id: 1, name: '豆豆', breed: '金毛', age: 3, note: '性格温顺，喜欢洗澡' },
  { id: 2, name: '咪咪', breed: '布偶猫', age: 2, note: '有点怕生，需要温柔对待' },
];

export const fetchShops = async (): Promise<Shop[]> => {
  const response = await api.get<Shop[]>('/shops');
  return response.data;
};

export const fetchShop = async (id: number): Promise<Shop> => {
  const response = await api.get<Shop>(`/shops/${id}`);
  return response.data;
};

export const fetchSlots = async (shopId: number, date: string): Promise<Slot[]> => {
  const response = await api.get<{ slots: Slot[] }>(`/slots/${shopId}`, {
    params: { date },
  });
  return response.data.slots;
};

export const createAppointment = async (data: Omit<Appointment, 'id' | 'created_at'>): Promise<Appointment> => {
  const response = await api.post<Appointment>('/appointments', data);
  return response.data;
};

export const fetchAppointments = async (): Promise<Appointment[]> => {
  const response = await api.get<Appointment[]>('/appointments');
  return response.data;
};

export const deleteAppointment = async (id: number): Promise<void> => {
  await api.delete(`/appointments/${id}`);
};

export const fetchPets = async (): Promise<Pet[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...petsData]), 100);
  });
};

export const addPet = async (pet: Omit<Pet, 'id'>): Promise<Pet> => {
  return new Promise((resolve) => {
    const newPet: Pet = {
      ...pet,
      id: Math.max(...petsData.map((p) => p.id), 0) + 1,
    };
    petsData.push(newPet);
    setTimeout(() => resolve(newPet), 100);
  });
};

export const updatePet = async (pet: Pet): Promise<Pet> => {
  return new Promise((resolve) => {
    petsData = petsData.map((p) => (p.id === pet.id ? pet : p));
    setTimeout(() => resolve(pet), 100);
  });
};

export const removePet = async (id: number): Promise<void> => {
  return new Promise((resolve) => {
    petsData = petsData.filter((p) => p.id !== id);
    setTimeout(() => resolve(), 100);
  });
};
