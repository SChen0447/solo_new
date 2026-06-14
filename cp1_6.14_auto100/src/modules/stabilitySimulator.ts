import { Brick, Position } from '../types';

interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function getBrickAABB(brick: Brick, yOffset: number = 0): AABB {
  const halfWidth = brick.dimensions.width / 2;
  const halfDepth = brick.dimensions.depth / 2;
  return {
    minX: brick.position.x - halfWidth,
    maxX: brick.position.x + halfWidth,
    minZ: brick.position.z - halfDepth,
    maxZ: brick.position.z + halfDepth,
  };
}

function getOverlapArea(a: AABB, b: AABB): number {
  const overlapX = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
  const overlapZ = Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
  return overlapX * overlapZ;
}

function getBrickBaseArea(brick: Brick): number {
  return brick.dimensions.width * brick.dimensions.depth;
}

export function calculateSingleBrickStability(brick: Brick, allBricks: Brick[]): boolean {
  if (brick.position.y <= brick.dimensions.height / 2 + 0.01) {
    return true;
  }

  const brickBottomY = brick.position.y - brick.dimensions.height / 2;
  const brickAABB = getBrickAABB(brick);
  const brickBaseArea = getBrickBaseArea(brick);

  let totalSupportArea = 0;

  for (const other of allBricks) {
    if (other.id === brick.id) continue;
    if (other.isFalling) continue;

    const otherTopY = other.position.y + other.dimensions.height / 2;

    if (Math.abs(brickBottomY - otherTopY) > 0.1) {
      continue;
    }

    const otherAABB = getBrickAABB(other);
    const overlapArea = getOverlapArea(brickAABB, otherAABB);
    totalSupportArea += overlapArea;
  }

  const supportRatio = totalSupportArea / brickBaseArea;
  return supportRatio >= 0.5;
}

export function calculateOverallStability(bricks: Brick[]): number {
  if (bricks.length === 0) return 100;

  let stableCount = 0;
  for (const brick of bricks) {
    if (calculateSingleBrickStability(brick, bricks)) {
      stableCount++;
    }
  }

  return Math.round((stableCount / bricks.length) * 100);
}

export function checkBrickOverlap(newBrick: Brick, existingBricks: Brick[], excludeId?: string): boolean {
  const newAABB = {
    minX: newBrick.position.x - newBrick.dimensions.width / 2,
    maxX: newBrick.position.x + newBrick.dimensions.width / 2,
    minY: newBrick.position.y - newBrick.dimensions.height / 2,
    maxY: newBrick.position.y + newBrick.dimensions.height / 2,
    minZ: newBrick.position.z - newBrick.dimensions.depth / 2,
    maxZ: newBrick.position.z + newBrick.dimensions.depth / 2,
  };

  for (const existing of existingBricks) {
    if (excludeId && existing.id === excludeId) continue;
    if (existing.isFalling) continue;

    const existingAABB = {
      minX: existing.position.x - existing.dimensions.width / 2,
      maxX: existing.position.x + existing.dimensions.width / 2,
      minY: existing.position.y - existing.dimensions.height / 2,
      maxY: existing.position.y + existing.dimensions.height / 2,
      minZ: existing.position.z - existing.dimensions.depth / 2,
      maxZ: existing.position.z + existing.dimensions.depth / 2,
    };

    const overlapX = newAABB.maxX > existingAABB.minX && newAABB.minX < existingAABB.maxX;
    const overlapY = newAABB.maxY > existingAABB.minY && newAABB.minY < existingAABB.maxY;
    const overlapZ = newAABB.maxZ > existingAABB.minZ && newAABB.minZ < existingAABB.maxZ;

    if (overlapX && overlapY && overlapZ) {
      return true;
    }
  }

  return false;
}

export function updateAllBricksStability(bricks: Brick[]): Brick[] {
  return bricks.map((brick) => ({
    ...brick,
    isStable: calculateSingleBrickStability(brick, bricks),
  }));
}
