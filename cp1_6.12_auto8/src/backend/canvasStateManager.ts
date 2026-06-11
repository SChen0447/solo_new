import { v4 as uuidv4 } from 'uuid';
import type {
  CanvasState,
  HistoryVersion,
  DrawElement,
  StickyNote,
  CanvasImage,
} from '../shared/types';

const MAX_HISTORY_VERSIONS = 50;

export class CanvasStateManager {
  private state: CanvasState;
  private versions: HistoryVersion[] = [];

  constructor(initialState?: CanvasState) {
    this.state = initialState || { drawings: [], stickies: [], images: [] };
  }

  getState(): CanvasState {
    return this.state;
  }

  getVersions(): HistoryVersion[] {
    return this.versions;
  }

  addDrawElement(element: DrawElement): void {
    this.state.drawings.push(element);
  }

  updateDrawElement(element: DrawElement): void {
    const idx = this.state.drawings.findIndex((d) => d.id === element.id);
    if (idx !== -1) {
      this.state.drawings[idx] = element;
    }
  }

  finishDrawElement(element: DrawElement): void {
    const idx = this.state.drawings.findIndex((d) => d.id === element.id);
    if (idx !== -1) {
      this.state.drawings[idx] = element;
    } else {
      this.state.drawings.push(element);
    }
  }

  addSticky(sticky: StickyNote): void {
    this.state.stickies.push(sticky);
  }

  updateSticky(sticky: StickyNote): void {
    const idx = this.state.stickies.findIndex((s) => s.id === sticky.id);
    if (idx !== -1) {
      this.state.stickies[idx] = sticky;
    }
  }

  deleteSticky(id: string): void {
    this.state.stickies = this.state.stickies.filter((s) => s.id !== id);
  }

  addImage(image: CanvasImage): void {
    this.state.images.push(image);
  }

  updateImage(image: CanvasImage): void {
    const idx = this.state.images.findIndex((i) => i.id === image.id);
    if (idx !== -1) {
      this.state.images[idx] = image;
    }
  }

  deleteImage(id: string): void {
    this.state.images = this.state.images.filter((i) => i.id !== id);
  }

  saveVersion(): HistoryVersion | null {
    const hasContent =
      this.state.drawings.length > 0 ||
      this.state.stickies.length > 0 ||
      this.state.images.length > 0;

    if (!hasContent) return null;

    const lastVersion = this.versions[this.versions.length - 1];
    const isChanged =
      !lastVersion ||
      JSON.stringify(lastVersion.drawings) !== JSON.stringify(this.state.drawings) ||
      JSON.stringify(lastVersion.stickies) !== JSON.stringify(this.state.stickies) ||
      JSON.stringify(lastVersion.images) !== JSON.stringify(this.state.images);

    if (!isChanged) return null;

    const version: HistoryVersion = {
      id: uuidv4(),
      timestamp: Date.now(),
      drawings: JSON.parse(JSON.stringify(this.state.drawings)),
      stickies: JSON.parse(JSON.stringify(this.state.stickies)),
      images: JSON.parse(JSON.stringify(this.state.images)),
    };

    this.versions.push(version);
    if (this.versions.length > MAX_HISTORY_VERSIONS) {
      this.versions = this.versions.slice(-MAX_HISTORY_VERSIONS);
    }

    return version;
  }

  restoreVersion(versionId: string): boolean {
    const version = this.versions.find((v) => v.id === versionId);
    if (!version) return false;

    this.state = {
      drawings: JSON.parse(JSON.stringify(version.drawings)),
      stickies: JSON.parse(JSON.stringify(version.stickies)),
      images: JSON.parse(JSON.stringify(version.images)),
    };
    return true;
  }

  clear(): void {
    this.state = { drawings: [], stickies: [], images: [] };
  }
}

export function validateImageFile(file: { type: string; size: number }): { valid: boolean; error?: string } {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: '仅支持 PNG 和 JPG 格式的图片' };
  }
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: '图片大小不能超过 5MB' };
  }
  return { valid: true };
}
