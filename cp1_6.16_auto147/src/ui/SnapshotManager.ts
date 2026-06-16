export interface TerrainSnapshot {
  id: string;
  heightMap: Float32Array;
  timestamp: number;
  description: string;
  thumbnail: string;
}

const DB_NAME = 'PlateTectonicsDB';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const MAX_SNAPSHOTS = 10;

export class SnapshotManager {
  private db: IDBDatabase | null = null;
  private snapshotListEl: HTMLDivElement | null = null;
  private onLoadCallback: ((heightMap: Float32Array) => void) | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  setOnLoadCallback(cb: (heightMap: Float32Array) => void): void {
    this.onLoadCallback = cb;
  }

  setSnapshotListElement(el: HTMLDivElement): void {
    this.snapshotListEl = el;
    this.renderList();
  }

  async saveSnapshot(heightMap: Float32Array, description: string, rendererCanvas: HTMLCanvasElement): Promise<void> {
    const thumbnail = this.generateThumbnail(rendererCanvas);

    const snapshot: TerrainSnapshot = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      heightMap: new Float32Array(heightMap),
      timestamp: Date.now(),
      description,
      thumbnail,
    };

    await this.ensureMaxSnapshots();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(snapshot);

      request.onsuccess = () => {
        this.renderList();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async ensureMaxSnapshots(): Promise<void> {
    const all = await this.getAll();
    while (all.length >= MAX_SNAPSHOTS) {
      const oldest = all.shift()!;
      await this.deleteSnapshot(oldest.id);
    }
  }

  async loadSnapshot(id: string): Promise<Float32Array | null> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          const heightMap = new Float32Array(request.result.heightMap);
          if (this.onLoadCallback) {
            this.onLoadCallback(heightMap);
          }
          resolve(heightMap);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSnapshot(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        this.renderList();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async getAll(): Promise<TerrainSnapshot[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private generateThumbnail(canvas: HTMLCanvasElement): string {
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 120;
    thumbCanvas.height = 80;
    const ctx = thumbCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0, 120, 80);
    return thumbCanvas.toDataURL('image/jpeg', 0.6);
  }

  private async renderList(): Promise<void> {
    if (!this.snapshotListEl) return;

    const snapshots = await this.getAll();

    if (snapshots.length === 0) {
      this.snapshotListEl.innerHTML = '<div class="empty-snapshots">暂无快照</div>';
      return;
    }

    this.snapshotListEl.innerHTML = '';
    for (const snap of snapshots) {
      const item = document.createElement('div');
      item.className = 'snapshot-item';

      const thumb = document.createElement('img');
      thumb.className = 'snapshot-thumb';
      thumb.src = snap.thumbnail;
      thumb.alt = snap.description;

      const info = document.createElement('div');
      info.className = 'snapshot-info';

      const desc = document.createElement('div');
      desc.className = 'snapshot-desc';
      desc.textContent = snap.description;

      const time = document.createElement('div');
      time.className = 'snapshot-time';
      time.textContent = new Date(snap.timestamp).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      info.appendChild(desc);
      info.appendChild(time);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'snapshot-delete';
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteSnapshot(snap.id);
      });

      item.appendChild(thumb);
      item.appendChild(info);
      item.appendChild(deleteBtn);

      item.addEventListener('click', () => {
        this.loadSnapshot(snap.id);
      });

      this.snapshotListEl.appendChild(item);
    }
  }
}
