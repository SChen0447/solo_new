import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { CanvasComponent, ExportSize, TextComponent, ImageComponent, RectComponent, CircleComponent } from '../types';
import { loadImage, sleep } from './helpers';

interface ExportOptions {
  components: CanvasComponent[];
  baseWidth: number;
  baseHeight: number;
  sizes: ExportSize[];
  format?: 'png' | 'jpeg';
  quality?: number;
  onProgress?: (progress: number, currentSize?: string) => void;
  filename?: string;
}

interface OffscreenCanvasPool {
  get: (w: number, h: number) => HTMLCanvasElement;
  release: () => void;
}

const createCanvasPool = (): OffscreenCanvasPool => {
  let canvas: HTMLCanvasElement | null = null;

  return {
    get(w: number, h: number): HTMLCanvasElement {
      if (!canvas) {
        canvas = document.createElement('canvas');
      }
      canvas.width = w;
      canvas.height = h;
      return canvas;
    },
    release() {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    },
  };
};

const parseColor = (color: string): string => {
  if (color === 'transparent' || !color) return 'transparent';
  return color;
};

const drawRect = (ctx: CanvasRenderingContext2D, comp: RectComponent, scale: number) => {
  const x = comp.x * scale;
  const y = comp.y * scale;
  const w = comp.width * scale;
  const h = comp.height * scale;
  const r = comp.borderRadius * scale;

  ctx.save();
  ctx.globalAlpha = comp.opacity;

  if (comp.rotation) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((comp.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  const fill = parseColor(comp.fill);
  if (fill !== 'transparent') {
    ctx.fillStyle = fill;
    if (r > 0) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(x, y, w, h);
    }
  }

  const stroke = parseColor(comp.stroke);
  if (stroke !== 'transparent' && comp.strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = comp.strokeWidth * scale;
    if (r > 0) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(x, y, w, h);
    }
  }

  ctx.restore();
};

const drawCircle = (ctx: CanvasRenderingContext2D, comp: CircleComponent, scale: number) => {
  const cx = (comp.x + comp.width / 2) * scale;
  const cy = (comp.y + comp.height / 2) * scale;
  const rx = (comp.width / 2) * scale;
  const ry = (comp.height / 2) * scale;

  ctx.save();
  ctx.globalAlpha = comp.opacity;

  if (comp.rotation) {
    ctx.translate(cx, cy);
    ctx.rotate((comp.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  const fill = parseColor(comp.fill);
  if (fill !== 'transparent') {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const stroke = parseColor(comp.stroke);
  if (stroke !== 'transparent' && comp.strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = comp.strokeWidth * scale;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
};

const drawText = async (
  ctx: CanvasRenderingContext2D,
  comp: TextComponent,
  scale: number,
  loadedImages: Map<string, HTMLImageElement>
) => {
  const x = comp.x * scale;
  const y = comp.y * scale;
  const w = comp.width * scale;
  const h = comp.height * scale;

  ctx.save();
  ctx.globalAlpha = comp.opacity;

  const cx = x + w / 2;
  const cy = y + h / 2;
  if (comp.rotation) {
    ctx.translate(cx, cy);
    ctx.rotate((comp.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  const bg = parseColor(comp.backgroundColor);
  if (bg !== 'transparent') {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
  }

  const fontSize = comp.fontSize * scale;
  const fontWeight = comp.fontWeight === 'bold' ? '700' : '400';
  const fontStyle = comp.fontStyle === 'italic' ? 'italic' : 'normal';
  const font = `${fontStyle} ${fontWeight} ${fontSize}px "${comp.fontFamily}", sans-serif`;

  ctx.font = font;
  ctx.fillStyle = parseColor(comp.color);
  ctx.textBaseline = 'top';

  let align: CanvasTextAlign = 'left';
  if (comp.textAlign === 'center') align = 'center';
  else if (comp.textAlign === 'right') align = 'right';
  ctx.textAlign = align;

  if (comp.textDecoration === 'underline') {
    // underline will be drawn per line
  }

  const lineHeightPx = fontSize * comp.lineHeight;
  const lines = comp.content.split('\n');

  let textX = x;
  if (align === 'center') textX = x + w / 2;
  else if (align === 'right') textX = x + w;

  const totalTextHeight = lines.length * lineHeightPx;
  let startY = y + (h - totalTextHeight) / 2;

  for (let i = 0; i < lines.length; i++) {
    const lineY = startY + i * lineHeightPx;
    ctx.fillText(lines[i], textX, lineY);

    if (comp.textDecoration === 'underline') {
      const metrics = ctx.measureText(lines[i]);
      let underlineX = textX;
      if (align === 'center') underlineX = textX - metrics.width / 2;
      else if (align === 'right') underlineX = textX - metrics.width;
      ctx.strokeStyle = parseColor(comp.color);
      ctx.lineWidth = Math.max(1, fontSize * 0.05);
      ctx.beginPath();
      ctx.moveTo(underlineX, lineY + fontSize * 1.05);
      ctx.lineTo(underlineX + metrics.width, lineY + fontSize * 1.05);
      ctx.stroke();
    }
  }

  ctx.restore();
  void loadedImages;
};

const drawImage = async (
  ctx: CanvasRenderingContext2D,
  comp: ImageComponent,
  scale: number,
  loadedImages: Map<string, HTMLImageElement>
) => {
  let img = loadedImages.get(comp.src);
  if (!img) {
    try {
      img = await loadImage(comp.src);
      loadedImages.set(comp.src, img);
    } catch {
      ctx.save();
      ctx.globalAlpha = comp.opacity;
      ctx.fillStyle = '#EEEEEE';
      ctx.fillRect(comp.x * scale, comp.y * scale, comp.width * scale, comp.height * scale);
      ctx.fillStyle = '#999999';
      ctx.font = `${14 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        '图片加载失败',
        (comp.x + comp.width / 2) * scale,
        (comp.y + comp.height / 2) * scale
      );
      ctx.restore();
      return;
    }
  }

  ctx.save();
  ctx.globalAlpha = comp.opacity;

  const cx = (comp.x + comp.width / 2) * scale;
  const cy = (comp.y + comp.height / 2) * scale;
  if (comp.rotation) {
    ctx.translate(cx, cy);
    ctx.rotate((comp.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  ctx.drawImage(
    img,
    comp.x * scale,
    comp.y * scale,
    comp.width * scale,
    comp.height * scale
  );

  ctx.restore();
};

const renderToCanvas = async (
  canvas: HTMLCanvasElement,
  components: CanvasComponent[],
  baseWidth: number,
  baseHeight: number,
  targetWidth: number,
  targetHeight: number,
  loadedImages: Map<string, HTMLImageElement>
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const scaleX = targetWidth / baseWidth;
  const scaleY = targetHeight / baseHeight;
  const scale = Math.min(scaleX, scaleY);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const offsetX = (targetWidth - baseWidth * scale) / 2;
  const offsetY = (targetHeight - baseHeight * scale) / 2;

  ctx.save();
  ctx.translate(offsetX, offsetY);

  const sorted = [...components].filter((c) => c.visible).sort((a, b) => a.zIndex - b.zIndex);

  const tileSize = 512;
  const tilesX = Math.ceil(targetWidth / tileSize);
  const tilesY = Math.ceil(targetHeight / tileSize);

  for (let tx = 0; tx < tilesX; tx++) {
    for (let ty = 0; ty < tilesY; ty++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }

  for (const comp of sorted) {
    switch (comp.type) {
      case 'rect':
        drawRect(ctx, comp, scale);
        break;
      case 'circle':
        drawCircle(ctx, comp, scale);
        break;
      case 'text':
        await drawText(ctx, comp, scale, loadedImages);
        break;
      case 'image':
        await drawImage(ctx, comp, scale, loadedImages);
        break;
    }
  }

  ctx.restore();
};

const canvasToBlob = (canvas: HTMLCanvasElement, format: 'png' | 'jpeg' = 'png', quality = 0.92): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert canvas to blob'));
      },
      format === 'jpeg' ? 'image/jpeg' : 'image/png',
      quality
    );
  });
};

export const exportPoster = async (options: ExportOptions): Promise<void> => {
  const {
    components,
    baseWidth,
    baseHeight,
    sizes,
    format = 'png',
    quality = 0.92,
    onProgress,
    filename = 'posters',
  } = options;

  const selectedSizes = sizes.filter((s) => s.selected);
  if (selectedSizes.length === 0) {
    throw new Error('请至少选择一个导出尺寸');
  }

  const pool = createCanvasPool();
  const zip = new JSZip();
  const loadedImages = new Map<string, HTMLImageElement>();
  const totalSteps = selectedSizes.length;

  try {
    for (let i = 0; i < selectedSizes.length; i++) {
      const size = selectedSizes[i];
      const progressStart = (i / totalSteps) * 100;

      onProgress?.(progressStart, `${size.width}×${size.height}`);

      await sleep(300);

      const canvas = pool.get(size.width, size.height);

      await renderToCanvas(
        canvas,
        components,
        baseWidth,
        baseHeight,
        size.width,
        size.height,
        loadedImages
      );

      await sleep(200);

      const blob = await canvasToBlob(canvas, format, quality);
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      zip.file(`${filename}_${size.width}x${size.height}.${ext}`, blob);

      const progressEnd = ((i + 1) / totalSteps) * 100;
      onProgress?.(progressEnd, `${size.width}×${size.height}`);

      pool.release();
    }

    onProgress?.(95, '正在打包...');

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    onProgress?.(100, '完成');

    saveAs(zipBlob, `${filename}.zip`);
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  } finally {
    pool.release();
  }
};

export const renderSinglePoster = async (
  components: CanvasComponent[],
  baseWidth: number,
  baseHeight: number,
  targetWidth: number,
  targetHeight: number,
  format: 'png' | 'jpeg' = 'png',
  quality = 0.92
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const loadedImages = new Map<string, HTMLImageElement>();
  await renderToCanvas(canvas, components, baseWidth, baseHeight, targetWidth, targetHeight, loadedImages);

  return canvasToBlob(canvas, format, quality);
};
