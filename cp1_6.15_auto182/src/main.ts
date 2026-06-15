import { GameEngine } from './GameEngine';
import { Player } from './Player';
import { Obstacles } from './Obstacles';
import { UIRenderer } from './UIRenderer';

const canvas: HTMLCanvasElement = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!;

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const gameEngine = new GameEngine(canvas.width, canvas.height);
const player = new Player(canvas.width, canvas.height);
const obstacles = new Obstacles(canvas.width, canvas.height);
const uiRenderer = new UIRenderer(canvas.width, canvas.height);

let lastTime: number = performance.now();
let gameRunning: boolean = true;

function handleMouseMove(e: MouseEvent): void {
  player.setTargetX(e.clientX);
}
window.addEventListener('mousemove', handleMouseMove);

function handleTouchMove(e: TouchEvent): void {
  if (e.touches.length > 0) {
    player.setTargetX(e.touches[0].clientX);
  }
  e.preventDefault();
}
window.addEventListener('touchmove', handleTouchMove, { passive: false });

function handleRestart(e: MouseEvent | TouchEvent): void {
  if (!gameRunning && uiRenderer.checkRestartClick(e)) {
    gameRunning = true;
    gameEngine.reset();
    player.reset();
    obstacles.reset();
    uiRenderer.reset();
  }
}
window.addEventListener('click', handleRestart);
window.addEventListener('touchstart', handleRestart);

function handleHover(e: MouseEvent): void {
  if (!gameRunning) {
    uiRenderer.updateHover(e.clientX, e.clientY);
  }
}
window.addEventListener('mousemove', handleHover);

function gameLoop(currentTime: number): void {
  const deltaTime: number = Math.min((currentTime - lastTime) / 16.67, 2);
  lastTime = currentTime;

  if (gameRunning) {
    gameEngine.update(deltaTime);
    player.update(deltaTime, gameEngine.getTrackLeft(), gameEngine.getTrackRight());
    obstacles.update(deltaTime, gameEngine.getSpeed());

    const obstacleList = obstacles.getObstacles();
    for (let i = 0; i < obstacleList.length; i++) {
      const obs = obstacleList[i];
      if (gameEngine.checkAABBCollision(
        player.getX() - player.getHalfWidth(),
        player.getY() - player.getHalfHeight(),
        player.getWidth(),
        player.getHeight(),
        obs.x - obs.size / 2,
        obs.y - obs.size / 2,
        obs.size,
        obs.size
      )) {
        gameRunning = false;
        uiRenderer.triggerGameOver(gameEngine.getScore());
        break;
      }
    }

    const pointList = obstacles.getPoints();
    for (let i = pointList.length - 1; i >= 0; i--) {
      const pt = pointList[i];
      if (gameEngine.checkAABBCollision(
        player.getX() - player.getHalfWidth(),
        player.getY() - player.getHalfHeight(),
        player.getWidth(),
        player.getHeight(),
        pt.x - pt.radius,
        pt.y - pt.radius,
        pt.radius * 2,
        pt.radius * 2
      )) {
        pointList.splice(i, 1);
        gameEngine.addScore(10);
        uiRenderer.triggerScoreFlash();
        player.triggerCollectFlash();
      }
    }
  }

  uiRenderer.renderBackground(ctx);
  gameEngine.render(ctx);
  obstacles.render(ctx);
  player.render(ctx);
  uiRenderer.render(ctx, gameEngine.getScore(), gameRunning);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
