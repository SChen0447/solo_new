import { RuneType, baseRunes, spellFormulas, SpellFormula } from '@/data/runes';

export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface RuneResult {
  type: RuneType | null;
  confidence: number;
  matchedSpell: SpellFormula | null;
}

interface PathFeatures {
  startPoint: Point;
  endPoint: Point;
  totalLength: number;
  boundingBox: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number };
  centroid: { x: number; y: number };
  cornerCount: number;
  directionChanges: number;
  isClosed: boolean;
  straightness: number;
  rotationCount: number;
  points: Point[];
}

function calculatePathFeatures(points: Point[]): PathFeatures {
  if (points.length < 2) {
    return {
      startPoint: points[0] || { x: 0, y: 0, timestamp: 0 },
      endPoint: points[points.length - 1] || { x: 0, y: 0, timestamp: 0 },
      totalLength: 0,
      boundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
      centroid: { x: 0, y: 0 },
      cornerCount: 0,
      directionChanges: 0,
      isClosed: false,
      straightness: 0,
      rotationCount: 0,
      points: points,
    };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let totalLength = 0;
  let sumX = 0, sumY = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    sumX += p.x;
    sumY += p.y;

    if (i > 0) {
      const dx = p.x - points[i - 1].x;
      const dy = p.y - points[i - 1].y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const diagonal = Math.sqrt(width * width + height * height);

  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const startEndDist = Math.sqrt(
    Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
  );
  const isClosed = startEndDist < diagonal * 0.25;

  const straightness = totalLength > 0 ? startEndDist / totalLength : 0;

  let cornerCount = 0;
  let directionChanges = 0;
  let lastAngle = 0;
  let angleSum = 0;

  for (let i = 2; i < points.length; i++) {
    const p0 = points[i - 2];
    const p1 = points[i - 1];
    const p2 = points[i];

    const angle1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const angle2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    let angleDiff = angle2 - angle1;

    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    angleSum += angleDiff;

    if (Math.abs(angleDiff) > Math.PI / 6) {
      cornerCount++;
    }

    if (i > 2) {
      const prevDiff = angle1 - lastAngle;
      while (prevDiff > Math.PI) prevDiff -= Math.PI * 2;
      while (prevDiff < -Math.PI) prevDiff += Math.PI * 2;

      if (angleDiff * prevDiff < 0 && Math.abs(angleDiff) > Math.PI / 8) {
        directionChanges++;
      }
    }

    lastAngle = angle1;
  }

  const rotationCount = Math.abs(angleSum) / (Math.PI * 2);

  return {
    startPoint,
    endPoint,
    totalLength,
    boundingBox: { minX, maxX, minY, maxY, width, height },
    centroid: { x: sumX / points.length, y: sumY / points.length },
    cornerCount,
    directionChanges,
    isClosed,
    straightness,
    rotationCount,
    points,
  };
}

function matchLine(features: PathFeatures): number {
  if (features.totalLength < 30) return 0;
  let score = features.straightness;

  const aspectRatio = features.boundingBox.width > 0
    ? Math.min(features.boundingBox.width, features.boundingBox.height) /
      Math.max(features.boundingBox.width, features.boundingBox.height)
    : 0;

  if (aspectRatio < 0.3) {
    score *= 1.2;
  }

  if (features.cornerCount < 3) {
    score *= 1.3;
  }

  return Math.min(1, Math.max(0, score));
}

function matchArc(features: PathFeatures): number {
  if (features.isClosed) return 0;
  if (features.totalLength < 30) return 0;

  let score = 0;

  if (features.rotationCount > 0.1 && features.rotationCount < 0.9) {
    score = 0.5 + Math.min(0.4, features.rotationCount * 0.8);
  }

  if (features.directionChanges < 3) {
    score *= 1.3;
  }

  const aspectRatio = features.boundingBox.width > 0
    ? Math.min(features.boundingBox.width, features.boundingBox.height) /
      Math.max(features.boundingBox.width, features.boundingBox.height)
    : 0;

  if (aspectRatio > 0.4) {
    score *= 1.1;
  }

  if (features.cornerCount < 5) {
    score *= 1.2;
  }

  return Math.min(1, Math.max(0, score));
}

function matchTriangle(features: PathFeatures): number {
  if (features.totalLength < 50) return 0;

  let score = 0;

  if (features.isClosed) {
    score += 0.3;
  }

  const expectedCorners = 3;
  const cornerDiff = Math.abs(features.cornerCount - expectedCorners);
  const cornerScore = Math.max(0, 1 - cornerDiff / expectedCorners);
  score += cornerScore * 0.4;

  const aspectRatio = features.boundingBox.width > 0
    ? Math.min(features.boundingBox.width, features.boundingBox.height) /
      Math.max(features.boundingBox.width, features.boundingBox.height)
    : 0;

  if (aspectRatio > 0.5 && aspectRatio < 1.5) {
    score += 0.3;
  }

  return Math.min(1, Math.max(0, score));
}

function matchSquare(features: PathFeatures): number {
  if (features.totalLength < 50) return 0;

  let score = 0;

  if (features.isClosed) {
    score += 0.3;
  }

  const expectedCorners = 4;
  const cornerDiff = Math.abs(features.cornerCount - expectedCorners);
  const cornerScore = Math.max(0, 1 - cornerDiff / expectedCorners);
  score += cornerScore * 0.4;

  const aspectRatio = features.boundingBox.width > 0
    ? Math.min(features.boundingBox.width, features.boundingBox.height) /
      Math.max(features.boundingBox.width, features.boundingBox.height)
    : 0;

  if (aspectRatio > 0.7) {
    score += 0.3;
  }

  return Math.min(1, Math.max(0, score));
}

function matchSpiral(features: PathFeatures): number {
  if (features.totalLength < 80) return 0;

  let score = 0;

  if (features.rotationCount > 0.8) {
    score = Math.min(1, features.rotationCount / 3) * 0.7;
  }

  if (features.directionChanges < 2) {
    score *= 1.3;
  }

  if (features.cornerCount < 8) {
    score *= 1.1;
  }

  const startCentroidDist = Math.sqrt(
    Math.pow(features.startPoint.x - features.centroid.x, 2) +
    Math.pow(features.startPoint.y - features.centroid.y, 2)
  );
  const endCentroidDist = Math.sqrt(
    Math.pow(features.endPoint.x - features.centroid.x, 2) +
    Math.pow(features.endPoint.y - features.centroid.y, 2)
  );

  const distDiff = Math.abs(startCentroidDist - endCentroidDist);
  const avgDist = (startCentroidDist + endCentroidDist) / 2;
  if (avgDist > 0 && distDiff / avgDist > 0.3) {
    score += 0.3;
  }

  return Math.min(1, Math.max(0, score));
}

function matchStar(features: PathFeatures): number {
  if (features.totalLength < 100) return 0;

  let score = 0;

  if (features.isClosed) {
    score += 0.2;
  }

  const expectedCorners = 5;
  const cornerDiff = Math.abs(features.cornerCount - expectedCorners * 2);
  const cornerScore = Math.max(0, 1 - cornerDiff / (expectedCorners * 2));
  score += cornerScore * 0.4;

  if (features.directionChanges >= 4) {
    score += 0.2;
  }

  const aspectRatio = features.boundingBox.width > 0
    ? Math.min(features.boundingBox.width, features.boundingBox.height) /
      Math.max(features.boundingBox.width, features.boundingBox.height)
    : 0;

  if (aspectRatio > 0.6) {
    score += 0.2;
  }

  return Math.min(1, Math.max(0, score));
}

export function detectRune(points: Point[]): RuneResult {
  if (points.length < 5) {
    return { type: null, confidence: 0, matchedSpell: null };
  }

  const features = calculatePathFeatures(points);

  const scores: Record<RuneType, number> = {
    line: matchLine(features),
    arc: matchArc(features),
    triangle: matchTriangle(features),
    square: matchSquare(features),
    spiral: matchSpiral(features),
    star: matchStar(features),
  };

  let bestType: RuneType | null = null;
  let bestScore = 0;

  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type as RuneType;
    }
  }

  const threshold = 0.35;
  if (bestScore < threshold) {
    return { type: null, confidence: bestScore, matchedSpell: null };
  }

  return { type: bestType, confidence: bestScore, matchedSpell: null };
}

export function getRuneResults(runeSequence: RuneType[]): {
  matchedSpell: SpellFormula | null;
  runes: RuneType[];
} {
  if (runeSequence.length < 2) {
    return { matchedSpell: null, runes: runeSequence };
  }

  for (const formula of Object.values(spellFormulas)) {
    if (formula.runes.length !== runeSequence.length) continue;

    let match = true;
    for (let i = 0; i < formula.runes.length; i++) {
      if (formula.runes[i] !== runeSequence[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return { matchedSpell: formula, runes: runeSequence };
    }
  }

  return { matchedSpell: null, runes: runeSequence };
}

export { baseRunes };
