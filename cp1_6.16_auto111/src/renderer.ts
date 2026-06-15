export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface RenderData {
  player: {
    x: number;
    y: number;
    width: number;
    height: number;
    facingRight: boolean;
    onGround: boolean;
  };
  phantoms: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    opacity: number;
  }>;
  platforms: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  walls: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  pressurePlates: Array<{
    x: number;
    y: number;
    size: number;
    pressed: boolean;
    pressAnim: number;
  }>;
  lightningBridges: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    active: boolean;
  }>;
  electricParticles: Array<Particle>;
  timeCrystals: Array<{
    x: number;
    y: number;
    size: number;
    activated: boolean;
  }>;
  spikes: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    extended: boolean;
    extendAnim: number;
  }>;
  goal: {
    x: number;
    y: number;
    radius: number;
    rotation: number;
    scale: number;
  };
  trail: Array<{ x: number; y: number; life: number }>;
  rippleParticles: Array<Particle>;
  screenOpacity: number;
  flashOpacity: number;
  anchorBlink: boolean;
  anchorSet: boolean;
  time: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  private handleResize(): void {
    const margin = 50;
    const maxWidth = window.innerWidth - margin * 2;
    const maxHeight = window.innerHeight - margin * 2;
    const scaleX = maxWidth / CANVAS_WIDTH;
    const scaleY = maxHeight / CANVAS_HEIGHT;
    this.scale = Math.min(scaleX, scaleY, 1);
    this.offsetX = (window.innerWidth - CANVAS_WIDTH * this.scale) / 2;
    this.offsetY = (window.innerHeight - CANVAS_HEIGHT * this.scale) / 2;
    this.canvas.style.width = `${CANVAS_WIDTH * this.scale}px`;
    this.canvas.style.height = `${CANVAS_HEIGHT * this.scale}px`;
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = `${this.offsetX}px`;
    this.canvas.style.top = `${this.offsetY}px`;
  }

  render(data: RenderData): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.drawBackground();
    this.drawGrid();
    this.drawPlatforms(data.platforms);
    this.drawWalls(data.walls);
    this.drawLightningBridges(data.lightningBridges, data.electricParticles, data.time);
    this.drawPressurePlates(data.pressurePlates);
    this.drawTimeCrystals(data.timeCrystals, data.time);
    this.drawSpikes(data.spikes);
    this.drawGoal(data.goal, data.time);
    this.drawTrail(data.trail);
    this.drawPhantoms(data.phantoms);
    this.drawPlayer(data.player, data.time);
    this.drawParticles(data.rippleParticles);
    this.drawScreenOverlay(data.screenOpacity, data.flashOpacity);
    this.drawAnchorIndicator(data.anchorBlink, data.anchorSet, data.time);
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0B0C10');
    gradient.addColorStop(1, '#1F2833');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#202020';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  }

  private drawPlatforms(platforms: RenderData['platforms']): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#303030';
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 1;
    for (const p of platforms) {
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.strokeRect(p.x, p.y, p.width, p.height);
    }
  }

  private drawWalls(walls: RenderData['walls']): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#262626';
    for (const w of walls) {
      ctx.fillRect(w.x, w.y, w.width, w.height);
    }
  }

  private drawLightningBridges(bridges: RenderData['lightningBridges'], particles: Particle[], time: number): void {
    const ctx = this.ctx;
    for (const bridge of bridges) {
      if (bridge.active) {
        ctx.save();
        ctx.shadowColor = '#FFF700';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#FFF700';
        ctx.fillRect(bridge.x, bridge.y, bridge.width, bridge.height);
        ctx.restore();
        for (const p of particles) {
          if (p.x >= bridge.x && p.x <= bridge.x + bridge.width &&
              p.y >= bridge.y && p.y <= bridge.y + bridge.height) {
            ctx.save();
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      } else {
        ctx.fillStyle = '#444444';
        ctx.fillRect(bridge.x, bridge.y + bridge.height / 2 - 1, bridge.width, 2);
      }
    }
  }

  private drawPressurePlates(plates: RenderData['pressurePlates']): void {
    const ctx = this.ctx;
    for (const plate of plates) {
      const yOffset = plate.pressed ? plate.pressAnim * 4 : 0;
      ctx.fillStyle = plate.pressed ? '#00BFFF' : '#888888';
      ctx.fillRect(plate.x, plate.y + yOffset, plate.size, plate.size - yOffset);
      ctx.strokeStyle = plate.pressed ? '#00FFFF' : '#666666';
      ctx.lineWidth = 2;
      ctx.strokeRect(plate.x, plate.y + yOffset, plate.size, plate.size - yOffset);
    }
  }

  private drawTimeCrystals(crystals: RenderData['timeCrystals'], time: number): void {
    const ctx = this.ctx;
    for (const crystal of crystals) {
      const pulse = Math.sin(time * 3) * 0.1 + 0.9;
      ctx.save();
      ctx.globalAlpha = 0.7 * pulse;
      ctx.fillStyle = '#87CEEB';
      ctx.shadowColor = '#87CEEB';
      ctx.shadowBlur = crystal.activated ? 15 : 5;
      ctx.fillRect(crystal.x, crystal.y, crystal.size, crystal.size);
      ctx.strokeStyle = '#ADD8E6';
      ctx.lineWidth = 2;
      ctx.strokeRect(crystal.x, crystal.y, crystal.size, crystal.size);
      ctx.restore();
    }
  }

  private drawSpikes(spikes: RenderData['spikes']): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#8B0000';
    for (const spike of spikes) {
      const height = spike.height * spike.extendAnim;
      const triangleCount = Math.floor(spike.width / 16);
      const triWidth = spike.width / triangleCount;
      for (let i = 0; i < triangleCount; i++) {
        ctx.beginPath();
        ctx.moveTo(spike.x + i * triWidth, spike.y + spike.height);
        ctx.lineTo(spike.x + i * triWidth + triWidth / 2, spike.y + spike.height - height);
        ctx.lineTo(spike.x + (i + 1) * triWidth, spike.y + spike.height);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  private drawGoal(goal: RenderData['goal'], time: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(goal.x, goal.y);
    ctx.rotate(goal.rotation);
    ctx.scale(goal.scale, goal.scale);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, goal.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, goal.radius - 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawPlayer(player: RenderData['player'], time: number): void {
    const ctx = this.ctx;
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    const rotation = Math.sin(time * 2) * 0.1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.fillStyle = '#00FF00';
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = Math.cos(angle) * 10;
      const y = Math.sin(angle) * 10;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawPhantoms(phantoms: RenderData['phantoms']): void {
    const ctx = this.ctx;
    for (const phantom of phantoms) {
      const cx = phantom.x + phantom.width / 2;
      const cy = phantom.y + phantom.height / 2;
      ctx.save();
      ctx.globalAlpha = phantom.opacity * 0.5;
      ctx.fillStyle = '#00FFFF';
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = Math.cos(angle) * 10;
        const y = Math.sin(angle) * 10;
        if (i === 0) ctx.moveTo(cx + x, cy + y);
        else ctx.lineTo(cx + x, cy + y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private drawTrail(trail: RenderData['trail']): void {
    const ctx = this.ctx;
    for (const t of trail) {
      ctx.save();
      ctx.globalAlpha = t.life * 0.2;
      ctx.fillStyle = '#00FF00';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = Math.cos(angle) * 10;
        const y = Math.sin(angle) * 10;
        if (i === 0) ctx.moveTo(t.x + x, t.y + y);
        else ctx.lineTo(t.x + x, t.y + y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawScreenOverlay(screenOpacity: number, flashOpacity: number): void {
    const ctx = this.ctx;
    if (screenOpacity > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - screenOpacity})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    if (flashOpacity > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  private drawAnchorIndicator(blink: boolean, anchorSet: boolean, time: number): void {
    if (!anchorSet) return;
    const ctx = this.ctx;
    const alpha = blink ? (Math.sin(time * Math.PI * 2 * 2) * 0.3 + 0.7) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#87CEEB';
    ctx.shadowColor = '#87CEEB';
    ctx.shadowBlur = 10;
    ctx.fillRect(10, 10, 24, 24);
    ctx.strokeStyle = '#ADD8E6';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 24, 24);
    ctx.restore();
  }
}
