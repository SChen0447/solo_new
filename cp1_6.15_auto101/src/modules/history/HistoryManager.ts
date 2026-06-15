import { HistoryItem, WatercolorParams, BrushStroke } from '../../store/useStore';

const MAX_HISTORY = 10;
const THUMB_WIDTH = 70;
const THUMB_HEIGHT = 55;

export const generateThumbnail = (imageData: ImageData): string => {
  const canvas = document.createElement('canvas');
  canvas.width = THUMB_WIDTH;
  canvas.height = THUMB_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);

  ctx.drawImage(tempCanvas, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
  return canvas.toDataURL('image/png');
};

export const createHistoryItem = (
  imageData: ImageData,
  originalImageData: ImageData,
  params: WatercolorParams,
  brushStrokes: BrushStroke[]
): HistoryItem => {
  return {
    id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    thumbnail: generateThumbnail(imageData),
    params: { ...params },
    imageData: new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    ),
    originalImageData: new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    ),
    brushStrokes: [...brushStrokes],
    timestamp: Date.now()
  };
};

export const addToHistory = (
  history: HistoryItem[],
  item: HistoryItem
): HistoryItem[] => {
  const newHistory = [item, ...history];
  if (newHistory.length > MAX_HISTORY) {
    return newHistory.slice(0, MAX_HISTORY);
  }
  return newHistory;
};

export const getHistoryItem = (
  history: HistoryItem[],
  id: string
): HistoryItem | null => {
  return history.find((item) => item.id === id) || null;
};

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};
