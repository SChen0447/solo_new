export interface Position {
  x: number;
  y: number;
}

export interface GridConfig {
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
}

export const DEFAULT_GRID_CONFIG: GridConfig = {
  rows: 3,
  cols: 4,
  cellWidth: 140,
  cellHeight: 200,
  gap: 12,
};

export const getTotalCells = (config: GridConfig): number => {
  return config.rows * config.cols;
};

export const getCellIndexFromPosition = (
  x: number,
  y: number,
  config: GridConfig,
  gridRect: DOMRect
): number => {
  const relX = x - gridRect.left;
  const relY = y - gridRect.top;

  const col = Math.floor(relX / (config.cellWidth + config.gap));
  const row = Math.floor(relY / (config.cellHeight + config.gap));

  const clampedCol = Math.max(0, Math.min(col, config.cols - 1));
  const clampedRow = Math.max(0, Math.min(row, config.rows - 1));

  return clampedRow * config.cols + clampedCol;
};

export const getCellCenterPosition = (
  cellIndex: number,
  config: GridConfig
): Position => {
  const col = cellIndex % config.cols;
  const row = Math.floor(cellIndex / config.cols);

  return {
    x: col * (config.cellWidth + config.gap) + config.cellWidth / 2,
    y: row * (config.cellHeight + config.gap) + config.cellHeight / 2,
  };
};

export const calculateTransform = (
  fromPosition: Position,
  toPosition: Position,
  progress: number
): string => {
  const easeOutElastic = (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  };

  const easedProgress = easeOutElastic(progress);

  const x = fromPosition.x + (toPosition.x - fromPosition.x) * easedProgress;
  const y = fromPosition.y + (toPosition.y - fromPosition.y) * easedProgress;

  const scale = 1 + 0.02 * Math.sin(easedProgress * Math.PI);

  return `translate(${x}px, ${y}px) scale(${scale})`;
};

export const findNearestEmptyCell = (
  targetIndex: number,
  occupiedCells: number[],
  totalCells: number
): number => {
  if (!occupiedCells.includes(targetIndex)) {
    return targetIndex;
  }

  for (let offset = 1; offset < totalCells; offset++) {
    const lower = targetIndex - offset;
    const upper = targetIndex + offset;

    if (lower >= 0 && !occupiedCells.includes(lower)) {
      return lower;
    }
    if (upper < totalCells && !occupiedCells.includes(upper)) {
      return upper;
    }
  }

  return -1;
};

export const getBounceAnimationKeyframes = (
  startScale: number = 1,
  peakScale: number = 1.02,
  endScale: number = 1
): Keyframe[] => {
  return [
    { transform: `scale(${startScale})` },
    { transform: `scale(${peakScale})`, offset: 0.5 },
    { transform: `scale(${endScale})` },
  ];
};

export const getShelfAnimationConfig = (): KeyframeAnimationOptions => {
  return {
    duration: 300,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    fill: 'forwards',
  };
};
