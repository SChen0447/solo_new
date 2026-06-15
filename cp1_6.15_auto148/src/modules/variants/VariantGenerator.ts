import type { ColorData, VariantParams, HSL } from '../../types';
import { hslToRgb, rgbToHex, rgbToHsl } from '../../utils/colorUtils';
import { getClosestColorName } from '../../utils/colorNames';

export function generateVariants(
  baseColor: ColorData,
  params: VariantParams,
  count = 5
): ColorData[] {
  const variants: ColorData[] = [];
  const { h: bh, s: bs, l: bl } = baseColor.hsl;

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (i / (count - 1)) - 0.5;
    const t2 = t * 2;
    const scale = t2 * (2 / 3);

    let h = bh + params.hueShift * scale;
    h = ((h % 360) + 360) % 360;

    const s = Math.max(0, Math.min(100, bs + params.saturationShift * scale));
    const l = Math.max(5, Math.min(95, bl + params.lightnessShift * scale));

    const hsl: HSL = { h: Math.round(h), s: Math.round(s), l: Math.round(l) };
    const rgb = hslToRgb(hsl);
    const hex = rgbToHex(rgb);
    const name = getClosestColorName(hsl);

    variants.push({ hex, rgb, hsl, name });
  }

  return variants;
}

export function generateDefaultVariants(baseColor: ColorData): ColorData[] {
  return generateVariants(
    baseColor,
    { hueShift: 0, saturationShift: 0, lightnessShift: 0 },
    5
  );
}
