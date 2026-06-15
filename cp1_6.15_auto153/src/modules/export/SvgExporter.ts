import { SvgElement } from '../editor/types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export function elementToSvgString(element: SvgElement): string {
  const transform = `rotate(${element.rotation} ${element.x + element.width / 2} ${element.y + element.height / 2}) scale(${element.scale})`;
  
  const commonAttrs = [
    `fill="${element.fill}"`,
    `stroke="${element.stroke}"`,
    `stroke-width="${element.strokeWidth}"`,
    `opacity="${element.opacity}"`,
    `transform="${transform}"`,
  ].join(' ');

  switch (element.type) {
    case 'rect':
      return `<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" rx="${element.rx || 0}" ry="${element.ry || 0}" ${commonAttrs} />`;
    case 'circle':
      return `<circle cx="${element.x + element.r}" cy="${element.y + element.r}" r="${element.r}" ${commonAttrs} />`;
    case 'line':
      return `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${element.stroke}" stroke-width="${element.strokeWidth}" opacity="${element.opacity}" transform="${transform}" />`;
    case 'polygon':
      return `<polygon points="${element.points}" ${commonAttrs} />`;
    case 'text':
      return `<text x="${element.x}" y="${element.y + element.fontSize}" font-size="${element.fontSize}" font-family="${element.fontFamily}" fill="${element.fill}" opacity="${element.opacity}" transform="${transform}">${element.text}</text>`;
    case 'path':
      return `<path d="${element.d}" ${commonAttrs} />`;
    default:
      return '';
  }
}

export function cleanElements(elements: SvgElement[]): SvgElement[] {
  return elements.filter((el) => {
    if (el.type === 'line') {
      return el.x1 !== el.x2 || el.y1 !== el.y2;
    }
    if (el.opacity <= 0) return false;
    if (el.width <= 0 && el.type !== 'text' && el.type !== 'line') return false;
    if (el.height <= 0 && el.type !== 'text' && el.type !== 'line') return false;
    return true;
  });
}

export function getBoundingBox(elements: SvgElement[]): { x: number; y: number; width: number; height: number } {
  if (elements.length === 0) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    const scaledWidth = el.width * el.scale;
    const scaledHeight = el.height * el.scale;
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    
    const halfW = scaledWidth / 2;
    const halfH = scaledHeight / 2;
    
    minX = Math.min(minX, cx - halfW);
    minY = Math.min(minY, cy - halfH);
    maxX = Math.max(maxX, cx + halfW);
    maxY = Math.max(maxY, cy + halfH);
  });

  const padding = 10;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

export function generateSvgString(elements: SvgElement[]): string {
  const cleanedElements = cleanElements(elements);
  const bbox = getBoundingBox(cleanedElements);

  const elementsSvg = cleanedElements.map((el) => {
    const translatedEl = {
      ...el,
      x: el.x - bbox.x,
      y: el.y - bbox.y,
      ...(el.type === 'line' ? {
        x1: el.x1 - bbox.x,
        y1: el.y1 - bbox.y,
        x2: el.x2 - bbox.x,
        y2: el.y2 - bbox.y,
      } : {}),
    } as SvgElement;
    return elementToSvgString(translatedEl);
  }).join('\n    ');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(bbox.width)}" height="${Math.ceil(bbox.height)}" viewBox="0 0 ${Math.ceil(bbox.width)} ${Math.ceil(bbox.height)}">
  ${elementsSvg}
</svg>`;

  return svg;
}

export function exportSvgFile(elements: SvgElement[]): void {
  const svgString = generateSvgString(elements);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
  link.download = `icon_${timestamp}.svg`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copySvgToClipboard(elements: SvgElement[]): Promise<boolean> {
  const svgString = generateSvgString(elements);
  try {
    await navigator.clipboard.writeText(svgString);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = svgString;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
