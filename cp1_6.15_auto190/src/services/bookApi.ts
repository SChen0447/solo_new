import axios, { AxiosInstance } from 'axios';

export interface BookInfo {
  isbn: string;
  title: string;
  author: string;
  coverUrl: string | null;
}

interface OpenLibraryDoc {
  title?: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
  key?: string;
}

interface OpenLibraryResponse {
  docs?: OpenLibraryDoc[];
  numFound?: number;
}

class RateLimiter {
  private queue: (() => Promise<any>)[] = [];
  private lastCallTime = 0;
  private minIntervalMs: number;
  private processing = false;

  constructor(minIntervalMs: number = 1000) {
    this.minIntervalMs = minIntervalMs;
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const elapsed = now - this.lastCallTime;
      if (elapsed < this.minIntervalMs) {
        await new Promise((r) => setTimeout(r, this.minIntervalMs - elapsed));
      }

      const task = this.queue.shift();
      if (task) {
        this.lastCallTime = Date.now();
        try {
          await task();
        } catch {
        }
      }
    }

    this.processing = false;
  }
}

const rateLimiter = new RateLimiter(1200);

const httpClient: AxiosInstance = axios.create({
  baseURL: 'https://openlibrary.org',
  timeout: 15000,
  headers: {
    Accept: 'application/json',
  },
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 500
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (error?.response?.status === 404) {
        throw error;
      }
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  throw lastError;
};

export const searchBookByISBN = async (isbn: string): Promise<BookInfo | null> => {
  const cleanIsbn = isbn.replace(/[-\s]/g, '');
  if (cleanIsbn.length < 10) {
    throw new Error('ISBN格式不正确');
  }

  return rateLimiter.schedule(async () => {
    try {
      const data = await retryWithBackoff<OpenLibraryResponse>(async () => {
        const response = await httpClient.get('/search.json', {
          params: {
            q: `isbn:${cleanIsbn}`,
            limit: 1,
          },
        });
        return response.data;
      });

      if (!data?.docs || data.docs.length === 0) {
        return null;
      }

      const doc = data.docs[0];
      const title = doc.title || '未知书名';
      const author = doc.author_name?.[0] || '未知作者';

      let coverUrl: string | null = null;
      if (doc.cover_i) {
        coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
      } else {
        coverUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`;
      }

      return {
        isbn: cleanIsbn,
        title,
        author,
        coverUrl,
      };
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      console.error('ISBN查询失败:', error);
      throw error;
    }
  });
};

export const checkCoverUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await axios.head(url, { timeout: 5000 });
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
};
