import EventBus from './EventBus';

export interface GrowthParams {
  lightIntensity: number;
  nutrientConcentration: number;
  spaceLimit: number;
}

export interface BranchData {
  id: string;
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  thickness: number;
  color: string;
  level: number;
  hasLeaves: boolean;
}

export interface CycleData {
  cycle: number;
  branchCount: number;
  averageHeight: number;
  totalLeafSurface: number;
  nutrientConsumption: number;
}

type Vector3 = { x: number; y: number; z: number };

interface BranchNode {
  id: string;
  start: Vector3;
  direction: Vector3;
  length: number;
  thickness: number;
  level: number;
  children: BranchNode[];
  hasLeaves: boolean;
  growthProgress: number;
  color: string;
}

class PlantEngine {
  private params: GrowthParams;
  private branches: BranchNode[] = [];
  private currentCycle: number = 0;
  private maxCycles: number = 12;
  private isGrowing: boolean = false;
  private isPaused: boolean = false;
  private growthTimer: number | null = null;
  private cycleDuration: number = 500;
  private transitionDuration: number = 300;
  private cycleDataList: CycleData[] = [];
  private totalNutrientUsed: number = 0;
  private branchIdCounter: number = 0;

  private readonly initialTrunkLength: number = 2;
  private readonly branchLengthRatio: number = 0.7;
  private readonly branchThicknessRatio: number = 0.7;
  private readonly leafSurfacePerBranch: number = 5;

  constructor() {
    this.params = {
      lightIntensity: 70,
      nutrientConcentration: 60,
      spaceLimit: 80,
    };
  }

  public setParams(params: Partial<GrowthParams>): void {
    const oldParams = { ...this.params };
    this.params = { ...this.params, ...params };

    if (this.currentCycle > 0) {
      this.adjustGrowthDirection();
      EventBus.getInstance().emit('params:updated', this.params);
      EventBus.getInstance().emit('plant:updated', this.getBranchData());
    } else {
      EventBus.getInstance().emit('params:updated', this.params);
    }
  }

  public getParams(): GrowthParams {
    return { ...this.params };
  }

  public startGrowth(): void {
    if (this.isGrowing && !this.isPaused) return;

    if (this.currentCycle === 0) {
      this.reset();
      this.createSeed();
      this.recordCycleData();
      EventBus.getInstance().emit('growth:started', this.getBranchData());
      EventBus.getInstance().emit('cycle:complete', this.cycleDataList[0]);
    }

    this.isGrowing = true;
    this.isPaused = false;
    this.scheduleNextCycle();
  }

  public pauseGrowth(): void {
    this.isPaused = true;
    if (this.growthTimer !== null) {
      clearTimeout(this.growthTimer);
      this.growthTimer = null;
    }
    EventBus.getInstance().emit('growth:paused');
  }

  public resumeGrowth(): void {
    if (!this.isGrowing || !this.isPaused) return;
    this.isPaused = false;
    this.scheduleNextCycle();
    EventBus.getInstance().emit('growth:resumed');
  }

  public reset(): void {
    this.stopGrowth();
    this.branches = [];
    this.currentCycle = 0;
    this.cycleDataList = [];
    this.totalNutrientUsed = 0;
    this.branchIdCounter = 0;
    EventBus.getInstance().emit('growth:reset');
  }

  private stopGrowth(): void {
    this.isGrowing = false;
    this.isPaused = false;
    if (this.growthTimer !== null) {
      clearTimeout(this.growthTimer);
      this.growthTimer = null;
    }
  }

  private scheduleNextCycle(): void {
    if (this.currentCycle >= this.maxCycles) {
      this.stopGrowth();
      EventBus.getInstance().emit('growth:complete', this.cycleDataList);
      return;
    }

    this.growthTimer = window.setTimeout(() => {
      this.growOneCycle();
    }, this.cycleDuration);
  }

  private createSeed(): void {
    const trunk: BranchNode = {
      id: this.generateId(),
      start: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 1, z: 0 },
      length: this.initialTrunkLength * 0.3,
      thickness: 0.3,
      level: 0,
      children: [],
      hasLeaves: false,
      growthProgress: 1,
      color: '#8BC34A',
    };
    this.branches.push(trunk);
  }

  private growOneCycle(): void {
    this.currentCycle++;

    const maxBranches = this.getMaxBranches();
    const lightFactor = this.params.lightIntensity / 100;
    const nutrientFactor = this.params.nutrientConcentration / 100;
    const spaceSize = this.getSpaceSize();

    this.growExistingBranches(lightFactor, nutrientFactor);
    this.generateNewBranches(maxBranches, lightFactor);
    this.applySpaceLimit(spaceSize);
    this.updateBranchColors();
    this.calculateNutrientConsumption();
    this.recordCycleData();

    EventBus.getInstance().emit('plant:updated', this.getBranchData());
    EventBus.getInstance().emit('cycle:complete', this.cycleDataList[this.currentCycle]);

    if (this.isGrowing && !this.isPaused) {
      this.scheduleNextCycle();
    }
  }

  private growExistingBranches(lightFactor: number, nutrientFactor: number): void {
    const growFactor = 0.5 + 0.5 * lightFactor * nutrientFactor;

    const growBranch = (branch: BranchNode) => {
      if (branch.growthProgress < 1) {
        branch.growthProgress = Math.min(1, branch.growthProgress + 0.3 * growFactor);
      }
      branch.children.forEach(growBranch);
    };

    this.branches.forEach(growBranch);
  }

  private generateNewBranches(maxBranches: number, lightFactor: number): void {
    const allBranches = this.getAllBranches();

    if (allBranches.length >= maxBranches) return;

    const newBranches: BranchNode[] = [];
    const tipBranches = allBranches.filter((b) => b.children.length === 0);

    const branchesToAdd = Math.min(
      Math.floor(tipBranches.length * (0.5 + 0.5 * lightFactor)),
      maxBranches - allBranches.length
    );

    const shuffled = [...tipBranches].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.max(1, branchesToAdd));

    selected.forEach((parent) => {
      const branchCount = parent.level === 0 ? 2 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2);

      for (let i = 0; i < branchCount; i++) {
        if (this.getAllBranches().length + newBranches.length >= maxBranches) break;

        const angle = this.calculateBranchAngle(parent, i, branchCount, lightFactor);
        const direction = this.calculateBranchDirection(parent, angle, i);

        const newBranch: BranchNode = {
          id: this.generateId(),
          start: this.getBranchEnd(parent),
          direction: this.normalize(direction),
          length: parent.length * this.branchLengthRatio * (0.8 + Math.random() * 0.4),
          thickness: parent.thickness * this.branchThicknessRatio,
          level: parent.level + 1,
          children: [],
          hasLeaves: parent.level >= 2,
          growthProgress: 0,
          color: '#8BC34A',
        };

        parent.children.push(newBranch);
        newBranches.push(newBranch);
      }
    });
  }

  private calculateBranchAngle(
    parent: BranchNode,
    index: number,
    total: number,
    lightFactor: number
  ): { horizontal: number; vertical: number } {
    const baseAngle = 45 + (1 - lightFactor) * 20;
    const spreadAngle = total > 1 ? (360 / total) * index : 0;

    const verticalAngle = baseAngle * (Math.PI / 180);
    const horizontalAngle = spreadAngle * (Math.PI / 180);

    return { horizontal: horizontalAngle, vertical: verticalAngle };
  }

  private calculateBranchDirection(
    parent: BranchNode,
    angle: { horizontal: number; vertical: number },
    index: number
  ): Vector3 {
    const lightDirection = { x: 0, y: 1, z: 0 };
    const lightBias = this.params.lightIntensity / 200;

    const perp = this.calculatePerpendicular(parent.direction);
    const cross = this.cross(parent.direction, perp);

    const rotAroundAxis = (v: Vector3, axis: Vector3, angle: number): Vector3 => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const dot = v.x * axis.x + v.y * axis.y + v.z * axis.z;

      return {
        x: v.x * cos + cross.x * sin + axis.x * dot * (1 - cos),
        y: v.y * cos + cross.y * sin + axis.y * dot * (1 - cos),
        z: v.z * cos + cross.z * sin + axis.z * dot * (1 - cos),
      };
    };

    let dir = rotAroundAxis(parent.direction, perp, angle.vertical);
    dir = rotAroundAxis(dir, parent.direction, angle.horizontal);

    dir.x += lightDirection.x * lightBias;
    dir.y += lightDirection.y * lightBias;
    dir.z += lightDirection.z * lightBias;

    return dir;
  }

  private calculatePerpendicular(v: Vector3): Vector3 {
    if (Math.abs(v.x) < Math.abs(v.y) && Math.abs(v.x) < Math.abs(v.z)) {
      return this.normalize({ x: 0, y: -v.z, z: v.y });
    } else if (Math.abs(v.y) < Math.abs(v.z)) {
      return this.normalize({ x: -v.z, y: 0, z: v.x });
    } else {
      return this.normalize({ x: -v.y, y: v.x, z: 0 });
    }
  }

  private cross(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  private normalize(v: Vector3): Vector3 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 1, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  private getBranchEnd(branch: BranchNode): Vector3 {
    return {
      x: branch.start.x + branch.direction.x * branch.length * branch.growthProgress,
      y: branch.start.y + branch.direction.y * branch.length * branch.growthProgress,
      z: branch.start.z + branch.direction.z * branch.length * branch.growthProgress,
    };
  }

  private getAllBranches(): BranchNode[] {
    const result: BranchNode[] = [];
    const collect = (branch: BranchNode) => {
      result.push(branch);
      branch.children.forEach(collect);
    };
    this.branches.forEach(collect);
    return result;
  }

  private getMaxBranches(): number {
    const baseMax = 200;
    const nutrientFactor = this.params.nutrientConcentration / 100;
    return Math.floor(baseMax * nutrientFactor);
  }

  private getSpaceSize(): number {
    const baseSize = 10;
    const spaceFactor = this.params.spaceLimit / 100;
    return baseSize * (0.3 + 0.7 * spaceFactor);
  }

  private applySpaceLimit(spaceSize: number): void {
    const halfSize = spaceSize / 2;
    const centerY = spaceSize / 2;

    const checkAndPrune = (branch: BranchNode, parent: BranchNode | null): boolean => {
      const end = this.getBranchEnd(branch);

      const outOfBounds =
        Math.abs(end.x) > halfSize ||
        end.y > centerY + halfSize ||
        end.y < 0 ||
        Math.abs(end.z) > halfSize;

      if (outOfBounds) {
        if (parent) {
          const idx = parent.children.indexOf(branch);
          if (idx > -1) {
            parent.children.splice(idx, 1);
          }
        } else {
          const idx = this.branches.indexOf(branch);
          if (idx > -1) {
            this.branches.splice(idx, 1);
          }
        }
        return true;
      }

      branch.children = branch.children.filter((child) => !checkAndPrune(child, branch));
      return false;
    };

    this.branches = this.branches.filter((b) => !checkAndPrune(b, null));
  }

  private updateBranchColors(): void {
    const updateColor = (branch: BranchNode) => {
      const progress = Math.min(1, this.currentCycle / this.maxCycles);
      const levelFactor = Math.min(1, branch.level / 4);
      const colorProgress = progress * (1 - levelFactor * 0.5) + levelFactor * 0.3;

      branch.color = this.interpolateColor('#8BC34A', '#795548', colorProgress);
      branch.children.forEach(updateColor);
    };

    this.branches.forEach(updateColor);
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  private calculateNutrientConsumption(): void {
    const allBranches = this.getAllBranches();
    const consumption = allBranches.length * 0.5;
    this.totalNutrientUsed = Math.min(this.params.nutrientConcentration, this.totalNutrientUsed + consumption);
  }

  private adjustGrowthDirection(): void {
    const lightFactor = this.params.lightIntensity / 100;
    const adjustBranch = (branch: BranchNode) => {
      if (branch.growthProgress < 1) {
        const lightDir = { x: 0, y: 1, z: 0 };
        const bias = lightFactor * 0.1;
        branch.direction.x += lightDir.x * bias;
        branch.direction.y += lightDir.y * bias;
        branch.direction.z += lightDir.z * bias;
        branch.direction = this.normalize(branch.direction);
      }
      branch.children.forEach(adjustBranch);
    };
    this.branches.forEach(adjustBranch);
  }

  private recordCycleData(): void {
    const allBranches = this.getAllBranches();
    const heights = allBranches.map((b) => this.getBranchEnd(b).y);
    const avgHeight = heights.length > 0 ? heights.reduce((a, b) => a + b, 0) / heights.length : 0;

    const leafBranches = allBranches.filter((b) => b.hasLeaves);
    const totalLeafSurface = leafBranches.length * this.leafSurfacePerBranch;

    const cycleData: CycleData = {
      cycle: this.currentCycle,
      branchCount: allBranches.length,
      averageHeight: Math.round(avgHeight * 100),
      totalLeafSurface: Math.round(totalLeafSurface * 10) / 10,
      nutrientConsumption: Math.round((this.totalNutrientUsed / this.params.nutrientConcentration) * 100),
    };

    this.cycleDataList.push(cycleData);
  }

  public getBranchData(): BranchData[] {
    const result: BranchData[] = [];

    const convert = (branch: BranchNode) => {
      const end = this.getBranchEnd(branch);
      result.push({
        id: branch.id,
        start: { ...branch.start },
        end: end,
        thickness: branch.thickness,
        color: branch.color,
        level: branch.level,
        hasLeaves: branch.hasLeaves,
      });
      branch.children.forEach(convert);
    };

    this.branches.forEach(convert);
    return result;
  }

  public getCycleData(): CycleData[] {
    return [...this.cycleDataList];
  }

  public getCurrentCycle(): number {
    return this.currentCycle;
  }

  public getIsGrowing(): boolean {
    return this.isGrowing;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getMaxCycles(): number {
    return this.maxCycles;
  }

  public getSpaceBoundary(): { min: Vector3; max: Vector3 } {
    const size = this.getSpaceSize();
    const half = size / 2;
    return {
      min: { x: -half, y: 0, z: -half },
      max: { x: half, y: size, z: half },
    };
  }

  private generateId(): string {
    this.branchIdCounter++;
    return `branch_${this.branchIdCounter}`;
  }

  public getPlantCenter(): Vector3 {
    const allBranches = this.getAllBranches();
    if (allBranches.length === 0) {
      return { x: 0, y: 1, z: 0 };
    }

    let sumX = 0,
      sumY = 0,
      sumZ = 0;
    let count = 0;

    const collectPoints = (branch: BranchNode) => {
      sumX += branch.start.x;
      sumY += branch.start.y;
      sumZ += branch.start.z;
      count++;

      const end = this.getBranchEnd(branch);
      sumX += end.x;
      sumY += end.y;
      sumZ += end.z;
      count++;

      branch.children.forEach(collectPoints);
    };

    this.branches.forEach(collectPoints);

    return {
      x: sumX / count,
      y: sumY / count,
      z: sumZ / count,
    };
  }
}

export default PlantEngine;
