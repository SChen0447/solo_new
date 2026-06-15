import {
  PixelMatrix,
  PIXEL_WIDTH,
  PIXEL_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  FRAME_COUNT,
} from './types';

// ========== 颜色工具 ==========

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 对颜色进行微变（限制在邻近色系，不超过20色阶）
 */
function nudgeColor(hex: string, seed: number): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);

  // 使用seed来控制方向，确保相同seed产生相同变化
  const r1 = (seed % 1000) / 1000;
  const r2 = ((seed >> 3) % 1000) / 1000;
  const r3 = ((seed >> 6) % 1000) / 1000;

  // 限制范围：H ±10°, S ±10%, L ±10% （约20色阶以内）
  const dh = (r1 - 0.5) * 20;
  const ds = (r2 - 0.5) * 20;
  const dl = (r3 - 0.5) * 20;

  let newH = h + dh;
  if (newH < 0) newH += 360;
  if (newH >= 360) newH -= 360;
  const newS = Math.max(0, Math.min(100, s + ds));
  const newL = Math.max(5, Math.min(95, l + dl));

  const [nr, ng, nb] = hslToRgb(newH, newS, newL);
  return rgbToHex(nr, ng, nb);
}

// ========== 点阵采样 ==========

/**
 * 将600x400手绘canvas缩放到96x64，读取像素并判定笔迹
 * 性能：对于500点内的笔迹，要求<200ms
 */
export function sampleCanvasToPixelMatrix(canvas: HTMLCanvasElement): PixelMatrix {
  // 创建离屏canvas缩放到目标尺寸
  const off = document.createElement('canvas');
  off.width = PIXEL_WIDTH;
  off.height = PIXEL_HEIGHT;
  const octx = off.getContext('2d', { willReadFrequently: true });
  if (!octx) {
    return createEmptyMatrix();
  }

  // 白色背景
  octx.fillStyle = '#ffffff';
  octx.fillRect(0, 0, PIXEL_WIDTH, PIXEL_HEIGHT);

  // 将源canvas按比例绘制，保持内容居中缩放
  // 源 600x400 -> 目标 96x64：源长宽比 1.5，目标 1.5，正好匹配
  // 但为了防止采样范围过大，按cover方式并保持比例
  const scale = Math.min(PIXEL_WIDTH / CANVAS_WIDTH, PIXEL_HEIGHT / CANVAS_HEIGHT);
  const dw = CANVAS_WIDTH * scale;
  const dh = CANVAS_HEIGHT * scale;
  const dx = (PIXEL_WIDTH - dw) / 2;
  const dy = (PIXEL_HEIGHT - dh) / 2;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(canvas, dx, dy, dw, dh);

  // 读取像素
  const imgData = octx.getImageData(0, 0, PIXEL_WIDTH, PIXEL_HEIGHT);
  const data = imgData.data;

  const matrix: PixelMatrix = new Array(PIXEL_HEIGHT);
  for (let y = 0; y < PIXEL_HEIGHT; y++) {
    matrix[y] = new Array(PIXEL_WIDTH).fill(null);
  }

  // 色差阈值：RGB与白色的差，加权取最大值>30判定有笔迹
  // 使用3x3邻域膨胀，确保连通
  const THRESHOLD = 28;
  const temp: (string | null)[][] = new Array(PIXEL_HEIGHT);
  for (let y = 0; y < PIXEL_HEIGHT; y++) {
    temp[y] = new Array(PIXEL_WIDTH).fill(null);
  }

  for (let y = 0; y < PIXEL_HEIGHT; y++) {
    for (let x = 0; x < PIXEL_WIDTH; x++) {
      const idx = (y * PIXEL_WIDTH + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a < 30) continue;
      // 与白色 (255,255,255) 的差异
      const dr = 255 - r;
      const dg = 255 - g;
      const db = 255 - b;
      const diff = Math.max(dr, dg, db);
      if (diff > THRESHOLD) {
        temp[y][x] = rgbToHex(r, g, b);
      }
    }
  }

  // 3x3膨胀（将有像素的点周围也标记），使线条更连续
  for (let y = 0; y < PIXEL_HEIGHT; y++) {
    for (let x = 0; x < PIXEL_WIDTH; x++) {
      if (temp[y][x]) {
        matrix[y][x] = temp[y][x];
        continue;
      }
      // 检查邻居
      let found: string | null = null;
      for (let dy = -1; dy <= 1 && !found; dy++) {
        for (let dx = -1; dx <= 1 && !found; dx++) {
          if (dx === 0 && dy === 0) continue;
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < PIXEL_HEIGHT && nx >= 0 && nx < PIXEL_WIDTH) {
            if (temp[ny][nx]) {
              // 只在距离1的格点且本身很接近时膨胀
              const idx = (y * PIXEL_WIDTH + x) * 4;
              const dr = 255 - data[idx];
              const dg = 255 - data[idx + 1];
              const db = 255 - data[idx + 2];
              const diff = Math.max(dr, dg, db);
              if (diff > THRESHOLD * 0.55) {
                found = temp[ny][nx];
              }
            }
          }
        }
      }
      if (found) {
        matrix[y][x] = found;
      }
    }
  }

  return matrix;
}

function createEmptyMatrix(): PixelMatrix {
  const m: PixelMatrix = new Array(PIXEL_HEIGHT);
  for (let y = 0; y < PIXEL_HEIGHT; y++) {
    m[y] = new Array(PIXEL_WIDTH).fill(null);
  }
  return m;
}

// ========== 随机噪声帧生成 ==========

/**
 * 基于首帧像素矩阵，生成36帧循环动画
 * 每帧让 5%-15% 的非空像素进行 颜色微变 或 位置偏移
 */
export function generateAnimationFrames(baseMatrix: PixelMatrix): PixelMatrix[] {
  const frames: PixelMatrix[] = new Array(FRAME_COUNT);

  // 深拷贝首帧
  frames[0] = cloneMatrix(baseMatrix);

  // 收集所有非空像素坐标
  type Px = { x: number; y: number; c: string };
  const collectPixels = (m: PixelMatrix): Px[] => {
    const list: Px[] = [];
    for (let y = 0; y < m.length; y++) {
      for (let x = 0; x < m[y].length; x++) {
        const c = m[y][x];
        if (c) list.push({ x, y, c });
      }
    }
    return list;
  };

  const dirs: Array<[number, number]> = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  // 逐帧生成 1..FRAME_COUNT-1
  for (let f = 1; f < FRAME_COUNT; f++) {
    const prev = frames[f - 1];
    const cur = cloneMatrix(prev);

    const pixels = collectPixels(prev);
    if (pixels.length === 0) {
      frames[f] = cur;
      continue;
    }

    // 5%-15% 比例
    const ratio = 0.05 + (pseudoRand(f * 97 + 13) * 0.1);
    const count = Math.max(1, Math.min(pixels.length, Math.round(pixels.length * ratio)));

    // Fisher-Yates 打乱取前count个
    const indices = pixels.map((_, i) => i);
    shuffleArray(indices, f * 131 + 7);

    for (let i = 0; i < count; i++) {
      const p = pixels[indices[i]];
      const r = pseudoRand(f * 53 + i * 17 + 3);

      // 55% 颜色微变, 35% 位置偏移, 10% 两者都做
      const doColor = r < 0.65;
      const doShift = r > 0.45;

      if (doColor) {
        const seed = f * 1000 + i * 31 + p.x * 7 + p.y * 11;
        const nc = nudgeColor(p.c, seed);
        if (nc) {
          cur[p.y][p.x] = nc;
        }
      }

      if (doShift) {
        const dirIdx = Math.floor(pseudoRand(f * 29 + i * 19 + p.x) * 4);
        const [dx, dy] = dirs[dirIdx];
        const nx = p.x + dx;
        const ny = p.y + dy;
        if (
          ny >= 0 &&
          ny < cur.length &&
          nx >= 0 &&
          nx < cur[0].length &&
          !cur[ny][nx] // 目标为空才移动（防止覆盖）
        ) {
          // 从原位取色，填入新位置，清除原位
          const color = cur[p.y][p.x];
          cur[p.y][p.x] = null;
          cur[ny][nx] = color;
        }
      }
    }

    frames[f] = cur;
  }

  // 使循环更平滑：后半段逐渐往首帧插值
  const startBlend = Math.floor(FRAME_COUNT * 0.7);
  for (let f = startBlend; f < FRAME_COUNT; f++) {
    const t = (f - startBlend) / (FRAME_COUNT - startBlend); // 0 -> 1
    frames[f] = blendMatrices(frames[f], baseMatrix, t * 0.55);
  }

  return frames;
}

function cloneMatrix(m: PixelMatrix): PixelMatrix {
  return m.map((row) => row.slice());
}

/**
 * 按 t (0..1) 把 A 往 B 插值混合
 */
function blendMatrices(a: PixelMatrix, b: PixelMatrix, t: number): PixelMatrix {
  const out = cloneMatrix(a);
  for (let y = 0; y < out.length; y++) {
    for (let x = 0; x < out[y].length; x++) {
      const ac = a[y][x];
      const bc = b[y][x];
      if (!ac && !bc) continue;
      if (ac && !bc) {
        // 只在A有，按概率消失
        if (pseudoRand(x * 13 + y * 29 + 1) < t * 0.7) {
          out[y][x] = null;
        }
      } else if (!ac && bc) {
        // 只在B有，按概率出现
        if (pseudoRand(x * 17 + y * 31 + 2) < t * 0.7) {
          out[y][x] = bc;
        }
      } else if (ac && bc) {
        // 都有，颜色往B插值
        if (t > 0.45) {
          out[y][x] = mixColor(ac, bc, (t - 0.35) * 1.6);
        }
      }
    }
  }
  return out;
}

function mixColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return a;
  const tt = Math.max(0, Math.min(1, t));
  return rgbToHex(
    ca[0] + (cb[0] - ca[0]) * tt,
    ca[1] + (cb[1] - ca[1]) * tt,
    ca[2] + (cb[2] - ca[2]) * tt,
  );
}

// 可重复的伪随机数 (0..1)，简单 xorshift 变体
function pseudoRand(seed: number): number {
  let x = (seed * 2654435761) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 0xffffffff;
}

function shuffleArray<T>(arr: T[], seed: number) {
  let s = seed || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
