export type SignatureStyle = 'handwriting' | 'calligraphy' | 'cartoon';

export interface Stroke {
  path: string;
  duration: number;
  delay: number;
  width: number;
}

export interface RenderedSignature {
  strokes: Stroke[];
  viewBox: string;
  gradientId: string;
}

const styleConfigs: Record<SignatureStyle, {
  strokeWidth: number;
  slant: number;
  variability: number;
  curveAmount: number;
}> = {
  handwriting: { strokeWidth: 3, slant: -8, variability: 0.4, curveAmount: 0.6 },
  calligraphy: { strokeWidth: 5, slant: -5, variability: 0.2, curveAmount: 0.3 },
  cartoon: { strokeWidth: 4, slant: 3, variability: 0.5, curveAmount: 0.8 }
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function adjustColorBrightness(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 + percent / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
}

export function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateCharStrokes(
  char: string,
  index: number,
  total: number,
  style: SignatureStyle,
  canvasWidth: number,
  canvasHeight: number
): Stroke[] {
  const config = styleConfigs[style];
  const random = seededRandom(char.charCodeAt(0) * 1000 + index);
  const strokes: Stroke[] = [];
  
  const charWidth = canvasWidth / total;
  const startX = index * charWidth + charWidth * 0.1;
  const endX = startX + charWidth * 0.8;
  const centerY = canvasHeight * 0.55;
  
  const slantRad = (config.slant * Math.PI) / 180;
  
  if (style === 'handwriting') {
    const strokeCount = 3 + Math.floor(random() * 2);
    for (let i = 0; i < strokeCount; i++) {
      const yOffset = (i - strokeCount / 2) * (canvasHeight * 0.12);
      const progress = i / strokeCount;
      const x1 = startX + (endX - startX) * progress * 0.1;
      const y1 = centerY + yOffset + Math.sin(progress * Math.PI) * 15;
      const x2 = startX + (endX - startX) * (0.4 + progress * 0.6);
      const y2 = centerY + yOffset * 0.3 + Math.sin(progress * Math.PI + 1) * 10;
      
      const cp1x = x1 + (x2 - x1) * 0.3 + (random() - 0.5) * 20 * config.variability;
      const cp1y = y1 - 15 - random() * 15 + slantRad * 10;
      const cp2x = x1 + (x2 - x1) * 0.7 + (random() - 0.5) * 20 * config.variability;
      const cp2y = y2 + 10 + random() * 10 - slantRad * 10;
      
      strokes.push({
        path: `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`,
        duration: 0.3,
        delay: index * 0.15 + i * 0.08,
        width: config.strokeWidth - random() * 1.5
      });
    }
  } else if (style === 'calligraphy') {
    const mainY = centerY;
    const topY = centerY - canvasHeight * 0.3;
    const bottomY = centerY + canvasHeight * 0.25;
    
    strokes.push({
      path: `M ${startX} ${mainY} Q ${startX + (endX - startX) * 0.3} ${topY + random() * 10}, ${startX + (endX - startX) * 0.5} ${mainY} T ${endX} ${mainY - 5 + random() * 10}`,
      duration: 0.3,
      delay: index * 0.15,
      width: config.strokeWidth
    });
    
    strokes.push({
      path: `M ${startX + 5} ${mainY - 20} C ${startX + 15} ${mainY - 35}, ${startX + 10} ${mainY + 10}, ${startX + 15} ${bottomY - 5}`,
      duration: 0.3,
      delay: index * 0.15 + 0.1,
      width: config.strokeWidth + 1
    });
    
    strokes.push({
      path: `M ${endX - 20} ${mainY - 10} C ${endX - 5} ${mainY - 25}, ${endX} ${mainY + 15}, ${endX - 10} ${bottomY}`,
      duration: 0.3,
      delay: index * 0.15 + 0.15,
      width: config.strokeWidth - 1
    });
  } else {
    const topY = centerY - canvasHeight * 0.25;
    const bottomY = centerY + canvasHeight * 0.2;
    
    strokes.push({
      path: `M ${startX + 5} ${topY} Q ${startX + (endX - startX) * 0.5} ${topY - 15 - random() * 10 * config.curveAmount}, ${endX - 5} ${topY}`,
      duration: 0.3,
      delay: index * 0.15,
      width: config.strokeWidth
    });
    
    strokes.push({
      path: `M ${startX + 8} ${topY + 5} C ${startX + 5} ${centerY}, ${startX + 10} ${bottomY - 10}, ${startX + 15} ${bottomY}`,
      duration: 0.3,
      delay: index * 0.15 + 0.1,
      width: config.strokeWidth
    });
    
    strokes.push({
      path: `M ${startX + 15} ${centerY - 10} Q ${(startX + endX) / 2 + (random() - 0.5) * 15} ${centerY + 10 + random() * 10 * config.curveAmount}, ${endX - 15} ${centerY - 5}`,
      duration: 0.3,
      delay: index * 0.15 + 0.15,
      width: config.strokeWidth - 0.5
    });
    
    strokes.push({
      path: `M ${endX - 10} ${topY + 3} C ${endX - 5} ${centerY - 5}, ${endX - 8} ${bottomY - 5}, ${endX - 15} ${bottomY}`,
      duration: 0.3,
      delay: index * 0.15 + 0.2,
      width: config.strokeWidth
    });
  }
  
  return strokes;
}

export function renderSignature(
  text: string,
  style: SignatureStyle,
  primaryColor: string,
  secondaryColor: string,
  width: number = 400,
  height: number = 150
): RenderedSignature {
  const chars = text.slice(0, 4).split('') || ['签', '名'];
  const allStrokes: Stroke[] = [];
  
  chars.forEach((char, index) => {
    const charStrokes = generateCharStrokes(char, index, chars.length, style, width, height);
    allStrokes.push(...charStrokes);
  });
  
  return {
    strokes: allStrokes,
    viewBox: `0 0 ${width} ${height}`,
    gradientId: `gradient-${style}-${Date.now()}`
  };
}

export function animateStroke(
  pathElement: SVGPathElement,
  duration: number = 0.3,
  delay: number = 0
): Promise<void> {
  return new Promise((resolve) => {
    const length = pathElement.getTotalLength();
    pathElement.style.strokeDasharray = `${length}`;
    pathElement.style.strokeDashoffset = `${length}`;
    pathElement.style.opacity = '0';
    
    requestAnimationFrame(() => {
      pathElement.style.transition = `stroke-dashoffset ${duration}s ease-out ${delay}s, opacity 0.1s ease-out ${delay}s`;
      pathElement.style.opacity = '1';
      
      requestAnimationFrame(() => {
        pathElement.style.strokeDashoffset = '0';
      });
      
      setTimeout(() => {
        resolve();
      }, (duration + delay) * 1000 + 50);
    });
  });
}

export function getColorForStroke(
  strokeIndex: number,
  totalStrokes: number,
  primaryColor: string,
  secondaryColor: string
): string {
  const t = totalStrokes <= 1 ? 0 : strokeIndex / (totalStrokes - 1);
  return interpolateColor(primaryColor, secondaryColor, t);
}
