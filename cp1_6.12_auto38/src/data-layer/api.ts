import { Photo, Tag, PRESET_TAGS, CUSTOM_TAG_COLOR, MAX_TAGS_PER_PHOTO } from './types';

const STORAGE_KEY = 'photo-wall-data-v2';
const MOCK_PHOTO_COUNT = 30;

function createSeededRandom(seed: number) {
  let state = seed;
  return function random(): number {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

function generateMockPhotos(count: number): Photo[] {
  const random = createSeededRandom(42);
  const photos: Photo[] = [];
  const startTimestamp = new Date('2024-01-01').getTime();
  const endTimestamp = new Date('2025-12-31').getTime();
  const timeRange = endTimestamp - startTimestamp;

  for (let i = 0; i < count; i++) {
    const randomTime = startTimestamp + Math.floor(random() * timeRange);
    const date = new Date(randomTime);
    const lat = 30 + random() * 20;
    const lng = 100 + random() * 30;
    const numTags = Math.floor(random() * MAX_TAGS_PER_PHOTO) + 1;

    const tagIndices: number[] = [];
    while (tagIndices.length < numTags) {
      const idx = Math.floor(random() * PRESET_TAGS.length);
      if (!tagIndices.includes(idx)) {
        tagIndices.push(idx);
      }
    }
    const tags = tagIndices.map(idx => PRESET_TAGS[idx].name);

    const photoId = `photo-fixed-${i + 1}-${Math.floor(random() * 1000000)}`;
    const seedKey = `picsum-photo-${i + 1}`;

    photos.push({
      id: photoId,
      url: `https://picsum.photos/seed/${seedKey}/800/600`,
      thumbnail: `https://picsum.photos/seed/${seedKey}/400/300`,
      date: date.toISOString().split('T')[0],
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      tags: tags,
      order: i
    });
  }

  photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  photos.forEach((photo, index) => {
    photo.order = index;
  });

  return photos;
}

function loadFromStorage(): Photo[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[photo-api] Failed to load from storage:', e);
  }
  return null;
}

function saveToStorage(photos: Photo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  } catch (e) {
    console.error('[photo-api] Failed to save to storage:', e);
  }
}

interface PhotoRepository {
  getAll: () => Photo[];
  getPage: (page: number, pageSize: number) => { photos: Photo[]; total: number; hasMore: boolean };
  addTag: (photoId: string, tagName: string) => Photo | null;
  removeTag: (photoId: string, tagName: string) => Photo | null;
  getAllTags: () => Tag[];
  updateOrder: (photoIds: string[], orders: number[]) => boolean;
  invalidate: () => void;
}

function createPhotoRepository(): PhotoRepository {
  let photos: Photo[] | null = null;

  function ensureLoaded(): Photo[] {
    if (photos) return photos;
    const stored = loadFromStorage();
    if (stored && stored.length > 0) {
      photos = stored;
      return photos;
    }
    const generated = generateMockPhotos(MOCK_PHOTO_COUNT);
    saveToStorage(generated);
    photos = generated;
    return photos;
  }

  function sortByOrder(list: Photo[]): Photo[] {
    return [...list].sort((a, b) => a.order - b.order);
  }

  return {
    getAll() {
      return sortByOrder(ensureLoaded());
    },

    getPage(page: number, pageSize: number) {
      const all = sortByOrder(ensureLoaded());
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return {
        photos: all.slice(start, end),
        total: all.length,
        hasMore: end < all.length
      };
    },

    addTag(photoId: string, tagName: string) {
      const all = ensureLoaded();
      const photo = all.find(p => p.id === photoId);
      if (!photo) return null;
      if (photo.tags.length >= MAX_TAGS_PER_PHOTO) return { ...photo };
      if (photo.tags.includes(tagName)) return { ...photo };
      photo.tags = [...photo.tags, tagName];
      saveToStorage(all);
      return { ...photo };
    },

    removeTag(photoId: string, tagName: string) {
      const all = ensureLoaded();
      const photo = all.find(p => p.id === photoId);
      if (!photo) return null;
      photo.tags = photo.tags.filter(t => t !== tagName);
      saveToStorage(all);
      return { ...photo };
    },

    getAllTags() {
      const all = ensureLoaded();
      const tagSet = new Set<string>();
      all.forEach(photo => {
        photo.tags.forEach(tag => tagSet.add(tag));
      });

      const tags: Tag[] = PRESET_TAGS.map(t => ({ ...t }));
      tagSet.forEach(tagName => {
        if (!PRESET_TAGS.find(t => t.name === tagName)) {
          tags.push({ name: tagName, color: CUSTOM_TAG_COLOR, isPreset: false });
        }
      });
      return tags;
    },

    updateOrder(photoIds: string[], orders: number[]) {
      const all = ensureLoaded();
      photoIds.forEach((id, index) => {
        const photo = all.find(p => p.id === id);
        if (photo) {
          photo.order = orders[index];
        }
      });
      saveToStorage(all);
      return true;
    },

    invalidate() {
      photos = null;
    }
  };
}

let repositoryInstance: PhotoRepository | null = null;

function getRepository(): PhotoRepository {
  if (!repositoryInstance) {
    repositoryInstance = createPhotoRepository();
  }
  return repositoryInstance;
}

export async function getPhotos(
  page: number = 1,
  pageSize: number = 10
): Promise<{ photos: Photo[]; total: number; hasMore: boolean }> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(getRepository().getPage(page, pageSize));
    }, 300);
  });
}

export async function getAllPhotos(): Promise<Photo[]> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(getRepository().getAll());
    }, 200);
  });
}

export async function addTagToPhoto(photoId: string, tagName: string): Promise<Photo | null> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(getRepository().addTag(photoId, tagName));
    }, 100);
  });
}

export async function removeTagFromPhoto(photoId: string, tagName: string): Promise<Photo | null> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(getRepository().removeTag(photoId, tagName));
    }, 100);
  });
}

export async function getAllTags(): Promise<Tag[]> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(getRepository().getAllTags());
    }, 100);
  });
}

export async function updatePhotoOrder(photoIds: string[], orders: number[]): Promise<boolean> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(getRepository().updateOrder(photoIds, orders));
    }, 100);
  });
}

export function invalidateCache(): void {
  if (repositoryInstance) {
    repositoryInstance.invalidate();
    repositoryInstance = null;
  }
}
