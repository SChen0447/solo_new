import { CharacterState, SkillEffect, Particle } from './character';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CHAR_WIDTH = 80;
const CHAR_HEIGHT = 120;

export function renderScene(
  ctx: CanvasRenderingContext2D,
  state: CharacterState
): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawBackground(ctx, state);
  drawSkillEffects(ctx, state.skillEffects);
  drawCharacter(ctx, state);
  drawSkillLabels(ctx, state.skillEffects);
}

function drawBackground(ctx: CanvasRenderingContext2D, state: CharacterState): void {
  ctx.fillStyle = state.weatherParams.bgColor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  switch (state.weatherType) {
    case 'rain':
      drawRainEffect(ctx);
      break;
    case 'snow':
      drawSnowEffect(ctx);
      break;
    case 'sandstorm':
      drawSandstormEffect(ctx);
      break;
    case 'thunder':
      drawThunderEffect(ctx);
      break;
    default:
      drawSunnyEffect(ctx);
  }
}

function drawSunnyEffect(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createRadialGradient(700, 80, 20, 700, 80, 200);
  gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawRainEffect(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = 'rgba(30, 144, 255, 0.3)';
  ctx.lineWidth = 1;
  const t = performance.now() * 0.01;
  for (let i = 0; i < 60; i++) {
    const x = ((i * 47 + t * 3) % CANVAS_WIDTH);
    const y = ((i * 31 + t * 8) % CANVAS_HEIGHT);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2, y + 15);
    ctx.stroke();
  }
}

function drawSnowEffect(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(224, 255, 255, 0.4)';
  const t = performance.now() * 0.001;
  for (let i = 0; i < 40; i++) {
    const x = ((i * 67 + Math.sin(t + i) * 30) % CANVAS_WIDTH);
    const y = ((i * 43 + t * 20) % CANVAS_HEIGHT);
    ctx.beginPath();
    ctx.arc(x, y, 2 + Math.sin(t + i * 0.5) * 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSandstormEffect(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(218, 165, 32, 0.15)';
  const t = performance.now() * 0.002;
  for (let i = 0; i < 50; i++) {
    const x = ((i * 83 + t * 40) % (CANVAS_WIDTH + 100)) - 50;
    const y = ((i * 29 + Math.sin(t + i) * 20) % CANVAS_HEIGHT);
    ctx.fillRect(x, y, 8 + Math.random() * 12, 2);
  }
}

function drawThunderEffect(ctx: CanvasRenderingContext2D): void {
  if (Math.random() > 0.97) {
    ctx.fillStyle = 'rgba(138, 43, 226, 0.15)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

function drawCharacter(ctx: CanvasRenderingContext2D, state: CharacterState): void {
  const idleBob = state.moving ? 0 : Math.sin(state.idleTime * 4.2) * 3;
  const cx = state.x;
  const cy = state.y + idleBob;
  const legSwing = state.moving ? Math.sin(state.legPhase) * 12 : 0;

  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = '#4a4a6a';
  ctx.fillRect(-15, -60, 30, 40);

  ctx.fillStyle = '#6a6a8a';
  ctx.fillRect(-18, -62, 36, 6);

  ctx.fillStyle = '#c0c0d0';
  ctx.fillRect(-12, -20, 10, 35 + legSwing);
  ctx.fillRect(2, -20, 10, 35 - legSwing);

  ctx.fillStyle = '#5a5a7a';
  ctx.fillRect(-14, -20, 28, 12);

  ctx.fillStyle = '#a0a0b0';
  ctx.fillRect(-8, -22, 4, 14);

  ctx.fillStyle = '#c0c0d0';
  ctx.beginPath();
  ctx.ellipse(0, -68, 12, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5a5a7a';
  ctx.fillRect(-14, -74, 28, 6);

  ctx.strokeStyle = '#d0d0e0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(20, -50);
  ctx.lineTo(20, -10);
  ctx.stroke();

  ctx.fillStyle = '#e0e0f0';
  ctx.beginPath();
  ctx.moveTo(20, -50);
  ctx.lineTo(18, -35);
  ctx.lineTo(34, -40);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawSkillEffects(ctx: CanvasRenderingContext2D, effects: SkillEffect[]): void {
  for (const effect of effects) {
    if (effect.elapsed < effect.duration) {
      const t = effect.elapsed / effect.duration;
      const alpha = 1 - t;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = alpha * 0.6;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.15;
      ctx.fillStyle = effect.color;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    drawParticles(ctx, effect.particles);
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    if (p.life <= 0) continue;
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSkillLabels(ctx: CanvasRenderingContext2D, effects: SkillEffect[]): void {
  for (const effect of effects) {
    if (effect.labelElapsed > 1.5) continue;
    const alpha = effect.labelElapsed < 1.2 ? 1 : 1 - (effect.labelElapsed - 1.2) / 0.3;
    const offsetY = effect.labelElapsed * 30;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '14px sans-serif';
    const text = effect.label;
    const metrics = ctx.measureText(text);
    const pw = metrics.width + 16;
    const ph = 24;
    const px = effect.x - pw / 2;
    const py = effect.y - 80 - offsetY;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    roundRect(ctx, px, py, pw, ph, 6);
    ctx.fill();

    ctx.fillStyle = effect.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, effect.x, py + ph / 2);
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export { CANVAS_WIDTH, CANVAS_HEIGHT };
