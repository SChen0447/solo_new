import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Station, PlayHistory } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATIONS_FILE = path.join(DATA_DIR, 'stations.json');
const PLAY_HISTORY_FILE = path.join(DATA_DIR, 'play-history.json');

async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  await ensureDataDir();
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    await writeJsonFile(filePath, defaultValue);
    return defaultValue;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export const fileStorage = {
  async getStations(): Promise<Station[]> {
    return readJsonFile<Station[]>(STATIONS_FILE, []);
  },

  async saveStations(stations: Station[]): Promise<void> {
    await writeJsonFile(STATIONS_FILE, stations);
  },

  async getPlayHistory(): Promise<PlayHistory[]> {
    return readJsonFile<PlayHistory[]>(PLAY_HISTORY_FILE, []);
  },

  async savePlayHistory(history: PlayHistory[]): Promise<void> {
    await writeJsonFile(PLAY_HISTORY_FILE, history);
  }
};
