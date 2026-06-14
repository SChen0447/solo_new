import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');

export function readJsonFile<T>(filename: string): T {
  const filePath = path.join(dataDir, filename);
  const rawData = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(rawData) as T;
}

export function writeJsonFile<T>(filename: string, data: T): void {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export interface ArtworkData {
  artworks: Artwork[];
}

export interface ExhibitionData {
  exhibitions: Exhibition[];
}

export type ArtworkCategory = 'oil' | 'sculpture' | 'photography' | 'installation';

export interface Artwork {
  id: string;
  name: string;
  category: ArtworkCategory;
  width: number;
  height: number;
  year: number;
  price: number;
  artistName: string;
  artistBio: string;
  thumbnailUrl?: string;
}

export interface ExhibitionArtwork {
  artworkId: string;
  positionX: number;
  positionY: number;
  gridWidth: number;
  gridHeight: number;
}

export interface Exhibition {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  openTime: string;
  description?: string;
  artworks: ExhibitionArtwork[];
}
