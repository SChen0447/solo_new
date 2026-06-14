import { v4 as uuidv4 } from 'uuid';
import {
  type ScrollData,
  type FusionResult,
  type Element,
  type Rarity,
  RARITY_INFO,
  RARITY_ORDER,
  ELEMENT_ORDER,
  SCROLL_PRESETS,
} from '@/scroll/types';

function getNextRarity(current: Rarity): Rarity | null {
  const idx = RARITY_ORDER.indexOf(current);
  if (idx < RARITY_ORDER.length - 1) return RARITY_ORDER[idx + 1];
  return null;
}

function getRarityByValue(value: number): Rarity {
  const clamped = Math.max(1, Math.min(5, Math.round(value)));
  return RARITY_ORDER[clamped - 1];
}

function getRandomElement(): Element {
  return ELEMENT_ORDER[Math.floor(Math.random() * ELEMENT_ORDER.length)];
}

function findScrollByElementAndRarity(scrolls: ScrollData[], element: Element, rarity: Rarity): ScrollData | null {
  return scrolls.find(s => s.element === element && s.rarity === rarity) || null;
}

export function calculateFusion(
  material1: ScrollData,
  material2: ScrollData,
  allScrolls: ScrollData[],
  seed?: number
): FusionResult {
  const rng = seed !== undefined
    ? () => { seed = (seed! * 16807) % 2147483647; return (seed! - 1) / 2147483646; }
    : Math.random;

  const sameElement = material1.element === material2.element;
  const r1 = RARITY_INFO[material1.rarity].value;
  const r2 = RARITY_INFO[material2.rarity].value;
  const rarityDiff = Math.abs(r1 - r2);

  if (sameElement) {
    const nextRarity = getNextRarity(material1.rarity);
    if (nextRarity === null) {
      const newElement = getRandomElement();
      const resultScroll = findScrollByElementAndRarity(allScrolls, newElement, 'Legendary');
      if (resultScroll) {
        const mutated: ScrollData = { ...resultScroll, id: uuidv4() };
        return {
          id: uuidv4(),
          success: true,
          resultScroll: mutated,
          experience: 500,
          failPenalty: '',
          mutationType: 'rarity_overflow',
        };
      }
      return {
        id: uuidv4(),
        success: false,
        resultScroll: null,
        experience: 0,
        failPenalty: '传说卷轴融合变异失败',
        mutationType: 'none',
      };
    }

    const resultScroll = findScrollByElementAndRarity(allScrolls, material1.element, nextRarity);
    if (resultScroll) {
      return {
        id: uuidv4(),
        success: true,
        resultScroll: { ...resultScroll, id: uuidv4() },
        experience: r1 * 50 + 100,
        failPenalty: '',
        mutationType: 'none',
      };
    }

    return {
      id: uuidv4(),
      success: false,
      resultScroll: null,
      experience: 10,
      failPenalty: '未找到对应卷轴',
      mutationType: 'none',
    };
  }

  const successRate = 0.5 + rarityDiff * 0.1;
  const roll = rng();

  if (roll < successRate) {
    const avgRarity = (r1 + r2) / 2 + 1;
    const resultRarity = getRarityByValue(avgRarity);
    const resultElement = getRandomElement();
    const resultScroll = findScrollByElementAndRarity(allScrolls, resultElement, resultRarity);

    if (resultScroll) {
      return {
        id: uuidv4(),
        success: true,
        resultScroll: { ...resultScroll, id: uuidv4() },
        experience: Math.round(avgRarity * 40 + 50),
        failPenalty: '',
        mutationType: resultElement !== material1.element && resultElement !== material2.element ? 'element_change' : 'none',
      };
    }
  }

  return {
    id: uuidv4(),
    success: false,
    resultScroll: null,
    experience: 5,
    failPenalty: '融合失败，材料消散，损失少量金币',
    mutationType: 'none',
  };
}

export function generateInitialScrolls(): ScrollData[] {
  return SCROLL_PRESETS.map((preset, index) => ({
    ...preset,
    id: `scroll-${index}`,
    obtained: index < 8,
  }));
}
