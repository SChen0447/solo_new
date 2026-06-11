import * as THREE from 'three';
import { JSDOM } from 'jsdom';
import { ParticleSystem, MotionMode } from '../../src/particleSystem';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).document = dom.window.document;
(global as any).window = dom.window;
(global as any).HTMLCanvasElement = dom.window.HTMLCanvasElement;
(global as any).performance = global.performance || require('perf_hooks').performance;

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

interface BenchmarkResult {
  name: string;
  avgMs: number;
  minMs: number;
  maxMs: number;
  fps: number;
  passed: boolean;
  target?: number;
  particles?: number;
}

const results: BenchmarkResult[] = [];

function formatMs(ms: number): string {
  return `${ms.toFixed(3)}ms`;
}

function formatFps(fps: number): string {
  return `${fps.toFixed(1)} FPS`;
}

function runBenchmark(
  name: string,
  setup: () => ParticleSystem,
  iterations: number,
  targetFps: number,
  extra?: { particles?: number }
): void {
  const ps = setup();
  const times: number[] = [];

  for (let i = 0; i < Math.min(50, iterations); i++) {
    ps.update(0.016);
  }

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    ps.update(0.016);
    times.push(performance.now() - start);
  }

  ps.dispose();

  const avgMs = times.reduce((s, t) => s + t, 0) / times.length;
  const minMs = Math.min(...times);
  const maxMs = Math.max(...times);
  const fps = 1000 / avgMs;
  const passed = fps >= targetFps;

  results.push({
    name,
    avgMs,
    minMs,
    maxMs,
    fps,
    passed,
    target: targetFps,
    particles: extra?.particles
  });

  const status = passed ? '✅' : '❌';
  const targetStr = targetFps ? `(target: ${targetFps} FPS)` : '';
  console.log(`  ${status} ${name}`);
  console.log(`     Avg: ${formatMs(avgMs)} | Min: ${formatMs(minMs)} | Max: ${formatMs(maxMs)}`);
  console.log(`     ${formatFps(fps)} ${targetStr}`);
}

function createRendererMock(): void {
  global.THREE = THREE;
}

console.log('\n=== Particle System Performance Benchmarks ===\n');
createRendererMock();

console.log('--- Motion Mode Performance (5000 particles, 500 iterations) ---\n');

const motionModes: { mode: MotionMode; name: string; target: number }[] = [
  { mode: 'lorenz', name: '🦋 Lorenz Attractor', target: 60 },
  { mode: 'noise', name: '🌫️ 3D Noise Field', target: 55 },
  { mode: 'attractors', name: '✨ Multi-Attractor', target: 50 },
  { mode: 'vortex', name: '🌀 Vortex', target: 60 },
  { mode: 'galaxy', name: '🌌 Spiral Galaxy', target: 60 }
];

for (const { mode, name, target } of motionModes) {
  runBenchmark(
    name,
    () => new ParticleSystem({ count: 5000, motionMode: mode, trailEnabled: false }),
    500,
    target,
    { particles: 5000 }
  );
}

console.log('\n--- Particle Count Scaling (Lorenz mode, 300 iterations) ---\n');

const particleCounts = [
  { count: 1000, target: 60 },
  { count: 5000, target: 60 },
  { count: 8000, target: 45 },
  { count: 10000, target: 40 }
];

for (const { count, target } of particleCounts) {
  runBenchmark(
    `${count.toLocaleString()} particles`,
    () => new ParticleSystem({ count, motionMode: 'lorenz', trailEnabled: false }),
    300,
    target,
    { particles: count }
  );
}

console.log('\n--- Trail System Performance (8000 particles, Lorenz mode, 200 iterations) ---\n');

const trailConfigs = [
  { enabled: false, length: 0, name: 'Trail OFF', target: 45 },
  { enabled: true, length: 6, name: 'Trail length 6', target: 45 },
  { enabled: true, length: 12, name: 'Trail length 12', target: 45 },
  { enabled: true, length: 20, name: 'Trail length 20', target: 40 },
  { enabled: true, length: 30, name: 'Trail length 30', target: 35 }
];

for (const config of trailConfigs) {
  runBenchmark(
    config.name,
    () => new ParticleSystem({
      count: 8000,
      motionMode: 'lorenz',
      trailEnabled: config.enabled,
      trailLength: config.length
    }),
    200,
    config.target,
    { particles: 8000 }
  );
}

console.log('\n--- Real-world Scenario Benchmark (TARGET: 45 FPS @ 8000 + trail) ---\n');

runBenchmark(
  '🎯 8000 particles + trail length 12 + Lorenz mode',
  () => new ParticleSystem({
    count: 8000,
    motionMode: 'lorenz',
    trailEnabled: true,
    trailLength: 12
  }),
  500,
  45,
  { particles: 8000 }
);

console.log('\n--- Benchmark Summary ---');

const passed = results.filter(r => r.passed).length;
const total = results.length;

console.log(`\nTotal benchmarks: ${total}`);
console.log(`Passed: ${passed} / ${total}`);
console.log(`Failed: ${total - passed}`);

if (total - passed > 0) {
  console.log('\n❌ Failed benchmarks:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}: ${formatFps(r.fps)} (target: ${r.target} FPS)`);
  });
}

const keyBenchmark = results.find(r => r.name.includes('8000 particles + trail length 12'));
if (keyBenchmark) {
  console.log(`\n📊 Key Performance Target (8000 particles + trail):`);
  console.log(`   FPS: ${formatFps(keyBenchmark.fps)} | Target: 45 FPS`);
  console.log(`   ${keyBenchmark.passed ? '✅ MET' : '❌ NOT MET'}`);
}

console.log('\n=== Benchmark Complete ===\n');

const allPassed = results.every(r => r.passed);
process.exit(allPassed ? 0 : 1);
