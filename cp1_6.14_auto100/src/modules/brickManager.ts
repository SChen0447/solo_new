import { v4 as uuidv4 } from 'uuid';
import {
  Brick,
  BrickShape,
  BrickMaterial,
  Position,
  Rotation,
  BrickDimensions,
} from '../types';
import {
  checkBrickOverlap,
  calculateSingleBrickStability,
  updateAllBricksStability,
} from './stabilitySimulator';
import { useGameStore } from '../stores/gameStore';

const GRID_SIZE = 0.5;

const DEFAULT_DIMENSIONS: Record<BrickShape, BrickDimensions> = {
  box: { width: 1.5, height: 0.8, depth: 1.5 },
  prism: { width: 1.5, height: 0.8, depth: 1.5 },
  cylinder: { width: 1.2, height: 0.8, depth: 1.2 },
  arch: { width: 2, height: 1, depth: 1 },
};

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function snapPositionToGrid(position: Position): Position {
  return {
    x: snapToGrid(position.x),
    y: snapToGrid(position.y),
    z: snapToGrid(position.z),
  };
}

export function createBrick(
  shape: BrickShape,
  material: BrickMaterial,
  position: Position,
  rotation: Rotation = { x: 0, y: 0, z: 0 }
): Brick {
  const dimensions = DEFAULT_DIMENSIONS[shape];
  const snappedPosition = snapPositionToGrid(position);

  return {
    id: uuidv4(),
    shape,
    material,
    position: snappedPosition,
    rotation,
    dimensions,
    isStable: true,
    isSelected: false,
    isFalling: false,
  };
}

export function validateAndPlaceBrick(
  newBrick: Brick,
  existingBricks: Brick[]
): { success: boolean; reason?: string; brick?: Brick } {
  const maxBricks = useGameStore.getState().maxBricks;
  if (existingBricks.length >= maxBricks) {
    return { success: false, reason: '已达到最大积木数量限制' };
  }

  if (checkBrickOverlap(newBrick, existingBricks)) {
    return { success: false, reason: '放置位置与已有积木重叠' };
  }

  const isStable = calculateSingleBrickStability(newBrick, existingBricks);
  const brickWithStability = { ...newBrick, isStable };

  return { success: true, brick: brickWithStability };
}

export function placeBrick(brick: Brick): boolean {
  const state = useGameStore.getState();
  const result = validateAndPlaceBrick(brick, state.bricks);

  if (!result.success || !result.brick) {
    return false;
  }

  const added = state.addBrick(result.brick);
  if (added) {
    recalculateAllBricksStability();
  }
  return added;
}

export function recalculateAllBricksStability(): void {
  const state = useGameStore.getState();
  const updatedBricks = updateAllBricksStability(state.bricks);

  state.bricks.forEach((brick, index) => {
    if (brick.isStable !== updatedBricks[index].isStable) {
      state.updateBrick(brick.id, { isStable: updatedBricks[index].isStable });
    }
  });

  state.checkAndUpdateStability();
}

export function startFallingAnimation(brickId: string): void {
  const state = useGameStore.getState();
  const brick = state.bricks.find((b) => b.id === brickId);
  if (!brick || brick.isFalling) return;

  state.updateBrick(brickId, {
    isFalling: true,
    fallStartTime: Date.now(),
    fallStartY: brick.position.y,
  });
}

export function updateFallingBricks(): void {
  const state = useGameStore.getState();
  const now = Date.now();
  const gravity = 9.8;

  state.bricks.forEach((brick) => {
    if (!brick.isFalling || brick.fallStartTime === undefined || brick.fallStartY === undefined) {
      return;
    }

    const elapsed = (now - brick.fallStartTime) / 1000;
    const displacement = 0.5 * gravity * elapsed * elapsed;
    const newY = brick.fallStartY - displacement;
    const groundY = brick.dimensions.height / 2;

    if (newY <= groundY) {
      state.updateBrick(brick.id, {
        position: { ...brick.position, y: groundY },
        isFalling: false,
        fallStartTime: undefined,
        fallStartY: undefined,
        isStable: true,
      });
      recalculateAllBricksStability();
    } else {
      state.updateBrick(brick.id, {
        position: { ...brick.position, y: newY },
      });
    }
  });
}

export function moveBrick(brickId: string, newPosition: Position): boolean {
  const state = useGameStore.getState();
  const brick = state.bricks.find((b) => b.id === brickId);
  if (!brick) return false;

  const snappedPosition = snapPositionToGrid(newPosition);
  const testBrick = { ...brick, position: snappedPosition };

  if (checkBrickOverlap(testBrick, state.bricks, brickId)) {
    return false;
  }

  state.updateBrickPosition(brickId, snappedPosition);
  return true;
}

export function deleteBrick(brickId: string): void {
  const state = useGameStore.getState();
  state.removeBrick(brickId);
  recalculateAllBricksStability();
}

export function getBrickDimensions(shape: BrickShape): BrickDimensions {
  return { ...DEFAULT_DIMENSIONS[shape] };
}
