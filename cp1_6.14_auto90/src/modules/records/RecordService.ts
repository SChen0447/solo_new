import axios from 'axios';
import type {
  RecordItem,
  NewRecordPayload,
  RatingPayload,
  SortMode,
  Style,
} from '@/shared/types';

const client = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export interface ListRecordsParams {
  style?: Style[];
  sort?: SortMode;
  yearGte?: number;
  yearLte?: number;
  rating?: number | null;
}

export const RecordService = {
  async list(params?: ListRecordsParams): Promise<RecordItem[]> {
    const query: Record<string, string | number | undefined> = {};
    if (params) {
      if (params.style && params.style.length) query.style = params.style.join(',');
      if (params.sort) query.sort = params.sort;
      if (params.yearGte !== undefined) query.yearGte = params.yearGte;
      if (params.yearLte !== undefined) query.yearLte = params.yearLte;
      if (params.rating !== null && params.rating !== undefined) query.rating = params.rating;
    }
    const { data } = await client.get<RecordItem[]>('/records', { params: query });
    return data;
  },

  async get(id: string): Promise<RecordItem> {
    const { data } = await client.get<RecordItem>(`/records/${id}`);
    return data;
  },

  async create(payload: NewRecordPayload): Promise<RecordItem> {
    const { data } = await client.post<RecordItem>('/records', payload);
    return data;
  },

  async addRating(id: string, payload: RatingPayload): Promise<RecordItem> {
    const { data } = await client.put<RecordItem>(`/records/${id}/rating`, payload);
    return data;
  },
};

export default RecordService;
