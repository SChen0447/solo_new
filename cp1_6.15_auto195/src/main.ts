import { CANVAS_WIDTH, CANVAS_HEIGHT } from './types';
import { GameController } from './gameController';

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Canvas element not found: #game-canvas');
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const dpr = window.devicePixelRatio || 1;
  if (dpr > 1) {
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  const game = new GameController(canvas);
  game.start();

  window.addEventListener('resize', () => {
    const container = document.getElementById('game-container');
    if (!container) return;

    const scaleX = container.clientWidth / CANVAS_WIDTH;
    const scaleY = container.clientHeight / CANVAS_HEIGHT;
    const scale = Math.min(scaleX, scaleY, 1);

    canvas.style.transform = `scale(${scale})`;
    canvas.style.transformOrigin = 'center center';
  });

  const container = document.getElementById('game-container');
  if (container) {
    const scaleX = container.clientWidth / CANVAS_WIDTH;
    const scaleY = container.clientHeight / CANVAS_HEIGHT;
    const scale = Math.min(scaleX, scaleY, 1);
    if (scale < 1) {
      canvas.style.transform = `scale(${scale})`;
      canvas.style.transformOrigin = 'center center';
    }
  }

  console.log('下水道潜行游戏已启动 - Sewer Stealth Game Started');
  console.log('控制方式: WASD / 方向键移动 | 鼠标瞄准手电筒 | F 开关手电 | R 重新开始');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
