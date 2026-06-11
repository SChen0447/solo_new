import {
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  FRAGMENTS_PER_LEVEL,
  TileType,
  Level,
  Fragment,
  Particle,
  Footprint,
  FogCell
} from './level';
import { Player } from './player';

export const GAME_WIDTH = MAP_WIDTH * TILE_SIZE;
export const GAME_HEIGHT = MAP_HEIGHT * TILE_SIZE;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
  }

  public render(level: Level, player: Player, gameState: 'playing' | 'levelComplete' | 'gameOver' | 'victory'): void {
    this.drawBackground();
    this.drawMap(level);
    this.drawFootprints(level);
    this.drawFragments(level);
    this.drawExit(level, player);
    this.drawPlayer(player);
    this.drawParticles(level);
    this.drawFog(level, player);
    this.drawUI(level);
    if (gameState !== 'playing') {
      this.drawOverlay(gameState, level);
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#2a2a35');
    gradient.addColorStop(1, '#1a1a2e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  private drawMap(level: Level): void {
    const tiles = level.getTiles();
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile === TileType.FLOOR || tile === TileType.EXIT) {
          this.drawFloor(px, py);
        } else if (tile === TileType.WALL) {
          this.drawWall(px, py);
        }
      }
    }
  }

  private drawFloor(px: number, py: number): void {
    this.ctx.fillStyle = '#3a3a45';
    this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

    this.ctx.strokeStyle = '#2e2e38';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

    this.ctx.fillStyle = '#454555';
    this.ctx.fillRect(px + 2, py + 2, 2, 2);
    this.ctx.fillRect(px + TILE_SIZE - 4, py + TILE_SIZE - 4, 2, 2);
  }

  private drawWall(px: number, py: number): void {
    this.ctx.fillStyle = '#4a3728';
    this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

    this.ctx.fillStyle = '#5a4738';
    this.ctx.fillRect(px, py, TILE_SIZE, 2);
    this.ctx.fillRect(px, py + TILE_SIZE / 2, TILE_SIZE, 2);

    this.ctx.fillStyle = '#3a2718';
    this.ctx.fillRect(px, py + 2, TILE_SIZE, TILE_SIZE / 2 - 2);
    this.ctx.fillRect(px, py + TILE_SIZE / 2 + 2, TILE_SIZE, TILE_SIZE / 2 - 2);

    this.ctx.strokeStyle = '#2a1a08';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(px + TILE_SIZE / 2, py);
    this.ctx.lineTo(px + TILE_SIZE / 2, py + TILE_SIZE / 2);
    this.ctx.moveTo(px, py + TILE_SIZE / 2);
    this.ctx.lineTo(px, py + TILE_SIZE);
    this.ctx.moveTo(px + TILE_SIZE / 4, py + TILE_SIZE / 2);
    this.ctx.lineTo(px + TILE_SIZE / 4, py + TILE_SIZE);
    this.ctx.moveTo(px + TILE_SIZE * 3 / 4, py + TILE_SIZE / 2);
    this.ctx.lineTo(px + TILE_SIZE * 3 / 4, py + TILE_SIZE);
    this.ctx.stroke();
  }

  private drawFootprints(level: Level): void {
    const footprints = level.getFootprints();
    for (const fp of footprints) {
      const alpha = 1 - fp.age / fp.maxAge;
      this.ctx.fillStyle = `rgba(100, 180, 255, ${alpha * 0.4})`;
      const size = 4;
      this.ctx.fillRect(fp.x - size / 2, fp.y - size / 2, size, size);
    }
  }

  private drawFragments(level: Level): void {
    const fragments = level.getFragments();
    for (const frag of fragments) {
      if (!frag.collected) {
        this.drawFragment(frag);
      }
    }
  }

  private drawFragment(frag: Fragment): void {
    const cx = frag.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = frag.y * TILE_SIZE + TILE_SIZE / 2;
    const size = 8;
    const glow = 0.5 + 0.5 * Math.sin(frag.glowPhase);

    this.ctx.save();
    this.ctx.globalAlpha = 0.3 + glow * 0.4;
    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 2.5);
    gradient.addColorStop(0, 'rgba(255, 220, 100, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 200, 50, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 180, 0, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(cx - size * 2.5, cy - size * 2.5, size * 5, size * 5);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(frag.rotation);

    this.ctx.beginPath();
    this.ctx.moveTo(0, -size);
    this.ctx.lineTo(size * 0.7, 0);
    this.ctx.lineTo(0, size);
    this.ctx.lineTo(-size * 0.7, 0);
    this.ctx.closePath();

    const bodyGradient = this.ctx.createLinearGradient(-size, -size, size, size);
    bodyGradient.addColorStop(0, '#ffec80');
    bodyGradient.addColorStop(0.5, '#ffd700');
    bodyGradient.addColorStop(1, '#ff9900');
    this.ctx.fillStyle = bodyGradient;
    this.ctx.fill();

    this.ctx.strokeStyle = '#cc8800';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(0, -size * 0.6);
    this.ctx.lineTo(size * 0.3, 0);
    this.ctx.lineTo(0, size * 0.2);
    this.ctx.lineTo(-size * 0.1, -size * 0.1);
    this.ctx.closePath();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawExit(level: Level, player: Player): void {
    const exitPos = level.getExitPosition();
    const px = exitPos.x * TILE_SIZE;
    const py = exitPos.y * TILE_SIZE;
    const pulsePhase = level.getExitPulsePhase();
    const isNear = level.isNearExit(player.getX(), player.getY());
    const canExit = level.canExit();

    this.ctx.save();

    if (canExit && isNear) {
      const pulse = 0.6 + 0.4 * Math.sin(pulsePhase * 2.5);
      
      const outerGlow = this.ctx.createRadialGradient(
        px + TILE_SIZE / 2, py + TILE_SIZE / 2, 0,
        px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE * 2.5
      );
      outerGlow.addColorStop(0, `rgba(120, 220, 255, ${0.7 * pulse})`);
      outerGlow.addColorStop(0.4, `rgba(80, 180, 255, ${0.4 * pulse})`);
      outerGlow.addColorStop(1, 'rgba(60, 140, 255, 0)');
      this.ctx.fillStyle = outerGlow;
      this.ctx.fillRect(px - TILE_SIZE * 2, py - TILE_SIZE * 2, TILE_SIZE * 5, TILE_SIZE * 5);

      const innerGlow = this.ctx.createRadialGradient(
        px + TILE_SIZE / 2, py + TILE_SIZE / 2, 0,
        px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE * 1.2
      );
      innerGlow.addColorStop(0, `rgba(200, 240, 255, ${0.9 * pulse})`);
      innerGlow.addColorStop(0.7, `rgba(100, 200, 255, ${0.6 * pulse})`);
      innerGlow.addColorStop(1, 'rgba(80, 180, 255, 0)');
      this.ctx.fillStyle = innerGlow;
      this.ctx.fillRect(px - TILE_SIZE, py - TILE_SIZE, TILE_SIZE * 3, TILE_SIZE * 3);

      const solidAlpha = 0.85 + 0.15 * pulse;
      const solidGradient = this.ctx.createLinearGradient(px, py, px + TILE_SIZE, py + TILE_SIZE);
      solidGradient.addColorStop(0, `rgba(120, 220, 255, ${solidAlpha})`);
      solidGradient.addColorStop(0.5, `rgba(80, 180, 255, ${solidAlpha})`);
      solidGradient.addColorStop(1, `rgba(100, 200, 255, ${solidAlpha})`);
      this.ctx.fillStyle = solidGradient;
    } else {
      const alpha = 0.3 + 0.15 * Math.sin(pulsePhase);
      this.ctx.fillStyle = `rgba(80, 160, 255, ${canExit ? alpha : alpha * 0.4})`;
    }

    this.ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);

    if (canExit && isNear) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + 0.3 * Math.sin(pulsePhase * 3)})`;
      this.ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    }

    this.ctx.strokeStyle = canExit ? (isNear ? '#a0e0ff' : '#4080c0') : '#304060';
    this.ctx.lineWidth = canExit && isNear ? 3 : 2;
    this.ctx.strokeRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);

    if (canExit && isNear) {
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + 0.4 * Math.sin(pulsePhase * 2)})`;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(px + 5, py + 5, TILE_SIZE - 10, TILE_SIZE - 10);
    }

    this.ctx.strokeStyle = canExit ? (isNear ? 'rgba(220, 240, 255, 0.9)' : 'rgba(150, 200, 255, 0.5)') : 'rgba(100, 120, 150, 0.3)';
    this.ctx.lineWidth = 1;
    const lineSpeed = canExit && isNear ? 12 : 8;
    const lineOffset = (pulsePhase * lineSpeed) % 8;
    for (let i = -TILE_SIZE; i < TILE_SIZE * 2; i += 8) {
      this.ctx.beginPath();
      this.ctx.moveTo(px + i + lineOffset, py);
      this.ctx.lineTo(px + i + lineOffset + TILE_SIZE, py + TILE_SIZE);
      this.ctx.stroke();
    }

    if (canExit && isNear) {
      for (let i = -TILE_SIZE; i < TILE_SIZE * 2; i += 8) {
        this.ctx.beginPath();
        this.ctx.moveTo(px + TILE_SIZE - (i + lineOffset), py);
        this.ctx.lineTo(px + TILE_SIZE - (i + lineOffset + TILE_SIZE), py + TILE_SIZE);
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  private drawPlayer(player: Player): void {
    const x = player.getX();
    const y = player.getY();
    const frame = player.getAnimFrame();
    const facing = player.getFacing();
    const isMoving = player.getIsMoving();

    this.ctx.save();

    let flipX = false;
    if (facing === 'left') flipX = true;

    if (flipX) {
      this.ctx.translate(x + 16, y);
      this.ctx.scale(-1, 1);
    } else {
      this.ctx.translate(x, y);
    }

    this.drawPixelPlayer(frame, facing, isMoving);

    this.ctx.restore();
  }

  private drawPixelPlayer(frame: number, facing: string, isMoving: boolean): void {
    const bobY = isMoving ? (frame % 2 === 0 ? 0 : -1) : 0;

    this.ctx.fillStyle = '#ffcc00';
    this.ctx.fillRect(3, 0 + bobY, 10, 3);
    this.ctx.fillRect(2, 2 + bobY, 12, 2);
    this.ctx.fillStyle = '#ff9900';
    this.ctx.fillRect(4, 4 + bobY, 8, 1);
    this.ctx.fillStyle = '#ffee88';
    this.ctx.fillRect(5, 1 + bobY, 6, 1);

    this.ctx.fillStyle = '#f4c2a0';
    this.ctx.fillRect(4, 5 + bobY, 8, 4);
    this.ctx.fillStyle = '#000';
    if (facing === 'right') {
      this.ctx.fillRect(9, 6 + bobY, 2, 2);
    } else if (facing === 'left') {
      this.ctx.fillRect(5, 6 + bobY, 2, 2);
    } else if (facing === 'up') {
      this.ctx.fillStyle = '#e0b090';
      this.ctx.fillRect(4, 5 + bobY, 8, 4);
    } else {
      this.ctx.fillRect(6, 6 + bobY, 1, 2);
      this.ctx.fillRect(9, 6 + bobY, 1, 2);
    }

    this.ctx.fillStyle = '#4466aa';
    this.ctx.fillRect(3, 9 + bobY, 10, 4);
    this.ctx.fillStyle = '#335599';
    this.ctx.fillRect(3, 9 + bobY, 10, 1);

    this.ctx.fillStyle = '#884422';
    const legOffset = isMoving ? (frame < 2 ? 0 : 1) : 0;
    this.ctx.fillRect(4, 13 + bobY, 3, 3 - legOffset);
    this.ctx.fillRect(9, 13 + bobY, 3, 3 - (1 - legOffset));

    this.ctx.fillStyle = '#553311';
    this.ctx.fillRect(4, 15 + bobY - legOffset, 3, 1);
    this.ctx.fillRect(9, 15 + bobY - (1 - legOffset), 3, 1);
  }

  private drawParticles(level: Level): void {
    const particles = level.getParticles();
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    this.ctx.globalAlpha = 1;
  }

  private drawFog(level: Level, player: Player): void {
    const fog = level.getFog();
    const px = player.getX() / TILE_SIZE + 0.5;
    const py = player.getY() / TILE_SIZE + 0.5;

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const cell = fog[y][x];
        const dx = x + 0.5 - px;
        const dy = y + 0.5 - py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const noiseVal = Math.sin(cell.noisePhase) * 0.3 + Math.sin(cell.noisePhase * 1.7 + 1.3) * 0.2 + Math.sin(cell.noisePhase * 2.3 + 2.7) * 0.15;
        const flicker = 0.75 + 0.25 * Math.sin(cell.flickerPhase) + noiseVal * 0.2;

        const warpX = Math.sin(cell.warpOffsetX) * 0.15;
        const warpY = Math.cos(cell.warpOffsetY) * 0.15;

        let alpha = cell.alpha * flicker;

        if (dist > 3 && dist < 7) {
          const edgeFactor = (dist - 3) / 4;
          const edgeNoise = Math.sin(cell.noisePhase * 3 + x * 0.5 + y * 0.3) * 0.3;
          alpha = cell.alpha * (0.65 + 0.35 * Math.sin(cell.flickerPhase * 2 + edgeNoise)) * edgeFactor;
        }

        if (alpha > 0.05) {
          const centerX = x * TILE_SIZE + TILE_SIZE / 2 + warpX * TILE_SIZE * 0.3;
          const centerY = y * TILE_SIZE + TILE_SIZE / 2 + warpY * TILE_SIZE * 0.3;

          const gradient = this.ctx.createRadialGradient(
            centerX,
            centerY,
            0,
            centerX,
            centerY,
            TILE_SIZE * 0.9
          );

          const noiseAlpha = alpha * (0.85 + noiseVal * 0.3);
          gradient.addColorStop(0, `rgba(0, 0, 0, ${noiseAlpha * 0.25})`);
          gradient.addColorStop(0.5, `rgba(0, 0, 0, ${noiseAlpha * 0.75})`);
          gradient.addColorStop(1, `rgba(0, 0, 0, ${noiseAlpha})`);

          this.ctx.fillStyle = gradient;
          this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

          if (dist > 4 && dist < 6 && alpha > 0.3) {
            const crackAlpha = Math.max(0, Math.sin(cell.noisePhase * 5 + x + y) - 0.7) * alpha * 0.4;
            if (crackAlpha > 0) {
              this.ctx.fillStyle = `rgba(40, 20, 60, ${crackAlpha})`;
              this.ctx.fillRect(x * TILE_SIZE + TILE_SIZE * 0.3, y * TILE_SIZE + TILE_SIZE * 0.3, TILE_SIZE * 0.4, TILE_SIZE * 0.4);
            }
          }
        }
      }
    }
  }

  private drawUI(level: Level): void {
    const time = Math.ceil(level.getTimeRemaining());
    const collected = level.getCollectedFragments();
    const levelNum = level.getLevelIndex() + 1;

    this.ctx.save();

    this.ctx.fillStyle = time <= 5 ? '#ff3333' : '#ff4444';
    this.ctx.font = 'bold 24px "Courier New", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    const timeStr = time.toString().padStart(2, '0');
    this.ctx.fillText(`TIME ${timeStr}`, 8, 8);
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeText(`TIME ${timeStr}`, 8, 8);
    this.ctx.fillStyle = time <= 5 ? '#ff3333' : '#ff4444';
    this.ctx.fillText(`TIME ${timeStr}`, 8, 8);

    this.drawFragmentIcon(GAME_WIDTH - 100, 12);
    this.ctx.fillStyle = '#ffcc00';
    this.ctx.font = 'bold 22px "Courier New", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    const fragStr = `${collected}/${FRAGMENTS_PER_LEVEL}`;
    this.ctx.strokeText(fragStr, GAME_WIDTH - 75, 8);
    this.ctx.fillStyle = '#ffcc00';
    this.ctx.fillText(fragStr, GAME_WIDTH - 75, 8);

    this.ctx.fillStyle = '#aabbff';
    this.ctx.font = 'bold 16px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    const lvlStr = `LV ${levelNum}`;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeText(lvlStr, GAME_WIDTH / 2, 10);
    this.ctx.fillStyle = '#aabbff';
    this.ctx.fillText(lvlStr, GAME_WIDTH / 2, 10);

    this.ctx.restore();
  }

  private drawFragmentIcon(x: number, y: number): void {
    const size = 10;
    this.ctx.save();
    this.ctx.translate(x + size / 2, y + size / 2);
    this.ctx.rotate(Math.PI / 4);

    this.ctx.beginPath();
    this.ctx.moveTo(0, -size / 2);
    this.ctx.lineTo(size / 2, 0);
    this.ctx.lineTo(0, size / 2);
    this.ctx.lineTo(-size / 2, 0);
    this.ctx.closePath();

    const gradient = this.ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
    gradient.addColorStop(0, '#ffec80');
    gradient.addColorStop(1, '#ff9900');
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    this.ctx.strokeStyle = '#885500';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawOverlay(state: 'playing' | 'levelComplete' | 'gameOver' | 'victory', level: Level): void {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    let title = '';
    let subtitle = '';
    let titleColor = '';

    if (state === 'levelComplete') {
      title = 'LEVEL COMPLETE';
      titleColor = '#66ff66';
      subtitle = 'Press SPACE to continue';
    } else if (state === 'gameOver') {
      title = 'TIME\'S UP';
      titleColor = '#ff4444';
      subtitle = 'Press SPACE to retry';
    } else if (state === 'victory') {
      title = 'YOU ESCAPED!';
      titleColor = '#66ffff';
      subtitle = 'Press SPACE to play again';
    }

    this.ctx.font = 'bold 40px "Courier New", monospace';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(title, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);
    this.ctx.fillStyle = titleColor;
    this.ctx.fillText(title, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);

    this.ctx.font = '18px "Courier New", monospace';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeText(subtitle, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
    this.ctx.fillStyle = '#cccccc';
    this.ctx.fillText(subtitle, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);

    this.ctx.restore();
  }
}
