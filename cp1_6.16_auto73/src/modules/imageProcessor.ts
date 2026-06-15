import type { FilterType, CropData } from '../types';

export async function cropImage(
  imageSrc: string,
  cropData: CropData
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;

      canvas.width = cropData.width * scaleX;
      canvas.height = cropData.height * scaleY;

      ctx.drawImage(
        img,
        cropData.x * scaleX,
        cropData.y * scaleY,
        cropData.width * scaleX,
        cropData.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/png',
        1.0
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
}

export async function applyFilter(
  imageSrc: string,
  filterType: FilterType
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        switch (filterType) {
          case 'vintage': {
            const tr = 0.393 * r + 0.769 * g + 0.189 * b;
            const tg = 0.349 * r + 0.686 * g + 0.168 * b;
            const tb = 0.272 * r + 0.534 * g + 0.131 * b;
            r = Math.min(255, tr);
            g = Math.min(255, tg);
            b = Math.min(255, tb);
            r = r * 0.9 + 20;
            g = g * 0.85 + 10;
            b = b * 0.7;
            break;
          }
          case 'monochrome': {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const contrast = 1.2;
            const intercept = 128 * (1 - contrast);
            r = g = b = Math.min(255, Math.max(0, gray * contrast + intercept));
            break;
          }
          case 'cool': {
            r = r * 0.85;
            g = g * 0.95;
            b = Math.min(255, b * 1.2);
            break;
          }
          case 'warm': {
            r = Math.min(255, r * 1.2);
            g = g * 1.05;
            b = b * 0.85;
            break;
          }
          case 'film': {
            r = Math.min(255, r * 1.1 + 10);
            g = Math.min(255, g * 1.05 + 5);
            b = b * 0.95;
            const grain = (Math.random() - 0.5) * 20;
            r = Math.min(255, Math.max(0, r + grain));
            g = Math.min(255, Math.max(0, g + grain * 0.8));
            b = Math.min(255, Math.max(0, b + grain * 0.6));
            r = r * 0.97 + 8;
            g = g * 0.98 + 4;
            b = b * 0.96 + 2;
            break;
          }
          case 'none':
          default:
            break;
        }

        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/png',
        1.0
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
