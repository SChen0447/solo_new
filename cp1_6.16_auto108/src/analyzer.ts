import _ from 'lodash';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementData {
  id: string;
  name: string;
  bbox: BoundingBox;
  centerX: number;
  centerY: number;
  area: number;
  excluded?: boolean;
  groupId?: string;
  maxDeviation: number;
  horizontalDeviation: number;
  verticalDeviation: number;
  spacingDeviation: number;
}

export interface AlignmentPair {
  elementA: string;
  elementB: string;
  horizontalDeviation: number;
  verticalDeviation: number;
  spacingH: number;
  spacingV: number;
}

export interface ElementGroup {
  id: string;
  name: string;
  color: string;
  elementIds: string[];
  avgHorizontalDeviation: number;
  avgVerticalDeviation: number;
  spacingVariance: number;
  suggestion: string;
  corrected?: boolean;
}

export interface AnalysisResult {
  elements: ElementData[];
  groups: ElementGroup[];
  pairs: AlignmentPair[];
  overallScore: number;
  horizontalScore: number;
  verticalScore: number;
  spacingScore: number;
  totalElements: number;
  alignedWell: number;
  warnings: number;
  errors: number;
  horizontalDeviations: number[];
  verticalDeviations: number[];
  spacingDeviations: number[];
  imageWidth: number;
  imageHeight: number;
}

const GROUP_COLORS = [
  '#BBDEFB',
  '#C8E6C9',
  '#FFE0B2',
  '#F8BBD0',
  '#E1BEE7',
  '#B2EBF2',
  '#FFF9C4',
  '#D7CCC8',
];

const GROUP_NAMES = [
  '导航栏组',
  '卡片列表组',
  '标题组',
  '内容块组',
  '按钮组',
  '表单组',
  '侧边栏组',
  '页脚组',
  '图标组',
  '图片组',
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}

export function analyzeImage(
  imageData: ImageData,
  progressCallback?: (progress: number, status: string) => void
): AnalysisResult {
  const { width: imgWidth, height: imgHeight, data } = imageData;

  if (progressCallback) progressCallback(0.05, '正在解析图像像素...');

  const elements = detectElements(imgWidth, imgHeight, data, progressCallback);

  if (progressCallback) progressCallback(0.4, '正在计算对齐关系...');

  const { pairs, horizontalDeviations, verticalDeviations, spacingDeviations } =
    calculateAlignmentPairs(elements);

  if (progressCallback) progressCallback(0.65, '正在智能分组...');

  const groups = groupElements(elements, pairs);

  if (progressCallback) progressCallback(0.85, '正在计算一致性分数...');

  elements.forEach((el) => {
    const relatedPairs = pairs.filter(
      (p) => p.elementA === el.id || p.elementB === el.id
    );
    if (relatedPairs.length > 0) {
      el.horizontalDeviation =
        relatedPairs.reduce((s, p) => s + Math.abs(p.horizontalDeviation), 0) /
        relatedPairs.length;
      el.verticalDeviation =
        relatedPairs.reduce((s, p) => s + Math.abs(p.verticalDeviation), 0) /
        relatedPairs.length;
      el.spacingDeviation =
        relatedPairs.reduce(
          (s, p) =>
            s + Math.min(Math.abs(p.spacingH > 0 ? p.spacingH : 999), Math.abs(p.spacingV > 0 ? p.spacingV : 999)),
          0
        ) / relatedPairs.length;
      el.maxDeviation = Math.max(
        el.horizontalDeviation,
        el.verticalDeviation
      );
    }
  });

  const horizontalScore = calculateScore(horizontalDeviations);
  const verticalScore = calculateScore(verticalDeviations);
  const spacingScore = calculateScore(spacingDeviations);
  const overallScore = Math.round(
    horizontalScore * 0.4 + verticalScore * 0.4 + spacingScore * 0.2
  );

  let alignedWell = 0;
  let warnings = 0;
  let errors = 0;
  elements.forEach((el) => {
    if (el.maxDeviation < 5) alignedWell++;
    else if (el.maxDeviation <= 15) warnings++;
    else errors++;
  });

  if (progressCallback) progressCallback(1, '分析完成！');

  return {
    elements,
    groups,
    pairs,
    overallScore,
    horizontalScore,
    verticalScore,
    spacingScore,
    totalElements: elements.length,
    alignedWell,
    warnings,
    errors,
    horizontalDeviations,
    verticalDeviations,
    spacingDeviations,
    imageWidth: imgWidth,
    imageHeight: imgHeight,
  };
}

function detectElements(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  progressCallback?: (progress: number, status: string) => void
): ElementData[] {
  const visited = new Uint8Array(width * height);
  const regions: Array<{ minX: number; minY: number; maxX: number; maxY: number; count: number }> = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 800));
  const threshold = 25;
  const bgColor = estimateBackground(width, height, data, step);

  for (let y = 0; y < height; y += step) {
    if (progressCallback && y % (step * 20) === 0) {
      progressCallback(
        0.1 + (y / height) * 0.25,
        `正在检测元素区域 ${Math.floor((y / height) * 100)}%...`
      );
    }
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x);
      if (visited[idx]) continue;

      const pixelIdx = (y * width + x) * 4;
      const dr = Math.abs(data[pixelIdx] - bgColor.r);
      const dg = Math.abs(data[pixelIdx + 1] - bgColor.g);
      const db = Math.abs(data[pixelIdx + 2] - bgColor.b);

      if (dr + dg + db > threshold * 2) {
        const region = floodFill(
          x,
          y,
          width,
          height,
          data,
          visited,
          bgColor,
          threshold,
          step
        );
        if (
          region &&
          (region.maxX - region.minX) * step >= 8 &&
          (region.maxY - region.minY) * step >= 8
        ) {
          regions.push(region);
        }
      } else {
        visited[idx] = 1;
      }
    }
  }

  const mergedRegions = mergeCloseRegions(regions, step, width, height);
  const minArea = (width * height) * 0.0005;
  const maxArea = (width * height) * 0.8;

  const elements: ElementData[] = mergedRegions
    .filter((r) => {
      const w = (r.maxX - r.minX) * step;
      const h = (r.maxY - r.minY) * step;
      const area = w * h;
      return area >= minArea && area <= maxArea && r.count > 10;
    })
    .slice(0, 80)
    .map((r, index) => {
      const x = r.minX * step;
      const y = r.minY * step;
      const w = Math.min((r.maxX - r.minX) * step, width - x);
      const h = Math.min((r.maxY - r.minY) * step, height - y);
      const bbox: BoundingBox = {
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.max(4, w),
        height: Math.max(4, h),
      };
      return {
        id: generateId(),
        name: `元素 ${index + 1}`,
        bbox,
        centerX: bbox.x + bbox.width / 2,
        centerY: bbox.y + bbox.height / 2,
        area: bbox.width * bbox.height,
        maxDeviation: 0,
        horizontalDeviation: 0,
        verticalDeviation: 0,
        spacingDeviation: 0,
      };
    });

  elements.sort((a, b) => a.area - b.area);

  return elements;
}

function estimateBackground(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  step: number
): { r: number; g: number; b: number } {
  const samples: number[][] = [];
  const sampleStep = step * 4;
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      if (
        x < width * 0.1 ||
        x > width * 0.9 ||
        y < height * 0.1 ||
        y > height * 0.9
      ) {
        const idx = (y * width + x) * 4;
        samples.push([data[idx], data[idx + 1], data[idx + 2]]);
      }
    }
  }
  if (samples.length === 0) return { r: 255, g: 255, b: 255 };

  const avgR = samples.reduce((s, p) => s + p[0], 0) / samples.length;
  const avgG = samples.reduce((s, p) => s + p[1], 0) / samples.length;
  const avgB = samples.reduce((s, p) => s + p[2], 0) / samples.length;
  return { r: avgR, g: avgG, b: avgB };
}

function floodFill(
  startX: number,
  startY: number,
  width: number,
  height: number,
  data: Uint8ClampedArray,
  visited: Uint8Array,
  bgColor: { r: number; g: number; b: number },
  threshold: number,
  step: number
): { minX: number; minY: number; maxX: number; maxY: number; count: number } | null {
  const stack: Array<[number, number]> = [[startX, startY]];
  let minX = startX;
  let minY = startY;
  let maxX = startX;
  let maxY = startY;
  let count = 0;
  const maxIter = 100000;
  let iter = 0;

  while (stack.length > 0 && iter < maxIter) {
    iter++;
    const [x, y] = stack.pop()!;
    const idx = y * width + x;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx]) continue;

    const pixelIdx = (y * width + x) * 4;
    const dr = Math.abs(data[pixelIdx] - bgColor.r);
    const dg = Math.abs(data[pixelIdx + 1] - bgColor.g);
    const db = Math.abs(data[pixelIdx + 2] - bgColor.b);

    if (dr + dg + db < threshold * 1.5) {
      visited[idx] = 1;
      continue;
    }

    visited[idx] = 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    count++;

    if (x - step >= 0) stack.push([x - step, y]);
    if (x + step < width) stack.push([x + step, y]);
    if (y - step >= 0) stack.push([x, y - step]);
    if (y + step < height) stack.push([x, y + step]);
  }

  if (count < 5) return null;
  return { minX, minY, maxX, maxY, count };
}

function mergeCloseRegions(
  regions: Array<{ minX: number; minY: number; maxX: number; maxY: number; count: number }>,
  step: number,
  width: number,
  height: number
): Array<{ minX: number; minY: number; maxX: number; maxY: number; count: number }> {
  if (regions.length < 2) return regions;

  const result = [...regions];
  const mergeThresholdX = Math.max(4, Math.floor(width * 0.005 / step));
  const mergeThresholdY = Math.max(4, Math.floor(height * 0.005 / step));
  let merged = true;
  let iterations = 0;
  const maxIter = 50;

  while (merged && iterations < maxIter) {
    merged = false;
    iterations++;
    outer: for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];

        const overlapX =
          (a.minX <= b.maxX && a.maxX >= b.minX) ||
          (b.minX <= a.maxX && b.maxX >= a.minX);
        const overlapY =
          (a.minY <= b.maxY && a.maxY >= b.minY) ||
          (b.minY <= a.maxY && b.maxY >= a.minY);

        const gapX = overlapX
          ? 0
          : Math.min(
              Math.abs(a.maxX - b.minX),
              Math.abs(b.maxX - a.minX)
            );
        const gapY = overlapY
          ? 0
          : Math.min(
              Math.abs(a.maxY - b.minY),
              Math.abs(b.maxY - a.minY)
            );

        if (
          (overlapY && gapX < mergeThresholdX) ||
          (overlapX && gapY < mergeThresholdY) ||
          (gapX < mergeThresholdX * 2 && gapY < mergeThresholdY * 2)
        ) {
          const mergedRegion = {
            minX: Math.min(a.minX, b.minX),
            minY: Math.min(a.minY, b.minY),
            maxX: Math.max(a.maxX, b.maxX),
            maxY: Math.max(a.maxY, b.maxY),
            count: a.count + b.count,
          };
          result.splice(j, 1);
          result.splice(i, 1);
          result.push(mergedRegion);
          merged = true;
          break outer;
        }
      }
    }
  }

  return result;
}

function calculateAlignmentPairs(elements: ElementData[]): {
  pairs: AlignmentPair[];
  horizontalDeviations: number[];
  verticalDeviations: number[];
  spacingDeviations: number[];
} {
  const pairs: AlignmentPair[] = [];
  const horizontalDeviations: number[] = [];
  const verticalDeviations: number[] = [];
  const spacingDeviations: number[] = [];

  const horizontalAlignmentGroups: Map<string, ElementData[]> = new Map();
  const verticalAlignmentGroups: Map<string, ElementData[]> = new Map();

  elements.forEach((el) => {
    const leftKey = `left_${Math.round(el.bbox.x / 8) * 8}`;
    const rightKey = `right_${Math.round((el.bbox.x + el.bbox.width) / 8) * 8}`;
    const centerXKey = `cx_${Math.round(el.centerX / 8) * 8}`;

    if (!horizontalAlignmentGroups.has(leftKey)) horizontalAlignmentGroups.set(leftKey, []);
    horizontalAlignmentGroups.get(leftKey)!.push(el);

    if (!horizontalAlignmentGroups.has(rightKey)) horizontalAlignmentGroups.set(rightKey, []);
    horizontalAlignmentGroups.get(rightKey)!.push(el);

    if (!horizontalAlignmentGroups.has(centerXKey)) horizontalAlignmentGroups.set(centerXKey, []);
    horizontalAlignmentGroups.get(centerXKey)!.push(el);

    const topKey = `top_${Math.round(el.bbox.y / 8) * 8}`;
    const bottomKey = `bottom_${Math.round((el.bbox.y + el.bbox.height) / 8) * 8}`;
    const centerYKey = `cy_${Math.round(el.centerY / 8) * 8}`;

    if (!verticalAlignmentGroups.has(topKey)) verticalAlignmentGroups.set(topKey, []);
    verticalAlignmentGroups.get(topKey)!.push(el);

    if (!verticalAlignmentGroups.has(bottomKey)) verticalAlignmentGroups.set(bottomKey, []);
    verticalAlignmentGroups.get(bottomKey)!.push(el);

    if (!verticalAlignmentGroups.has(centerYKey)) verticalAlignmentGroups.set(centerYKey, []);
    verticalAlignmentGroups.get(centerYKey)!.push(el);
  });

  const pairSet = new Set<string>();

  function addPair(a: ElementData, b: ElementData, hDev: number, vDev: number) {
    const pairKey = [a.id, b.id].sort().join('|');
    if (pairSet.has(pairKey)) return;
    pairSet.add(pairKey);

    const spacingH =
      a.centerY === b.centerY
        ? Math.abs(a.centerX - b.centerX)
        : Math.min(
            Math.abs((a.bbox.x + a.bbox.width) - b.bbox.x),
            Math.abs((b.bbox.x + b.bbox.width) - a.bbox.x)
          );
    const spacingV =
      a.centerX === b.centerX
        ? Math.abs(a.centerY - b.centerY)
        : Math.min(
            Math.abs((a.bbox.y + a.bbox.height) - b.bbox.y),
            Math.abs((b.bbox.y + b.bbox.height) - a.bbox.y)
          );

    pairs.push({
      elementA: a.id,
      elementB: b.id,
      horizontalDeviation: hDev,
      verticalDeviation: vDev,
      spacingH,
      spacingV,
    });

    if (Math.abs(hDev) > 0.5) horizontalDeviations.push(Math.abs(hDev));
    if (Math.abs(vDev) > 0.5) verticalDeviations.push(Math.abs(vDev));
    if (spacingH > 0 && spacingH < 1000) spacingDeviations.push(spacingH);
    if (spacingV > 0 && spacingV < 1000) spacingDeviations.push(spacingV);
  }

  horizontalAlignmentGroups.forEach((group) => {
    if (group.length < 2) return;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const hDev = a.bbox.x - b.bbox.x;
        const vDev = a.centerY - b.centerY;
        if (distance(a.centerX, a.centerY, b.centerX, b.centerY) < Math.max(a.area, b.area) * 3) {
          addPair(a, b, hDev, vDev);
        }
      }
    }
  });

  verticalAlignmentGroups.forEach((group) => {
    if (group.length < 2) return;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const hDev = a.centerX - b.centerX;
        const vDev = a.bbox.y - b.bbox.y;
        if (distance(a.centerX, a.centerY, b.centerX, b.centerY) < Math.max(a.area, b.area) * 3) {
          addPair(a, b, hDev, vDev);
        }
      }
    }
  });

  const sortedByX = [...elements].sort((a, b) => a.bbox.x - b.bbox.x);
  for (let i = 0; i < sortedByX.length - 1; i++) {
    for (let j = i + 1; j < Math.min(i + 6, sortedByX.length); j++) {
      const a = sortedByX[i];
      const b = sortedByX[j];
      if (Math.abs(a.centerY - b.centerY) < Math.max(a.bbox.height, b.bbox.height) * 1.5) {
        const hDev = a.bbox.y - b.bbox.y;
        const vDev = a.bbox.y - b.bbox.y;
        addPair(a, b, hDev, vDev);
      }
    }
  }

  const sortedByY = [...elements].sort((a, b) => a.bbox.y - b.bbox.y);
  for (let i = 0; i < sortedByY.length - 1; i++) {
    for (let j = i + 1; j < Math.min(i + 6, sortedByY.length); j++) {
      const a = sortedByY[i];
      const b = sortedByY[j];
      if (Math.abs(a.centerX - b.centerX) < Math.max(a.bbox.width, b.bbox.width) * 1.5) {
        const hDev = a.bbox.x - b.bbox.x;
        const vDev = a.bbox.x - b.bbox.x;
        addPair(a, b, hDev, vDev);
      }
    }
  }

  return {
    pairs: pairs.slice(0, 500),
    horizontalDeviations,
    verticalDeviations,
    spacingDeviations,
  };
}

function groupElements(elements: ElementData[], pairs: AlignmentPair[]): ElementGroup[] {
  const adjacency: Map<string, Set<string>> = new Map();
  elements.forEach((el) => adjacency.set(el.id, new Set()));

  pairs.forEach((p) => {
    const totalDev = Math.abs(p.horizontalDeviation) + Math.abs(p.verticalDeviation);
    if (totalDev < 20) {
      adjacency.get(p.elementA)!.add(p.elementB);
      adjacency.get(p.elementB)!.add(p.elementA);
    }
  });

  const elementById = new Map(elements.map((e) => [e.id, e]));
  const visited = new Set<string>();
  const groups: ElementGroup[] = [];
  let groupIndex = 0;

  elements.forEach((el) => {
    if (visited.has(el.id)) return;

    const cluster: string[] = [];
    const stack = [el.id];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      cluster.push(current);

      adjacency.get(current)!.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      });
    }

    if (cluster.length >= 2) {
      const groupElementsData = cluster
        .map((id) => elementById.get(id))
        .filter(Boolean) as ElementData[];

      const relatedPairs = pairs.filter(
        (p) => cluster.includes(p.elementA) && cluster.includes(p.elementB)
      );

      const avgH =
        relatedPairs.length > 0
          ? relatedPairs.reduce((s, p) => s + Math.abs(p.horizontalDeviation), 0) /
            relatedPairs.length
          : 0;
      const avgV =
        relatedPairs.length > 0
          ? relatedPairs.reduce((s, p) => s + Math.abs(p.verticalDeviation), 0) /
            relatedPairs.length
          : 0;

      const spacingsH = relatedPairs.map((p) => p.spacingH).filter((s) => s > 0 && s < 1000);
      const spacingsV = relatedPairs.map((p) => p.spacingV).filter((s) => s > 0 && s < 1000);
      const spacingVar = (variance(spacingsH) + variance(spacingsV)) / 2;

      const avgX = groupElementsData.reduce((s, e) => s + e.centerX, 0) / groupElementsData.length;
      const avgY = groupElementsData.reduce((s, e) => s + e.centerY, 0) / groupElementsData.length;
      const suggestions = generateSuggestions(groupElementsData, avgH, avgV, spacingVar);

      const group: ElementGroup = {
        id: generateId(),
        name: GROUP_NAMES[groupIndex % GROUP_NAMES.length],
        color: GROUP_COLORS[groupIndex % GROUP_COLORS.length],
        elementIds: cluster,
        avgHorizontalDeviation: avgH,
        avgVerticalDeviation: avgV,
        spacingVariance: spacingVar,
        suggestion: suggestions,
      };

      cluster.forEach((id) => {
        const e = elementById.get(id);
        if (e) e.groupId = group.id;
      });

      groups.push(group);
      groupIndex++;
    }
  });

  return groups.sort((a, b) => b.elementIds.length - a.elementIds.length);
}

function generateSuggestions(
  elements: ElementData[],
  avgH: number,
  avgV: number,
  spacingVar: number
): string {
  const suggestions: string[] = [];

  const leftMargins = elements.map((e) => Math.round(e.bbox.x));
  const topMargins = elements.map((e) => Math.round(e.bbox.y));
  const widths = elements.map((e) => Math.round(e.bbox.width));
  const heights = elements.map((e) => Math.round(e.bbox.height));

  const uniqueLeft = _.uniq(leftMargins);
  const uniqueTop = _.uniq(topMargins);
  const uniqueWidths = _.uniq(widths);
  const uniqueHeights = _.uniq(heights);

  if (avgH > 5) {
    const targetLeft = Math.round(_.mean(leftMargins));
    suggestions.push(`将水平对齐基准统一为左边缘 ${targetLeft}px，可减少 ${Math.round(avgH)}px 的平均偏差`);
  }

  if (avgV > 5) {
    const targetTop = Math.round(_.mean(topMargins));
    suggestions.push(`将垂直对齐基准统一为顶部 ${targetTop}px，可减少 ${Math.round(avgV)}px 的平均偏差`);
  }

  if (uniqueWidths.length > 1 && elements.length >= 3) {
    const modeWidth = _.head(_.sortBy(widths, (w) => -widths.filter((x) => x === w).length))!;
    suggestions.push(`建议统一组内宽度为 ${modeWidth}px（当前有 ${uniqueWidths.length} 种不同宽度）`);
  }

  if (uniqueHeights.length > 1 && elements.length >= 3) {
    const modeHeight = _.head(_.sortBy(heights, (h) => -heights.filter((x) => x === h).length))!;
    suggestions.push(`建议统一组内高度为 ${modeHeight}px（当前有 ${uniqueHeights.length} 种不同高度）`);
  }

  if (spacingVar > 100) {
    suggestions.push(`元素间距方差较大（${Math.round(spacingVar)}），建议使用等间距网格布局`);
  }

  if (uniqueLeft.length > 2 && uniqueLeft.length === elements.length) {
    suggestions.push(`该组元素左侧边距不一致，建议使用统一的 ${Math.round(_.mean(leftMargins))}px 边距`);
  }

  if (suggestions.length === 0) {
    suggestions.push('该组布局对齐良好，无需重大调整');
  }

  return suggestions.join('；') + '。';
}

function calculateScore(deviations: number[]): number {
  if (deviations.length === 0) return 95;

  const validDevs = deviations.filter((d) => d <= 100);
  if (validDevs.length === 0) return 50;

  const avg = validDevs.reduce((s, d) => s + d, 0) / validDevs.length;

  if (avg <= 2) return 98;
  if (avg <= 5) return 90;
  if (avg <= 8) return 82;
  if (avg <= 12) return 72;
  if (avg <= 18) return 60;
  if (avg <= 25) return 48;
  if (avg <= 40) return 35;
  return Math.max(15, Math.round(35 - (avg - 40) * 0.5));
}

export function applyCorrection(
  result: AnalysisResult,
  groupId: string
): AnalysisResult {
  const group = result.groups.find((g) => g.id === groupId);
  if (!group) return result;

  const groupElements = result.elements.filter((e) =>
    group.elementIds.includes(e.id)
  );

  if (groupElements.length < 2) return result;

  const targetLeftX = Math.round(
    groupElements.reduce((s, e) => s + e.bbox.x, 0) / groupElements.length
  );
  const targetTopY = Math.round(
    groupElements.reduce((s, e) => s + e.bbox.y, 0) / groupElements.length
  );
  const targetWidth = Math.round(
    groupElements.reduce((s, e) => s + e.bbox.width, 0) / groupElements.length
  );
  const targetHeight = Math.round(
    groupElements.reduce((s, e) => s + e.bbox.height, 0) / groupElements.length
  );

  const sortedByY = [...groupElements].sort((a, b) => a.bbox.y - b.bbox.y);
  const avgSpacingV =
    sortedByY.length > 1
      ? (sortedByY[sortedByY.length - 1].bbox.y - sortedByY[0].bbox.y) /
        (sortedByY.length - 1)
      : 0;

  const sortedByX = [...groupElements].sort((a, b) => a.bbox.x - b.bbox.x);
  const avgSpacingH =
    sortedByX.length > 1
      ? (sortedByX[sortedByX.length - 1].bbox.x - sortedByX[0].bbox.x) /
        (sortedByX.length - 1)
      : 0;

  const updatedElements = result.elements.map((el) => {
    if (!group.elementIds.includes(el.id)) return el;

    const newEl = { ...el, bbox: { ...el.bbox } };
    const yIndex = sortedByY.findIndex((e) => e.id === el.id);
    const xIndex = sortedByX.findIndex((e) => e.id === el.id);

    if (group.avgHorizontalDeviation > 5) {
      newEl.bbox.x = targetLeftX;
    }
    if (group.avgVerticalDeviation > 5) {
      newEl.bbox.y = targetTopY + (yIndex >= 0 ? yIndex * Math.round(avgSpacingV || targetHeight) : 0);
    }
    if (xIndex >= 0 && avgSpacingH > 0) {
      newEl.bbox.x = targetLeftX + xIndex * Math.round(avgSpacingH || targetWidth);
    }
    newEl.bbox.width = targetWidth;
    newEl.bbox.height = targetHeight;
    newEl.centerX = newEl.bbox.x + newEl.bbox.width / 2;
    newEl.centerY = newEl.bbox.y + newEl.bbox.height / 2;
    newEl.horizontalDeviation = 0;
    newEl.verticalDeviation = 0;
    newEl.spacingDeviation = 0;
    newEl.maxDeviation = 0;

    return newEl;
  });

  const updatedGroups = result.groups.map((g) =>
    g.id === groupId ? { ...g, corrected: true, avgHorizontalDeviation: 0, avgVerticalDeviation: 0, spacingVariance: 0 } : g
  );

  const activeElements = updatedElements.filter((e) => !e.excluded);
  const hDevs = activeElements.map((e) => e.horizontalDeviation).filter((d) => d > 0);
  const vDevs = activeElements.map((e) => e.verticalDeviation).filter((d) => d > 0);
  const sDevs = activeElements.map((e) => e.spacingDeviation).filter((d) => d > 0);

  const hScore = calculateScore(hDevs);
  const vScore = calculateScore(vDevs);
  const sScore = calculateScore(sDevs);
  const newScore = Math.round(hScore * 0.4 + vScore * 0.4 + sScore * 0.2);

  let alignedWell = 0,
    warnings = 0,
    errors = 0;
  activeElements.forEach((el) => {
    if (el.maxDeviation < 5) alignedWell++;
    else if (el.maxDeviation <= 15) warnings++;
    else errors++;
  });

  return {
    ...result,
    elements: updatedElements,
    groups: updatedGroups,
    overallScore: newScore,
    horizontalScore: hScore,
    verticalScore: vScore,
    spacingScore: sScore,
    alignedWell,
    warnings,
    errors,
  };
}

export function excludeElement(result: AnalysisResult, elementId: string): AnalysisResult {
  const updatedElements = result.elements.map((el) =>
    el.id === elementId ? { ...el, excluded: true } : el
  );

  const activeElements = updatedElements.filter((e) => !e.excluded);
  const hDevs = activeElements.map((e) => e.horizontalDeviation).filter((d) => d > 0);
  const vDevs = activeElements.map((e) => e.verticalDeviation).filter((d) => d > 0);
  const sDevs = activeElements.map((e) => e.spacingDeviation).filter((d) => d > 0);

  const hScore = calculateScore(hDevs);
  const vScore = calculateScore(vDevs);
  const sScore = calculateScore(sDevs);
  const newScore = Math.round(hScore * 0.4 + vScore * 0.4 + sScore * 0.2);

  let alignedWell = 0,
    warnings = 0,
    errors = 0;
  activeElements.forEach((el) => {
    if (el.maxDeviation < 5) alignedWell++;
    else if (el.maxDeviation <= 15) warnings++;
    else errors++;
  });

  return {
    ...result,
    elements: updatedElements,
    totalElements: activeElements.length,
    overallScore: newScore,
    horizontalScore: hScore,
    verticalScore: vScore,
    spacingScore: sScore,
    alignedWell,
    warnings,
    errors,
  };
}
