import { ImageFeature, CellLayout, LayoutCandidate } from '../store';

interface LayoutContext {
  canvasWidth: number;
  canvasHeight: number;
  padding: number;
  gap: number;
}

function computeWaterfallLayout(
  features: ImageFeature[],
  ctx: LayoutContext
): CellLayout[] {
  const { canvasWidth, padding, gap } = ctx;
  const cols = Math.min(features.length, 3);
  const colWidth = (canvasWidth - padding * 2 - gap * (cols - 1)) / cols;
  const colHeights: number[] = new Array(cols).fill(padding);

  return features.map((feat, i) => {
    const shortestCol = colHeights.indexOf(Math.min(...colHeights));
    const aspectRatio = feat.width / Math.max(feat.height, 1);
    const cellHeight = colWidth / aspectRatio;
    const scaleBySubject = 0.8 + feat.subjectRatio * 0.4;
    const finalHeight = cellHeight * scaleBySubject;

    const cell: CellLayout = {
      imageId: feat.id,
      x: padding + shortestCol * (colWidth + gap),
      y: colHeights[shortestCol],
      width: colWidth,
      height: finalHeight,
    };

    colHeights[shortestCol] += finalHeight + gap;
    return cell;
  });
}

function computeGridLayout(
  features: ImageFeature[],
  ctx: LayoutContext
): CellLayout[] {
  const { canvasWidth, padding, gap } = ctx;
  const n = features.length;

  let cols: number;
  if (n <= 3) cols = n;
  else if (n <= 6) cols = 3;
  else if (n <= 9) cols = 3;
  else cols = 4;

  const rows = Math.ceil(n / cols);
  const cellWidth = (canvasWidth - padding * 2 - gap * (cols - 1)) / cols;

  const sorted = [...features].sort((a, b) => b.subjectRatio - a.subjectRatio);

  return sorted.map((feat, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const aspectRatio = feat.width / Math.max(feat.height, 1);
    const baseHeight = cellWidth / aspectRatio;
    const rowSpan = feat.subjectRatio > 0.65 ? 2 : 1;
    const finalHeight = baseHeight * (rowSpan === 2 ? 1.8 : 1);
    const finalWidth = rowSpan === 2 ? cellWidth * 2 + gap : cellWidth;

    return {
      imageId: feat.id,
      x: padding + col * (cellWidth + gap),
      y: padding + row * (cellWidth / 1.2 + gap),
      width: Math.min(finalWidth, canvasWidth - padding * 2),
      height: finalHeight,
    };
  });
}

function computeHybridLayout(
  features: ImageFeature[],
  ctx: LayoutContext
): CellLayout[] {
  const { canvasWidth, padding, gap } = ctx;
  const n = features.length;

  if (n <= 2) {
    return features.map((feat, i) => ({
      imageId: feat.id,
      x: padding,
      y: padding + i * (ctx.canvasHeight / 2 - padding),
      width: canvasWidth - padding * 2,
      height: ctx.canvasHeight / 2 - padding - gap / 2,
    }));
  }

  const featured = features.reduce((best, f) =>
    f.subjectRatio > best.subjectRatio ? f : best
  );
  const rest = features.filter((f) => f.id !== featured.id);

  const featuredCell: CellLayout = {
    imageId: featured.id,
    x: padding,
    y: padding,
    width: (canvasWidth - padding * 2) * 0.55,
    height: ctx.canvasHeight * 0.6,
  };

  const rightWidth = (canvasWidth - padding * 2) * 0.45 - gap;
  const restCells: CellLayout[] = rest.map((feat, i) => {
    const row = i % 2;
    const col = Math.floor(i / 2);
    const cellH = (featuredCell.height - gap) / 2;

    return {
      imageId: feat.id,
      x: featuredCell.x + featuredCell.width + gap,
      y: padding + row * (cellH + gap),
      width: rightWidth,
      height: cellH,
    };
  });

  return [featuredCell, ...restCells];
}

function scoreLayout(
  cells: CellLayout[],
  features: ImageFeature[]
): number {
  if (cells.length === 0) return 0;

  const featMap = new Map(features.map((f) => [f.id, f]));

  let subjectScore = 0;
  cells.forEach((cell) => {
    const feat = featMap.get(cell.imageId);
    if (!feat) return;
    const cellArea = cell.width * cell.height;
    const expectedArea = feat.width * feat.height;
    const ratio = Math.min(cellArea / Math.max(expectedArea, 1), 1);
    subjectScore += ratio * feat.subjectRatio;
  });
  subjectScore = (subjectScore / cells.length) * 60;

  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  const avgX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const variance =
    cells.reduce((sum, c) => sum + Math.pow(c.x - avgX, 2) + Math.pow(c.y - avgY, 2), 0) /
    cells.length;
  const balanceScore = Math.max(0, 40 - Math.sqrt(variance) * 0.1);

  return Math.min(Math.round(subjectScore + balanceScore), 100);
}

export function generateLayouts(
  features: ImageFeature[],
  canvasWidth: number,
  canvasHeight: number
): LayoutCandidate[] {
  const ctx: LayoutContext = {
    canvasWidth,
    canvasHeight,
    padding: 24,
    gap: 12,
  };

  const waterfallCells = computeWaterfallLayout(features, ctx);
  const gridCells = computeGridLayout(features, ctx);
  const hybridCells = computeHybridLayout(features, ctx);

  return [
    {
      id: 'waterfall',
      strategy: 'waterfall',
      cells: waterfallCells,
      score: scoreLayout(waterfallCells, features),
    },
    {
      id: 'grid',
      strategy: 'grid',
      cells: gridCells,
      score: scoreLayout(gridCells, features),
    },
    {
      id: 'waterfall',
      strategy: 'waterfall',
      cells: hybridCells,
      score: scoreLayout(hybridCells, features),
    },
  ];
}
