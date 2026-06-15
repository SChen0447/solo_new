import * as THREE from 'three';
import {
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
  STOP_WORDS,
  COLOR_PALETTE,
  type AnalysisResult,
  type ParticleParams,
  type KeywordData
} from './constants';

export function hexToRgb(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, t);
}

export function getColorFromHueShift(hueShift: number): string {
  const warmColor = hexToRgb('#ff9f43');
  const coolColor = hexToRgb('#0abde3');
  const t = (hueShift + 1) / 2;
  const color = lerpColor(coolColor, warmColor, t);
  return `#${color.getHexString()}`;
}

export function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const result = lerpColor(c1, c2, Math.max(0, Math.min(1, t)));
  return `#${result.getHexString()}`;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.includes(word));
}

export function countWordFrequencies(words: string[]): { word: string; count: number }[] {
  const frequencyMap = new Map<string, number>();
  words.forEach(word => {
    frequencyMap.set(word, (frequencyMap.get(word) || 0) + 1);
  });
  return Array.from(frequencyMap.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}

export function analyzeSentiment(words: string[]): { score: number; sentiment: 'positive' | 'negative' | 'neutral' } {
  if (words.length === 0) {
    return { score: 0, sentiment: 'neutral' };
  }

  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach(word => {
    if (POSITIVE_WORDS.includes(word)) positiveCount++;
    if (NEGATIVE_WORDS.includes(word)) negativeCount++;
  });

  const score = (positiveCount - negativeCount) / words.length;
  const sentiment = score > 0.05 ? 'positive' : score < -0.05 ? 'negative' : 'neutral';

  return { score: Math.max(-1, Math.min(1, score)), sentiment };
}

export function generateKeywords(
  frequencies: { word: string; count: number }[],
  sentimentScore: number
): KeywordData[] {
  const maxCount = frequencies.length > 0 ? frequencies[0].count : 1;
  const baseColor = getColorFromHueShift(sentimentScore);

  return frequencies.slice(0, 10).map(({ word, count }) => {
    const size = 12 + (count / maxCount) * 24;
    const paletteIndex = Math.floor(Math.random() * COLOR_PALETTE.length);
    const color = Math.random() > 0.3 ? COLOR_PALETTE[paletteIndex] : baseColor;
    return { word, size, color };
  });
}

export function analyzeText(text: string, emotionIntensity: number = 50): AnalysisResult {
  const intensity = emotionIntensity / 100;
  const words = tokenize(text);
  const wordFrequencies = countWordFrequencies(words);
  const { score: rawScore, sentiment } = analyzeSentiment(words);
  const sentimentScore = rawScore * intensity;
  const keywords = generateKeywords(wordFrequencies, sentimentScore);

  return {
    wordFrequencies: wordFrequencies.slice(0, 10),
    sentiment,
    sentimentScore,
    keywords
  };
}

export function mapToParticleParams(
  analysisResult: AnalysisResult,
  emotionIntensity: number
): ParticleParams {
  const intensity = emotionIntensity / 100;
  const { sentimentScore } = analysisResult;

  const hueShift = sentimentScore * intensity;
  const motionIntensity = 0.2 + Math.abs(sentimentScore) * 1.3 * intensity;
  const aggregation = 1.0 - sentimentScore * 0.2 * intensity;

  return {
    hueShift: Math.max(-1, Math.min(1, hueShift)),
    motionIntensity: Math.max(0.2, Math.min(1.5, motionIntensity)),
    aggregation: Math.max(0.8, Math.min(1.2, aggregation))
  };
}
