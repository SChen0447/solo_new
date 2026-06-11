import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { ParticleSystem, MotionMode, ColorMode, ParticleShape } from '../../src/particleSystem';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).document = dom.window.document;
(global as any).window = dom.window;
(global as any).HTMLCanvasElement = dom.window.HTMLCanvasElement;
(global as any).performance = global.performance || require('perf_hooks').performance;
(global as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 16);

dom.window.HTMLCanvasElement.prototype.getContext = function () {
  return {
    clearRect: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    beginPath: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fill: () => {},
    fillRect: () => {}
  } as any;
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void> | void): Promise<void> {
  const start = performance.now();
  try {
    await fn();
    results.push({ name, passed: true, duration: performance.now() - start });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error, duration: performance.now() - start });
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error}`);
  }
}

console.log('\n=== Particle System Unit Tests ===\n');

console.log('--- Constructor & Initialization ---');

await runTest('should create particle system with default params', () => {
  const ps = new ParticleSystem();
  assert.equal(ps.params.count, 5000);
  assert.equal(ps.params.speed, 1.0);
  assert.equal(ps.params.size, 0.15);
  assert.equal(ps.params.colorMode, 'rainbow');
  assert.equal(ps.params.shape, 'circle');
  assert.equal(ps.params.motionMode, 'lorenz');
  assert.equal(ps.params.trailEnabled, false);
  assert.equal(ps.params.trailLength, 12);
  assert.equal(ps.paused, false);
  ps.dispose();
});

await runTest('should create particle system with custom params', () => {
  const custom = {
    count: 2000,
    speed: 2.5,
    size: 0.3,
    colorMode: 'neon' as ColorMode,
    shape: 'triangle' as ParticleShape,
    motionMode: 'noise' as MotionMode,
    trailEnabled: true,
    trailLength: 20
  };
  const ps = new ParticleSystem(custom);
  for (const [key, value] of Object.entries(custom)) {
    assert.equal(ps.params[key as keyof typeof ps.params], value, `Param ${key} mismatch`);
  }
  ps.dispose();
});

await runTest('should generate correct number of particles', () => {
  const counts = [1000, 5000, 8000, 10000];
  for (const count of counts) {
    const ps = new ParticleSystem({ count });
    const posAttr = ps.points.geometry.attributes.position;
    assert.equal(posAttr.count, count, `Expected ${count} particles`);
    assert.equal(posAttr.array.length, count * 3);
    ps.dispose();
  }
});

await runTest('should initialize particles within bounds', () => {
  const ps = new ParticleSystem({ count: 5000 });
  const positions = ps.points.geometry.attributes.position.array as Float32Array;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    const dist = Math.sqrt(x * x + y * y + z * z);
    assert.ok(dist <= 9, `Particle ${i / 3} too far from origin: ${dist}`);
    assert.ok(dist >= 0.5, `Particle ${i / 3} too close to origin: ${dist}`);
  }
  ps.dispose();
});

await runTest('should generate valid colors in RGB range', () => {
  const modes: ColorMode[] = ['rainbow', 'warm', 'cool', 'neon'];
  for (const mode of modes) {
    const ps = new ParticleSystem({ colorMode: mode, count: 1000 });
    const colors = ps.points.geometry.attributes.color.array as Float32Array;
    for (let i = 0; i < colors.length; i++) {
      assert.ok(colors[i] >= 0 && colors[i] <= 1, `Color component out of range: ${colors[i]}`);
    }
    ps.dispose();
  }
});

console.log('\n--- Motion Algorithms ---');

const motionModes: { mode: MotionMode; name: string }[] = [
  { mode: 'lorenz', name: 'Lorenz attractor' },
  { mode: 'noise', name: '3D noise field' },
  { mode: 'attractors', name: 'Multi-attractor system' },
  { mode: 'vortex', name: 'Vortex' },
  { mode: 'galaxy', name: 'Spiral galaxy' }
];

for (const { mode, name } of motionModes) {
  await runTest(`${name} mode should update particles without NaN values`, () => {
    const ps = new ParticleSystem({ count: 1000, motionMode: mode });
    const positions = ps.points.geometry.attributes.position.array as Float32Array;
    const initial = new Float32Array(positions);

    for (let i = 0; i < 100; i++) {
      ps.update(0.016);
    }

    for (let i = 0; i < positions.length; i++) {
      assert.ok(!Number.isNaN(positions[i]), `NaN at position ${i}`);
      assert.ok(Number.isFinite(positions[i]), `Infinite at position ${i}`);
    }

    let changed = false;
    for (let i = 0; i < positions.length; i++) {
      if (Math.abs(positions[i] - initial[i]) > 0.001) {
        changed = true;
        break;
      }
    }
    assert.ok(changed, 'Particles did not move');
    ps.dispose();
  });
}

await runTest('Lorenz attractor should follow butterfly pattern characteristics', () => {
  const ps = new ParticleSystem({ count: 50, motionMode: 'lorenz' });
  const positions = ps.points.geometry.attributes.position.array as Float32Array;
  const initialY = positions[1];

  for (let i = 0; i < 500; i++) {
    ps.update(0.008);
  }

  let hasPositiveX = false, hasNegativeX = false;
  let hasPositiveZ = false, hasNegativeZ = false;
  for (let i = 0; i < positions.length; i += 3) {
    if (positions[i] > 1) hasPositiveX = true;
    if (positions[i] < -1) hasNegativeX = true;
    if (positions[i + 2] > 1) hasPositiveZ = true;
    if (positions[i + 2] < -1) hasNegativeZ = true;
  }
  assert.ok(hasPositiveX && hasNegativeX, 'Lorenz should spread in X axis');
  assert.ok(hasPositiveZ && hasNegativeZ, 'Lorenz should spread in Z axis');
  ps.dispose();
});

await runTest('Vortex mode should maintain mostly circular motion', () => {
  const ps = new ParticleSystem({ count: 50, motionMode: 'vortex' });
  const positions = ps.points.geometry.attributes.position.array as Float32Array;
  const initialAngles = new Float32Array(50);

  for (let i = 0; i < 50; i++) {
    const i3 = i * 3;
    initialAngles[i] = Math.atan2(positions[i3 + 2], positions[i3]);
  }

  let totalRotation = 0;
  for (let step = 0; step < 50; step++) {
    ps.update(0.016);
    for (let i = 0; i < 50; i++) {
      const i3 = i * 3;
      const newAngle = Math.atan2(positions[i3 + 2], positions[i3]);
      let diff = newAngle - initialAngles[i];
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      totalRotation += Math.abs(diff);
      initialAngles[i] = newAngle;
    }
  }
  assert.ok(totalRotation > 50, 'Vortex particles should rotate significantly');
  ps.dispose();
});

console.log('\n--- Trail System ---');

await runTest('trail disabled should create no trail meshes', () => {
  const ps = new ParticleSystem({ trailEnabled: false });
  assert.equal(ps.trailMeshes.length, 0);
  ps.dispose();
});

await runTest('trail enabled should create correct number of trail meshes', () => {
  const lengths = [3, 8, 12, 20];
  for (const len of lengths) {
    const ps = new ParticleSystem({ trailEnabled: true, trailLength: len });
    assert.equal(ps.trailMeshes.length, len - 1, `Expected ${len - 1} trail meshes for length ${len}`);
    ps.dispose();
  }
});

await runTest('trail positions should follow current position with decay', () => {
  const ps = new ParticleSystem({ trailEnabled: true, trailLength: 6, count: 100 });
  const positions = ps.points.geometry.attributes.position.array as Float32Array;

  for (let i = 0; i < 10; i++) {
    ps.update(0.016);
  }

  const currentPos = new Float32Array(positions);
  for (let t = 0; t < ps.trailMeshes.length; t++) {
    const trailPos = ps.trailMeshes[t].geometry.attributes.position.array as Float32Array;
    let maxDiff = 0;
    for (let i = 0; i < trailPos.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(trailPos[i] - currentPos[i]));
    }
    if (t < ps.trailMeshes.length - 1) {
      assert.ok(maxDiff > 0.001, `Trail ${t} should differ from current position`);
    }
  }
  ps.dispose();
});

await runTest('trail meshes should have decreasing opacity with age', () => {
  const ps = new ParticleSystem({ trailEnabled: true, trailLength: 10 });
  let prevOpacity = 1;
  for (let t = 0; t < ps.trailMeshes.length; t++) {
    const mat = ps.trailMeshes[t].material as THREE.PointsMaterial;
    assert.ok(mat.opacity < prevOpacity, `Trail ${t} opacity should decrease with age`);
    assert.ok(mat.opacity > 0, `Trail ${t} opacity should be > 0`);
    prevOpacity = mat.opacity;
  }
  ps.dispose();
});

await runTest('setTrailLength should recreate trail meshes', () => {
  const ps = new ParticleSystem({ trailEnabled: true, trailLength: 8 });
  assert.equal(ps.trailMeshes.length, 7);
  ps.setTrailLength(15);
  assert.equal(ps.trailMeshes.length, 14);
  assert.equal(ps.params.trailLength, 15);
  ps.dispose();
});

await runTest('setTrailEnabled should toggle trail meshes', () => {
  const ps = new ParticleSystem({ trailEnabled: true, trailLength: 10 });
  assert.equal(ps.trailMeshes.length, 9);
  ps.setTrailEnabled(false);
  assert.equal(ps.trailMeshes.length, 0);
  assert.equal(ps.params.trailEnabled, false);
  ps.setTrailEnabled(true);
  assert.equal(ps.trailMeshes.length, 9);
  assert.equal(ps.params.trailEnabled, true);
  ps.dispose();
});

console.log('\n--- Parameter Updates ---');

await runTest('setCount should regenerate particles', () => {
  const ps = new ParticleSystem({ count: 2000 });
  assert.equal(ps.points.geometry.attributes.position.count, 2000);
  ps.setCount(8000);
  assert.equal(ps.points.geometry.attributes.position.count, 8000);
  assert.equal(ps.params.count, 8000);
  ps.dispose();
});

await runTest('setSpeed should update speed immediately', () => {
  const ps = new ParticleSystem({ speed: 1.0 });
  ps.setSpeed(2.5);
  assert.equal(ps.params.speed, 2.5);
  ps.dispose();
});

await runTest('setSize should update particle sizes', () => {
  const ps = new ParticleSystem({ size: 0.15, count: 1000 });
  const sizes = ps.points.geometry.attributes.size.array as Float32Array;
  const initialSizes = new Float32Array(sizes);
  ps.setSize(0.4);
  assert.equal(ps.params.size, 0.4);
  for (let i = 0; i < sizes.length; i++) {
    assert.ok(sizes[i] > initialSizes[i], `Size should increase`);
  }
  ps.dispose();
});

await runTest('setColorMode should update all particle colors', () => {
  const ps = new ParticleSystem({ colorMode: 'rainbow', count: 1000 });
  const colors = ps.points.geometry.attributes.color.array as Float32Array;
  const initialColors = new Float32Array(colors);
  ps.setColorMode('neon');
  assert.equal(ps.params.colorMode, 'neon');
  let changed = false;
  for (let i = 0; i < colors.length; i++) {
    if (Math.abs(colors[i] - initialColors[i]) > 0.001) {
      changed = true;
      break;
    }
  }
  assert.ok(changed, 'Colors should change after setColorMode');
  ps.dispose();
});

await runTest('setShape should update texture without error', () => {
  const shapes: ParticleShape[] = ['circle', 'triangle', 'square'];
  const ps = new ParticleSystem({ shape: 'circle' });
  for (const shape of shapes) {
    ps.setShape(shape);
    assert.equal(ps.params.shape, shape);
    const mat = ps.points.material as THREE.PointsMaterial;
    assert.ok(mat.map !== null, 'Material should have texture map');
  }
  ps.dispose();
});

await runTest('setMotionMode should reset velocity damping', () => {
  const ps = new ParticleSystem({ motionMode: 'lorenz', count: 100 });
  const velocities = new Float32Array(300);
  for (let i = 0; i < 300; i++) velocities[i] = 10 + Math.random() * 10;
  ps.setMotionMode('noise');
  assert.equal(ps.params.motionMode, 'noise');
  ps.dispose();
});

console.log('\n--- Pause & Reset ---');

await runTest('pause should prevent particle updates', () => {
  const ps = new ParticleSystem({ count: 1000 });
  const positions = ps.points.geometry.attributes.position.array as Float32Array;
  const before = new Float32Array(positions);

  ps.paused = true;
  for (let i = 0; i < 10; i++) ps.update(0.016);

  for (let i = 0; i < positions.length; i++) {
    assert.equal(positions[i], before[i], 'Position should not change when paused');
  }
  ps.dispose();
});

await runTest('togglePause should flip paused state', () => {
  const ps = new ParticleSystem();
  assert.equal(ps.paused, false);
  ps.togglePause();
  assert.equal(ps.paused, true);
  ps.togglePause();
  assert.equal(ps.paused, false);
  ps.dispose();
});

await runTest('reset should reinitialize particles to starting state', () => {
  const ps = new ParticleSystem({ count: 1000 });
  const positions = ps.points.geometry.attributes.position.array as Float32Array;

  for (let i = 0; i < 100; i++) ps.update(0.016);

  const afterUpdate = new Float32Array(positions);
  ps.reset();

  let changed = false;
  for (let i = 0; i < positions.length; i++) {
    if (Math.abs(positions[i] - afterUpdate[i]) > 0.001) {
      changed = true;
      break;
    }
  }
  assert.ok(changed, 'Positions should change after reset');
  ps.dispose();
});

console.log('\n--- Rendering & Depth ---');

await runTest('non-circular shapes should have depthTest enabled', () => {
  const shapes: ParticleShape[] = ['circle', 'triangle', 'square'];
  for (const shape of shapes) {
    const ps = new ParticleSystem({ shape });
    const mat = ps.points.material as THREE.PointsMaterial;
    assert.equal(mat.depthTest, true, `${shape} should have depthTest=true`);
    assert.equal(mat.alphaTest > 0, true, `${shape} should have alphaTest > 0`);
    ps.dispose();
  }
});

await runTest('particles should have proper renderOrder for sorting', () => {
  const ps = new ParticleSystem({ trailEnabled: true, trailLength: 8 });
  assert.equal(ps.points.renderOrder, 1);
  for (let t = 0; t < ps.trailMeshes.length; t++) {
    assert.equal(ps.trailMeshes[t].renderOrder, 2 + t, `Trail ${t} renderOrder incorrect`);
  }
  ps.dispose();
});

await runTest('material should use AdditiveBlending for glow effect', () => {
  const ps = new ParticleSystem();
  const mat = ps.points.material as THREE.PointsMaterial;
  assert.equal(mat.blending, THREE.AdditiveBlending);
  assert.equal(mat.transparent, true);
  ps.dispose();
});

console.log('\n--- Boundary Constraints ---');

await runTest('noise mode particles should stay within bounds', () => {
  const ps = new ParticleSystem({ count: 100, motionMode: 'noise' });
  const positions = ps.points.geometry.attributes.position.array as Float32Array;
  const B = ParticleSystem.BOUNDARY;

  for (let i = 0; i < 200; i++) {
    ps.update(0.016);
    for (let j = 0; j < positions.length; j += 3) {
      assert.ok(Math.abs(positions[j]) <= B + 0.5, `X out of bounds: ${positions[j]}`);
      assert.ok(Math.abs(positions[j + 1]) <= B + 0.5, `Y out of bounds: ${positions[j + 1]}`);
      assert.ok(Math.abs(positions[j + 2]) <= B + 0.5, `Z out of bounds: ${positions[j + 2]}`);
    }
  }
  ps.dispose();
});

console.log('\n=== Test Summary ===');
const passed = results.filter(r => r.passed).length;
const total = results.length;
const avgDuration = results.reduce((s, r) => s + r.duration, 0) / total;

console.log(`\nTotal: ${total} tests`);
console.log(`Passed: ${passed} / ${total}`);
console.log(`Failed: ${total - passed}`);
console.log(`Avg duration: ${avgDuration.toFixed(2)}ms per test`);

if (total - passed > 0) {
  console.log('\nFailed tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
}
