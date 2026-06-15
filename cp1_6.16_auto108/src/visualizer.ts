import type { AnalysisResult, ElementData, AlignmentPair } from './analyzer';

const COLOR_GREEN = '#4CAF50';
const COLOR_YELLOW = '#FFC107';
const COLOR_RED = '#F44336';
const COLOR_GUIDE = '#2196F3';

export interface RenderOptions {
  zoom: number;
  offsetX: number;
  offsetY: number;
  hoveredElementId: string | null;
  selectedElementId: string | null;
  showGuides: boolean;
  showLabels: boolean;
  showGroupColors: boolean;
}

export function getDeviationColor(deviation: number): string {
  if (deviation < 5) return COLOR_GREEN;
  if (deviation <= 15) return COLOR_YELLOW;
  return COLOR_RED;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function renderAnalysis(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  result: AnalysisResult | null,
  containerWidth: number,
  containerHeight: number,
  options: RenderOptions
): { displayWidth: number; displayHeight: number; scale: number } {
  ctx.clearRect(0, 0, containerWidth, containerHeight);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, containerWidth, containerHeight);

  if (!image) {
    ctx.fillStyle = '#9E9E9E';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('请上传网页截图或输入URL开始分析', containerWidth / 2, containerHeight / 2);
    return { displayWidth: 0, displayHeight: 0, scale: 1 };
  }

  const imgRatio = image.width / image.height;
  const containerRatio = containerWidth / containerHeight;

  let displayWidth: number;
  let displayHeight: number;

  if (imgRatio > containerRatio) {
    displayWidth = containerWidth * 0.96;
    displayHeight = displayWidth / imgRatio;
  } else {
    displayHeight = containerHeight * 0.92;
    displayWidth = displayHeight * imgRatio;
  }

  const baseScale = displayWidth / image.width;
  const finalScale = baseScale * options.zoom;
  const finalWidth = image.width * finalScale;
  const finalHeight = image.height * finalScale;

  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const drawX = centerX - finalWidth / 2 + options.offsetX;
  const drawY = centerY - finalHeight / 2 + options.offsetY;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, drawX, drawY, finalWidth, finalHeight);
  ctx.restore();

  if (!result) {
    return { displayWidth, displayHeight, scale: finalScale };
  }

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.scale(finalScale, finalScale);

  if (options.showGroupColors) {
    drawGroupBackgrounds(ctx, result);
  }

  if (options.showGuides) {
    drawAlignmentGuides(ctx, result);
  }

  drawElementBoxes(ctx, result, options);

  if (options.showLabels) {
    drawDeviationLabels(ctx, result, options, finalScale);
  }

  drawArrowsForDeviations(ctx, result, finalScale);

  ctx.restore();

  return { displayWidth, displayHeight, scale: finalScale };
}

function drawGroupBackgrounds(ctx: CanvasRenderingContext2D, result: AnalysisResult) {
  result.groups.forEach((group) => {
    const groupElements = result.elements.filter(
      (e) => group.elementIds.includes(e.id) && !e.excluded
    );
    if (groupElements.length < 2) return;

    const padding = 8;
    const minX = Math.min(...groupElements.map((e) => e.bbox.x)) - padding;
    const minY = Math.min(...groupElements.map((e) => e.bbox.y)) - padding;
    const maxX = Math.max(...groupElements.map((e) => e.bbox.x + e.bbox.width)) + padding;
    const maxY = Math.max(...groupElements.map((e) => e.bbox.y + e.bbox.height)) + padding;

    ctx.save();
    ctx.fillStyle = hexToRgba(group.color, 0.18);
    ctx.strokeStyle = group.color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    roundRect(ctx, minX, minY, maxX - minX, maxY - minY, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

function drawAlignmentGuides(ctx: CanvasRenderingContext2D, result: AnalysisResult) {
  const activeElements = result.elements.filter((e) => !e.excluded);
  if (activeElements.length < 2) return;

  const leftEdges = new Map<number, ElementData[]>();
  const rightEdges = new Map<number, ElementData[]>();
  const centerXs = new Map<number, ElementData[]>();
  const topEdges = new Map<number, ElementData[]>();
  const bottomEdges = new Map<number, ElementData[]>();
  const centerYs = new Map<number, ElementData[]>();

  const snap = 8;
  activeElements.forEach((el) => {
    const lk = Math.round(el.bbox.x / snap) * snap;
    const rk = Math.round((el.bbox.x + el.bbox.width) / snap) * snap;
    const cxk = Math.round(el.centerX / snap) * snap;
    const tk = Math.round(el.bbox.y / snap) * snap;
    const bk = Math.round((el.bbox.y + el.bbox.height) / snap) * snap;
    const cyk = Math.round(el.centerY / snap) * snap;

    if (!leftEdges.has(lk)) leftEdges.set(lk, []);
    leftEdges.get(lk)!.push(el);
    if (!rightEdges.has(rk)) rightEdges.set(rk, []);
    rightEdges.get(rk)!.push(el);
    if (!centerXs.has(cxk)) centerXs.set(cxk, []);
    centerXs.get(cxk)!.push(el);
    if (!topEdges.has(tk)) topEdges.set(tk, []);
    topEdges.get(tk)!.push(el);
    if (!bottomEdges.has(bk)) bottomEdges.set(bk, []);
    bottomEdges.get(bk)!.push(el);
    if (!centerYs.has(cyk)) centerYs.set(cyk, []);
    centerYs.get(cyk)!.push(el);
  });

  ctx.save();
  ctx.strokeStyle = COLOR_GUIDE;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.globalAlpha = 0.5;

  const minX = Math.min(...activeElements.map((e) => e.bbox.x)) - 50;
  const maxX = Math.max(...activeElements.map((e) => e.bbox.x + e.bbox.width)) + 50;
  const minY = Math.min(...activeElements.map((e) => e.bbox.y)) - 50;
  const maxY = Math.max(...activeElements.map((e) => e.bbox.y + e.bbox.height)) + 50;

  function drawVerticalGuide(x: number, elements: ElementData[]) {
    if (elements.length < 2) return;
    const top = Math.min(...elements.map((e) => e.bbox.y));
    const bottom = Math.max(...elements.map((e) => e.bbox.y + e.bbox.height));
    ctx.beginPath();
    ctx.moveTo(x, top - 20);
    ctx.lineTo(x, bottom + 20);
    ctx.stroke();
  }

  function drawHorizontalGuide(y: number, elements: ElementData[]) {
    if (elements.length < 2) return;
    const left = Math.min(...elements.map((e) => e.bbox.x));
    const right = Math.max(...elements.map((e) => e.bbox.x + e.bbox.width));
    ctx.beginPath();
    ctx.moveTo(left - 20, y);
    ctx.lineTo(right + 20, y);
    ctx.stroke();
  }

  leftEdges.forEach((elements, x) => drawVerticalGuide(x, elements));
  rightEdges.forEach((elements, x) => drawVerticalGuide(x, elements));
  centerXs.forEach((elements, x) => drawVerticalGuide(x, elements));
  topEdges.forEach((elements, y) => drawHorizontalGuide(y, elements));
  bottomEdges.forEach((elements, y) => drawHorizontalGuide(y, elements));
  centerYs.forEach((elements, y) => drawHorizontalGuide(y, elements));

  ctx.restore();
}

function drawElementBoxes(
  ctx: CanvasRenderingContext2D,
  result: AnalysisResult,
  options: RenderOptions
) {
  result.elements.forEach((element) => {
    const isHovered = options.hoveredElementId === element.id;
    const isSelected = options.selectedElementId === element.id;
    const isExcluded = element.excluded;

    const color = getDeviationColor(element.maxDeviation);
    const lineWidth = isHovered || isSelected ? 4 : 2;

    ctx.save();

    if (isHovered || isSelected) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
    }

    ctx.globalAlpha = isExcluded ? 0.25 : 0.85;
    ctx.fillStyle = hexToRgba(color, 0.15);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);

    roundRect(
      ctx,
      element.bbox.x - lineWidth / 2,
      element.bbox.y - lineWidth / 2,
      element.bbox.width + lineWidth,
      element.bbox.height + lineWidth,
      4
    );
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  });
}

function drawDeviationLabels(
  ctx: CanvasRenderingContext2D,
  result: AnalysisResult,
  options: RenderOptions,
  scale: number
) {
  result.elements.forEach((element) => {
    if (element.excluded) return;

    const color = getDeviationColor(element.maxDeviation);
    const value = Math.round(element.maxDeviation);
    const label = `${value}px`;

    const fontSize = Math.max(10, 12 / scale);
    ctx.save();
    ctx.font = `600 ${fontSize}px sans-serif`;

    const textMetrics = ctx.measureText(label);
    const padding = 4 / scale;
    const labelWidth = textMetrics.width + padding * 2;
    const labelHeight = fontSize + padding * 2;

    let labelX = element.bbox.x + element.bbox.width / 2 - labelWidth / 2;
    let labelY = element.bbox.y + element.bbox.height / 2 - labelHeight / 2;

    if (element.bbox.width < labelWidth || element.bbox.height < labelHeight) {
      labelX = element.bbox.x;
      labelY = element.bbox.y - labelHeight - 4 / scale;
    }

    ctx.fillStyle = color;
    roundRect(ctx, labelX, labelY, labelWidth, labelHeight, 3 / scale);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, labelX + labelWidth / 2, labelY + labelHeight / 2);

    ctx.restore();
  });
}

function drawArrowsForDeviations(
  ctx: CanvasRenderingContext2D,
  result: AnalysisResult,
  scale: number
) {
  const significantPairs = result.pairs.filter(
    (p) => Math.abs(p.horizontalDeviation) > 15 || Math.abs(p.verticalDeviation) > 15
  );

  if (significantPairs.length === 0) return;

  const elementMap = new Map(result.elements.map((e) => [e.id, e]));
  const drawn = new Set<string>();

  ctx.save();
  ctx.strokeStyle = COLOR_RED;
  ctx.fillStyle = COLOR_RED;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.7;

  significantPairs.slice(0, 15).forEach((pair) => {
    const a = elementMap.get(pair.elementA);
    const b = elementMap.get(pair.elementB);
    if (!a || !b || a.excluded || b.excluded) return;

    const pairKey = [pair.elementA, pair.elementB].sort().join('|');
    if (drawn.has(pairKey)) return;
    drawn.add(pairKey);

    if (Math.abs(pair.verticalDeviation) > 15) {
      const startX = Math.min(a.centerX, b.centerX);
      const startY = a.bbox.y;
      const endX = startX;
      const endY = b.bbox.y;

      drawArrow(ctx, startX, startY, endX, endY);

      const midY = (startY + endY) / 2;
      const fontSize = Math.max(9, 11 / scale);
      ctx.font = `600 ${fontSize}px sans-serif`;
      const label = `ΔY ${Math.round(Math.abs(pair.verticalDeviation))}px`;
      const tw = ctx.measureText(label).width;

      ctx.fillStyle = 'rgba(244, 67, 54, 0.9)';
      roundRect(ctx, startX + 5 / scale, midY - fontSize, tw + 8 / scale, fontSize + 8 / scale, 2 / scale);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, startX + 9 / scale, midY - fontSize / 2 + 4 / scale);
      ctx.fillStyle = COLOR_RED;
    }

    if (Math.abs(pair.horizontalDeviation) > 15) {
      const startX = a.bbox.x;
      const startY = Math.min(a.centerY, b.centerY);
      const endX = b.bbox.x;
      const endY = startY;

      drawArrow(ctx, startX, startY, endX, endY);

      const midX = (startX + endX) / 2;
      const fontSize = Math.max(9, 11 / scale);
      ctx.font = `600 ${fontSize}px sans-serif`;
      const label = `ΔX ${Math.round(Math.abs(pair.horizontalDeviation))}px`;
      const tw = ctx.measureText(label).width;

      ctx.fillStyle = 'rgba(244, 67, 54, 0.9)';
      roundRect(ctx, midX - tw / 2 - 4 / scale, startY + 5 / scale, tw + 8 / scale, fontSize + 8 / scale, 2 / scale);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, midX, startY + fontSize / 2 + 9 / scale);
    }
  });

  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) {
  const headLen = 8;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLen * Math.cos(angle - Math.PI / 6),
    toY - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLen * Math.cos(angle + Math.PI / 6),
    toY - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function getElementAtPosition(
  mouseX: number,
  mouseY: number,
  image: HTMLImageElement | null,
  result: AnalysisResult | null,
  containerWidth: number,
  containerHeight: number,
  options: RenderOptions
): ElementData | null {
  if (!image || !result) return null;

  const imgRatio = image.width / image.height;
  const containerRatio = containerWidth / containerHeight;

  let displayWidth: number;
  let displayHeight: number;

  if (imgRatio > containerRatio) {
    displayWidth = containerWidth * 0.96;
    displayHeight = displayWidth / imgRatio;
  } else {
    displayHeight = containerHeight * 0.92;
    displayWidth = displayHeight * imgRatio;
  }

  const baseScale = displayWidth / image.width;
  const finalScale = baseScale * options.zoom;
  const finalWidth = image.width * finalScale;
  const finalHeight = image.height * finalScale;

  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const drawX = centerX - finalWidth / 2 + options.offsetX;
  const drawY = centerY - finalHeight / 2 + options.offsetY;

  const relativeX = mouseX - drawX;
  const relativeY = mouseY - drawY;

  if (relativeX < 0 || relativeY < 0 || relativeX > finalWidth || relativeY > finalHeight) {
    return null;
  }

  const imageX = relativeX / finalScale;
  const imageY = relativeY / finalScale;

  let matched: ElementData | null = null;
  let smallestArea = Infinity;

  for (const element of result.elements) {
    if (element.excluded) continue;
    const { x, y, width, height } = element.bbox;
    if (imageX >= x && imageX <= x + width && imageY >= y && imageY <= y + height) {
      const area = width * height;
      if (area < smallestArea) {
        smallestArea = area;
        matched = element;
      }
    }
  }

  return matched;
}
