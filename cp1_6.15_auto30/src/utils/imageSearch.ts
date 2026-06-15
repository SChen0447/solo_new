import { v4 as uuidv4 } from 'uuid';
import type { ImageTag } from '../stores/appStore';

const STOP_WORDS = ['的', '了', '是', '在', '我', '你', '他', '她', '它', '们', '着', '过', '不', '也', '都', '就', '和', '与', '及', '或', '而', '之', '乎', '者', '也', '矣', '焉', '哉', '啊', '呀', '吧', '呢', '吗', '罢了'];

const IMAGE_KEYWORDS: Record<string, string[]> = {
  山水: ['mountain', 'nature', 'landscape', 'scenic', 'valley', 'peak'],
  月亮: ['moon', 'night', 'lunar', 'moonlight', 'starry', 'nightsky'],
  太阳: ['sun', 'sunrise', 'sunset', 'sunlight', 'goldenhour'],
  花: ['flower', 'floral', 'blossom', 'garden', 'botanical'],
  水: ['water', 'ocean', 'lake', 'river', 'waterfall'],
  云: ['cloud', 'sky', 'clouds', 'overcast', 'atmospheric'],
  风: ['wind', 'breeze', 'windy', 'swaying', 'movement'],
  雪: ['snow', 'winter', 'snowy', 'frost', 'ice'],
  雨: ['rain', 'rainy', 'rainfall', 'umbrella', 'storm'],
  夜: ['night', 'dark', 'stars', 'moon', 'evening'],
  春: ['spring', 'bloom', 'green', 'fresh', 'nature'],
  秋: ['autumn', 'fall', 'leaves', 'golden', 'fallfoliage'],
  树: ['tree', 'forest', 'woods', 'forest', 'woodland'],
  海: ['ocean', 'sea', 'beach', 'coast', 'waves'],
  山: ['mountain', 'peak', 'cliff', 'alpine', 'summit'],
  鸟: ['bird', 'feather', 'avian', 'flight', 'sky'],
  梦: ['dream', 'abstract', 'dreamy', 'ethereal', 'surreal'],
  诗: ['poetry', 'art', 'creative', 'inspiration', 'literary'],
  酒: ['wine', 'drink', 'glass', 'celebration', 'elegant'],
  剑: ['sword', 'blade', 'metal', 'warrior', 'ancient'],
  书: ['book', 'reading', 'literature', 'library', 'knowledge'],
  琴: ['music', 'instrument', 'melody', 'piano', 'musical'],
  棋: ['chess', 'strategy', 'boardgame', 'pieces', 'intellectual'],
  画: ['painting', 'art', 'canvas', 'brushstroke', 'artistic'],
  桥: ['bridge', 'architecture', 'structure', 'connection', 'river'],
  楼: ['building', 'architecture', 'tower', 'city', 'urban'],
  船: ['boat', 'ship', 'sailing', 'ocean', 'vessel'],
  马: ['horse', 'equine', 'running', 'wild', 'gallop'],
  泪: ['tears', 'sad', 'emotion', 'rain', 'melancholy'],
  笑: ['smile', 'happy', 'joy', 'laughter', 'cheerful'],
  思: ['thought', 'thinking', 'contemplation', 'meditation', 'reflection'],
  愁: ['sorrow', 'melancholy', 'sad', 'gloomy', 'blue'],
  乡: ['hometown', 'village', 'countryside', 'rural', 'nostalgia'],
  客: ['traveler', 'journey', 'adventure', 'exploration', 'wanderer'],
  老: ['old', 'ancient', 'vintage', 'aged', 'weathered'],
  少: ['young', 'youth', 'fresh', 'new', 'juvenile'],
  红: ['red', 'crimson', 'scarlet', 'ruby', 'vibrant'],
  绿: ['green', 'verdant', 'lush', 'nature', 'leafy'],
  青: ['cyan', 'turquoise', 'teal', 'bluegreen', 'aqua'],
  白: ['white', 'pure', 'snow', 'cloud', 'bright'],
  黑: ['black', 'dark', 'shadow', 'night', 'ebony'],
  金: ['gold', 'golden', 'yellow', 'amber', 'sun'],
  空: ['sky', 'space', 'vast', 'endless', 'infinite'],
  地: ['earth', 'ground', 'soil', 'land', 'terrain'],
  人: ['person', 'people', 'human', 'silhouette', 'figure'],
  心: ['heart', 'love', 'emotion', 'passion', 'warmth'],
  情: ['love', 'emotion', 'romance', 'feeling', 'affection'],
  意: ['meaning', 'purpose', 'intention', 'significance', 'idea'],
};

const DEFAULT_KEYWORDS = ['nature', 'art', 'abstract', 'beautiful', 'serene', 'poetic'];

export interface ImageSearchResult {
  url: string;
  width: number;
  height: number;
}

export function parseImagery(text: string): ImageTag[] {
  if (!text.trim()) return [];

  const sentences = text.split(/[，。！？；：、\n,.!?;:"']+/).filter((s) => s.trim());
  const tags: ImageTag[] = [];

  sentences.forEach((sentence) => {
    const trimmed = sentence.trim();
    if (!trimmed) return;

    const chars = Array.from(trimmed);
    const words: string[] = [];

    if (trimmed.length <= 3) {
      words.push(trimmed);
    } else {
      for (let i = 0; i < chars.length - 1; i++) {
      const word = chars[i] + chars[i + 1];
        if (!STOP_WORDS.includes(chars[i]) && !STOP_WORDS.includes(chars[i + 1])) {
          words.push(word);
        }
      }
      for (let i = 0; i < chars.length; i++) {
        if (!STOP_WORDS.includes(chars[i]) && chars[i].match(/[\u4e00-\u9fa5]/)) {
          let hasBigram = false;
          for (const w of words) {
            if (w.includes(chars[i])) {
              hasBigram = true;
              break;
            }
          }
          if (!hasBigram) {
            words.push(chars[i]);
          }
        }
      }
    }

    const uniqueWords = [...new Set(words)];
    const count = Math.min(3, Math.max(2, uniqueWords.length));
    const selected = uniqueWords.slice(0, count);

    selected.forEach((word) => {
      tags.push({
        id: uuidv4(),
        text: word,
      });
    });
  });

  const uniqueTags: ImageTag[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    if (!seen.has(tag.text)) {
      seen.add(tag.text);
      uniqueTags.push(tag);
    }
  }

  return uniqueTags.slice(0, 12);
}

function getEnglishKeyword(keyword: string): string {
  for (const [key, values] of Object.entries(IMAGE_KEYWORDS)) {
    if (keyword.includes(key) || key.includes(keyword)) {
      return values[Math.floor(Math.random() * values.length)];
    }
  }
  return DEFAULT_KEYWORDS[Math.floor(Math.random() * DEFAULT_KEYWORDS.length)];
}

export async function searchImage(keyword: string): Promise<ImageSearchResult> {
  return new Promise((resolve) => {
    const englishKeyword = getEnglishKeyword(keyword);
    const seed = `${keyword}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const width = 400;
    const height = 300;

    const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      resolve({
        url,
        width: img.naturalWidth || width,
        height: img.naturalHeight || height,
      });
    };
    img.onerror = () => {
      const fallbackUrl = `https://picsum.photos/${width}/${height}`;
      resolve({
        url: fallbackUrl,
        width,
        height,
      });
    };
    img.src = url;
  });
}

export async function searchImagesBatch(keywords: string[]): Promise<Map<string, ImageSearchResult>> {
  const results = new Map<string, ImageSearchResult>();
  const promises = keywords.map(async (keyword) => {
    return searchImage(keyword).then((result) => {
      results.set(keyword, result);
    });
  });
  await Promise.all(promises);
  return results;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), wait);
  };
}
