import { v4 as uuidv4 } from 'uuid';
import { HistoryItem, Collection, RequestConfig } from './types';

const HISTORY_KEY = 'postman_lite_history';
const COLLECTIONS_KEY = 'postman_lite_collections';

export const historyService = {
  save: (config: RequestConfig, status?: number, responseTime?: number): HistoryItem => {
    const item: HistoryItem = {
      id: config.id || uuidv4(),
      method: config.method,
      url: config.url,
      headers: config.headers,
      body: config.body,
      timestamp: Date.now(),
      status,
      responseTime,
    };

    const all = historyService.getAll();
    all.unshift(item);
    if (all.length > 100) {
      all.pop();
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
    return item;
  },

  getAll: (): HistoryItem[] => {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  delete: (id: string): void => {
    const all = historyService.getAll().filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
  },

  clear: (): void => {
    localStorage.removeItem(HISTORY_KEY);
  },
};

export const collectionService = {
  getAll: (): Collection[] => {
    try {
      const data = localStorage.getItem(COLLECTIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  save: (name: string, description: string, requests: RequestConfig[]): Collection => {
    const collection: Collection = {
      id: uuidv4(),
      name,
      description,
      requests,
      createdAt: Date.now(),
    };
    const all = collectionService.getAll();
    all.unshift(collection);
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(all));
    return collection;
  },

  delete: (id: string): void => {
    const all = collectionService.getAll().filter((c) => c.id !== id);
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(all));
  },

  addRequest: (collectionId: string, request: RequestConfig): void => {
    const all = collectionService.getAll();
    const collection = all.find((c) => c.id === collectionId);
    if (collection) {
      collection.requests.push({ ...request, id: uuidv4() });
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(all));
    }
  },
};
