import { Photo, Tag, PRESET_TAGS, CUSTOM_TAG_COLOR, MAX_TAGS_PER_PHOTO } from './types';

const STORAGE_KEY = 'photo-wall-data-v2';

function createSeededRandom(seed: number) {
  let state = seed;
  return function random(): number {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

function generateMockPhotos(): Photo[] {
  const random = createSeededRandom(42);
  const photos: Photo[] = [];
  const startDate = new Date('2024-01-01').getTime();
  const endDate = new Date('2025-12-31').getTime();

  for (let i = 0; i < 30; i++) {
    const randomTime = startDate + Math.floor(random() * (endDate - startDate));
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
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load from storage:', e);
  }
  return null;
}

function saveToStorage(photos: Photo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
}

let photosCache: Photo[] | null = null;

function getPhotosInternal(): Photo[] {
  if (photosCache) {
    return photosCache;
  }

  const stored = loadFromStorage();
  if (stored && stored.length > 0) {
    photosCache = stored;
    return photosCache;
  }

  const generated = generateMockPhotos();
  saveToStorage(generated);
  photosCache = generated;
  return photosCache;
}

export async function getPhotos(page: number = 1, pageSize: number = 10): Promise<{
  photos: Photo[];
  total: number;
  hasMore: boolean;
}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const allPhotos = getPhotosInternal();
      const sortedPhotos = [...allPhotos].sort((a, b) => a.order - b.order);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const photos = sortedPhotos.slice(start, end);

      resolve({
        photos,
        total: allPhotos.length,
        hasMore: end < allPhotos.length
      });
    }, 300);
  });
}

export async function getAllPhotos(): Promise<Photo[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const allPhotos = getPhotosInternal();
      const sortedPhotos = [...allPhotos].sort((a, b) => a.order - b.order);
      resolve(sortedPhotos);
    }, 200);
  });
}

export async function addTagToPhoto(photoId: string, tagName: string): Promise<Photo | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const photos = getPhotosInternal();
      const photo = photos.find(p => p.id === photoId);
      if (!photo) {
        resolve(null);
        return;
      }
      if (photo.tags.length >= MAX_TAGS_PER_PHOTO) {
        resolve({ ...photo });
        return;
      }
      if (photo.tags.includes(tagName)) {
        resolve({ ...photo });
        return;
      }
      photo.tags = [...photo.tags, tagName];
      saveToStorage(photos);
      photosCache = photos;
      resolve({ ...photo });
    }, 100);
  });
}

export async function removeTagFromPhoto(photoId: string, tagName: string): Promise<Photo | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const photos = getPhotosInternal();
      const photo = photos.find(p => p.id === photoId);
      if (photo) {
        photo.tags = photo.tags.filter(t => t !== tagName);
        saveToStorage(photos);
        photosCache = photos;
        resolve({ ...photo });
      } else {
        resolve(null);
      }
    }, 100);
  });
}

export async function getAllTags(): Promise<Tag[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const photos = getPhotosInternal();
      const tagSet = new Set<string>();
      photos.forEach(photo => {
        photo.tags.forEach(tag => tagSet.add(tag));
      });

      const tags: Tag[] = PRESET_TAGS.map(t => ({ ...t }));
      tagSet.forEach(tagName => {
        if (!PRESET_TAGS.find(t => t.name === tagName)) {
          tags.push({ name: tagName, color: CUSTOM_TAG_COLOR, isPreset: false });
        }
      });

      resolve(tags);
    }, 100);
  });
}

export async function updatePhotoOrder(photoIds: string[], orders: number[]): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const photos = getPhotosInternal();
      photoIds.forEach((id, index) => {
        const photo = photos.find(p => p.id === id);
        if (photo) {
          photo.order = orders[index];
        }
      });
      saveToStorage(photos);
      photosCache = photos;
      resolve(true);
    }, 100);
  });
}

export function invalidateCache(): void {
  photosCache = null;
}
