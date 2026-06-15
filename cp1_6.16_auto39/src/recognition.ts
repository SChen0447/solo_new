import { FurnitureType, RecognitionResult } from './types';
import { eventBus, Events } from './eventBus';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

function generateId(): string {
  return `furniture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getRandomFurnitureType(): FurnitureType {
  const types = Object.values(FurnitureType);
  return types[Math.floor(Math.random() * types.length)];
}

function getRandomConfidence(): number {
  return Math.floor(Math.random() * 30) + 70;
}

function getImageUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class RecognitionService {
  private isProcessing: boolean = false;

  constructor() {
    eventBus.on(Events.IMAGE_UPLOAD, this.handleImageUpload.bind(this));
  }

  private validateFile(file: File): { valid: boolean; error?: string } {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: '不支持的图片格式，仅支持 JPG、PNG、WEBP' };
    }
    if (file.size > MAX_SIZE) {
      return { valid: false, error: '图片大小超过限制（最大 5MB）' };
    }
    return { valid: true };
  }

  private async simulateProgress(duration: number): Promise<void> {
    const startTime = Date.now();
    const interval = 100;

    return new Promise((resolve) => {
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 95);
        eventBus.emit(Events.RECOGNITION_PROGRESS, progress);

        if (elapsed >= duration) {
          clearInterval(timer);
          eventBus.emit(Events.RECOGNITION_PROGRESS, 100);
          resolve();
        }
      }, interval);
    });
  }

  private async handleImageUpload(file: File): Promise<void> {
    if (this.isProcessing) {
      eventBus.emit(Events.RECOGNITION_ERROR, '正在处理中，请稍候...');
      return;
    }

    const validation = this.validateFile(file);
    if (!validation.valid) {
      eventBus.emit(Events.RECOGNITION_ERROR, validation.error);
      return;
    }

    this.isProcessing = true;
    eventBus.emit(Events.RECOGNITION_START);

    try {
      const imageUrl = await getImageUrl(file);
      const duration = 2000 + Math.random() * 1000;
      await this.simulateProgress(duration);

      const result: RecognitionResult = {
        id: generateId(),
        type: getRandomFurnitureType(),
        confidence: getRandomConfidence(),
        imageUrl,
      };

      await delay(200);
      eventBus.emit(Events.RECOGNITION_COMPLETE, result);
    } catch (error) {
      eventBus.emit(Events.RECOGNITION_ERROR, '图片处理失败，请重试');
    } finally {
      this.isProcessing = false;
    }
  }
}

export const recognitionService = new RecognitionService();
