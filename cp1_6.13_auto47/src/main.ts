import { InputManager } from './InputManager';
import { GameWorld } from './GameWorld';
import { Renderer } from './Renderer';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const input = new InputManager(canvas);
const world = new GameWorld();
const renderer = new Renderer(canvas);

let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;
let currentFps = 60;

canvas.addEventListener('mousemove', (e) => {
  renderer.checkRestartHover(e.clientX, e.clientY);
});

canvas.addEventListener('click', (e) => {
  if (renderer.checkRestartClick(e.clientX, e.clientY)) {
    world.restart();
  }
});

canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0 && world.gameOverInfo) {
    const t = e.touches[0];
    if (renderer.checkRestartClick(t.clientX, t.clientY)) {
      world.restart();
    }
  }
}, { passive: true });

function loop(now: number): void {
  const deltaTime = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  frameCount++;
  fpsTimer += deltaTime;
  if (fpsTimer >= 1) {
    currentFps = frameCount;
    frameCount = 0;
    fpsTimer = 0;
    console.log(`[FPS] ${currentFps}`);
  }

  const inputState = input.getState();
  world.update(deltaTime, inputState);
  renderer.render(deltaTime, world);

  requestAnimationFrame(loop);
}

console.log('[Magma Escape] 游戏启动中...');
console.log('[Controls] WASD/方向键 移动 | 空格 跳跃 + 蒸汽滑翔');
requestAnimationFrame(loop);
