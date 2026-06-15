import { saveAs } from 'file-saver';

const EXPORT_WIDTH = 1920;
const EXPORT_HEIGHT = 1440;
const WATERMARK_TEXT = 'Watercolor Pro';
const WATERMARK_FONT_SIZE = 12;
const WATERMARK_COLOR = '#9a9580';
const WATERMARK_OPACITY = 0.3;
const WATERMARK_MARGIN = 20;

export interface ExportOptions {
  width?: number;
  height?: number;
  includeWatermark?: boolean;
}

export const exportAsPNG = async (
  imageData: ImageData,
  options: ExportOptions = {}
): Promise<void> => {
  const {
    width = EXPORT_WIDTH,
    height = EXPORT_HEIGHT,
    includeWatermark = true
  } = options;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext('2d')!;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = imageData.width;
  srcCanvas.height = imageData.height;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(imageData, 0, 0);

  const srcAspect = imageData.width / imageData.height;
  const dstAspect = width / height;

  let drawWidth: number;
  let drawHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (srcAspect > dstAspect) {
    drawWidth = width;
    drawHeight = width / srcAspect;
    offsetX = 0;
    offsetY = (height - drawHeight) / 2;
  } else {
    drawHeight = height;
    drawWidth = height * srcAspect;
    offsetX = (width - drawWidth) / 2;
    offsetY = 0;
  }

  ctx.fillStyle = '#faf9f4';
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(srcCanvas, offsetX, offsetY, drawWidth, drawHeight);

  if (includeWatermark) {
    ctx.save();
    ctx.globalAlpha = WATERMARK_OPACITY;
    ctx.fillStyle = WATERMARK_COLOR;
    ctx.font = `${WATERMARK_FONT_SIZE}px Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(WATERMARK_TEXT, width - WATERMARK_MARGIN, height - WATERMARK_MARGIN);
    ctx.restore();
  }

  const timestamp = Date.now();
  const filename = `watercolor_${timestamp}.png`;

  return new Promise((resolve, reject) => {
    exportCanvas.toBlob(
      (blob) => {
        if (blob) {
          saveAs(blob, filename);
          resolve();
        } else {
          reject(new Error('Failed to create blob for export'));
        }
      },
      'image/png',
      1.0
    );
  });
};

export const generateFileName = (): string => {
  const timestamp = Date.now();
  return `watercolor_${timestamp}.png`;
};
