// 简化版 GIF89a 编码器
// 96x64, 256色, LZW 压缩
// 支持多帧动画，每帧 delay 以 10ms 为单位

const LZW_MIN_CODE_SIZE = 8;
const MAX_COLORS = 256;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgbObj(hex: string): Rgb {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbDist(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

// NeuQuant 简化版：中位切分构建调色板
function buildPalette(colors: Rgb[]): Rgb[] {
  if (colors.length === 0) return [{ r: 255, g: 255, b: 255 }];
  if (colors.length <= MAX_COLORS) {
    // 确保有白色背景（第0位）
    const white: Rgb = { r: 255, g: 255, b: 255 };
    const hasWhite = colors.some(
      (c) => c.r === 255 && c.g === 255 && c.b === 255,
    );
    const result = hasWhite ? [...colors] : [white, ...colors];
    while (result.length < MAX_COLORS) result.push(white);
    return result.slice(0, MAX_COLORS);
  }

  // 中位切分
  interface Box {
    colors: Rgb[];
    rMin: number; rMax: number;
    gMin: number; gMax: number;
    bMin: number; bMax: number;
  }
  const makeBox = (arr: Rgb[]): Box => {
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    for (const c of arr) {
      if (c.r < rMin) rMin = c.r; if (c.r > rMax) rMax = c.r;
      if (c.g < gMin) gMin = c.g; if (c.g > gMax) gMax = c.g;
      if (c.b < bMin) bMin = c.b; if (c.b > bMax) bMax = c.b;
    }
    return { colors: arr, rMin, rMax, gMin, gMax, bMin, bMax };
  };
  const boxRange = (b: Box) =>
    Math.max(b.rMax - b.rMin, b.gMax - b.gMin, b.bMax - b.bMin);

  const boxes: Box[] = [makeBox(colors)];
  while (boxes.length < MAX_COLORS) {
    // 找范围最大的box
    let maxIdx = 0;
    let maxR = -1;
    for (let i = 0; i < boxes.length; i++) {
      const r = boxRange(boxes[i]);
      if (r > maxR) { maxR = r; maxIdx = i; }
    }
    if (maxR < 4) break;
    const box = boxes[maxIdx];
    if (box.colors.length < 2) break;
    // 按最长边排序
    const rangeR = box.rMax - box.rMin;
    const rangeG = box.gMax - box.gMin;
    const rangeB = box.bMax - box.bMin;
    let key: keyof Rgb = 'r';
    if (rangeG >= rangeR && rangeG >= rangeB) key = 'g';
    else if (rangeB >= rangeR) key = 'b';
    const sorted = [...box.colors].sort((a, b) => a[key] - b[key]);
    const mid = Math.floor(sorted.length / 2);
    const a = makeBox(sorted.slice(0, mid));
    const b = makeBox(sorted.slice(mid));
    boxes.splice(maxIdx, 1, a, b);
  }
  // 每个box取平均
  const palette: Rgb[] = [{ r: 255, g: 255, b: 255 }];
  for (const b of boxes) {
    if (b.colors.length === 0) continue;
    let sr = 0, sg = 0, sb = 0;
    for (const c of b.colors) { sr += c.r; sg += c.g; sb += c.b; }
    const n = b.colors.length;
    palette.push({
      r: Math.round(sr / n),
      g: Math.round(sg / n),
      b: Math.round(sb / n),
    });
  }
  while (palette.length < MAX_COLORS) {
    palette.push({ r: 255, g: 255, b: 255 });
  }
  return palette.slice(0, MAX_COLORS);
}

function nearestIndex(palette: Rgb[], c: Rgb): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = rgbDist(c, palette[i]);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// LZW 压缩输出到字节数组
function lzwEncode(
  indices: Uint8Array,
  minCodeSize: number,
): number[] {
  const output: number[] = [];
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let nextCode = eoiCode + 1;
  let codeSize = minCodeSize + 1;
  const MAX_CODE = 1 << 12;

  const dict = new Map<number, number>();
  const initDict = () => {
    dict.clear();
    for (let i = 0; i < clearCode; i++) dict.set(i, i);
    nextCode = eoiCode + 1;
    codeSize = minCodeSize + 1;
  };
  initDict();

  let bitBuf = 0;
  let bitCount = 0;

  const writeCode = (code: number) => {
    bitBuf |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      output.push(bitBuf & 0xff);
      bitBuf >>= 8;
      bitCount -= 8;
    }
  };

  writeCode(clearCode);
  let w: number | null = null;
  for (let i = 0; i < indices.length; i++) {
    const k = indices[i];
    const key = w === null ? k : (w << 12) + k + 1;
    if (dict.has(key)) {
      w = dict.get(key)!;
    } else {
      if (w !== null) writeCode(w);
      if (nextCode < MAX_CODE) {
        dict.set(key, nextCode++);
        if (nextCode === 1 << codeSize && codeSize < 12) codeSize++;
      } else {
        writeCode(clearCode);
        initDict();
      }
      w = k;
    }
  }
  if (w !== null) writeCode(w);
  writeCode(eoiCode);
  if (bitCount > 0) output.push(bitBuf & 0xff);

  return output;
}

function writeSubBlocks(data: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < data.length; i += 255) {
    const chunk = data.slice(i, i + 255);
    out.push(chunk.length);
    out.push(...chunk);
  }
  out.push(0);
  return out;
}

// ========== 对外 API ==========

export interface GifFrame {
  matrix: (string | null)[][];
  delayCentiseconds: number; // 1/100秒 单位，GIF规范
}

/**
 * 编码多帧动画GIF
 * @param frames 帧数据
 * @param width 宽
 * @param height 高
 * @param backgroundColor 背景色 默认白
 * @returns Uint8Array GIF 二进制
 */
export function encodeAnimatedGif(
  frames: GifFrame[],
  width: number,
  height: number,
  backgroundColor: string = '#ffffff',
): Uint8Array {
  if (frames.length === 0) throw new Error('No frames');

  const bgRgb = hexToRgbObj(backgroundColor);

  // 1. 收集所有出现的颜色
  const allColors: Rgb[] = [];
  const seen = new Set<string>();
  const addColor = (c: Rgb) => {
    const key = `${c.r},${c.g},${c.b}`;
    if (!seen.has(key)) { seen.add(key); allColors.push(c); }
  };
  addColor(bgRgb);
  for (const f of frames) {
    for (const row of f.matrix) {
      for (const c of row) {
        if (c) addColor(hexToRgbObj(c));
      }
    }
  }

  // 2. 构建调色板（固定256）
  const palette = buildPalette(allColors);

  // 写 GIF89a Header
  const bytes: number[] = [];
  const writeBytes = (arr: ArrayLike<number>) => {
    for (let i = 0; i < arr.length; i++) bytes.push(arr[i] as number);
  };
  const writeU16 = (v: number) => {
    bytes.push(v & 0xff);
    bytes.push((v >> 8) & 0xff);
  };
  const writeStr = (s: string) => {
    for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i) & 0xff);
  };

  writeStr('GIF89a');
  writeU16(width);
  writeU16(height);
  // Logical Screen Descriptor packed fields:
  // Global Color Table = 1, Color Resolution = 7(8bit), Sort = 0, Size of GCT = 7 (2^8=256)
  bytes.push(0xf7);
  bytes.push(0); // background color index (white = 0)
  bytes.push(0); // pixel aspect ratio (0 = default)

  // Global Color Table (256 * 3)
  for (let i = 0; i < MAX_COLORS; i++) {
    const c = palette[i] || { r: 255, g: 255, b: 255 };
    bytes.push(c.r); bytes.push(c.g); bytes.push(c.b);
  }

  // Application Extension (NETSCAPE2.0) for loop
  const netscape = [
    0x21, 0xff, 0x0b,
    ...'NETSCAPE2.0'.split('').map((c) => c.charCodeAt(0)),
    0x03, 0x01, 0x00, 0x00, // loop 无限
    0x00,
  ];
  writeBytes(netscape);

  // 逐帧写入
  for (const f of frames) {
    // Graphics Control Extension
    // Disposal method = 2 (restore to background), user input=0, transparent=0, delay=...
    const delay = Math.max(2, Math.round(f.delayCentiseconds));
    const gce = [
      0x21, 0xf9, 0x04,
      0x04, // disposal=2, no transparency
      delay & 0xff, (delay >> 8) & 0xff,
      0x00, // transparent color index
      0x00, // block terminator
    ];
    writeBytes(gce);

    // Image Descriptor
    bytes.push(0x2c); // image separator
    writeU16(0); // left
    writeU16(0); // top
    writeU16(width);
    writeU16(height);
    bytes.push(0x00); // no local color table, interlace=0

    // 索引化图像
    const indices = new Uint8Array(width * height);
    let pix = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const c = f.matrix[y]?.[x];
        const rgb = c ? hexToRgbObj(c) : bgRgb;
        indices[pix++] = nearestIndex(palette, rgb);
      }
    }

    // LZW Minimum Code Size
    bytes.push(LZW_MIN_CODE_SIZE);

    // LZW 编码 + sub-blocks
    const lzw = lzwEncode(indices, LZW_MIN_CODE_SIZE);
    writeBytes(writeSubBlocks(lzw));
  }

  // Trailer
  bytes.push(0x3b);

  return new Uint8Array(bytes);
}

export function downloadUint8As(data: Uint8Array, filename: string) {
  const blob = new Blob([data], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}
