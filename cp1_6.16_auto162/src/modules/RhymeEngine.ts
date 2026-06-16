interface RhymeWord {
  word: string;
  pinyin: string;
  final: string;
  tone: number;
}

interface RhymeCandidate {
  word: string;
  similarity: number;
}

const CHAR_TO_PINYIN: Record<string, { pinyin: string; final: string; tone: number }> = {
  春: { pinyin: 'chun', final: 'un', tone: 1 },
  风: { pinyin: 'feng', final: 'eng', tone: 1 },
  花: { pinyin: 'hua', final: 'a', tone: 1 },
  月: { pinyin: 'yue', final: 'ue', tone: 4 },
  山: { pinyin: 'shan', final: 'an', tone: 1 },
  水: { pinyin: 'shui', final: 'ui', tone: 3 },
  云: { pinyin: 'yun', final: 'un', tone: 2 },
  雨: { pinyin: 'yu', final: 'u', tone: 3 },
  天: { pinyin: 'tian', final: 'ian', tone: 1 },
  地: { pinyin: 'di', final: 'i', tone: 4 },
  人: { pinyin: 'ren', final: 'en', tone: 2 },
  心: { pinyin: 'xin', final: 'in', tone: 1 },
  情: { pinyin: 'qing', final: 'ing', tone: 2 },
  意: { pinyin: 'yi', final: 'i', tone: 4 },
  梦: { pinyin: 'meng', final: 'eng', tone: 4 },
  夜: { pinyin: 'ye', final: 'e', tone: 4 },
  明: { pinyin: 'ming', final: 'ing', tone: 2 },
  光: { pinyin: 'guang', final: 'ang', tone: 1 },
  影: { pinyin: 'ying', final: 'ing', tone: 3 },
  声: { pinyin: 'sheng', final: 'eng', tone: 1 },
  色: { pinyin: 'se', final: 'e', tone: 4 },
  香: { pinyin: 'xiang', final: 'iang', tone: 1 },
  秋: { pinyin: 'qiu', final: 'iu', tone: 1 },
  冬: { pinyin: 'dong', final: 'ong', tone: 1 },
  夏: { pinyin: 'xia', final: 'ia', tone: 4 },
  江: { pinyin: 'jiang', final: 'iang', tone: 1 },
  河: { pinyin: 'he', final: 'e', tone: 2 },
  湖: { pinyin: 'hu', final: 'u', tone: 2 },
  海: { pinyin: 'hai', final: 'ai', tone: 3 },
  林: { pinyin: 'lin', final: 'in', tone: 2 },
  树: { pinyin: 'shu', final: 'u', tone: 4 },
  叶: { pinyin: 'ye', final: 'e', tone: 4 },
  草: { pinyin: 'cao', final: 'ao', tone: 3 },
  鸟: { pinyin: 'niao', final: 'iao', tone: 3 },
  鱼: { pinyin: 'yu', final: 'u', tone: 2 },
  龙: { pinyin: 'long', final: 'ong', tone: 2 },
  凤: { pinyin: 'feng', final: 'eng', tone: 4 },
  剑: { pinyin: 'jian', final: 'ian', tone: 4 },
  酒: { pinyin: 'jiu', final: 'iu', tone: 3 },
  诗: { pinyin: 'shi', final: 'i', tone: 1 },
  书: { pinyin: 'shu', final: 'u', tone: 1 },
  画: { pinyin: 'hua', final: 'a', tone: 4 },
  琴: { pinyin: 'qin', final: 'in', tone: 2 },
  棋: { pinyin: 'qi', final: 'i', tone: 2 },
  愁: { pinyin: 'chou', final: 'ou', tone: 2 },
  恨: { pinyin: 'hen', final: 'en', tone: 4 },
  爱: { pinyin: 'ai', final: 'ai', tone: 4 },
  思: { pinyin: 'si', final: 'i', tone: 1 },
  念: { pinyin: 'nian', final: 'ian', tone: 4 },
  归: { pinyin: 'gui', final: 'ui', tone: 1 },
  去: { pinyin: 'qu', final: 'u', tone: 4 },
  来: { pinyin: 'lai', final: 'ai', tone: 2 },
  往: { pinyin: 'wang', final: 'ang', tone: 3 },
  前: { pinyin: 'qian', final: 'ian', tone: 2 },
  后: { pinyin: 'hou', final: 'ou', tone: 4 },
  左: { pinyin: 'zuo', final: 'uo', tone: 3 },
  右: { pinyin: 'you', final: 'ou', tone: 4 },
  东: { pinyin: 'dong', final: 'ong', tone: 1 },
  西: { pinyin: 'xi', final: 'i', tone: 1 },
  南: { pinyin: 'nan', final: 'an', tone: 2 },
  北: { pinyin: 'bei', final: 'ei', tone: 3 },
  中: { pinyin: 'zhong', final: 'ong', tone: 1 },
  外: { pinyin: 'wai', final: 'ai', tone: 4 },
  里: { pinyin: 'li', final: 'i', tone: 3 },
  上: { pinyin: 'shang', final: 'ang', tone: 4 },
  下: { pinyin: 'xia', final: 'ia', tone: 4 },
  高: { pinyin: 'gao', final: 'ao', tone: 1 },
  低: { pinyin: 'di', final: 'i', tone: 1 },
  长: { pinyin: 'chang', final: 'ang', tone: 2 },
  短: { pinyin: 'duan', final: 'uan', tone: 3 },
  深: { pinyin: 'shen', final: 'en', tone: 1 },
  浅: { pinyin: 'qian', final: 'ian', tone: 3 },
  清: { pinyin: 'qing', final: 'ing', tone: 1 },
  浊: { pinyin: 'zhuo', final: 'uo', tone: 2 },
  冷: { pinyin: 'leng', final: 'eng', tone: 3 },
  暖: { pinyin: 'nuan', final: 'uan', tone: 3 },
  寒: { pinyin: 'han', final: 'an', tone: 2 },
  热: { pinyin: 're', final: 'e', tone: 4 },
  老: { pinyin: 'lao', final: 'ao', tone: 3 },
  少: { pinyin: 'shao', final: 'ao', tone: 4 },
  多: { pinyin: 'duo', final: 'uo', tone: 1 },
  大: { pinyin: 'da', final: 'a', tone: 4 },
  小: { pinyin: 'xiao', final: 'iao', tone: 3 },
  红: { pinyin: 'hong', final: 'ong', tone: 2 },
  绿: { pinyin: 'lu', final: 'u', tone: 4 },
  青: { pinyin: 'qing', final: 'ing', tone: 1 },
  白: { pinyin: 'bai', final: 'ai', tone: 2 },
  黑: { pinyin: 'hei', final: 'ei', tone: 1 },
  黄: { pinyin: 'huang', final: 'uang', tone: 2 },
  紫: { pinyin: 'zi', final: 'i', tone: 3 },
  蓝: { pinyin: 'lan', final: 'an', tone: 2 },
  碧: { pinyin: 'bi', final: 'i', tone: 4 },
  丹: { pinyin: 'dan', final: 'an', tone: 1 },
  翠: { pinyin: 'cui', final: 'ui', tone: 4 },
  金: { pinyin: 'jin', final: 'in', tone: 1 },
  银: { pinyin: 'yin', final: 'in', tone: 2 },
  玉: { pinyin: 'yu', final: 'u', tone: 4 },
  珠: { pinyin: 'zhu', final: 'u', tone: 1 },
  宝: { pinyin: 'bao', final: 'ao', tone: 3 },
  贵: { pinyin: 'gui', final: 'ui', tone: 4 },
  富: { pinyin: 'fu', final: 'u', tone: 4 },
  贫: { pinyin: 'pin', final: 'in', tone: 2 },
  欢: { pinyin: 'huan', final: 'uan', tone: 1 },
  笑: { pinyin: 'xiao', final: 'iao', tone: 4 },
  哭: { pinyin: 'ku', final: 'u', tone: 1 },
  悲: { pinyin: 'bei', final: 'ei', tone: 1 },
  喜: { pinyin: 'xi', final: 'i', tone: 3 },
  怒: { pinyin: 'nu', final: 'u', tone: 4 },
  哀: { pinyin: 'ai', final: 'ai', tone: 1 },
  乐: { pinyin: 'le', final: 'e', tone: 4 },
  离: { pinyin: 'li', final: 'i', tone: 2 },
  合: { pinyin: 'he', final: 'e', tone: 2 },
  别: { pinyin: 'bie', final: 'ie', tone: 2 },
  聚: { pinyin: 'ju', final: 'u', tone: 4 },
  送: { pinyin: 'song', final: 'ong', tone: 4 },
  迎: { pinyin: 'ying', final: 'ing', tone: 2 },
  远: { pinyin: 'yuan', final: 'uan', tone: 3 },
  近: { pinyin: 'jin', final: 'in', tone: 4 },
  千: { pinyin: 'qian', final: 'ian', tone: 1 },
  万: { pinyin: 'wan', final: 'an', tone: 4 },
  百: { pinyin: 'bai', final: 'ai', tone: 3 },
  十: { pinyin: 'shi', final: 'i', tone: 2 },
  一: { pinyin: 'yi', final: 'i', tone: 1 },
  二: { pinyin: 'er', final: 'er', tone: 4 },
  三: { pinyin: 'san', final: 'an', tone: 1 },
  四: { pinyin: 'si', final: 'i', tone: 4 },
  五: { pinyin: 'wu', final: 'u', tone: 3 },
  六: { pinyin: 'liu', final: 'iu', tone: 4 },
  七: { pinyin: 'qi', final: 'i', tone: 1 },
  八: { pinyin: 'ba', final: 'a', tone: 1 },
  九: { pinyin: 'jiu', final: 'iu', tone: 3 },
  岁: { pinyin: 'sui', final: 'ui', tone: 4 },
  年: { pinyin: 'nian', final: 'ian', tone: 2 },
  载: { pinyin: 'zai', final: 'ai', tone: 3 },
  朝: { pinyin: 'zhao', final: 'ao', tone: 1 },
  暮: { pinyin: 'mu', final: 'u', tone: 4 },
  晨: { pinyin: 'chen', final: 'en', tone: 2 },
  昏: { pinyin: 'hun', final: 'un', tone: 1 },
  钟: { pinyin: 'zhong', final: 'ong', tone: 1 },
  鼓: { pinyin: 'gu', final: 'u', tone: 3 },
  笛: { pinyin: 'di', final: 'i', tone: 2 },
  箫: { pinyin: 'xiao', final: 'iao', tone: 1 },
  弦: { pinyin: 'xian', final: 'ian', tone: 2 },
  歌: { pinyin: 'ge', final: 'e', tone: 1 },
  舞: { pinyin: 'wu', final: 'u', tone: 3 },
  楼: { pinyin: 'lou', final: 'ou', tone: 2 },
  台: { pinyin: 'tai', final: 'ai', tone: 2 },
  亭: { pinyin: 'ting', final: 'ing', tone: 2 },
  阁: { pinyin: 'ge', final: 'e', tone: 2 },
  塔: { pinyin: 'ta', final: 'a', tone: 3 },
  桥: { pinyin: 'qiao', final: 'iao', tone: 2 },
  渡: { pinyin: 'du', final: 'u', tone: 4 },
  舟: { pinyin: 'zhou', final: 'ou', tone: 1 },
  船: { pinyin: 'chuan', final: 'uan', tone: 2 },
  帆: { pinyin: 'fan', final: 'an', tone: 1 },
  桨: { pinyin: 'jiang', final: 'iang', tone: 3 },
  马: { pinyin: 'ma', final: 'a', tone: 3 },
  车: { pinyin: 'che', final: 'e', tone: 1 },
  骑: { pinyin: 'qi', final: 'i', tone: 2 },
  乘: { pinyin: 'cheng', final: 'eng', tone: 2 },
  征: { pinyin: 'zheng', final: 'eng', tone: 1 },
  战: { pinyin: 'zhan', final: 'an', tone: 4 },
  戈: { pinyin: 'ge', final: 'e', tone: 1 },
  甲: { pinyin: 'jia', final: 'ia', tone: 3 },
  旗: { pinyin: 'qi', final: 'i', tone: 2 },
  烽: { pinyin: 'feng', final: 'eng', tone: 1 },
  烟: { pinyin: 'yan', final: 'an', tone: 1 },
  尘: { pinyin: 'chen', final: 'en', tone: 2 },
  沙: { pinyin: 'sha', final: 'a', tone: 1 },
  漠: { pinyin: 'mo', final: 'o', tone: 4 },
  孤: { pinyin: 'gu', final: 'u', tone: 1 },
  独: { pinyin: 'du', final: 'u', tone: 2 },
  群: { pinyin: 'qun', final: 'un', tone: 2 },
  众: { pinyin: 'zhong', final: 'ong', tone: 4 },
  君: { pinyin: 'jun', final: 'un', tone: 1 },
  臣: { pinyin: 'chen', final: 'en', tone: 2 },
  王: { pinyin: 'wang', final: 'ang', tone: 2 },
  侯: { pinyin: 'hou', final: 'ou', tone: 2 },
  将: { pinyin: 'jiang', final: 'iang', tone: 4 },
  相: { pinyin: 'xiang', final: 'iang', tone: 4 },
  官: { pinyin: 'guan', final: 'uan', tone: 1 },
  民: { pinyin: 'min', final: 'in', tone: 2 },
  农: { pinyin: 'nong', final: 'ong', tone: 2 },
  商: { pinyin: 'shang', final: 'ang', tone: 1 },
  工: { pinyin: 'gong', final: 'ong', tone: 1 },
  学: { pinyin: 'xue', final: 'ue', tone: 2 },
  道: { pinyin: 'dao', final: 'ao', tone: 4 },
  德: { pinyin: 'de', final: 'e', tone: 2 },
  仁: { pinyin: 'ren', final: 'en', tone: 2 },
  义: { pinyin: 'yi', final: 'i', tone: 4 },
  礼: { pinyin: 'li', final: 'i', tone: 3 },
  智: { pinyin: 'zhi', final: 'i', tone: 4 },
  信: { pinyin: 'xin', final: 'in', tone: 4 },
  忠: { pinyin: 'zhong', final: 'ong', tone: 1 },
  孝: { pinyin: 'xiao', final: 'iao', tone: 4 },
  节: { pinyin: 'jie', final: 'ie', tone: 2 },
  操: { pinyin: 'cao', final: 'ao', tone: 1 },
};

const RHYME_WORDS: RhymeWord[] = Object.entries(CHAR_TO_PINYIN).map(([word, info]) => ({
  word,
  pinyin: info.pinyin,
  final: info.final,
  tone: info.tone,
}));

const FINAL_GROUPS: Record<string, string[]> = {
  a: ['a', 'ia', 'ua'],
  o: ['o', 'uo', 'io'],
  e: ['e', 'ie', 'ue', 'ei'],
  ai: ['ai', 'uai'],
  ei: ['ei', 'ui', 'uei'],
  ao: ['ao', 'iao'],
  ou: ['ou', 'iu', 'iou'],
  an: ['an', 'ian', 'uan', 'uan'],
  en: ['en', 'in', 'un', 'un'],
  ang: ['ang', 'iang', 'uang'],
  eng: ['eng', 'ing', 'ong', 'iong'],
  ong: ['ong', 'iong', 'eng'],
  er: ['er'],
  i: ['i', 'ü'],
  u: ['u', 'ü'],
};

function getFinalGroup(final: string): string {
  for (const [group, finals] of Object.entries(FINAL_GROUPS)) {
    if (finals.includes(final)) {
      return group;
    }
  }
  return final;
}

function calculateSimilarity(final1: string, final2: string): number {
  if (final1 === final2) return 1.0;

  const group1 = getFinalGroup(final1);
  const group2 = getFinalGroup(final2);

  if (group1 === group2) {
    const commonChars = [...final1].filter((c) => final2.includes(c)).length;
    const maxLen = Math.max(final1.length, final2.length);
    return 0.7 + (commonChars / maxLen) * 0.25;
  }

  const finals1 = FINAL_GROUPS[group1] || [final1];
  const finals2 = FINAL_GROUPS[group2] || [final2];

  let maxSimilarity = 0;
  for (const f1 of finals1) {
    for (const f2 of finals2) {
      const commonChars = [...f1].filter((c) => f2.includes(c)).length;
      const maxLen = Math.max(f1.length, f2.length);
      const similarity = commonChars / maxLen;
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
      }
    }
  }

  return maxSimilarity * 0.6;
}

export function getRhymeCandidates(char: string, maxCount: number = 10): RhymeCandidate[] {
  const charInfo = CHAR_TO_PINYIN[char];
  if (!charInfo) {
    return [];
  }

  const candidates: RhymeCandidate[] = [];

  for (const word of RHYME_WORDS) {
    if (word.word === char) continue;

    const similarity = calculateSimilarity(charInfo.final, word.final);

    if (similarity >= 0.6) {
      const similarityWithVariance = similarity + (Math.random() - 0.5) * 0.1;
      const clampedSimilarity = Math.max(0.6, Math.min(1.0, similarityWithVariance));
      candidates.push({
        word: word.word,
        similarity: Math.round(clampedSimilarity * 100) / 100,
      });
    }
  }

  candidates.sort((a, b) => b.similarity - a.similarity);

  return candidates.slice(0, maxCount);
}

export function getLastCharOfLine(text: string): string {
  const lines = text.split('\n');
  const currentLine = lines[lines.length - 1].trim();
  if (currentLine.length === 0) return '';

  const lastChar = currentLine[currentLine.length - 1];
  if (/[\u4e00-\u9fa5]/.test(lastChar)) {
    return lastChar;
  }

  for (let i = currentLine.length - 2; i >= 0; i--) {
    if (/[\u4e00-\u9fa5]/.test(currentLine[i])) {
      return currentLine[i];
    }
  }

  return '';
}

export function getCharInfo(char: string): { pinyin: string; final: string; tone: number } | null {
  return CHAR_TO_PINYIN[char] || null;
}
