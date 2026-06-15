import { VersionSnapshot, DiffResult, DiffPixel, Annotation } from '../types';

export interface VersionNode {
  version: VersionSnapshot;
  parentId: string | null;
  children: string[];
}

const THRESHOLD = 30;
const DIFF_COLOR = { r: 142, g: 68, b: 173 };

export class VersionManager {
  private versionTree: Map<string, VersionNode> = new Map();
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private canvasCache: Map<string, ImageData> = new Map();

  setVersions(versions: VersionSnapshot[]): void {
    this.versionTree.clear();
    versions
      .sort((a, b) => a.createdAt - b.createdAt)
      .forEach((v, index) => {
        const parentId = index > 0 ? versions[index - 1].id : null;
        const children = index < versions.length - 1 ? [versions[index + 1].id] : [];
        this.versionTree.set(v.id, { version: v, parentId, children });
      });
  }

  addVersion(version: VersionSnapshot, parentId: string | null = null): void {
    const lastVersion = this.getLastVersion();
    const actualParentId = parentId || (lastVersion ? lastVersion.id : null);

    this.versionTree.set(version.id, {
      version,
      parentId: actualParentId,
      children: [],
    });

    if (actualParentId && this.versionTree.has(actualParentId)) {
      const parent = this.versionTree.get(actualParentId)!;
      if (!parent.children.includes(version.id)) {
        parent.children.push(version.id);
      }
    }
  }

  getVersion(versionId: string): VersionSnapshot | null {
    const node = this.versionTree.get(versionId);
    return node ? node.version : null;
  }

  getAllVersions(): VersionSnapshot[] {
    return Array.from(this.versionTree.values())
      .map((n) => n.version)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getLastVersion(): VersionSnapshot | null {
    const versions = this.getAllVersions();
    return versions.length > 0 ? versions[0] : null;
  }

  getParentVersion(versionId: string): VersionSnapshot | null {
    const node = this.versionTree.get(versionId);
    if (!node || !node.parentId) return null;
    return this.getVersion(node.parentId);
  }

  getChildVersions(versionId: string): VersionSnapshot[] {
    const node = this.versionTree.get(versionId);
    if (!node) return [];
    return node.children
      .map((id) => this.getVersion(id))
      .filter((v): v is VersionSnapshot => v !== null);
  }

  private async loadImage(url: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!;
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageCache.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  private async getImageData(url: string): Promise<ImageData> {
    if (this.canvasCache.has(url)) {
      return this.canvasCache.get(url)!;
    }
    const img = await this.loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get canvas context');
    }
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.canvasCache.set(url, imageData);
    return imageData;
  }

  async compareVersions(
    versionAId: string,
    versionBId: string
  ): Promise<DiffResult> {
    const versionA = this.getVersion(versionAId);
    const versionB = this.getVersion(versionBId);

    if (!versionA || !versionB) {
      throw new Error('One or both versions not found');
    }

    const [dataA, dataB] = await Promise.all([
      this.getImageData(versionA.imageUrl),
      this.getImageData(versionB.imageUrl),
    ]);

    return this.compareImageData(dataA, dataB);
  }

  private compareImageData(dataA: ImageData, dataB: ImageData): DiffResult {
    const diffPixels: DiffPixel[] = [];
    const width = Math.min(dataA.width, dataB.width);
    const height = Math.min(dataA.height, dataB.height);
    const totalPixels = width * height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const rA = dataA.data[idx];
        const gA = dataA.data[idx + 1];
        const bA = dataA.data[idx + 2];
        const rB = dataB.data[idx];
        const gB = dataB.data[idx + 1];
        const bB = dataB.data[idx + 2];

        const diff = Math.abs(rA - rB) + Math.abs(gA - gB) + Math.abs(bA - bB);

        if (diff > THRESHOLD) {
          diffPixels.push({
            x,
            y,
            rgbDiff: {
              r: Math.abs(rA - rB),
              g: Math.abs(gA - gB),
              b: Math.abs(bA - bB),
            },
          });
        }
      }
    }

    return {
      diffPixels,
      totalDiffPixels: diffPixels.length,
      diffPercentage: (diffPixels.length / totalPixels) * 100,
    };
  }

  generateDiffOverlay(
    ctx: CanvasRenderingContext2D,
    diffResult: DiffResult,
    width: number,
    height: number
  ): void {
    const overlayData = ctx.createImageData(width, height);

    diffResult.diffPixels.forEach((pixel) => {
      if (pixel.x >= 0 && pixel.x < width && pixel.y >= 0 && pixel.y < height) {
        const idx = (pixel.y * width + pixel.x) * 4;
        overlayData.data[idx] = DIFF_COLOR.r;
        overlayData.data[idx + 1] = DIFF_COLOR.g;
        overlayData.data[idx + 2] = DIFF_COLOR.b;
        overlayData.data[idx + 3] = 100;
      }
    });

    ctx.putImageData(overlayData, 0, 0);
  }

  getDiffAtPosition(
    diffResult: DiffResult,
    x: number,
    y: number
  ): DiffPixel | null {
    return (
      diffResult.diffPixels.find(
        (p) => Math.abs(p.x - x) <= 2 && Math.abs(p.y - y) <= 2
      ) || null
    );
  }

  compareAnnotations(
    annA: Annotation[],
    annB: Annotation[]
  ): {
    added: Annotation[];
    removed: Annotation[];
    modified: Annotation[];
  } {
    const mapA = new Map(annA.map((a) => [a.id, a]));
    const mapB = new Map(annB.map((a) => [a.id, a]));

    const added: Annotation[] = [];
    const removed: Annotation[] = [];
    const modified: Annotation[] = [];

    for (const [id, ann] of mapB) {
      if (!mapA.has(id)) {
        added.push(ann);
      } else if (JSON.stringify(mapA.get(id)) !== JSON.stringify(ann)) {
        modified.push(ann);
      }
    }

    for (const [id, ann] of mapA) {
      if (!mapB.has(id)) {
        removed.push(ann);
      }
    }

    return { added, removed, modified };
  }

  clearCache(): void {
    this.imageCache.clear();
    this.canvasCache.clear();
  }

  exportComparisonImage(
    leftCanvas: HTMLCanvasElement,
    rightCanvas: HTMLCanvasElement,
    diffResult?: DiffResult
  ): string {
    const gap = 20;
    const labelHeight = 40;
    const width = leftCanvas.width + rightCanvas.width + gap;
    const height = Math.max(leftCanvas.height, rightCanvas.height) + labelHeight * 2;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d')!;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#e0e0e0';
    ctx.font = '16px sans-serif';
    ctx.fillText('版本 A', 10, 28);
    ctx.fillText('版本 B', leftCanvas.width + gap + 10, 28);

    ctx.drawImage(leftCanvas, 0, labelHeight);
    ctx.drawImage(rightCanvas, leftCanvas.width + gap, labelHeight);

    if (diffResult) {
      ctx.fillStyle = '#8e44ad';
      ctx.font = '14px sans-serif';
      const diffText = `差异像素: