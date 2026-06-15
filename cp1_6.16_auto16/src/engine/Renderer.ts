import { GrowthInstruction, PlantState, Leaf, Flower, Fruit, SeedVariety } from '../types';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number;
  private lastInstruction: GrowthInstruction | null = null;
  private renderTime: number = 0;
  private gridSpacing: number = 40;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.scale(this.dpr, this.dpr);
  }

  getRenderTime(): number {
    return this.renderTime;
  }

  render(instruction: GrowthInstruction): void {
    const start = performance.now();
    this.lastInstruction = instruction;

    this.drawBackground();
    this.drawGrid();
    this.drawSoil();

    const originX = this.width / 2;
    const originY = this.height - 60;

    this.drawRoots(originX, originY, instruction);
    this.drawPlant(originX, originY, instruction);

    this.renderTime = performance.now() - start;
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a237e');
    gradient.addColorStop(1, '#0d3b2e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;

    for (let x = 0; x < this.width; x += this.gridSpacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.height; y += this.gridSpacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  private drawSoil(): void {
    const soilY = this.height - 50;
    const gradient = this.ctx.createLinearGradient(0, soilY, 0, this.height);
    gradient.addColorStop(0, '#3e2723');
    gradient.addColorStop(0.5, '#4e342e');
    gradient.addColorStop(1, '#2d1810');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.moveTo(0, soilY + 10);

    for (let x = 0; x <= this.width; x += 20) {
      const y = soilY + Math.sin(x * 0.05) * 6 + Math.sin(x * 0.12) * 3;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.width, this.height);
    this.ctx.lineTo(0, this.height);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let i = 0; i < 15; i++) {
      const px = (i * 73 + 20) % this.width;
      const py = soilY + 15 + (i * 37) % 25;
      const pr = 2 + (i % 3);
      this.ctx.beginPath();
      this.ctx.arc(px, py, pr, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawRoots(ox: number, oy: number, instruction: GrowthInstruction): void {
    const { height, variety } = instruction;
    const heightRatio = Math.min(height / variety.maxHeight, 1);
    const rootDepth = 30 + heightRatio * 40;
    const rootSpread = 20 + heightRatio * 30;

    this.ctx.strokeStyle = variety.id === 'cactus' ? '#6d4c41' : '#5d4037';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';

    this.drawRootBranch(ox, oy, 0, rootDepth * 0.7, 0.8, 3);
    this.drawRootBranch(ox - 8, oy, -0.4, rootDepth * 0.5, 0.6, 2);
    this.drawRootBranch(ox + 8, oy, 0.4, rootDepth * 0.5, 0.6, 2);
    this.drawRootBranch(ox - rootSpread * 0.3, oy, -0.8, rootDepth * 0.35, 0.5, 2);
    this.drawRootBranch(ox + rootSpread * 0.3, oy, 0.8, rootDepth * 0.35, 0.5, 2);
  }

  private drawRootBranch(
    x: number,
    y: number,
    angle: number,
    length: number,
    thickness: number,
    depth: number
  ): void {
    if (depth <= 0 || length < 5) return;

    const endX = x + Math.sin(angle) * length;
    const endY = y + Math.cos(angle) * length;

    this.ctx.lineWidth = thickness;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);

    const midX = (x + endX) / 2 + Math.sin(angle + 0.5) * length * 0.15;
    const midY = (y + endY) / 2;
    this.ctx.quadraticCurveTo(midX, midY, endX, endY);
    this.ctx.stroke();

    if (depth > 1) {
      this.drawRootBranch(endX, endY, angle - 0.4, length * 0.5, thickness * 0.6, depth - 1);
      this.drawRootBranch(endX, endY, angle + 0.4, length * 0.5, thickness * 0.6, depth - 1);
    }
  }

  private drawPlant(ox: number, oy: number, instruction: GrowthInstruction): void {
    const { state, height, sway, variety } = instruction;
    const heightRatio = Math.min(height / variety.maxHeight, 1);
    const stemTopX = ox + sway * height * 0.5;
    const stemTopY = oy - height;

    this.drawStem(ox, oy, stemTopX, stemTopY, instruction, heightRatio);
    this.drawLeaves(ox, oy, instruction, heightRatio);

    if (state === PlantState.SEED && height < 3) {
      this.drawSeed(ox, oy, variety);
    }

    if (state === PlantState.FLOWERING || (state === PlantState.FRUITING && instruction.flowers.length > 0)) {
      this.drawFlowers(stemTopX, stemTopY, instruction);
    }

    if (state === PlantState.FRUITING || (state === PlantState.WITHERED && instruction.fruits.length > 0)) {
      this.drawFruits(ox, oy, instruction);
    }
  }

  private drawStem(
    baseX: number,
    baseY: number,
    topX: number,
    topY: number,
    instruction: GrowthInstruction,
    heightRatio: number
  ): void {
    const { stemColor, variety, sway, height } = instruction;
    const isCactus = variety.id === 'cactus';

    if (isCactus) {
      this.drawCactusStem(baseX, baseY, topX, topY, stemColor, heightRatio);
      return;
    }

    const stemWidth = 4 + heightRatio * 8;

    this.ctx.strokeStyle = stemColor;
    this.ctx.lineWidth = stemWidth;
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(baseX, baseY);

    const segments = 8;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const progressY = t;
      const swayAmount = sway * height * 0.5 * (t * t);
      const nodeX = baseX + (topX - baseX) * t + swayAmount * 0.5;
      const nodeY = baseY + (topY - baseY) * progressY;

      if (i === 1) {
        this.ctx.lineTo(nodeX, nodeY);
      } else {
        this.ctx.lineTo(nodeX, nodeY);
      }
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = this.shadeColor(stemColor, -30);
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(baseX + stemWidth * 0.3, baseY);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const swayAmount = sway * height * 0.5 * (t * t);
      const nodeX = baseX + (topX - baseX) * t + swayAmount * 0.5 + stemWidth * 0.3 * (1 - t);
      const nodeY = baseY + (topY - baseY) * t;
      this.ctx.lineTo(nodeX, nodeY);
    }
    this.ctx.stroke();
  }

  private drawCactusStem(
    baseX: number,
    baseY: number,
    topX: number,
    topY: number,
    stemColor: string,
    heightRatio: number
  ): void {
    const stemWidth = 18 + heightRatio * 22;
    const startY = baseY;
    const endY = topY;

    this.ctx.fillStyle = stemColor;

    const leftX = topX - stemWidth / 2;
    const rightX = topX + stemWidth / 2;

    this.ctx.beginPath();
    this.ctx.moveTo(baseX - stemWidth * 0.6, startY);
    this.ctx.quadraticCurveTo(baseX - stemWidth * 0.7, startY - 20, leftX, endY + 15);
    this.ctx.quadraticCurveTo(leftX - 3, endY, topX, endY);
    this.ctx.quadraticCurveTo(rightX + 3, endY, rightX, endY + 15);
    this.ctx.quadraticCurveTo(baseX + stemWidth * 0.7, startY - 20, baseX + stemWidth * 0.6, startY);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = this.shadeColor(stemColor, -20);
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const t = (i + 1) / 7;
      const y = startY + (endY - startY) * t;
      const x = baseX + (topX - baseX) * t;
      const w = stemWidth * (0.55 - t * 0.15);
      this.ctx.beginPath();
      this.ctx.moveTo(x - w, y);
      this.ctx.quadraticCurveTo(x, y - 3, x + w, y);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1.5;
    const spineCount = 4 + Math.floor(heightRatio * 6);
    for (let i = 0; i < spineCount; i++) {
      const t = (i + 0.5) / spineCount;
      const y = startY + (endY - startY) * t;
      const x = baseX + (topX - baseX) * t;
      const w = stemWidth * (0.55 - t * 0.15);
      for (let s = -2; s <= 2; s++) {
        const sx = x + s * 6;
        const sy = y;
        this.ctx.beginPath();
        this.ctx.moveTo(sx, sy);
        this.ctx.lineTo(sx + (s > 0 ? 4 : -4), sy - 6);
        this.ctx.stroke();
      }
    }

    if (heightRatio > 0.5) {
      const armY = endY + (baseY - endY) * 0.4;
      const armHeight = (baseY - endY) * 0.3;
      this.drawCactusArm(topX - stemWidth * 0.5, armY, -1, armHeight, stemColor, heightRatio);
    }
    if (heightRatio > 0.7) {
      const armY = endY + (baseY - endY) * 0.55;
      const armHeight = (baseY - endY) * 0.25;
      this.drawCactusArm(topX + stemWidth * 0.5, armY, 1, armHeight, stemColor, heightRatio);
    }
  }

  private drawCactusArm(
    x: number,
    y: number,
    dir: number,
    length: number,
    color: string,
    hr: number
  ): void {
    const aw = 12 + hr * 10;
    this.ctx.fillStyle = color;

    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.quadraticCurveTo(x + dir * aw * 0.8, y + 5, x + dir * aw * 1.2, y - length * 0.3);
    this.ctx.quadraticCurveTo(x + dir * aw * 1.6, y - length * 0.8, x + dir * aw * 1.1, y - length);
    this.ctx.quadraticCurveTo(x + dir * aw * 0.7, y - length * 0.95, x + dir * aw * 0.5, y - length * 0.7);
    this.ctx.quadraticCurveTo(x + dir * aw * 0.2, y - length * 0.3, x, y - 5);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawSeed(ox: number, oy: number, variety: SeedVariety): void {
    const seedColor = variety.id === 'sunflower' ? '#4e342e' : variety.id === 'rose' ? '#5d4037' : '#6d4c41';
    this.ctx.fillStyle = seedColor;
    this.ctx.beginPath();
    this.ctx.ellipse(ox, oy - 5, 10, 7, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = this.shadeColor(seedColor, 30);
    this.ctx.beginPath();
    this.ctx.ellipse(ox - 3, oy - 7, 3, 2, -0.3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawLeaves(
    ox: number,
    oy: number,
    instruction: GrowthInstruction,
    heightRatio: number
  ): void {
    const { leaves, leafColor, sway, height, variety } = instruction;

    for (const leaf of leaves) {
      const t = leaf.positionY / Math.max(height, 1);
      const swayOffset = sway * height * 0.5 * (t * t);
      const leafX = ox + swayOffset;
      const leafY = oy - leaf.positionY;

      this.drawLeaf(leafX, leafY, leaf, leafColor, variety);
    }
  }

  private drawLeaf(
    x: number,
    y: number,
    leaf: Leaf,
    color: string,
    variety: SeedVariety
  ): void {
    if (variety.id === 'cactus') return;

    const progress = leaf.growthProgress;
    const size = leaf.size * progress;
    const baseAngle = leaf.angle;
    const side = leaf.side === 'left' ? -1 : 1;
    const angle = baseAngle + (1 - progress) * side * 0.3;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);

    const tipX = size * 1.6;
    const tipY = 0;
    const ctrl1X = size * 0.6;
    const ctrl1Y = -size * 0.9;
    const ctrl2X = size * 0.9;
    const ctrl2Y = size * 0.9;

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.bezierCurveTo(ctrl1X, ctrl1Y * 0.7, tipX * 0.8, ctrl1Y * 0.9, tipX, tipY);
    this.ctx.bezierCurveTo(tipX * 0.8, ctrl2Y * 0.9, ctrl2X, ctrl2Y * 0.7, 0, 0);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = this.shadeColor(color, -25);
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.quadraticCurveTo(size * 0.8, -size * 0.1, tipX * 0.9, tipY);
    this.ctx.stroke();

    const veinCount = 3;
    for (let i = 1; i <= veinCount; i++) {
      const vt = i / (veinCount + 1);
      const vx = tipX * vt;
      const vTopY = -size * 0.4 * vt;
      const vBotY = size * 0.4 * vt;
      this.ctx.strokeStyle = this.shadeColor(color, -20);
      this.ctx.lineWidth = 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(vx * 0.7, 0);
      this.ctx.quadraticCurveTo(vx, vTopY * 0.5, vx, vTopY);
      this.ctx.moveTo(vx * 0.7, 0);
      this.ctx.quadraticCurveTo(vx, vBotY * 0.5, vx, vBotY);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawFlowers(tipX: number, tipY: number, instruction: GrowthInstruction): void {
    const { flowers, variety } = instruction;
    const isCactus = variety.id === 'cactus';

    for (let i = 0; i < flowers.length; i++) {
      const flower = flowers[i];
      const offsetY = isCactus ? 0 : i * 25;
      const offsetX = isCactus ? 0 : (i === 1 ? 30 : (i === 2 ? -30 : 0));
      this.drawFlower(tipX + offsetX, tipY - offsetY, flower, variety);
    }
  }

  private drawFlower(
    x: number,
    y: number,
    flower: Flower,
    variety: SeedVariety
  ): void {
    const progress = flower.growthProgress;
    const size = flower.size * progress;
    const petalCount = flower.petalCount;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(flower.angle * progress);

    const scale = 0.8 + 0.2 * progress;
    this.ctx.scale(scale, scale);

    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      this.ctx.save();
      this.ctx.rotate(angle);

      const petalGradient = this.ctx.createLinearGradient(0, 0, size * 0.9, 0);
      petalGradient.addColorStop(0, flower.secondaryColor);
      petalGradient.addColorStop(1, flower.color);
      this.ctx.fillStyle = petalGradient;

      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.quadraticCurveTo(size * 0.5, -size * 0.25, size * 0.9, 0);
      this.ctx.quadraticCurveTo(size * 0.5, size * 0.25, 0, 0);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();
    }

    const centerSize = size * 0.35;
    const centerColor = variety.id === 'sunflower' ? '#5d4037' : '#ffeb3b';
    this.ctx.fillStyle = centerColor;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, centerSize, 0, Math.PI * 2);
    this.ctx.fill();

    if (variety.id === 'sunflower') {
      this.ctx.fillStyle = '#3e2723';
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const r = centerSize * 0.6;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    } else if (variety.id === 'rose') {
      for (let layer = 0; layer < 3; layer++) {
        const layerSize = centerSize * (0.3 + layer * 0.3);
        this.ctx.fillStyle = this.shadeColor(flower.color, layer * 15);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, layerSize, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.restore();
  }

  private drawFruits(ox: number, oy: number, instruction: GrowthInstruction): void {
    const { fruits, sway, height, variety } = instruction;

    for (let i = 0; i < fruits.length; i++) {
      const fruit = fruits[i];
      const t = fruit.positionY / Math.max(height, 1);
      const swayOffset = sway * height * 0.5 * (t * t);
      const fruitX = ox + swayOffset + (i === 1 ? 15 : (i === 2 ? -15 : 0));
      const fruitY = oy - fruit.positionY;

      this.drawFruit(fruitX, fruitY, fruit, variety);
    }
  }

  private drawFruit(
    x: number,
    y: number,
    fruit: Fruit,
    variety: SeedVariety
  ): void {
    const progress = fruit.growthProgress;
    const size = fruit.size * progress;

    this.ctx.save();
    this.ctx.translate(x, y);

    if (variety.id === 'sunflower') {
      this.ctx.fillStyle = fruit.color;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, size, size * 0.7, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = this.shadeColor(fruit.color, 20);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const sx = Math.cos(a) * size * 0.5;
        const sy = Math.sin(a) * size * 0.4;
        this.ctx.beginPath();
        this.ctx.ellipse(sx, sy, 2, 3, a, 0, Math.PI * 2);
        this.ctx.fill();
      }
    } else if (variety.id === 'rose') {
      this.ctx.fillStyle = fruit.color;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = this.shadeColor(fruit.color, 30);
      this.ctx.beginPath();
      this.ctx.arc(-size * 0.3, -size * 0.3, size * 0.3, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.fillStyle = fruit.color;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, size * 0.8, size, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private shadeColor(color: string, percent: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const adjust = (c: number): number => {
      const adjusted = c + (percent / 100) * 255;
      return Math.max(0, Math.min(255, Math.round(adjusted)));
    };

    const nr = adjust(r);
    const ng = adjust(g);
    const nb = adjust(b);

    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
  }
}
