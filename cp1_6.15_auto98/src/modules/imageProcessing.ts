export interface EdgeDetectionResult {
  edgePixels: boolean[][];
  width: number;
  height: number;
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('文件大小不能超过8MB'));
      return;
    }
    if (!/\.(jpg|jpeg|png)$/i.test(file.name)) {
      reject(new Error('只支持JPG/PNG格式'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export function imageToGrayscale(imageData: ImageData): number[][] {
  const { width, height, data } = imageData;
  const grayscale: number[][] = [];
  for (let y = 0; y < height; y++) {
    grayscale[y] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      grayscale[y][x] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
  }
  return grayscale;
}

function gaussianBlur(grayscale: number[][], sigma: number = 1.4): number[][] {
  const height = grayscale.length;
  const width = grayscale[0].length;
  const size = Math.floor(sigma * 3) * 2 + 1;
  const half = Math.floor(size / 2);
  const kernel: number[][] = [];
  let sum = 0;

  for (let i = 0; i < size; i++) {
    kernel[i] = [];
    for (let j = 0; j < size; j++) {
      const x = i - half;
      const y = j - half;
      const val = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      kernel[i][j] = val;
      sum += val;
    }
  }
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      kernel[i][j] /= sum;
    }
  }

  const result: number[][] = [];
  for (let y = 0; y < height; y++) {
    result[y] = [];
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const px = Math.min(Math.max(x + j - half, 0), width - 1);
          const py = Math.min(Math.max(y + i - half, 0), height - 1);
          val += grayscale[py][px] * kernel[i][j];
        }
      }
      result[y][x] = val;
    }
  }
  return result;
}

function sobelEdgeDetect(grayscale: number[][]): { magnitude: number[][]; direction: number[][] } {
  const height = grayscale.length;
  const width = grayscale[0].length;
  const gx: number[][] = [];
  const gy: number[][] = [];
  const magnitude: number[][] = [];
  const direction: number[][] = [];

  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

  for (let y = 0; y < height; y++) {
    gx[y] = new Array(width).fill(0);
    gy[y] = new Array(width).fill(0);
    magnitude[y] = new Array(width).fill(0);
    direction[y] = new Array(width).fill(0);

    for (let x = 0; x < width; x++) {
      let sumX = 0, sumY = 0;
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const px = Math.min(Math.max(x + j, 0), width - 1);
          const py = Math.min(Math.max(y + i, 0), height - 1);
          sumX += grayscale[py][px] * sobelX[i + 1][j + 1];
          sumY += grayscale[py][px] * sobelY[i + 1][j + 1];
        }
      }
      gx[y][x] = sumX;
      gy[y][x] = sumY;
      magnitude[y][x] = Math.sqrt(sumX * sumX + sumY * sumY);
      direction[y][x] = Math.atan2(sumY, sumX);
    }
  }
  return { magnitude, direction };
}

function nonMaximumSuppression(magnitude: number[][], direction: number[][]): number[][] {
  const height = magnitude.length;
  const width = magnitude[0].length;
  const result: number[][] = [];

  for (let y = 0; y < height; y++) {
    result[y] = [];
    for (let x = 0; x < width; x++) {
      let angle = direction[y][x] * 180 / Math.PI;
      if (angle < 0) angle += 180;
      angle = Math.round(angle / 45) * 45;

      const m = magnitude[y][x];
      let q = 255, r = 255;

      if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        if (angle === 0 || angle === 180) {
          q = magnitude[y][x + 1];
          r = magnitude[y][x - 1];
        } else if (angle === 45) {
          q = magnitude[y + 1][x - 1];
          r = magnitude[y - 1][x + 1];
        } else if (angle === 90) {
          q = magnitude[y + 1][x];
          r = magnitude[y - 1][x];
        } else if (angle === 135) {
          q = magnitude[y - 1][x - 1];
          r = magnitude[y + 1][x + 1];
        }
      }
      result[y][x] = (m >= q && m >= r) ? m : 0;
    }
  }
  return result;
}

function doubleThreshold(nms: number[][], lowThresh: number, highThresh: number): boolean[][] {
  const height = nms.length;
  const width = nms[0].length;
  const result: boolean[][] = [];
  const strong = 255, weak = 50;

  for (let y = 0; y < height; y++) {
    result[y] = [];
    for (let x = 0; x < width; x++) {
      const v = nms[y][x];
      if (v >= highThresh) {
        result[y][x] = true;
      } else if (v >= lowThresh) {
        result[y][x] = false;
        let connected = false;
        for (let i = -1; i <= 1 && !connected; i++) {
          for (let j = -1; j <= 1 && !connected; j++) {
            const px = x + j, py = y + i;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              if (nms[py][px] >= highThresh) connected = true;
            }
          }
        }
        if (connected) result[y][x] = true;
      } else {
        result[y][x] = false;
      }
    }
  }
  return result;
}

export function cannyEdgeDetection(
  imageData: ImageData,
  lowThreshold: number = 50,
  highThreshold: number = 100
): EdgeDetectionResult {
  const { width, height } = imageData;
  const grayscale = imageToGrayscale(imageData);
  const blurred = gaussianBlur(grayscale, 1.4);
  const { magnitude, direction } = sobelEdgeDetect(blurred);
  const nms = nonMaximumSuppression(magnitude, direction);
  const edgePixels = doubleThreshold(nms, lowThreshold, highThreshold);
  return { edgePixels, width, height };
}

export function edgesToImageData(
  edges: EdgeDetectionResult,
  color: string = '#00e5ff',
  lineWidth: number = 2
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = edges.width;
  canvas.height = edges.height;
  const ctx = canvas.getContext('2d')!;

  const imageData = ctx.createImageData(edges.width, edges.height);
  const data = imageData.data;

  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const halfW = Math.floor(lineWidth / 2);

  for (let y = 0; y < edges.height; y++) {
    for (let x = 0; x < edges.width; x++) {
      if (edges.edgePixels[y][x]) {
        for (let dy = -halfW; dy <= halfW; dy++) {
          for (let dx = -halfW; dx <= halfW; dx++) {
            const px = x + dx, py = y + dy;
            if (px >= 0 && px < edges.width && py >= 0 && py < edges.height) {
              const i = (py * edges.width + px) * 4;
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
              data[i + 3] = 255;
            }
          }
        }
      }
    }
  }
  return imageData;
}
