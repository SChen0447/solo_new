import { Game } from './game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const game = new Game(canvas);

const scoreValueEl = document.getElementById('score-value')!;
const comboDisplayEl = document.getElementById('combo-display')!;
const hudLivesEl = document.getElementById('hud-lives')!;
const weaponNameEl = document.getElementById('weapon-name')!;
const weaponInfoEl = document.getElementById('weapon-info')!;
const weaponIconEl = document.getElementById('weapon-icon')!;
const gameOverOverlayEl = document.getElementById('game-over-overlay')!;
const finalScoreEl = document.getElementById('final-score')!;
const restartBtnEl = document.getElementById('restart-btn')!;
const scoreFloatContainerEl = document.getElementById('score-float-container')!;
const buffIndicatorEl = document.getElementById('buff-indicator')!;
const reviveFlashEl = document.getElementById('revive-flash')!;
const gameContainerEl = document.getElementById('game-container')!;

function updateScoreUI(score: number, combo: number): void {
  scoreValueEl.textContent = score.toString();
  if (combo >= 2) {
    comboDisplayEl.textContent = `连杀 x${combo}${combo >= 5 ? ' 🔥' : ''}`;
  } else {
    comboDisplayEl.textContent = '';
  }
}

function updateLivesUI(lives: number, maxLives: number): void {
  hudLivesEl.innerHTML = '';
  for (let i = 0; i < maxLives; i++) {
    const heart = document.createElement('div');
    heart.className = 'heart' + (i >= lives ? ' empty' : '');
    hudLivesEl.appendChild(heart);
  }
}

function updateWeaponUI(
  weaponName: string,
  ammo: number,
  isInfinite: boolean,
  fireRate: string
): void {
  weaponNameEl.textContent = weaponName;
  const ammoText = isInfinite ? '∞' : ammo.toString();
  weaponInfoEl.textContent = `弹药: ${ammoText} | 射速: ${fireRate}`;

  weaponIconEl.innerHTML = '';
  const iconCanvas = document.createElement('canvas');
  iconCanvas.width = 40;
  iconCanvas.height = 40;
  const iconCtx = iconCanvas.getContext('2d')!;
  drawWeaponIcon(iconCtx, weaponName);
  weaponIconEl.appendChild(iconCanvas);
}

function drawWeaponIcon(ctx: CanvasRenderingContext2D, weaponName: string): void {
  ctx.save();
  ctx.translate(20, 20);

  if (weaponName === '手枪') {
    ctx.fillStyle = '#888';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-10, -6, 20, 8, 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-4, 2, 8, 10, 2);
    ctx.fill();
    ctx.stroke();
  } else if (weaponName === '霰弹枪') {
    ctx.fillStyle = '#e67e22';
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-14, -5, 28, 7, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.roundRect(-14, 2, 10, 10, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.arc(14, -1, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function updateBuffUI(speedBoost: number): void {
  buffIndicatorEl.innerHTML = '';

  if (speedBoost > 0) {
    const item = document.createElement('div');
    item.className = 'buff-item';
    item.innerHTML = `
      <span style="font-size: 14px;">⚡</span>
      <span>加速 ${speedBoost.toFixed(1)}s</span>
    `;
    buffIndicatorEl.appendChild(item);
  }
}

function showGameOver(finalScore: number): void {
  finalScoreEl.textContent = `最终得分: ${finalScore}`;
  gameOverOverlayEl.classList.add('visible');
}

function hideGameOver(): void {
  gameOverOverlayEl.classList.remove('visible');
}

function showScoreFloat(value: number, canvasX: number, canvasY: number): void {
  const containerRect = gameContainerEl.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  const relX = canvasRect.left - containerRect.left + canvasX;
  const relY = canvasRect.top - containerRect.top + canvasY;

  const float = document.createElement('div');
  float.className = 'score-float';
  float.textContent = `+${value}`;
  float.style.left = `${relX}px`;
  float.style.top = `${relY}px`;
  scoreFloatContainerEl.appendChild(float);

  setTimeout(() => {
    float.remove();
  }, 500);
}

function startReviveFlash(): void {
  reviveFlashEl.classList.add('flashing');
}

function stopReviveFlash(): void {
  reviveFlashEl.classList.remove('flashing');
}

game.setCallbacks({
  onScoreUpdate: updateScoreUI,
  onLivesUpdate: updateLivesUI,
  onWeaponUpdate: updateWeaponUI,
  onGameOver: showGameOver,
  onScoreFloat: showScoreFloat,
  onBuffUpdate: updateBuffUI,
  onReviveStart: startReviveFlash,
  onReviveEnd: stopReviveFlash,
});

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

window.addEventListener('keydown', (e) => {
  game.player.setKey(e.key, true);
});

window.addEventListener('keyup', (e) => {
  game.player.setKey(e.key, false);
});

canvas.addEventListener('mousemove', (e) => {
  const coords = getCanvasCoords(e);
  game.player.setMousePosition(coords.x, coords.y);
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    game.player.setMouseDown(true);
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    game.player.setMouseDown(false);
  }
});

canvas.addEventListener('mouseleave', () => {
  game.player.setMouseDown(false);
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

restartBtnEl.addEventListener('click', () => {
  hideGameOver();
  game.reset();
});

game.start();

let lastTime = performance.now();

function gameLoop(currentTime: number): void {
  const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  game.update(dt);
  game.render();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
