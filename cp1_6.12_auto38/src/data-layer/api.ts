import { v4 as uuidv4 } from 'uuid';
import { Photo, Tag, PRESET_TAGS, CUSTOM_TAG_COLOR } from './types';

const STORAGE_KEY = 'photo-wall-data';
const ORDER_STORAGE_KEY = 'photo-wall-order';

function generateMockPhotos(): Photo[] {
  const photos: Photo[] = [];
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2025-12-31');

  for (let i = 0; i < 30; i++) {
    const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
    const date = new Date(randomTime);
    const lat = 30 + Math.random() * 20;
    const lng = 100 + Math.random() * 30;
    const numTags = Math.floor(Math.random() * 3) + 1;
    const shuffledTags = [...PRESET_TAGS].sort(() => Math.random() - 0.5);
    const tags = shuffledTags.slice(0, numTags).map(t => t.name);

    photos.push({
      id: uuidv4(),
      url: `https://picsum.photos/seed/${uuidv4()}/800/600`,
      thumbnail: `https://picsum.photos/seed/${uuidv4()}/400/300`,
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

function loadOrderFromStorage(): Record<string, number> | null {
  try {
    const data = localStorage.getItem(ORDER_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load order from storage:', e);
  }
  return null;
}

function saveOrderToStorage(photoIds: string[], orders: number[]): void {
  try {
    const orderMap: Record<string, number> = {};
    photoIds.forEach((id, index) => {
      orderMap[id] = orders[index];
    });
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orderMap));
  } catch (e) {
    console.error('Failed to save order to storage:', e);
  }
}

let photosCache: Photo[] | null = null;

function getPhotosInternal(): Photo[] {
  if (photosCache) {
    return photosCache;
  }

  let photos = loadFromStorage();
  if (!photos || photos.length === 0) {
    photos = generateMockPhotos();
    saveToStorage(photos);
  }

  const orderMap = loadOrderFromStorage();
  if (orderMap) {
    photos.forEach(photo => {
      if (orderMap[photo.id] !== undefined) {
        photo.order = orderMap[photo.id];
      }
    });
  }

  photosCache = photos;
  return photos;
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
      if (photo && photo.tags.length < 3 && !photo.tags.includes(tagName)) {
        photo.tags = [...photo.tags, tagName];
        saveToStorage(photos);
        resolve({ ...photo });
      } else {
        resolve(photo ? { ...photo } : null);
      }
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
      saveOrderToStorage(photoIds, orders);
      photosCache = photos;
      resolve(true);
    }, 100);
  });
}
