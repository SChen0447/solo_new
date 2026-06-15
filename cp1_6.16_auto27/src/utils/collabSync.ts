import type { CanvasElement } from '../store/useCanvasStore';
import { useCanvasStore } from '../store/useCanvasStore';

const STORAGE_KEY = 'teamdraw_collab_data';
const LAST_PUSH_KEY = 'teamdraw_last_push_time';

interface StoredData {
  elements: CanvasElement[];
  timestamp: number;
  sourceUserId: string;
}

function readStorage(): StoredData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredData;
  } catch {
    return null;
  }
}

function writeStorage(data: StoredData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(LAST_PUSH_KEY, String(data.timestamp));
  } catch {
    // ignore
  }
}

export function loadFromStorage(): CanvasElement[] {
  const data = readStorage();
  if (data && Array.isArray(data.elements)) {
    return data.elements;
  }
  return [];
}

function mergeElements(
  local: CanvasElement[],
  remote: CanvasElement[],
  localUserId: string
): CanvasElement[] {
  const map = new Map<string, CanvasElement>();

  for (const el of remote) {
    map.set(el.id, el);
  }

  for (const el of local) {
    const existing = map.get(el.id);
    if (!existing) {
      map.set(el.id, el);
    } else {
      if (el.userId === localUserId && el.createdAt >= existing.createdAt) {
        map.set(el.id, el);
      } else if (el.createdAt > existing.createdAt) {
        map.set(el.id, el);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
}

export function syncWithServer(): void {
  const state = useCanvasStore.getState();
  const userId = state.userId;
  const localElements = state.elements;

  const stored = readStorage();
  const now = Date.now();

  if (!stored) {
    writeStorage({
      elements: localElements,
      timestamp: now,
      sourceUserId: userId,
    });
    return;
  }

  if (stored.sourceUserId === userId) {
    if (localElements.length !== stored.elements.length) {
      writeStorage({
        elements: localElements,
        timestamp: now,
        sourceUserId: userId,
      });
    }
    return;
  }

  const merged = mergeElements(localElements, stored.elements, userId);
  const localChanged = JSON.stringify(localElements) !== JSON.stringify(merged);

  if (localChanged) {
    useCanvasStore.setState({ elements: merged });
  }

  const remoteChanged =
    JSON.stringify(stored.elements) !== JSON.stringify(merged);

  if (remoteChanged || localChanged) {
    writeStorage({
      elements: merged,
      timestamp: now,
      sourceUserId: userId,
    });
  }
}

let syncIntervalId: number | null = null;

export function startCollabSync(): void {
  if (syncIntervalId !== null) return;

  const existing = loadFromStorage();
  if (existing.length > 0) {
    const state = useCanvasStore.getState();
    if (state.elements.length === 0) {
      useCanvasStore.setState({ elements: existing });
    }
  }

  syncIntervalId = window.setInterval(() => {
    syncWithServer();
  }, 500);
}

export function stopCollabSync(): void {
  if (syncIntervalId !== null) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}

export function resetCollabData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_PUSH_KEY);
  } catch {
    // ignore
  }
}
