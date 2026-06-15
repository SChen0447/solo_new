export const ANCIENT_COLORS = {
  inkBlack: '#1a1a1a',
  ochre: '#8b5a2b',
  cyanine: '#2c5f7c',
  rattanYellow: '#e6a23c',
  paperWhite: '#f5f0e8',
  inkGray: '#3a3226',
} as const;

export type AncientColorKey = keyof typeof ANCIENT_COLORS;

export const JOY_KEYWORDS = ['喜', '乐', '欢', '笑', '明', '春', '花', '月', '酒', '歌', '兴', '悠', '恬', '逸', '雅'];
export const SORROW_KEYWORDS = ['悲', '愁', '哀', '忧', '泪', '寒', '霜', '雪', '孤', '独', '思', '念', '恨', '苦', '残', '断', '寂', '寥'];

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function extractKeywords(verse: string): string[] {
  const patterns = [
    /[\u4e00-\u9fa5]{2,}/g,
    /(明月|床前|霜|光|疑是|举头|低头|故乡|山|水|云|风|雨|花|鸟|春|秋|夏|冬|夜|日|月|星|江|河|湖|海|楼|台|亭|阁|酒|茶|剑|琴|书|画|梦|思|愁|喜|悲|欢|恨)/g,
  ];

  const keywords: Set<string> = new Set();

  patterns.forEach((pattern) => {
    const matches = verse.match(pattern);
    if (matches) {
      matches.forEach((match) => keywords.add(match));
    }
  });

  const chars = verse.split('').filter((c) => /[\u4e00-\u9fa5]/.test(c));
  chars.forEach((c) => keywords.add(c));

  return Array.from(keywords).slice(0, 10);
}

export function calculateEmotionWeights(verses: string[]): { joy: number; sorrow: number } {
  const fullText = verses.join('');
  let joyCount = 0;
  let sorrowCount = 0;

  JOY_KEYWORDS.forEach((keyword) => {
    const regex = new RegExp(keyword, 'g');
    const matches = fullText.match(regex);
    if (matches) joyCount += matches.length;
  });

  SORROW_KEYWORDS.forEach((keyword) => {
    const regex = new RegExp(keyword, 'g');
    const matches = fullText.match(regex);
    if (matches) sorrowCount += matches.length;
  });

  const total = joyCount + sorrowCount;

  if (total === 0) {
    return { joy: 0.5, sorrow: 0.5 };
  }

  return {
    joy: Math.round((joyCount / total) * 10) / 10,
    sorrow: Math.round((sorrowCount / total) * 10) / 10,
  };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function getColorForKeyword(keyword: string): AncientColorKey {
  const skyKeywords = ['月', '星', '云', '天', '晴', '空', '明'];
  const earthKeywords = ['山', '石', '土', '地', '丘', '陵'];
  const waterKeywords = ['水', '江', '河', '湖', '海', '雨', '霜', '雪', '冰'];
  const fireKeywords = ['日', '火', '光', '明', '红', '霞'];
  const plantKeywords = ['花', '草', '树', '木', '林', '叶', '春', '秋'];

  if (skyKeywords.some((k) => keyword.includes(k))) return 'cyanine';
  if (waterKeywords.some((k) => keyword.includes(k))) return 'cyanine';
  if (earthKeywords.some((k) => keyword.includes(k))) return 'ochre';
  if (fireKeywords.some((k) => keyword.includes(k))) return 'rattanYellow';
  if (plantKeywords.some((k) => keyword.includes(k))) return 'rattanYellow';

  const colorKeys: AncientColorKey[] = ['inkBlack', 'inkGray', 'cyanine', 'ochre', 'rattanYellow'];
  return colorKeys[randomInt(0, colorKeys.length - 1)];
}
