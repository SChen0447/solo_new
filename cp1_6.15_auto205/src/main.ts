import { Scene } from './scene';
import { Interaction } from './interaction';
import { GameController } from './gameController';
import { eventBus } from './eventBus';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let w = window.innerWidth;
let h = window.innerHeight;
canvas.width = w;
canvas.height = h;

const scene = new Scene();
const interaction = new Interaction();
const controller = new GameController(w, h);

let mousePos = { x: w / 2, y: h / 2 };
let mouseDown = false;
let lastTime = performance.now();

scene.init(w, h);

eventBus.on('scene:removeDebris', (id: unknown) => {
  scene.removeDebris(id as number);
});
eventBus.on('scene:removeCore', (id: unknown) => {
  scene.removeCore(id as number);
});

function resize(): void {
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
}

window.addEventListener('resize', resize);

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  mousePos = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  if (e.button === 0) {
    mouseDown = true;
    if (controller.handleClick(e.clientX, e.clientY)) {
      if (controller.getState() === 'start' || controller.getState() === 'over') {
        controller.reset(w, h);
        scene.init(w, h);
      }
    }
  }
});

canvas.addEventListener('mouseup', (e: MouseEvent) => {
  if (e.button === 0) mouseDown = false;
});

canvas.addEventListener('touchstart', (e: TouchEvent) => {
  e.preventDefault();
  const t = e.touches[0];
  mousePos = { x: t.clientX, y: t.clientY };
  mouseDown = true;
  if (controller.handleClick(t.clientX, t.clientY)) {
    if (controller.getState() === 'start' || controller.getState() === 'over') {
      controller.reset(w, h);
      scene.init(w, h);
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e: TouchEvent) => {
  e.preventDefault();
  const t = e.touches[0];
  mousePos = { x: t.clientX, y: t.clientY };
}, { passive: false });

canvas.addEventListener('touchend', () => {
  mouseDown = false;
});

function gameLoop(now: number): void {
  requestAnimationFrame(gameLoop);

  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (controller.getState() === 'playing') {
    controller.updateShip(mousePos, w, h);
    scene.update(dt, w, h);
    interaction.update(dt, controller.getShip(), mouseDown, mousePos, scene.getDebris(), scene.getCores());
    controller.update(dt, scene.getAsteroids(), scene.getTraps());
  }

  ctx.fillStyle = '#0b0c10';
  ctx.fillRect(0, 0, w, h);

  scene.drawNebula(ctx);
  scene.drawTraps(ctx);
  scene.drawDebris(ctx);
  scene.drawCores(ctx);
  scene.drawAsteroids(ctx);
  interaction.drawBeam(ctx, controller.getShip());
  controller.drawShip(ctx);
  controller.drawUI(ctx, w, h, controller.getTimeRemaining());
}

lastTime = performance.now();
requestAnimationFrame(gameLoop);
