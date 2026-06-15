import type { Well, WellType } from '@/store/simulationStore';

let wellIdCounter = 0;

export function createWell(
  type: WellType,
  position: { x: number; y: number; z: number },
  rate: number
): Well {
  wellIdCounter += 1;
  return {
    id: `well_${wellIdCounter}_${Date.now()}`,
    type,
    position: { ...position },
    rate: Math.max(0.1, Math.min(5.0, rate)),
  };
}

export function validateWellPosition(
  position: { x: number; y: number; z: number },
  rockSize: { x: number; y: number; z: number }
): boolean {
  const halfX = rockSize.x / 2;
  const halfY = rockSize.y / 2;
  const halfZ = rockSize.z / 2;
  const epsilon = 0.01;

  const onSurface =
    Math.abs(Math.abs(position.x) - halfX) < epsilon ||
    Math.abs(Math.abs(position.y) - halfY) < epsilon ||
    Math.abs(Math.abs(position.z) - halfZ) < epsilon;

  const insideBounds =
    position.x >= -halfX - epsilon &&
    position.x <= halfX + epsilon &&
    position.y >= -halfY - epsilon &&
    position.y <= halfY + epsilon &&
    position.z >= -halfZ - epsilon &&
    position.z <= halfZ + epsilon;

  return onSurface && insideBounds;
}

export function snapToSurface(
  position: { x: number; y: number; z: number },
  rockSize: { x: number; y: number; z: number }
): { x: number; y: number; z: number } {
  const halfX = rockSize.x / 2;
  const halfY = rockSize.y / 2;
  const halfZ = rockSize.z / 2;

  const distX = Math.min(
    Math.abs(position.x + halfX),
    Math.abs(position.x - halfX)
  );
  const distY = Math.min(
    Math.abs(position.y + halfY),
    Math.abs(position.y - halfY)
  );
  const distZ = Math.min(
    Math.abs(position.z + halfZ),
    Math.abs(position.z - halfZ)
  );

  const snapped = { ...position };

  if (distX <= distY && distX <= distZ) {
    snapped.x = Math.abs(position.x + halfX) < Math.abs(position.x - halfX)
      ? -halfX
      : halfX;
  } else if (distY <= distX && distY <= distZ) {
    snapped.y = Math.abs(position.y + halfY) < Math.abs(position.y - halfY)
      ? -halfY
      : halfY;
  } else {
    snapped.z = Math.abs(position.z + halfZ) < Math.abs(position.z - halfZ)
      ? -halfZ
      : halfZ;
  }

  return snapped;
}
