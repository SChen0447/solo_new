import TinyColor from 'tinycolor2';
import { ExtractedColor } from './colorExtractor';

export interface PaletteVariant {
  label: string;
  hex: string;
}

export interface ColorPalette {
  baseColor: ExtractedColor;
  variants: PaletteVariant[];
}

function generateLightVariant(hex: string, amount: number = 20): string {
  return TinyColor(hex).lighten(amount).toHexString();
}

function generateDarkVariant(hex: string, amount: number = 20): string {
  return TinyColor(hex).darken(amount).toHexString();
}

function generateAnalogous(hex: string): string {
  const color = TinyColor(hex);
  const analogous = color.analogous(3, 30);
  return analogous.length > 1 ? analogous[1].toHexString() : hex;
}

function generateComplementary(hex: string): string {
  return TinyColor(hex).complement().toHexString();
}

export function generatePalette(baseColor: ExtractedColor): ColorPalette {
  const variants: PaletteVariant[] = [
    { label: '原色', hex: baseColor.hex },
    { label: '浅色20%', hex: generateLightVariant(baseColor.hex, 20) },
    { label: '深色20%', hex: generateDarkVariant(baseColor.hex, 20) },
    { label: '类似色', hex: generateAnalogous(baseColor.hex) },
    { label: '互补色', hex: generateComplementary(baseColor.hex) },
  ];
  return { baseColor, variants };
}

export function generatePalettes(colors: ExtractedColor[]): ColorPalette[] {
  return colors.map(generatePalette);
}

export function exportAsCSSVariables(palettes: ColorPalette[]): string {
  const lines: string[] = [':root {'];
  palettes.forEach((palette, i) => {
    palette.variants.forEach((variant, j) => {
      const name = `color-${i + 1}-${variant.label}`;
      lines.push(`  --${name}: ${variant.hex};`);
    });
  });
  lines.push('}');
  return lines.join('\n');
}

export function exportAsSCSSVariables(palettes: ColorPalette[]): string {
  const lines: string[] = [];
  palettes.forEach((palette, i) => {
    palette.variants.forEach((variant, j) => {
      const name = `color-${i + 1}-${variant.label}`;
      lines.push(`$${name}: ${variant.hex};`);
    });
  });
  return lines.join('\n');
}

export function exportAsSVG(palettes: ColorPalette[]): string {
  const blockWidth = 64;
  const blockHeight = 64;
  const gap = 8;
  const cols = 5;
  const rowHeight = blockHeight + gap + 20;
  const headerHeight = 30;
  const svgWidth = cols * (blockWidth + gap) + gap;
  const svgHeight = palettes.length * rowHeight + headerHeight + gap;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`;
  svg += `<rect width="100%" height="100%" fill="#121212"/>`;
  svg += `<text x="${gap}" y="20" fill="#e0e0e0" font-family="sans-serif" font-size="14" font-weight="bold">Palette Forge</text>`;

  palettes.forEach((palette, i) => {
    const yOffset = headerHeight + i * rowHeight;
    palette.variants.forEach((variant, j) => {
      const x = gap + j * (blockWidth + gap);
      const y = yOffset;
      svg += `<rect x="${x}" y="${y}" width="${blockWidth}" height="${blockHeight}" rx="8" fill="${variant.hex}"/>`;
      svg += `<text x="${x + blockWidth / 2}" y="${y + blockHeight + 14}" fill="#888" font-family="sans-serif" font-size="10" text-anchor="middle">${variant.hex}</text>`;
    });
  });

  svg += '</svg>';
  return svg;
}
