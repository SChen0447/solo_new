import type { HSL } from '../types';

const colorPresets: Array<{ name: string; hsl: HSL }> = [
  { name: '朱砂红', hsl: { h: 0, s: 78, l: 51 } },
  { name: '胭脂红', hsl: { h: 348, s: 75, l: 45 } },
  { name: '品红', hsl: { h: 320, s: 70, l: 48 } },
  { name: '藤紫', hsl: { h: 290, s: 60, l: 55 } },
  { name: '青莲', hsl: { h: 270, s: 55, l: 50 } },
  { name: '靛青', hsl: { h: 240, s: 70, l: 55 } },
  { name: '群青', hsl: { h: 220, s: 75, l: 52 } },
  { name: '湖蓝', hsl: { h: 200, s: 80, l: 55 } },
  { name: '天青', hsl: { h: 190, s: 70, l: 60 } },
  { name: '翡翠绿', hsl: { h: 160, s: 65, l: 45 } },
  { name: '松绿', hsl: { h: 150, s: 55, l: 50 } },
  { name: '草绿', hsl: { h: 120, s: 60, l: 45 } },
  { name: '柳黄', hsl: { h: 85, s: 65, l: 55 } },
  { name: '橄榄黄', hsl: { h: 60, s: 55, l: 50 } },
  { name: '鹅黄', hsl: { h: 50, s: 80, l: 65 } },
  { name: '橘黄', hsl: { h: 40, s: 90, l: 60 } },
  { name: '藤黄', hsl: { h: 45, s: 95, l: 55 } },
  { name: '赤金', hsl: { h: 35, s: 80, l: 50 } },
  { name: '橙橘', hsl: { h: 25, s: 90, l: 55 } },
  { name: '赭石', hsl: { h: 20, s: 70, l: 45 } },
  { name: '赤褐', hsl: { h: 15, s: 60, l: 40 } },
  { name: '咖啡', hsl: { h: 25, s: 40, l: 35 } },
  { name: '驼色', hsl: { h: 35, s: 30, l: 55 } },
  { name: '米白', hsl: { h: 45, s: 30, l: 88 } },
  { name: '象牙白', hsl: { h: 50, s: 20, l: 92 } },
  { name: '银灰', hsl: { h: 220, s: 5, l: 75 } },
  { name: '月白', hsl: { h: 210, s: 15, l: 90 } },
  { name: '墨灰', hsl: { h: 220, s: 10, l: 35 } },
  { name: '炭黑', hsl: { h: 0, s: 0, l: 15 } },
  { name: '粉色', hsl: { h: 340, s: 70, l: 78 } },
  { name: '藕色', hsl: { h: 330, s: 30, l: 72 } },
  { name: '豆沙色', hsl: { h: 340, s: 35, l: 55 } },
];

export function getClosestColorName(hsl: HSL): string {
  let bestMatch = colorPresets[0];
  let bestScore = Infinity;

  for (const preset of colorPresets) {
    const dh = Math.min(
      Math.abs(hsl.h - preset.hsl.h),
      360 - Math.abs(hsl.h - preset.hsl.h)
    ) / 180;
    const ds = Math.abs(hsl.s - preset.hsl.s) / 100;
    const dl = Math.abs(hsl.l - preset.hsl.l) / 100;
    const score = dh * 2 + ds + dl * 1.5;
    if (score < bestScore) {
      bestScore = score;
      bestMatch = preset;
    }
  }

  return bestMatch.name;
}
