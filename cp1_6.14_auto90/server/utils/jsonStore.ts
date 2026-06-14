import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface JsonStoreOptions<T> {
  filePath: string;
  fallback: T;
}

export function createJsonStore<T>(relativePath: string, fallback: T) {
  const filePath = path.resolve(__dirname, '..', relativePath);

  function ensureFile() {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
    }
  }

  function read(): T {
    ensureFile();
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error('[jsonStore] 读取失败，使用 fallback:', err);
      return fallback;
    }
  }

  function write(data: T): void {
    ensureFile();
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, filePath);
  }

  return { read, write, filePath };
}
