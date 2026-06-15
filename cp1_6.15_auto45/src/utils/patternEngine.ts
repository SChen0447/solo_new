export type ShapeType =
  | 'circle'
  | 'triangle'
  | 'hexagon'
  | 'spiral'
  | 'diamond'
  | 'ripple'
  | 'star'
  | 'irregularPolygon'
  | 'cross'
  | 'arc'
  | 'parallelogram'
  | 'pentagon'
  | 'semicircle'
  | 'zigzag'
  | 'petal';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface PatternItem {
  id: string;
  text: string;
  shape: ShapeType;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color1: string;
  color2: string;
  sentiment: Sentiment;
}

export interface GenerateOptions {
  density: number;
  contrast: number;
  hueShift: number;
}

const SHAPE_TYPES: ShapeType[] = [
  'circle', 'triangle', 'hexagon', 'spiral', 'diamond',
  'ripple', 'star', 'irregularPolygon', 'cross', 'arc',
  'parallelogram', 'pentagon', 'semicircle', 'zigzag', 'petal',
];

const POSITIVE_WORDS = [
  '爱', '美', '光', '梦', '喜', '乐', '福', '春', '花', '星',
  '月', '阳', '暖', '甜', '笑', '舞', '飞', '翔', '辉', '灿',
  'hope', 'love', 'light', 'dream', 'joy', 'happy', 'bright', 'warm',
  'sun', 'moon', 'star', 'bloom', 'smile', 'dance', 'fly', 'glow',
  'peace', 'freedom', 'kind', 'sweet', 'grace', 'bliss',
];

const NEGATIVE_WORDS = [
  '悲', '愁', '苦', '泪', '寒', '暗', '孤', '哀', '伤', '灭',
  '冷', '灰', '亡', '痛', '离', '恨', '怒', '惧', '沉', '寂',
  'sad', 'dark', 'cold', 'pain', 'fear', 'hate', 'lost', 'cry',
  'grief', 'sorrow', 'alone', 'death', 'despair', 'gloom', 'angry',
  'broken', 'shadow', 'storm', 'rain', 'fade',
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function analyzeSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();
  let score = 0;
  for (const w of POSITIVE_WORDS) {
    if (lower.includes(w)) score += 1;
  }
  for (const w of NEGATIVE_WORDS) {
    if (lower.includes(w)) score -= 1;
  }
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

function matchShape(text: string, index: number): ShapeType {
  const hash = hashCode(text);
  return SHAPE_TYPES[(hash + index) % SHAPE_TYPES.length];
}

function sentimentColors(sentiment: Sentiment, hueShift: number): [string, string] {
  const h = (base: number) => ((base + hueShift) % 360 + 360) % 360;
  switch (sentiment) {
    case 'positive': {
      const h1 = h(30);
      const h2 = h(50);
      return [`hsl(${h1}, 80%, 60%)`, `hsl(${h2}, 90%, 70%)`];
    }
    case 'negative': {
      const h1 = h(220);
      const h2 = h(240);
      return [`hsl(${h1}, 20%, 45%)`, `hsl(${h2}, 15%, 55%)`];
    }
    default: {
      const h1 = h(200);
      const h2 = h(220);
      return [`hsl(${h1}, 60%, 55%)`, `hsl(${h2}, 50%, 65%)`];
    }
  }
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function computeLayout(
  count: number,
  canvasWidth: number,
  canvasHeight: number,
  density: number,
  rand: () => number
): { x: number; y: number; size: number; rotation: number }[] {
  const items: { x: number; y: number; size: number; rotation: number }[] = [];
  const baseSize = 55 * density;
  const rowHeight = baseSize + 10;
  const colSpacing = baseSize * 0.8;
  const cols = Math.max(1, Math.floor((canvasWidth - 40) / colSpacing));
  const totalRows = Math.ceil(count / cols);
  const totalHeight = totalRows * rowHeight;
  const offsetY = Math.max(20, (canvasHeight - totalHeight) / 2);

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const size = 30 + rand() * 50;
    const jitterX = (rand() - 0.5) * (8 + rand() * 7);
    const jitterY = (rand() - 0.5) * 10;
    const totalWidth = cols * colSpacing;
    const offsetX = (canvasWidth - totalWidth) / 2;
    const x = offsetX + col * colSpacing + colSpacing / 2 + jitterX;
    const y = offsetY + row * rowHeight + rowHeight / 2 + jitterY;
    const rotation = Math.floor(rand() * 24) * 15;
    items.push({ x, y, size, rotation });
  }
  return items;
}

export function generatePatterns(
  units: string[],
  canvasWidth: number,
  canvasHeight: number,
  options: GenerateOptions
): PatternItem[] {
  const rand = seededRandom(units.join('').length > 0 ? hashCode(units.join('')) : 42);
  const layouts = computeLayout(units.length, canvasWidth, canvasHeight, options.density, rand);

  return units.map((text, i) => {
    const sentiment = analyzeSentiment(text);
    const shape = matchShape(text, i);
    const [color1, color2] = sentimentColors(sentiment, options.hueShift);
    const layout = layouts[i] || { x: canvasWidth / 2, y: canvasHeight / 2, size: 55, rotation: 0 };
    return {
      id: `pattern-${i}-${hashCode(text)}`,
      text,
      shape,
      x: layout.x,
      y: layout.y,
      size: layout.size,
      rotation: layout.rotation,
      color1,
      color2,
      sentiment,
    };
  });
}

export function randomizeLayout(
  patterns: PatternItem[],
  count: number = 4
): PatternItem[] {
  const indices = new Set<number>();
  while (indices.size < Math.min(count, patterns.length)) {
    indices.add(Math.floor(Math.random() * patterns.length));
  }
  return patterns.map((p, i) => {
    if (!indices.has(i)) return p;
    const dx = (Math.random() - 0.5) * 30;
    const dy = (Math.random() - 0.5) * 30;
    const sizeDelta = (Math.random() - 0.5) * 20;
    const rotDelta = (Math.random() > 0.5 ? 1 : -1) * 15;
    return {
      ...p,
      x: p.x + dx,
      y: p.y + dy,
      size: Math.max(30, Math.min(80, p.size + sizeDelta)),
      rotation: p.rotation + rotDelta,
    };
  });
}

export const ALL_SHAPE_TYPES = SHAPE_TYPES;
