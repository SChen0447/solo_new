import {
  TILE_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_SIZE,
  LIGHT_LENGTH,
  LIGHT_SOFT_EDGE,
  GameState,
  Monster,
  Tile,
  Item,
  Player,
  LightState,
  Exit,
  Position
} from './types';

type LightPolygonFn = (playerPos: Position) => Position[];
type LightIntensityFn = (px: number, py: number, playerPos: Position) => number;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private lightPolygonFn: LightPolygonFn | null;
  private lightIntensityFn: LightIntensityFn | null;
  private camera: Position;
  private canvasW: number;
  private canvasH: number;
  private mapPixelW: number;
  private mapPixelH: number;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.lightPolygonFn = null;
    this.lightIntensityFn = null;
    this.camera = { x: 0, y: 0 };
    this.canvasW = CANVAS_WIDTH;
    this.canvasH = CANVAS_HEIGHT;
    this.mapPixelW = 0;
    this.mapPixelH = 0;
  }

  setLightFunctions(polyFn: LightPolygonFn, intensityFn: LightIntensityFn): void {
    this.lightPolygonFn = polyFn;
    this.lightIntensityFn = intensityFn;
  }

  setMapSize(gridW: number, gridH: number): void {
    this.mapPixelW = gridW * TILE_SIZE;
    this.mapPixelH = gridH * TILE_SIZE;
  }

  render(state: GameState): void {
    this.updateCamera(state.player.position);
    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);

    this.drawMap(state.map);
    this.drawExit(state.exit, state.player.hasKey, state.time);
    this.drawItems(state.items, state.time);
    this.drawMonsters(state.monsters, state.light, state.player.position);
    this.drawPlayer(state.player, state.light.angle);

    this.ctx.restore();

    this.applyLighting(state.player.position, state.light);
    this.drawVignette();
    this.drawUI(state);

    if (state.status !== 'playing') {
      this.drawStatusScreen(state);
    }
  }

  private updateCamera(playerPos: Position): void {
    let targetX = playerPos.x - this.canvasW / 2;
    let targetY = playerPos.y - this.canvasH / 2;

    targetX = Math.max(0, Math.min(this.mapPixelW - this.canvasW, targetX));
    targetY = Math.max(0, Math.min(this.mapPixelH - this.canvasH, targetY));

    if (this.mapPixelW < this.canvasW) {
      targetX = (this.mapPixelW - this.canvasW) / 2;
    }
    if (this.mapPixelH < this.canvasH) {
      targetY = (this.mapPixelH - this.canvasH) / 2;
    }

    this.camera.x += (targetX - this.camera.x) * 0.15;
    this.camera.y += (targetY - this.camera.y) * 0.15;
  }

  private drawMap(map: Tile[][]): void {
    const startGX = Math.max(0, Math.floor(this.camera.x / TILE_SIZE));
    const startGY = Math.max(0, Math.floor(this.camera.y / TILE_SIZE));
    const endGX = Math.min(map[0].length, Math.ceil((this.camera.x + this.canvasW) / TILE_SIZE) + 1);
    const endGY = Math.min(map.length, Math.ceil((this.camera.y + this.canvasH) / TILE_SIZE) + 1);

    for (let gy = startGY; gy < endGY; gy++) {
      for (let gx = startGX; gx < endGX; gx++) {
        const tile = map[gy][gx];
        const x = gx * TILE_SIZE;
        const y = gy * TILE_SIZE;

        if (tile.type === 'wall') {
          this.ctx.fillStyle = '#2d2d2d';
          this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          this.drawWallTexture(x, y);
        } else {
          this.ctx.fillStyle = '#0d1b2a';
          this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          this.drawFloorTexture(x, y, gx, gy);
        }

        this.ctx.strokeStyle = '#3d3d3d';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      }
    }
  }

  private drawWallTexture(x: number, y: number): void {
    this.ctx.strokeStyle = '#3d3d3d';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo(x + 2, y + TILE_SIZE / 3);
    this.ctx.lineTo(x + TILE_SIZE - 2, y + TILE_SIZE / 3);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(x + 2, y + (TILE_SIZE * 2) / 3);
    this.ctx.lineTo(x + TILE_SIZE - 2, y + (TILE_SIZE * 2) / 3);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(x + TILE_SIZE / 2, y + 2);
    this.ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE / 3);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(x + TILE_SIZE / 4, y + TILE_SIZE / 3);
    this.ctx.lineTo(x + TILE_SIZE / 4, y + (TILE_SIZE * 2) / 3);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(x + (TILE_SIZE * 3) / 4, y + TILE_SIZE / 3);
    this.ctx.lineTo(x + (TILE_SIZE * 3) / 4, y + (TILE_SIZE * 2) / 3);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(x + TILE_SIZE / 2, y + (TILE_SIZE * 2) / 3);
    this.ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE - 2);
    this.ctx.stroke();
  }

  private drawFloorTexture(x: number, y: number, gx: number, gy: number): void {
    this.ctx.strokeStyle = 'rgba(13, 43, 69, 0.8)';
    this.ctx.lineWidth = 1;

    const seed = (gx * 31 + gy * 17) % 100;
    if (seed < 30) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + 4 + seed % 10, y + 8);
      this.ctx.lineTo(x + 12 + seed % 8, y + 20);
      this.ctx.stroke();
    }
  }

  private drawExit(exit: Exit, hasKey: boolean, time: number): void {
    const pulse = (Math.sin(time * 0.004) + 1) / 2;
    const x = exit.position.x;
    const y = exit.position.y;
    const size = TILE_SIZE * 0.7;

    if (hasKey) {
      const glowSize = size + 20 + pulse * 10;
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, glowSize);
      gradient.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
      gradient.addColorStop(0.5, 'rgba(0, 255, 136, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);

      const exitGlow = this.ctx.createRadialGradient(x, y, 0, x, y, 80);
      exitGlow.addColorStop(0, 'rgba(255, 255, 180, 0.15)');
      exitGlow.addColorStop(1, 'rgba(255, 255, 180, 0)');
      this.ctx.fillStyle = exitGlow;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 80, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.save();
    this.ctx.translate(x, y);

    const doorGradient = this.ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    if (hasKey) {
      const alpha = 0.7 + pulse * 0.3;
      doorGradient.addColorStop(0, `rgba(0, 255, 136, ${alpha})`);
      doorGradient.addColorStop(1, `rgba(0, 200, 100, ${alpha})`);
    } else {
      doorGradient.addColorStop(0, 'rgba(80, 80, 80, 0.9)');
      doorGradient.addColorStop(1, 'rgba(50, 50, 50, 0.9)');
    }

    this.ctx.fillStyle = doorGradient;
    this.roundRect(-size / 2, -size / 2, size, size, 4);
    this.ctx.fill();

    this.ctx.strokeStyle = hasKey ? 'rgba(150, 255, 200, 0.9)' : 'rgba(100, 100, 100, 0.9)';
    this.ctx.lineWidth = 2;
    this.roundRect(-size / 2, -size / 2, size, size, 4);
    this.ctx.stroke();

    if (hasKey) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      this.ctx.font = 'bold 14px Courier New';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('↑', 0, 0);
    } else {
      this.ctx.fillStyle = 'rgba(255, 200, 100, 0.9)';
      this.ctx.beginPath();
      this.ctx.arc(0, -2, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillRect(-3, 0, 6, 8);
      this.ctx.fillRect(-6, 4, 3, 2);
    }

    this.ctx.restore();
  }

  private drawItems(items: Item[], time: number): void {
    for (const item of items) {
      if (item.collected) continue;

      if (!this.isInView(item.position.x, item.position.y, 40)) continue;

      if (item.type === 'battery') {
        this.drawBattery(item.position, time);
      } else if (item.type === 'key') {
        this.drawKey(item.position, time);
      }
    }
  }

  private drawBattery(pos: Position, time: number): void {
    const pulse = (Math.sin(time * 0.006) + 1) / 2;
    const x = pos.x;
    const y = pos.y;

    const glowSize = 30 + pulse * 8;
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, glowSize);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
    gradient.addColorStop(0.6, 'rgba(255, 215, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, glowSize, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffd700';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#ffec8b';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(x - 2, y - 6, 4, 3);
  }

  private drawKey(pos: Position, time: number): void {
    const pulse = (Math.sin(time * 0.005) + 1) / 2;
    const x = pos.x;
    const y = pos.y;

    const glowSize = 28 + pulse * 6;
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, glowSize);
    gradient.addColorStop(0, 'rgba(192, 192, 192, 0.5)');
    gradient.addColorStop(0.6, 'rgba(192, 192, 192, 0.15)');
    gradient.addColorStop(1, 'rgba(192, 192, 192, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, glowSize, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(Math.sin(time * 0.002) * 0.2);

    this.ctx.fillStyle = '#c0c0c0';
    this.ctx.beginPath();
    this.ctx.arc(-3, 0, 5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#0d1b2a';
    this.ctx.beginPath();
    this.ctx.arc(-3, 0, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#c0c0c0';
    this.ctx.fillRect(2, -1.5, 8, 3);
    this.ctx.fillRect(7, 1.5, 2, 3);
    this.ctx.fillRect(5, 1.5, 2, 2);

    this.ctx.strokeStyle = '#e8e8e8';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(-3, 0, 5, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawMonsters(monsters: Monster[], lightState: LightState, playerPos: Position): void {
    for (const monster of monsters) {
      if (!this.isInView(monster.position.x, monster.position.y, 50)) continue;

      if (lightState.isOn && this.lightIntensityFn) {
        const intensity = this.lightIntensityFn(monster.position.x, monster.position.y, playerPos);
        if (intensity < 0.05 && monster.state !== 'chase') {
          continue;
        }
      }

      this.drawMonster(monster);
    }
  }

  private drawMonster(monster: Monster): void {
    const x = monster.position.x;
    const y = monster.position.y;
    let radius = 12;
    let color = '#ff3333';
    let glowColor = 'rgba(255, 51, 51, 0.4)';

    if (monster.state === 'chase') {
      color = '#ff6600';
      glowColor = 'rgba(255, 102, 0, 0.5)';
      const pulse = (Math.sin(monster.pulsePhase) + 1) / 2;
      radius = 12 * (1 + pulse * 0.2);
    } else if (monster.state === 'stunned' || monster.state === 'dazed') {
      color = '#666688';
      glowColor = 'rgba(102, 102, 136, 0.3)';
    }

    const glowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
    glowGradient.addColorStop(0, glowColor);
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    const eyeOffsetX = monster.direction.x * 3;
    const eyeOffsetY = monster.direction.y * 3;

    if (monster.state === 'dazed') {
      this.ctx.fillStyle = '#ffff00';
      this.ctx.font = '10px Courier New';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('?', x, y - radius - 5);
    } else if (monster.state === 'stunned') {
      this.ctx.fillStyle = '#88ccff';
      this.ctx.font = '10px Courier New';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('~', x, y - radius - 5);
    } else {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(x - 4 + eyeOffsetX, y - 2 + eyeOffsetY, 2.5, 0, Math.PI * 2);
      this.ctx.arc(x + 4 + eyeOffsetX, y - 2 + eyeOffsetY, 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#000000';
      this.ctx.beginPath();
      this.ctx.arc(x - 4 + eyeOffsetX * 1.3, y - 2 + eyeOffsetY * 1.3, 1.3, 0, Math.PI * 2);
      this.ctx.arc(x + 4 + eyeOffsetX * 1.3, y - 2 + eyeOffsetY * 1.3, 1.3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawPlayer(player: Player, angle: number): void {
    const x = player.position.x;
    const y = player.position.y;
    const size = PLAYER_SIZE;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);

    const bodyGradient = this.ctx.createLinearGradient(-size / 2, 0, size / 2, 0);
    bodyGradient.addColorStop(0, '#3388ff');
    bodyGradient.addColorStop(1, '#0055cc');
    this.ctx.fillStyle = bodyGradient;

    this.ctx.beginPath();
    this.ctx.moveTo(size / 2 + 2, 0);
    this.ctx.lineTo(-size / 2, -size / 2);
    this.ctx.lineTo(-size / 3, 0);
    this.ctx.lineTo(-size / 2, size / 2);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = '#88ccff';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffcc';
    this.ctx.beginPath();
    this.ctx.arc(size / 3, 0, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private applyLighting(playerPos: Position, lightState: LightState): void {
    const screenPlayerX = playerPos.x - this.camera.x;
    const screenPlayerY = playerPos.y - this.camera.y;
    const screenPlayer = { x: screenPlayerX, y: screenPlayerY };

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';

    if (lightState.isOn && this.lightPolygonFn) {
      const worldPoints = this.lightPolygonFn(playerPos);
      const screenPoints = worldPoints.map(p => ({
        x: p.x - this.camera.x,
        y: p.y - this.camera.y
      }));

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      for (let i = 1; i < screenPoints.length; i++) {
        this.ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
      }
      this.ctx.closePath();
      this.ctx.clip();

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      this.ctx.fillRect(0, 0, this.canvasW, this.canvasH);

      const lightGrad = this.ctx.createRadialGradient(
        screenPlayer.x, screenPlayer.y, 0,
        screenPlayer.x, screenPlayer.y, LIGHT_LENGTH + LIGHT_SOFT_EDGE
      );
      lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      lightGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.05)');
      lightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.ctx.fillStyle = lightGrad;
      this.ctx.fillRect(0, 0, this.canvasW, this.canvasH);

      this.ctx.restore();

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(0, 0, this.canvasW, this.canvasH);
      this.ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      for (let i = screenPoints.length - 1; i >= 0; i--) {
        this.ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
      }
      this.ctx.closePath();
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.97)';
      this.ctx.fill('evenodd');
      this.ctx.restore();
    } else {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.98)';
      this.ctx.fillRect(0, 0, this.canvasW, this.canvasH);

      if (this.lightIntensityFn) {
        const personalGrad = this.ctx.createRadialGradient(
          screenPlayer.x, screenPlayer.y, 0,
          screenPlayer.x, screenPlayer.y, 40
        );
        personalGrad.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
        personalGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        this.ctx.fillStyle = personalGrad;
        this.ctx.fillRect(0, 0, this.canvasW, this.canvasH);
      }
    }

    this.ctx.restore();
  }

  private drawVignette(): void {
    const gradient = this.ctx.createRadialGradient(
      this.canvasW / 2, this.canvasH / 2, Math.min(this.canvasW, this.canvasH) * 0.3,
      this.canvasW / 2, this.canvasH / 2, Math.max(this.canvasW, this.canvasH) * 0.8
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasW, this.canvasH);
  }

  private drawUI(state: GameState): void {
    this.drawBatteryBar(state.light.battery, state.time);
    this.drawInventory(state.player);
    this.drawHint(state);
  }

  private drawBatteryBar(battery: number, time: number): void {
    const barX = 16;
    const barY = 16;
    const barW = 150;
    const barH = 20;
    const radius = 4;

    this.ctx.save();

    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 4;
    this.ctx.fillStyle = '#1a1a2e';
    this.roundRect(barX, barY, barW, barH, radius);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.strokeStyle = '#4a4a6a';
    this.ctx.lineWidth = 1;
    this.roundRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1, radius);
    this.ctx.stroke();

    const lowBattery = battery < 20;
    let fillColorStart = '#00d4ff';
    let fillColorEnd = '#0088aa';

    if (lowBattery) {
      fillColorStart = '#ff4444';
      fillColorEnd = '#aa2222';
    } else if (battery < 50) {
      fillColorStart = '#ffaa00';
      fillColorEnd = '#cc6600';
    }

    let flashAlpha = 1;
    if (lowBattery) {
      flashAlpha = (Math.sin(time * 0.02) + 1) / 2 * 0.4 + 0.6;
    }

    const fillW = Math.max(0, (barW - 4) * (battery / 100));
    if (fillW > 0) {
      this.ctx.globalAlpha = flashAlpha;
      const batteryGrad = this.ctx.createLinearGradient(barX + 2, barY, barX + 2 + fillW, barY);
      batteryGrad.addColorStop(0, fillColorStart);
      batteryGrad.addColorStop(1, fillColorEnd);
      this.ctx.fillStyle = batteryGrad;
      this.roundRect(barX + 2, barY + 2, fillW, barH - 4, radius - 1);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '11px Courier New';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    const batteryText = `${Math.floor(battery)}%`;
    this.ctx.fillText(batteryText, barX + barW / 2, barY + barH / 2 + 1);

    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.font = '9px Courier New';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('电量', barX, barY + barH + 12);

    this.ctx.restore();
  }

  private drawInventory(player: Player): void {
    const invX = 16;
    const invY = this.canvasH - 40;

    this.ctx.save();

    if (player.hasKey) {
      this.ctx.save();
      this.ctx.translate(invX + 8, invY + 8);

      const keyGlow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
      keyGlow.addColorStop(0, 'rgba(192, 192, 192, 0.3)');
      keyGlow.addColorStop(1, 'rgba(192, 192, 192, 0)');
      this.ctx.fillStyle = keyGlow;
      this.ctx.fillRect(-20, -20, 40, 40);

      this.ctx.fillStyle = '#c0c0c0';
      this.ctx.beginPath();
      this.ctx.arc(-3, 0, 5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#1a1a2e';
      this.ctx.beginPath();
      this.ctx.arc(-3, 0, 2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#c0c0c0';
      this.ctx.fillRect(2, -1.5, 7, 3);
      this.ctx.fillRect(6, 1.5, 2, 2);

      this.ctx.restore();
    } else {
      this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
      this.ctx.setLineDash([2, 2]);
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(invX, invY, 16, 16);
      this.ctx.setLineDash([]);
    }

    const batteryStartX = invX + 28;
    for (let i = 0; i < player.batteryCount; i++) {
      const bx = batteryStartX + i * 18;
      const by = invY + 8;

      const batteryGlow = this.ctx.createRadialGradient(bx, by, 0, bx, by, 12);
      batteryGlow.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
      batteryGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
      this.ctx.fillStyle = batteryGlow;
      this.ctx.beginPath();
      this.ctx.arc(bx, by, 12, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ffd700';
      this.ctx.beginPath();
      this.ctx.arc(bx, by, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = '#666666';
    this.ctx.font = '9px Courier New';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('物品栏', invX, invY + 24);

    this.ctx.restore();
  }

  private drawHint(state: GameState): void {
    if (!state.player.hasKey && state.status === 'playing') {
      const hintY = this.canvasH - 12;
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(150, 150, 150, 0.6)';
      this.ctx.font = '10px Courier New';
      this.ctx.textAlign = 'right';
      this.ctx.fillText('提示：寻找钥匙开启出口', this.canvasW - 16, hintY);
      this.ctx.restore();
    } else if (state.player.hasKey && state.status === 'playing') {
      const hintY = this.canvasH - 12;
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(0, 255, 136, 0.7)';
      this.ctx.font = '10px Courier New';
      this.ctx.textAlign = 'right';
      this.ctx.fillText('★ 钥匙已获得！前往出口', this.canvasW - 16, hintY);
      this.ctx.restore();
    }
  }

  private drawStatusScreen(state: GameState): void {
    const progress = Math.min(1, state.statusTimer / 1000);
    const blurProgress = Math.min(1, state.statusTimer / 500);

    this.ctx.save();

    this.ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * progress})`;
    this.ctx.fillRect(0, 0, this.canvasW, this.canvasH);

    if (blurProgress > 0.3) {
      const ctx = this.ctx;
      ctx.filter = `blur(${Math.floor(blurProgress * 10)}px)`;
      ctx.filter = 'none';
    }

    this.ctx.globalAlpha = progress;

    const centerX = this.canvasW / 2;
    const centerY = this.canvasH / 2;

    const boxW = 360;
    const boxH = 180;
    const boxX = centerX - boxW / 2;
    const boxY = centerY - boxH / 2;

    const boxGrad = this.ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
    if (state.status === 'won') {
      boxGrad.addColorStop(0, 'rgba(0, 50, 30, 0.95)');
      boxGrad.addColorStop(1, 'rgba(0, 30, 20, 0.95)');
    } else {
      boxGrad.addColorStop(0, 'rgba(50, 10, 10, 0.95)');
      boxGrad.addColorStop(1, 'rgba(30, 5, 5, 0.95)');
    }

    this.ctx.fillStyle = boxGrad;
    this.roundRect(boxX, boxY, boxW, boxH, 8);
    this.ctx.fill();

    this.ctx.strokeStyle = state.status === 'won' ? 'rgba(0, 255, 136, 0.6)' : 'rgba(255, 68, 68, 0.6)';
    this.ctx.lineWidth = 2;
    this.roundRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1, 8);
    this.ctx.stroke();

    this.ctx.font = 'bold 36px Courier New';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = state.status === 'won' ? '#00ff88' : '#ff4444';

    if (state.status === 'won') {
      this.ctx.shadowColor = 'rgba(0, 255, 136, 0.8)';
      this.ctx.shadowBlur = 15;
      this.ctx.fillText('逃脱成功！', centerX, centerY - 20);
    } else {
      this.ctx.shadowColor = 'rgba(255, 68, 68, 0.8)';
      this.ctx.shadowBlur = 15;
      this.ctx.fillText('游戏结束', centerX, centerY - 20);
    }
    this.ctx.shadowBlur = 0;

    this.ctx.font = '14px Courier New';
    this.ctx.fillStyle = '#cccccc';
    let reasonText = '';
    if (state.status === 'lost') {
      if (state.light.battery <= 0) {
        reasonText = '电量耗尽，你永远迷失在了黑暗中...';
      } else {
        reasonText = '你被怪物抓住了！';
      }
    } else {
      reasonText = '你成功逃离了下水道！';
    }
    this.ctx.fillText(reasonText, centerX, centerY + 20);

    this.ctx.font = '12px Courier New';
    this.ctx.fillStyle = '#888888';
    const blinkAlpha = (Math.sin(state.time * 0.005) + 1) / 2 * 0.5 + 0.5;
    this.ctx.globalAlpha = progress * blinkAlpha;
    this.ctx.fillText('按 R 键重新开始', centerX, centerY + 60);

    this.ctx.restore();
  }

  private isInView(x: number, y: number, margin: number): boolean {
    return (
      x >= this.camera.x - margin &&
      x <= this.camera.x + this.canvasW + margin &&
      y >= this.camera.y - margin &&
      y <= this.camera.y + this.canvasH + margin
    );
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + w - radius, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    this.ctx.lineTo(x + w, y + h - radius);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    this.ctx.lineTo(x + radius, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  clear(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvasW, this.canvasH);
  }
}
