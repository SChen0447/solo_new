import axios from 'axios';

const API_BASE = '/api';

export interface Drink {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  thumbnail: string;
  customizations: {
    milkTypes: string[];
    syrupFlavors: string[];
    temperatures: string[];
    espressoShots: { min: number; max: number; default: number };
    iceLevels: { min: number; max: number; default: number };
  };
}

export interface Note {
  id: string;
  drinkId: string;
  content: string;
  mood: 'happy' | 'relaxed' | 'energized' | 'disappointed' | 'surprised';
  createdAt: string;
}

export interface Order {
  id: string;
  drinkId: string;
  customizations: {
    milkType: string;
    syrupFlavor: string;
    temperature: string;
    espressoShots: number;
    iceLevel: number;
  };
  createdAt: string;
}

export interface DashboardStats {
  topDrinks: { drinkId: string; name: string; count: number }[];
  wordCloud: { word: string; count: number }[];
  moodAverages: { drinkId: string; name: string; averageMood: number }[];
  weeklyTrend: { date: string; count: number }[];
}

export const api = {
  getDrinks: () => axios.get<Drink[]>(`${API_BASE}/drinks`).then(res => res.data),
  getDrink: (id: string) => axios.get<Drink>(`${API_BASE}/drinks/${id}`).then(res => res.data),
  getNotes: (drinkId?: string) => 
    axios.get<Note[]>(`${API_BASE}/notes`, drinkId ? { params: { drinkId } } : undefined).then(res => res.data),
  createNote: (data: Omit<Note, 'id' | 'createdAt'>) =>
    axios.post<Note>(`${API_BASE}/notes`, data).then(res => res.data),
  createOrder: (data: Omit<Order, 'id' | 'createdAt'>) =>
    axios.post<Order>(`${API_BASE}/orders`, data).then(res => res.data),
  getDashboardStats: () => axios.get<DashboardStats>(`${API_BASE}/dashboard`).then(res => res.data),
  login: (password: string) =>
    axios.post<{ success: boolean }>(`${API_BASE}/login`, { password }).then(res => res.data)
};
