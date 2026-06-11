import {
  STAR_CLUSTER_RADIUS,
  STAR_COLORS,
  STAR_COLOR_WEIGHTS,
  MIN_MASS,
  MAX_MASS,
  COLLISION_DISTANCE,
  INITIAL_VELOCITY_SCALE,
  INITIAL_STAR_COUNT,
  INITIAL_GRAVITATIONAL_CONSTANT,
  INITIAL_TIME_STEP
} from '../utils/constants';

interface Star {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  mass: number;
  colorIndex: number;
  size: number;
}

let stars: Star[] = [];
let gravitationalConstant = INITIAL_GRAVITATIONAL_CONSTANT;
let timeStep = INITIAL_TIME_STEP;
let collisionCount = 0;

function getRandomColorIndex(): number {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < STAR_COLOR_WEIGHTS.length; i++) {
    cumulative += STAR_COLOR_WEIGHTS[i];
    if (r < cumulative) return i;
  }
  return STAR_COLOR_WEIGHTS.length - 1;
}

function generateStars(count: number): Star[] {
  const newStars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 1 / 3) * STAR_CLUSTER_RADIUS;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    const speed = Math.sqrt(r) * INITIAL_VELOCITY_SCALE;
    const vx = -y * speed * 0.01 + (Math.random() - 0.5) * 0.1;
    const vy = x * speed * 0.01 + (Math.random() - 0.5) * 0.1;
    const vz = (Math.random() - 0.5) * 0.05;

    const mass = MIN_MASS + Math.random() * (MAX_MASS - MIN_MASS);
    const colorIndex = getRandomColorIndex();
    const size = 0.8 + mass * 0.3;

    newStars.push({ x, y, z, vx, vy, vz, mass, colorIndex, size });
  }
  return newStars;
}

function computeGravity() {
  const len = stars.length;
  const softening = 2.0;

  for (let i = 0; i < len; i++) {
    let ax = 0, ay = 0, az = 0;
    const si = stars[i];

    for (let j = 0; j < len; j++) {
      if (i === j) continue;
      const sj = stars[j];

      const dx = sj.x - si.x;
      const dy = sj.y - si.y;
      const dz = sj.z - si.z;

      const distSq = dx * dx + dy * dy + dz * dz + softening * softening;
      const dist = Math.sqrt(distSq);
      const force = gravitationalConstant * sj.mass / distSq;

      ax += force * dx / dist;
      ay += force * dy / dist;
      az += force * dz / dist;
    }

    si.vx += ax * timeStep;
    si.vy += ay * timeStep;
    si.vz += az * timeStep;
  }
}

function updatePositions() {
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    s.x += s.vx * timeStep;
    s.y += s.vy * timeStep;
    s.z += s.vz * timeStep;
  }
}

function handleCollisions(): number {
  let collisions = 0;
  const toRemove = new Set<number>();
  const len = stars.length;

  for (let i = 0; i < len; i++) {
    if (toRemove.has(i)) continue;
    const si = stars[i];

    for (let j = i + 1; j < len; j++) {
      if (toRemove.has(j)) continue;
      const sj = stars[j];

      const dx = sj.x - si.x;
      const dy = sj.y - si.y;
      const dz = sj.z - si.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const collisionDist = COLLISION_DISTANCE * (si.size + sj.size) * 0.5;

      if (distSq < collisionDist * collisionDist) {
        const totalMass = si.mass + sj.mass;

        si.vx = (si.vx * si.mass + sj.vx * sj.mass) / totalMass;
        si.vy = (si.vy * si.mass + sj.vy * sj.mass) / totalMass;
        si.vz = (si.vz * si.mass + sj.vz * sj.mass) / totalMass;

        si.x = (si.x * si.mass + sj.x * sj.mass) / totalMass;
        si.y = (si.y * si.mass + sj.y * sj.mass) / totalMass;
        si.z = (si.z * si.mass + sj.z * sj.mass) / totalMass;

        si.mass = totalMass;
        si.size = 0.8 + totalMass * 0.3;

        const tempFactor = Math.min(1, totalMass / (MAX_MASS * 2));
        si.colorIndex = Math.max(0, Math.min(STAR_COLORS.length - 1, Math.floor(tempFactor * 2)));

        toRemove.add(j);
        collisions++;
      }
    }
  }

  if (toRemove.size > 0) {
    stars = stars.filter((_, idx) => !toRemove.has(idx));
  }

  return collisions;
}

function step() {
  computeGravity();
  updatePositions();
  const newCollisions = handleCollisions();
  collisionCount += newCollisions;
}

function buildPositionBuffer(): Float32Array {
  const positions = new Float32Array(stars.length * 3);
  for (let i = 0; i < stars.length; i++) {
    positions[i * 3] = stars[i].x;
    positions[i * 3 + 1] = stars[i].y;
    positions[i * 3 + 2] = stars[i].z;
  }
  return positions;
}

function buildColorBuffer(): Float32Array {
  const colors = new Float32Array(stars.length * 3);
  for (let i = 0; i < stars.length; i++) {
    const c = STAR_COLORS[stars[i].colorIndex];
    const brightness = 0.7 + (stars[i].mass / MAX_MASS) * 0.5;
    colors[i * 3] = c.r * brightness;
    colors[i * 3 + 1] = c.g * brightness;
    colors[i * 3 + 2] = c.b * brightness;
  }
  return colors;
}

function buildSizeBuffer(): Float32Array {
  const sizes = new Float32Array(stars.length);
  for (let i = 0; i < stars.length; i++) {
    sizes[i] = stars[i].size;
  }
  return sizes;
}

function setStarCount(count: number) {
  if (count > stars.length) {
    const newStars = generateStars(count - stars.length);
    stars = stars.concat(newStars);
  } else if (count < stars.length) {
    stars = stars.slice(0, count);
  }
}

onmessage = function(e: MessageEvent) {
  const { type, data, params, count } = e.data;

  switch (type) {
    case 'init':
      stars = generateStars(data.count ?? INITIAL_STAR_COUNT);
      collisionCount = 0;
      postMessage({
        type: 'positions',
        positions: buildPositionBuffer(),
        colors: buildColorBuffer(),
        sizes: buildSizeBuffer(),
        collisions: collisionCount,
        count: stars.length
      }, [buildPositionBuffer().buffer, buildColorBuffer().buffer, buildSizeBuffer().buffer]);
      break;

    case 'step':
      step();
      const posBuffer = buildPositionBuffer();
      const colBuffer = buildColorBuffer();
      const sizeBuffer = buildSizeBuffer();
      postMessage({
        type: 'positions',
        positions: posBuffer,
        colors: colBuffer,
        sizes: sizeBuffer,
        collisions: collisionCount,
        count: stars.length
      }, [posBuffer.buffer, colBuffer.buffer, sizeBuffer.buffer]);
      break;

    case 'updateParams':
      if (params.gravitationalConstant !== undefined) {
        gravitationalConstant = params.gravitationalConstant;
      }
      if (params.timeStep !== undefined) {
        timeStep = params.timeStep;
      }
      break;

    case 'setStarCount':
      setStarCount(count);
      const pBuf = buildPositionBuffer();
      const cBuf = buildColorBuffer();
      const sBuf = buildSizeBuffer();
      postMessage({
        type: 'positions',
        positions: pBuf,
        colors: cBuf,
        sizes: sBuf,
        collisions: collisionCount,
        count: stars.length
      }, [pBuf.buffer, cBuf.buffer, sBuf.buffer]);
      break;
  }
};

export {};
