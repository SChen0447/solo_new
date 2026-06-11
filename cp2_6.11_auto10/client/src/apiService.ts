import axios from 'axios';
import { RequestConfig, ResponseData, HeaderItem } from './types';

const headersToRecord = (headers: HeaderItem[]): Record<string, string> => {
  const record: Record<string, string> = {};
  headers.forEach((h) => {
    if (h.key.trim()) {
      record[h.key.trim()] = h.value;
    }
  });
  return record;
};

export const sendRequest = async (config: RequestConfig): Promise<ResponseData> => {
  const timeout = config.timeout || 30000;
  const response = await axios.post<ResponseData>(
    '/api/proxy',
    {
      method: config.method,
      url: config.url,
      headers: headersToRecord(config.headers),
      body: config.body,
      timeout,
    },
    { timeout: timeout + 5000 }
  );
  return response.data;
};
