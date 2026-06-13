import axios from 'axios';
import type { Book, CreateBookRequest, ExchangeRequest, LikeRequest } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const bookApi = {
  async getAllBooks(): Promise<Book[]> {
    const response = await api.get<Book[]>('/books');
    return response.data;
  },

  async getBookById(id: string): Promise<Book> {
    const response = await api.get<Book>(`/books/${id}`);
    return response.data;
  },

  async createBook(payload: CreateBookRequest): Promise<Book> {
    const response = await api.post<Book>('/books', payload);
    return response.data;
  },

  async toggleLike(bookId: string, userId: string): Promise<Book> {
    const payload: LikeRequest = { bookId, userId };
    const response = await api.post<Book>(`/books/${bookId}/like`, { userId });
    return response.data;
  },

  async createExchangeRequest(payload: ExchangeRequest): Promise<{
    success: boolean;
    targetBook: Book;
    offeredBook: Book;
    timestamp: string;
  }> {
    const response = await api.post('/exchange-request', payload);
    return response.data;
  },
};

export default api;
