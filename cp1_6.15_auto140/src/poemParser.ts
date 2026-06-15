import { extractKeywords, calculateEmotionWeights } from './utils';

export interface VerseData {
  verse: string;
  keywords: string[];
}

export interface PoemData {
  verses: VerseData[];
  emotion: {
    joy: number;
    sorrow: number;
  };
}

export function parsePoem(poemText: string): PoemData {
  const cleanText = poemText.trim().replace(/\r/g, '');

  let verses = cleanText
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (verses.length === 1 && verses[0].length > 10) {
    const line = verses[0];
    verses = [];
    let current = '';
    for (let i = 0; i < line.length; i++) {
      current += line[i];
      if (/[，。！？；：]/.test(line[i]) || (i > 0 && i % 5 === 4) || (i > 0 && i % 7 === 6)) {
        if (current.trim().length > 0) {
          verses.push(current);
          current = '';
        }
      }
    }
    if (current.trim().length > 0) {
      verses.push(current);
    }
  }

  verses = verses.map((v) => v.replace(/[，。！？、；：]/g, '').trim()).filter((v) => v.length > 0);

  const verseData: VerseData[] = verses.map((verse) => ({
    verse,
    keywords: extractKeywords(verse),
  }));

  const emotion = calculateEmotionWeights(verses);

  return {
    verses: verseData,
    emotion,
  };
}
