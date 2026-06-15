import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const AUDIO_DIR = path.join(DATA_DIR, 'audio');
const ANNOTATIONS_DIR = path.join(DATA_DIR, 'annotations');
const VERSIONS_DIR = path.join(DATA_DIR, 'versions');
const AUDIO_FILES_PATH = path.join(DATA_DIR, 'audio_files.json');

export async function ensureDirectories() {
  await fs.mkdir(AUDIO_DIR, { recursive: true });
  await fs.mkdir(ANNOTATIONS_DIR, { recursive: true });
  await fs.mkdir(VERSIONS_DIR, { recursive: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [] as unknown as T;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export function getAudioPath(audioId: string, format: string): string {
  return path.join(AUDIO_DIR, `${audioId}.${format}`);
}

export function getAnnotationsPath(audioId: string): string {
  return path.join(ANNOTATIONS_DIR, `${audioId}.json`);
}

export function getVersionsPath(audioId: string): string {
  return path.join(VERSIONS_DIR, `${audioId}.json`);
}

export async function saveAudioFile(audioId: string, format: string, buffer: Buffer): Promise<string> {
  const filePath = getAudioPath(audioId, format);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function readAudioFile(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}

export { AUDIO_FILES_PATH;
export { AUDIO_DIR, ANNOTATIONS_DIR, VERSIONS_DIR };
