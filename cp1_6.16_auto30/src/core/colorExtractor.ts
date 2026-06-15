import ColorThief from 'colorthief';
import TinyColor from 'tinycolor2';

export interface ExtractedColor {
  rgb: [number, number, number];
  hex: string;
  hsl: { h: number; s: number; l: number };
}

const colorThief = new ColorThief();

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const color = TinyColor({ r, g, b });
  const hsl = color.toHsl();
  return { h: Math.round(hsl.h), s: Math.round(hsl.s * 100), l: Math.round(hsl.l * 100) };
}

function rgbToHex(r: number, g: number, b: number): string {
  return TinyColor({ r, g, b }).toHexString();
}

function sortByHueAndSaturation(colors: ExtractedColor[]): ExtractedColor[] {
  return [...colors].sort((a, b) => {
    const hueDiff = a.hsl.h - b.hsl.h;
    if (Math.abs(hueDiff) > 30) return hueDiff;
    return b.hsl.s - a.hsl.s;
  });
}

function removeDuplicateColors(colors: ExtractedColor[], threshold: number = 30): ExtractedColor[] {
  const result: ExtractedColor[] = [];
  for (const color of colors) {
    const isDuplicate = result.some(existing => {
      const colorObj = TinyColor(color.hex);
      const existingObj = TinyColor(existing.hex);
      return colorObj.toRgbString() === existingObj.toRgbString() ||
        Math.abs(color.hsl.h - existing.hsl.h) < threshold &&
        Math.abs(color.hsl.s - existing.hsl.s) < threshold;
    });
    if (!isDuplicate) {
      result.push(color);
    }
  }
  return result;
}

export async function extractColors(
  imgElement: HTMLImageElement,
  colorCount: number = 6
): Promise<ExtractedColor[]> {
  const rawColors: [number, number, number][] = colorThief.getPalette(imgElement, colorCount + 4) || [];

  let extracted: ExtractedColor[] = rawColors.map(([r, g, b]) => ({
    rgb: [r, g, b],
    hex: rgbToHex(r, g, b),
    hsl: rgbToHsl(r, g, b),
  }));

  extracted = removeDuplicateColors(extracted);
  extracted = sortByHueAndSaturation(extracted);
  extracted = extracted.slice(0, Math.min(colorCount, 8));
  extracted = extracted.length >= 5 ? extracted : extracted.slice(0, 5);

  return extracted;
}
