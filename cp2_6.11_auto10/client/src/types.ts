export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface HeaderItem {
  key: string;
  value: string;
}

export interface RequestConfig {
  id?: string;
  method: HttpMethod;
  url: string;
  headers: HeaderItem[];
  body: string;
  timestamp?: number;
  name?: string;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
}

export interface HistoryItem {
  id: string;
  method: HttpMethod;
  url: string;
  headers: HeaderItem[];
  body: string;
  timestamp: number;
  status?: number;
  responseTime?: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  requests: RequestConfig[];
  createdAt: number;
}

export interface CompareResult {
  requestId: string;
  name: string;
  method: HttpMethod;
  url: string;
  status?: number;
  responseTime?: number;
  error?: string;
}
