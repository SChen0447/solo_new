export type SignatureStyle = 'handwriting' | 'calligraphy' | 'cartoon';

export interface Stroke {
  path: string;
  duration: number;
  delay: number;
  width: number;
  positionX: number;
  positionY: number;
}

export interface CharStrokeData {
  strokes: Stroke[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface RenderedSignature {
  strokes: Stroke[];
  viewBox: string;
  gradientId: string;
  charPositions: Array<{ char: string; centerX: number; width: number }>;
}

const styleConfigs: Record<SignatureStyle, {
  baseWidth: number;
  slant: number;
  variability: number;
  curveAmount: number;
  widthVariation: number;
  pressureEffect: number;
}> = {
  handwriting: { baseWidth: 2.8, slant: -10, variability: 0.55, curveAmount: 0.7, widthVariation: 0.4, pressureEffect: 0.6 },
  calligraphy: { baseWidth: 5, slant: -6, variability: 0.25, curveAmount: 0.35, widthVariation: 0.6, pressureEffect: 0.9 },
  cartoon: { baseWidth: 3.8, slant: 5, variability: 0.65, curveAmount: 0.9, widthVariation: 0.3, pressureEffect: 0.3 }
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

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let { r, g, b } = hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return rgbToHex(r * 255, g * 255, b * 255);
}

export function adjustColorBrightness(hex: string, percent: number): string {
  const hsl = hexToHsl(hex);
  const newL = Math.max(5, Math.min(90, hsl.l + percent));
  return hslToHex(hsl.h, hsl.s, newL);
}

function interpolateColorHSL(color1: string, color2: string, t: number): string {
  const hsl1 = hexToHsl(color1);
  const hsl2 = hexToHsl(color2);
  
  let hDiff = hsl2.h - hsl1.h;
  if (Math.abs(hDiff) > 180) {
    hDiff = hDiff > 0 ? hDiff - 360 : hDiff + 360;
  }
  
  const sDiff = hsl2.s - hsl1.s;
  const lDiff = hsl2.l - hsl1.l;
  
  return hslToHex(
    hsl1.h + hDiff * t,
    hsl1.s + sDiff * t,
    hsl1.l + lDiff * t
  );
}

export function interpolateColor(color1: string, color2: string, t: number): string {
  return interpolateColorHSL(color1, hslToHex(
    hexToHsl(color2).h,
    Math.max(hexToHsl(color2).s, hexToHsl(color1).s * 0.6 + 20),
    hexToHsl(color1).l > hexToHsl(color2).l 
      ? hexToHsl(color2).l 
      : Math.min(hexToHsl(color2).l, hexToHsl(color1).l * 0.8 + 15)
  ), t);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function getCharStrokeFeatures(char: string): {
  strokeCount: number;
  complexity: number;
  symmetry: number;
  radical: 'left' | 'right' | 'top' | 'bottom' | 'enclosure' | 'none';
  hasEnclosure: boolean;
  hasCrossStroke: boolean;
  hasDiagonal: boolean;
  seed: number;
} {
  const code = char.charCodeAt(0);
  const seed = code * 31 + 7;
  const rand = seededRandom(seed);
  
  let strokeCount: number;
  if (code >= 0x4e00 && code <= 0x9fff) {
    const base = ((code - 0x4e00) % 36) + 1;
    const adjustment = Math.floor(rand() * 8) - 4;
    strokeCount = Math.max(3, Math.min(18, base + adjustment));
  } else {
    strokeCount = 3 + Math.floor(rand() * 4);
  }
  
  const complexity = (strokeCount / 15) * 0.6 + rand() * 0.4;
  const symmetry = rand() * 0.8;
  const hasEnclosure = rand() > 0.6;
  const hasCrossStroke = rand() > 0.4;
  const hasDiagonal = rand() > 0.35;
  
  let radical: 'left' | 'right' | 'top' | 'bottom' | 'enclosure' | 'none' = 'none';
  const rVal = rand();
  if (hasEnclosure && rVal > 0.7) {
    radical = 'enclosure';
  } else if (rVal > 0.55) {
    radical = 'left';
  } else if (rVal > 0.4) {
    radical = 'top';
  } else if (rVal > 0.25) {
    radical = 'right';
  }
  
  return { strokeCount, complexity, symmetry, radical, hasEnclosure, hasCrossStroke, hasDiagonal, seed };
}

type StrokeType = 'horizontal' | 'vertical' | 'left-falling' | 'right-falling' | 'dot' | 'hook' | 'turn' | 'cross';

function getStrokeType(
  strokeIndex: number,
  totalStrokes: number,
  features: ReturnType<typeof getCharStrokeFeatures>,
  rand: () => number
): StrokeType {
  const progress = strokeIndex / Math.max(1, totalStrokes - 1);
  const types: StrokeType[] = ['horizontal', 'vertical'];
  
  if (features.hasDiagonal) {
    types.push('left-falling', 'right-falling');
  }
  if (strokeIndex >= totalStrokes - 2) {
    types.push('dot', 'hook');
  }
  if (features.complexity > 0.4) {
    types.push('turn');
  }
  if (features.hasCrossStroke && progress > 0.3 && progress < 0.7) {
    types.push('cross');
  }
  
  const weights = types.map((_, i) => 1 + rand() * 0.5);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = rand() * totalWeight;
  for (let i = 0; i < types.length; i++) {
    r -= weights[i];
    if (r <= 0) return types[i];
  }
  return types[0];
}

function generateStrokePath(
  type: StrokeType,
  startX: number,
  startY: number,
  charWidth: number,
  charHeight: number,
  style: SignatureStyle,
  rand: () => number,
  strokeIndex: number,
  totalStrokes: number
): { path: string; endX: number; endY: number; centerX: number } {
  const config = styleConfigs[style];
  const progress = strokeIndex / Math.max(1, totalStrokes - 1);
  const vary = (v: number) => (rand() - 0.5) * v * config.variability;
  
  const slant = (config.slant * Math.PI) / 180;
  const slantOffset = (y: number) => Math.tan(slant) * (y - charHeight * 0.5) * 0.3;
  
  let path = '';
  let endX = startX;
  let endY = startY;
  let centerX = startX + charWidth * 0.5;
  
  const zoneLeft = startX + charWidth * 0.08;
  const zoneRight = startX + charWidth * 0.92;
  const zoneTop = charHeight * 0.12;
  const zoneBottom = charHeight * 0.88;
  const zoneMidY = (zoneTop + zoneBottom) / 2;
  
  switch (type) {
    case 'horizontal': {
      const y = zoneTop + progress * (zoneBottom - zoneTop) * 0.7 + vary(8);
      const x1 = zoneLeft + vary(6) + slantOffset(y);
      const x2 = zoneRight + vary(6) + slantOffset(y);
      const cpY = y + (rand() > 0.5 ? 1 : -1) * (3 + rand() * 5) * config.curveAmount;
      const midX = (x1 + x2) / 2;
      centerX = midX;
      path = `M ${x1.toFixed(1)} ${y.toFixed(1)} C ${(midX - 8).toFixed(1)} ${(cpY - 2).toFixed(1)}, ${(midX + 8).toFixed(1)} ${cpY.toFixed(1)}, ${x2.toFixed(1)} ${y.toFixed(1)}`;
      endX = x2; endY = y;
      break;
    }
    case 'vertical': {
      const x = zoneLeft + (zoneRight - zoneLeft) * (progress * 0.6 + 0.2) + vary(8);
      const y1 = zoneTop + vary(5);
      const y2 = zoneBottom - vary(5);
      const midY = (y1 + y2) / 2;
      const cpX = x + (rand() > 0.5 ? 1 : -1) * (2 + rand() * 4) * config.curveAmount;
      centerX = x + slantOffset(midY);
      path = `M ${(x + slantOffset(y1)).toFixed(1)} ${y1.toFixed(1)} C ${(cpX + slantOffset(midY - 10)).toFixed(1)} ${(midY - 10).toFixed(1)}, ${(cpX + slantOffset(midY + 10)).toFixed(1)} ${(midY + 10).toFixed(1)}, ${(x + slantOffset(y2)).toFixed(1)} ${y2.toFixed(1)}`;
      endX = x + slantOffset(y2); endY = y2;
      break;
    }
    case 'left-falling': {
      const x1 = zoneRight - charWidth * 0.2 + vary(8);
      const y1 = zoneTop + charHeight * 0.1 + vary(6);
      const x2 = zoneLeft + charWidth * 0.15 + vary(8);
      const y2 = zoneBottom - charHeight * 0.05 + vary(5);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const curveX = midX + (x2 - x1) * 0.15 * config.curveAmount;
      const curveY = midY + (y2 - y1) * 0.05;
      centerX = midX;
      path = `M ${(x1 + slantOffset(y1)).toFixed(1)} ${y1.toFixed(1)} Q ${(curveX + slantOffset(curveY)).toFixed(1)} ${curveY.toFixed(1)}, ${(x2 + slantOffset(y2)).toFixed(1)} ${y2.toFixed(1)}`;
      endX = x2 + slantOffset(y2); endY = y2;
      break;
    }
    case 'right-falling': {
      const x1 = zoneLeft + charWidth * 0.2 + vary(8);
      const y1 = zoneTop + charHeight * 0.15 + vary(6);
      const x2 = zoneRight - charWidth * 0.1 + vary(8);
      const y2 = zoneBottom - charHeight * 0.08 + vary(5);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const tailX = x2 + charWidth * 0.08 * config.curveAmount;
      const tailY = y2 + 3;
      centerX = midX;
      path = `M ${(x1 + slantOffset(y1)).toFixed(1)} ${y1.toFixed(1)} Q ${(midX + slantOffset(midY)).toFixed(1)} ${(midY + 3).toFixed(1)}, ${(x2 + slantOffset(y2)).toFixed(1)} ${y2.toFixed(1)} T ${(tailX + slantOffset(tailY)).toFixed(1)} ${tailY.toFixed(1)}`;
      endX = tailX + slantOffset(tailY); endY = tailY;
      break;
    }
    case 'dot': {
      const x = zoneLeft + (zoneRight - zoneLeft) * rand() + vary(4);
      const y = zoneTop + charHeight * 0.15 + progress * (zoneBottom - zoneTop - charHeight * 0.3) + vary(4);
      const r = 2.5 + rand() * 2.5;
      centerX = x + slantOffset(y);
      const sx = x + slantOffset(y);
      path = `M ${sx.toFixed(1)} ${(y - r).toFixed(1)} C ${(sx + r * 1.2).toFixed(1)} ${(y - r * 0.5).toFixed(1)}, ${(sx + r * 0.8).toFixed(1)} ${(y + r * 0.8).toFixed(1)}, ${sx.toFixed(1)} ${(y + r * 0.5).toFixed(1)} S ${(sx - r * 1.2).toFixed(1)} ${(y - r * 0.3).toFixed(1)}, ${sx.toFixed(1)} ${(y - r).toFixed(1)}`;
      endX = sx; endY = y;
      break;
    }
    case 'hook': {
      const x = zoneLeft + (zoneRight - zoneLeft) * (0.3 + progress * 0.5) + vary(6);
      const y1 = zoneTop + charHeight * 0.12 + vary(5);
      const y2 = zoneBottom - charHeight * 0.12 + vary(4);
      const hookDir = rand() > 0.5 ? 1 : -1;
      const hookLen = charWidth * 0.15 + rand() * charWidth * 0.1;
      const midY = (y1 + y2) / 2;
      centerX = x + slantOffset(y2);
      path = `M ${(x + slantOffset(y1)).toFixed(1)} ${y1.toFixed(1)} C ${(x + slantOffset(midY)).toFixed(1)} ${(midY - 3).toFixed(1)}, ${(x + hookDir * 3 + slantOffset(y2)).toFixed(1)} ${y2.toFixed(1)}, ${(x + slantOffset(y2)).toFixed(1)} ${y2.toFixed(1)} Q ${(x + hookDir * hookLen * 0.6 + slantOffset(y2 - 5)).toFixed(1)} ${(y2 - 8).toFixed(1)}, ${(x + hookDir * hookLen + slantOffset(y2 - 3)).toFixed(1)} ${(y2 - 3).toFixed(1)}`;
      endX = x + hookDir * hookLen + slantOffset(y2 - 3); endY = y2 - 3;
      break;
    }
    case 'turn': {
      const x1 = zoneLeft + charWidth * 0.15 + vary(6);
      const y1 = zoneTop + charHeight * (0.15 + progress * 0.4) + vary(5);
      const turnX = zoneLeft + charWidth * (0.55 + rand() * 0.3);
      const turnY = zoneTop + charHeight * (0.35 + progress * 0.3);
      const x2 = turnX + vary(4);
      const y2 = zoneBottom - charHeight * 0.1 + vary(5);
      centerX = turnX;
      path = `M ${(x1 + slantOffset(y1)).toFixed(1)} ${y1.toFixed(1)} C ${((x1 + turnX) / 2 + slantOffset(y1)).toFixed(1)} ${y1.toFixed(1)}, ${(turnX + slantOffset(turnY - 5)).toFixed(1)} ${(turnY - 5).toFixed(1)}, ${(turnX + slantOffset(turnY)).toFixed(1)} ${turnY.toFixed(1)} S ${(x2 + slantOffset((turnY + y2) / 2)).toFixed(1)} ${((turnY + y2) / 2 + 5).toFixed(1)}, ${(x2 + slantOffset(y2)).toFixed(1)} ${y2.toFixed(1)}`;
      endX = x2 + slantOffset(y2); endY = y2;
      break;
    }
    case 'cross': {
      const x1 = zoneLeft + charWidth * 0.12;
      const y1 = zoneTop + charHeight * 0.3 + progress * charHeight * 0.35;
      const x2 = zoneRight - charWidth * 0.12;
      const y2 = y1;
      const vx = (x1 + x2) / 2;
      const vy1 = zoneTop + charHeight * 0.08;
      const vy2 = zoneBottom - charHeight * 0.15;
      centerX = vx;
      path = `M ${(x1 + slantOffset(y1)).toFixed(1)} ${y1.toFixed(1)} L ${(x2 + slantOffset(y2)).toFixed(1)} ${y2.toFixed(1)} M ${(vx + slantOffset(vy1)).toFixed(1)} ${vy1.toFixed(1)} L ${(vx + slantOffset(vy2)).toFixed(1)} ${vy2.toFixed(1)}`;
      endX = vx + slantOffset(vy2); endY = vy2;
      break;
    }
  }
  
  return { path, endX, endY, centerX };
}

function generateCharStrokes(
  char: string,
  charIndex: number,
  totalChars: number,
  style: SignatureStyle,
  canvasWidth: number,
  canvasHeight: number
): CharStrokeData {
  const config = styleConfigs[style];
  const features = getCharStrokeFeatures(char);
  const rand = seededRandom(features.seed + charIndex * 131 + style.length * 17);
  
  const strokes: Stroke[] = [];
  
  const padding = canvasWidth * 0.03;
  const usableWidth = canvasWidth - padding * 2;
  const charSlotWidth = usableWidth / totalChars;
  const charSpacing = charSlotWidth * 0.06;
  const charWidth = charSlotWidth - charSpacing;
  const startX = padding + charIndex * charSlotWidth + charSpacing / 2;
  
  const strokeDelayBase = charIndex * 0.18;
  const interStrokeGap = 0.06 + rand() * 0.04;
  
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  for (let i = 0; i < features.strokeCount; i++) {
    const strokeType = getStrokeType(i, features.strokeCount, features, rand);
    const strokeStartY = canvasHeight * 0.1;
    
    const { path, centerX } = generateStrokePath(
      strokeType,
      startX,
      strokeStartY,
      charWidth,
      canvasHeight,
      style,
      rand,
      i,
      features.strokeCount
    );
    
    const pressureVariation = 1 + Math.sin(i * 1.3) * config.pressureEffect * 0.3;
    const baseStrokeWidth = config.baseWidth * pressureVariation;
    const widthVar = (rand() - 0.3) * config.widthVariation;
    const strokeWidth = Math.max(1.2, baseStrokeWidth + widthVar);
    
    const centerY = canvasHeight * 0.45 + (i / features.strokeCount - 0.5) * canvasHeight * 0.2;
    
    minX = Math.min(minX, centerX - charWidth * 0.5);
    maxX = Math.max(maxX, centerX + charWidth * 0.5);
    minY = Math.min(minY, centerY - canvasHeight * 0.35);
    maxY = Math.max(maxY, centerY + canvasHeight * 0.35);
    
    strokes.push({
      path,
      duration: 0.28 + rand() * 0.06,
      delay: strokeDelayBase + i * interStrokeGap,
      width: strokeWidth,
      positionX: centerX,
      positionY: centerY
    });
  }
  
  return {
    strokes,
    bounds: { minX, maxX, minY, maxY }
  };
}

export function renderSignature(
  text: string,
  style: SignatureStyle,
  primaryColor: string,
  secondaryColor: string,
  width: number = 400,
  height: number = 150
): RenderedSignature {
  const cleanText = (text && text.trim().length > 0) ? text.trim().slice(0, 4) : '签名';
  const chars = cleanText.split('');
  
  const allStrokes: Stroke[] = [];
  const charPositions: Array<{ char: string; centerX: number; width: number }> = [];
  
  chars.forEach((char, index) => {
    const charData = generateCharStrokes(char, index, chars.length, style, width, height);
    allStrokes.push(...charData.strokes);
    
    const padding = width * 0.03;
    const usableWidth = width - padding * 2;
    const charSlotWidth = usableWidth / chars.length;
    const centerX = padding + index * charSlotWidth + charSlotWidth / 2;
    
    charPositions.push({
      char,
      centerX,
      width: charSlotWidth * 0.88
    });
  });
  
  return {
    strokes: allStrokes,
    viewBox: `0 0 ${width} ${height}`,
    gradientId: `gradient-${style}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    charPositions
  };
}

export function animateStroke(
  pathElement: SVGPathElement,
  duration: number = 0.3,
  delay: number = 0
): Promise<void> {
  return new Promise((resolve) => {
    const length = pathElement.getTotalLength();
    if (length === 0 || !isFinite(length)) {
      pathElement.style.opacity = '0';
      setTimeout(() => {
        pathElement.style.transition = `opacity ${Math.max(duration, 0.15)}s ease-out ${delay}s`;
        pathElement.style.opacity = '1';
        setTimeout(resolve, (duration + delay) * 1000 + 50);
      }, 10);
      return;
    }
    
    pathElement.style.strokeDasharray = `${length}`;
    pathElement.style.strokeDashoffset = `${length}`;
    pathElement.style.opacity = '0';
    pathElement.style.willChange = 'stroke-dashoffset, opacity';
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        pathElement.style.transition = `stroke-dashoffset ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}s, opacity 0.12s ease-out ${delay}s`;
        pathElement.style.opacity = '1';
        pathElement.style.strokeDashoffset = '0';
        
        setTimeout(() => {
          pathElement.style.willChange = 'auto';
          resolve();
        }, (duration + delay) * 1000 + 60);
      });
    });
  });
}

export function getColorForStroke(
  stroke: Stroke,
  allStrokes: Stroke[],
  charPositions: Array<{ char: string; centerX: number; width: number }>,
  primaryColor: string,
  secondaryColor: string,
  canvasWidth: number
): string {
  const hsl1 = hexToHsl(primaryColor);
  const hsl2 = hexToHsl(secondaryColor);
  
  const minBrightness = Math.min(hsl1.l, hsl2.l);
  const maxBrightness = Math.max(hsl1.l, hsl2.l);
  const brightDiff = Math.abs(hsl1.l - hsl2.l);
  
  const minSat = Math.min(hsl1.s, hsl2.s);
  const maxSat = Math.max(hsl1.s, hsl2.s);
  const satDiff = Math.abs(hsl1.s - hsl2.s);
  
  let boostedColor2 = secondaryColor;
  if (brightDiff < 12) {
    const darker = hsl1.l < hsl2.l ? hsl1 : hsl2;
    const lighter = hsl1.l >= hsl2.l ? hsl1 : hsl2;
    const newDark = hslToHex(darker.h, Math.max(maxSat, minSat + 15), Math.max(10, darker.l - 15));
    const newLight = hslToHex(lighter.h, Math.max(maxSat, minSat + 10), Math.min(85, lighter.l + 12));
    const [c1, c2] = hsl1.l < hsl2.l ? [newDark, newLight] : [newLight, newDark];
    boostedColor2 = hsl1.l < hsl2.l ? c2 : c1;
    primaryColor = hsl1.l < hsl2.l ? c1 : primaryColor;
    if (hsl1.l >= hsl2.l) primaryColor = c1;
  }
  
  if (satDiff < 15 && brightDiff < 20) {
    const avgHue = (hsl1.h + hsl2.h) / 2;
    boostedColor2 = hslToHex(
      (hsl2.h + 25) % 360,
      Math.max(maxSat, minSat + 25),
      Math.min(80, maxBrightness + 8)
    );
    primaryColor = hslToHex(
      avgHue,
      Math.max(maxSat, minSat + 20),
      maxBrightness
    );
  }
  
  const padding = canvasWidth * 0.03;
  const usableWidth = canvasWidth - padding * 2;
  
  const relativeX = (stroke.positionX - padding) / usableWidth;
  const clampedX = Math.max(0, Math.min(1, relativeX));
  
  const strokeIndex = allStrokes.indexOf(stroke);
  const indexT = allStrokes.length <= 1 ? 0 : strokeIndex / (allStrokes.length - 1);
  
  const yT = (stroke.positionY - canvasWidth * 0.1) / (canvasWidth * 0.7);
  const yFactor = Math.max(0, Math.min(1, yT)) * 0.15;
  
  const t = clampedX * 0.7 + indexT * 0.25 + yFactor * 0.05;
  const finalT = Math.max(0, Math.min(1, t));
  
  const smoothT = finalT < 0.5
    ? 4 * finalT * finalT * finalT
    : 1 - Math.pow(-2 * finalT + 2, 3) / 2;
  
  return interpolateColor(primaryColor, boostedColor2, smoothT);
}

export { hexToHsl, hslToHex };
