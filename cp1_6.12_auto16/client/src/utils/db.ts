import { v4 as uuidv4 } from 'uuid';
import type { LyricLine, LyricsTrack } from '../types';

const DB_NAME = 'LyricsPlayerDB';
const DB_VERSION = 1;
const STORE_TRACKS = 'tracks';
const STORE_LINES = 'lines';

let dbInstance: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        const tracksStore = db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
        tracksStore.createIndex('audioFileId', 'audioFileId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_LINES)) {
        const linesStore = db.createObjectStore(STORE_LINES, { keyPath: 'id' });
        linesStore.createIndex('trackId', 'trackId', { unique: false });
      }
    };
  });
};

export const createTrack = async (audioFileId: string, title: string): Promise<LyricsTrack> => {
  const db = await openDB();
  const now = Date.now();
  const track: LyricsTrack = {
    id: uuidv4(),
    audioFileId,
    title,
    lines: [],
    createdAt: now,
    updatedAt: now
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRACKS, 'readwrite');
    const store = transaction.objectStore(STORE_TRACKS);
    const request = store.add(track);

    request.onsuccess = () => resolve(track);
    request.onerror = () => reject(request.error);
  });
};

export const getTrackByAudioId = async (audioFileId: string): Promise<LyricsTrack | null> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRACKS, 'readonly');
    const store = transaction.objectStore(STORE_TRACKS);
    const index = store.index('audioFileId');
    const request = index.get(audioFileId);

    request.onsuccess = async () => {
      const track = request.result as LyricsTrack | undefined;
      if (track) {
        const lines = await getLinesByTrackId(track.id);
        track.lines = lines.sort((a, b) => a.time - b.time);
        resolve(track);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const updateTrack = async (track: LyricsTrack): Promise<LyricsTrack> => {
  const db = await openDB();
  track.updatedAt = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRACKS, 'readwrite');
    const store = transaction.objectStore(STORE_TRACKS);
    const request = store.put(track);

    request.onsuccess = () => resolve(track);
    request.onerror = () => reject(request.error);
  });
};

export const deleteTrack = async (trackId: string): Promise<void> => {
  const db = await openDB();

  await deleteLinesByTrackId(trackId);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRACKS, 'readwrite');
    const store = transaction.objectStore(STORE_TRACKS);
    const request = store.delete(trackId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const addLine = async (trackId: string, time: number, text: string): Promise<LyricLine> => {
  const db = await openDB();
  const line: LyricLine = {
    id: uuidv4(),
    time,
    text,
    trackId
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LINES, 'readwrite');
    const store = transaction.objectStore(STORE_LINES);
    const request = store.add(line);

    request.onsuccess = () => {
      updateTrackUpdatedAt(trackId);
      resolve(line);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getLinesByTrackId = async (trackId: string): Promise<LyricLine[]> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LINES, 'readonly');
    const store = transaction.objectStore(STORE_LINES);
    const index = store.index('trackId');
    const request = index.getAll(trackId);

    request.onsuccess = () => resolve(request.result as LyricLine[]);
    request.onerror = () => reject(request.error);
  });
};

export const updateLine = async (line: LyricLine): Promise<LyricLine> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LINES, 'readwrite');
    const store = transaction.objectStore(STORE_LINES);
    const request = store.put(line);

    request.onsuccess = () => {
      updateTrackUpdatedAt(line.trackId);
      resolve(line);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteLine = async (lineId: string, trackId: string): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LINES, 'readwrite');
    const store = transaction.objectStore(STORE_LINES);
    const request = store.delete(lineId);

    request.onsuccess = () => {
      updateTrackUpdatedAt(trackId);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteLinesByTrackId = async (trackId: string): Promise<void> => {
  const db = await openDB();
  const lines = await getLinesByTrackId(trackId);

  const transaction = db.transaction(STORE_LINES, 'readwrite');
  const store = transaction.objectStore(STORE_LINES);

  return Promise.all(
    lines.map(line => new Promise<void>((resolve, reject) => {
      const request = store.delete(line.id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }))
  ).then(() => undefined);
};

const updateTrackUpdatedAt = async (trackId: string): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_TRACKS, 'readwrite');
  const store = transaction.objectStore(STORE_TRACKS);
  const request = store.get(trackId);

  request.onsuccess = () => {
    const track = request.result as LyricsTrack;
    if (track) {
      track.updatedAt = Date.now();
      store.put(track);
    }
  };
};

export const parseLRC = (lrcContent: string): Omit<LyricLine, 'id' | 'trackId'>[] => {
  const lines = lrcContent.split('\n');
  const result: Omit<LyricLine, 'id' | 'trackId'>[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];
    const text = line.replace(timeRegex, '').trim();

    if (!text) continue;

    for (const match of matches) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = parseInt(match[3].padEnd(3, '0'));
      const time = minutes * 60 + seconds + milliseconds / 1000;
      result.push({ time, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
};

export const formatLRC = (lines: LyricLine[]): string => {
  return lines
    .sort((a, b) => a.time - b.time)
    .map(line => {
      const minutes = Math.floor(line.time / 60);
      const seconds = Math.floor(line.time % 60);
      const milliseconds = Math.floor((line.time % 1) * 1000);
      const timeStr = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}]`;
      return `${timeStr}${line.text}`;
    })
    .join('\n');
};
