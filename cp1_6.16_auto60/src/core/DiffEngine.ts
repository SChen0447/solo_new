import { diffLines, Change } from 'diff';

export type LineDiffType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface LineDiff {
  type: LineDiffType;
  leftLine?: number;
  rightLine?: number;
  content: string;
}

export interface DiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  areaPercent: number;
}

export interface DiffResult {
  lineDiffs: LineDiff[];
  visualDiffs: DiffRegion[];
  totalVisualDiffs: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
}

export function computeLineDiffs(leftText: string, rightText: string): LineDiff[] {
  const changes = diffLines(leftText, rightText);
  const result: LineDiff[] = [];
  let leftLineNum = 1;
  let rightLineNum = 1;

  changes.forEach((change: Change) => {
    const lines = change.value.split('\n');
    if (lines[lines.length - 1] === '') {
      lines.pop();
    }

    if (change.added) {
      lines.forEach((line) => {
        result.push({
          type: 'added',
          rightLine: rightLineNum,
          content: line,
        });
        rightLineNum++;
      });
    } else if (change.removed) {
      lines.forEach((line) => {
        result.push({
          type: 'removed',
          leftLine: leftLineNum,
          content: line,
        });
        leftLineNum++;
      });
    } else {
      lines.forEach((line) => {
        result.push({
          type: 'unchanged',
          leftLine: leftLineNum,
          rightLine: rightLineNum,
          content: line,
        });
        leftLineNum++;
        rightLineNum++;
      });
    }
  });

  const modifiedPairs = detectModifiedPairs(result);
  return modifiedPairs;
}

function detectModifiedPairs(diffs: LineDiff[]): LineDiff[] {
  const result: LineDiff[] = [];
  let i = 0;

  while (i < diffs.length) {
    if (diffs[i].type === 'removed' && i + 1 < diffs.length && diffs[i + 1].type === 'added') {
      result.push({
        type: 'modified',
        leftLine: diffs[i].leftLine,
        rightLine: diffs[i + 1].rightLine,
        content: diffs[i].content,
      });
      result.push({
        type: 'modified',
        leftLine: diffs[i].leftLine,
        rightLine: diffs[i + 1].rightLine,
        content: diffs[i + 1].content,
      });
      i += 2;
    } else {
      result.push(diffs[i]);
      i++;
    }
  }

  return result;
}

export function getEditorLineDecorations(lineDiffs: LineDiff[], side: 'left' | 'right') {
  const decorations: { line: number; className: string; glyph: string }[] = [];

  lineDiffs.forEach((diff) => {
    const line = side === 'left' ? diff.leftLine : diff.rightLine;
    if (!line) return;

    let className = '';
    let glyph = '';

    if (diff.type === 'added' && side === 'right') {
      className = 'diff-line-added';
      glyph = '+';
    } else if (diff.type === 'removed' && side === 'left') {
      className = 'diff-line-removed';
      glyph = '-';
    } else if (diff.type === 'modified') {
      className = 'diff-line-modified';
      glyph = side === 'left' ? '-' : '+';
    }

    if (className) {
      decorations.push({ line, className, glyph });
    }
  });

  return decorations;
}

export function getDiffCounts(lineDiffs: LineDiff[]) {
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  lineDiffs.forEach((diff) => {
    if (diff.type === 'added') addedCount++;
    else if (diff.type === 'removed') removedCount++;
    else if (diff.type === 'modified') modifiedCount++;
  });

  return {
    addedCount,
    removedCount,
    modifiedCount: Math.floor(modifiedCount / 2),
  };
}

export async function computeVisualDiffs(
  leftCanvas: HTMLCanvasElement | null,
  rightCanvas: HTMLCanvasElement | null
): Promise<DiffRegion[]> {
  if (!leftCanvas || !rightCanvas) return [];

  const width = Math.min(leftCanvas.width, rightCanvas.width);
  const height = Math.min(leftCanvas.height, rightCanvas.height);

  if (width === 0 || height === 0) return [];

  const leftCtx = leftCanvas.getContext('2d');
  const rightCtx = rightCanvas.getContext('2d');

  if (!leftCtx || !rightCtx) return [];

  const leftData = leftCtx.getImageData(0, 0, width, height).data;
  const rightData = rightCtx.getImageData(0, 0, width, height).data;

  const diffMask = new Uint8Array(width * height);
  const colorThreshold = 30;
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const dr = Math.abs(leftData[offset] - rightData[offset]);
    const dg = Math.abs(leftData[offset + 1] - rightData[offset + 1]);
    const db = Math.abs(leftData[offset + 2] - rightData[offset + 2]);

    if (dr > colorThreshold || dg > colorThreshold || db > colorThreshold) {
      diffMask[i] = 1;
    }
  }

  const regions = findConnectedRegions(diffMask, width, height, 10);

  const regionsWithArea = regions.map((r) => ({
    ...r,
    areaPercent: Number(((r.width * r.height) / totalPixels) * 100),
  }));

  return regionsWithArea.sort((a, b) => b.areaPercent - a.areaPercent);
}

interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

function findConnectedRegions(
  mask: Uint8Array,
  width: number,
  height: number,
  minArea: number
): Region[] {
  const visited = new Uint8Array(width * height);
  const regions: Region[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx] === 1 && visited[idx] === 0) {
        const region = floodFill(mask, visited, x, y, width, height);
        if (region.width * region.height >= minArea) {
          regions.push(region);
        }
      }
    }
  }

  return mergeCloseRegions(regions, 8);
}

function floodFill(
  mask: Uint8Array,
  visited: Uint8Array,
  startX: number,
  startY: number,
  width: number,
  height: number
): Region {
  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;

  const stack: [number, number][] = [[startX, startY]];
  visited[startY * width + startX] = 1;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    const neighbors: [number, number][] = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nidx = ny * width + nx;
        if (mask[nidx] === 1 && visited[nidx] === 0) {
          visited[nidx] = 1;
          stack.push([nx, ny]);
        }
      }
    }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function mergeCloseRegions(regions: Region[], gap: number): Region[] {
  if (regions.length <= 1) return regions;

  let merged = true;
  let result = [...regions];

  while (merged) {
    merged = false;
    for (let i = 0; i < result.length && !merged; i++) {
      for (let j = i + 1; j < result.length && !merged; j++) {
        const a = result[i];
        const b = result[j];
        const horizontalOverlap =
          a.x <= b.x + b.width + gap && b.x <= a.x + a.width + gap;
        const verticalOverlap =
          a.y <= b.y + b.height + gap && b.y <= a.y + a.height + gap;

        if (horizontalOverlap && verticalOverlap) {
          const newRegion: Region = {
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            width: Math.max(a.x + a.width, b.x + b.width) - Math.min(a.x, b.x),
            height: Math.max(a.y + a.height, b.y + b.height) - Math.min(a.y, b.y),
          };
          result.splice(j, 1);
          result.splice(i, 1);
          result.push(newRegion);
          merged = true;
        }
      }
    }
  }

  return result;
}

export function getMonacoDecorations(lineDiffs: LineDiff[], side: 'left' | 'right') {
  const decorations: any[] = [];
  const seenLines = new Set<number>();

  lineDiffs.forEach((diff) => {
    const line = side === 'left' ? diff.leftLine : diff.rightLine;
    if (!line || seenLines.has(line)) return;
    seenLines.add(line);

    let className = '';
    if (diff.type === 'added' && side === 'right') {
      className = 'diff-line-added';
    } else if (diff.type === 'removed' && side === 'left') {
      className = 'diff-line-removed';
    } else if (diff.type === 'modified') {
      className = 'diff-line-modified';
    }

    if (className) {
      decorations.push({
        range: {
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className,
          glyphMarginClassName: className,
          linesDecorationsClassName: className,
        },
      });
    }
  });

  return decorations;
}
