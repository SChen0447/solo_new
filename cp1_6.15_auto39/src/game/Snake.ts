import { v4 as uuidv4 } from 'uuid';

export type SnakeState = 'patrol' | 'chase' | 'attack' | 'eat';

export interface Segment {
  x: number;
  y: number;
  angle: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: 'rock' | 'tree' | 'bush';
}

export interface PerceptionResult {
  obstacles: Obstacle[];
  preys: { id: string; x: number; y: number; distance: number }[];
  nearestPreyDistance: number;
  nearestPreyId: string | null;
  boundaryWarnings: { top: boolean; bottom: boolean; left: boolean; right: boolean };
}

export class Snake {
  id: string;
  segments: Segment[];
  headRadius: number = 14;
  bodyRadius: number = 10;
  segmentCount: number = 25;
  segmentSpacing: number = 10;
  angle: number = 0;
  speed: number = 2;
  baseSpeed: number = 2;
  chaseSpeed: number = 3.5;
  attackSpeed: number = 6;
  maxSpeed: number = 6;
  turnRate: number = 0.06;
  state: SnakeState = 'patrol';
  stateTimer: number = 0;
  attackCooldown: number = 0;
  eatDuration: number = 120;
  manualControl: boolean = false;
  manualDirection: { up: boolean; down: boolean; left: boolean; right: boolean } = {
    up: false,
    down: false,
    left: false,
    right: false
  };
  perceptionRadius: number = 150;
  perceptionAngle: number = Math.PI / 2;
  history: Segment[][] = [];
  historyLength: number = 6;
  mouthOpen: number = 0;
  waveOffset: number = 0;
  huntCount: number = 0;
  totalDistance: number = 0;
  startTime: number;

  constructor(x: number, y: number) {
    this.id = uuidv4();
    this.startTime = Date.now();
    this.segments = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this.segments.push({
        x: x - i * this.segmentSpacing,
        y: y,
        angle: 0
      });
    }
  }

  get head(): Segment {
    return this.segments[0];
  }

  setState(newState: SnakeState) {
    if (this.state !== newState) {
      this.state = newState;
      this.stateTimer = 0;
      if (newState === 'eat') {
        this.stateTimer = this.eatDuration;
      }
      if (newState === 'attack') {
        this.attackCooldown = 30;
      }
    }
  }

  perceive(obstacles: Obstacle[], preys: { id: string; x: number; y: number }[], worldWidth: number, worldHeight: number): PerceptionResult {
    const head = this.head;
    const result: PerceptionResult = {
      obstacles: [],
      preys: [],
      nearestPreyDistance: Infinity,
      nearestPreyId: null,
      boundaryWarnings: {
        top: head.y - this.perceptionRadius < 0,
        bottom: head.y + this.perceptionRadius > worldHeight,
        left: head.x - this.perceptionRadius < 0,
        right: head.x + this.perceptionRadius > worldWidth
      }
    };

    for (const obs of obstacles) {
      const dx = obs.x - head.x;
      const dy = obs.y - head.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= this.perceptionRadius + obs.radius) {
        const angleTo = Math.atan2(dy, dx);
        let angleDiff = angleTo - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (Math.abs(angleDiff) <= this.perceptionAngle / 2) {
          result.obstacles.push(obs);
        }
      }
    }

    for (const prey of preys) {
      const dx = prey.x - head.x;
      const dy = prey.y - head.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= this.perceptionRadius) {
        const angleTo = Math.atan2(dy, dx);
        let angleDiff = angleTo - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (Math.abs(angleDiff) <= this.perceptionAngle / 2) {
          result.preys.push({ id: prey.id, x: prey.x, y: prey.y, distance: dist });
          if (dist < result.nearestPreyDistance) {
            result.nearestPreyDistance = dist;
            result.nearestPreyId = prey.id;
          }
        }
      }
    }

    return result;
  }

  avoidObstacles(perception: PerceptionResult): number {
    let turnAdjustment = 0;
    const head = this.head;

    for (const obs of perception.obstacles) {
      const dx = obs.x - head.x;
      const dy = obs.y - head.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angleTo = Math.atan2(dy, dx);
      let angleDiff = angleTo - this.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const dangerZone = obs.radius + this.headRadius + 30;
      if (dist < dangerZone) {
        const urgency = 1 - (dist - obs.radius - this.headRadius) / 30;
        if (angleDiff > 0) {
          turnAdjustment -= urgency * this.turnRate * 2;
        } else {
          turnAdjustment += urgency * this.turnRate * 2;
        }
      }
    }

    const margin = 80;
    if (head.x < margin) turnAdjustment += this.turnRate;
    if (head.x > (perception.boundaryWarnings.right ? 9999 : 0) && head.x > (typeof perception !== 'undefined' ? 0 : 0)) {
    }

    return turnAdjustment;
  }

  update(
    perception: PerceptionResult,
    preys: Map<string, { x: number; y: number; alive: boolean }>,
    obstacles: Obstacle[],
    worldWidth: number,
    worldHeight: number,
    deltaTime: number = 1
  ): { caughtPreyId: string | null } {
    let caughtPreyId: string | null = null;
    this.waveOffset += this.speed * 0.05;

    if (this.state === 'eat') {
      this.stateTimer--;
      this.mouthOpen = Math.max(0, this.mouthOpen - 0.02);
      if (this.stateTimer <= 0) {
        this.setState('patrol');
      }
      this.updateBody();
      return { caughtPreyId };
    }

    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.state !== 'attack') {
      this.mouthOpen = Math.max(0, this.mouthOpen - 0.05);
    }

    let targetAngle = this.angle;
    let desiredSpeed = this.baseSpeed;

    if (this.manualControl) {
      let dx = 0, dy = 0;
      if (this.manualDirection.up) dy -= 1;
      if (this.manualDirection.down) dy += 1;
      if (this.manualDirection.left) dx -= 1;
      if (this.manualDirection.right) dx += 1;
      if (dx !== 0 || dy !== 0) {
        targetAngle = Math.atan2(dy, dx);
        desiredSpeed = this.chaseSpeed;
      }
    } else {
      const nearestPrey = perception.nearestPreyId
        ? preys.get(perception.nearestPreyId)
        : null;

      if (perception.nearestPreyDistance < 120 && nearestPrey?.alive) {
        if (perception.nearestPreyDistance < 30) {
          this.setState('attack');
        } else {
          this.setState('chase');
        }

        if (nearestPrey) {
          const dx = nearestPrey.x - this.head.x;
          const dy = nearestPrey.y - this.head.y;
          targetAngle = Math.atan2(dy, dx);

          if (this.state === 'chase') {
            desiredSpeed = this.chaseSpeed;
          } else if (this.state === 'attack') {
            desiredSpeed = this.attackSpeed;
            this.mouthOpen = Math.min(1, this.mouthOpen + 0.15);
            if (perception.nearestPreyDistance < this.headRadius + 15 && this.attackCooldown <= 0) {
              caughtPreyId = perception.nearestPreyId;
              this.huntCount++;
              this.setState('eat');
            }
          }
        }
      } else {
        this.setState('patrol');
        desiredSpeed = this.baseSpeed;

        if (Math.random() < 0.01) {
          targetAngle = this.angle + (Math.random() - 0.5) * Math.PI;
        }
      }
    }

    const obstacleAdjust = this.avoidObstacles(perception);
    targetAngle += obstacleAdjust;

    const head = this.head;
    if (head.x < 50) targetAngle = 0;
    if (head.x > worldWidth - 50) targetAngle = Math.PI;
    if (head.y < 50) targetAngle = Math.PI / 2;
    if (head.y > worldHeight - 50) targetAngle = -Math.PI / 2;

    let angleDiff = targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turnRate);

    this.speed = desiredSpeed;
    const moveX = Math.cos(this.angle) * this.speed;
    const moveY = Math.sin(this.angle) * this.speed;

    const newHeadX = Math.max(this.headRadius, Math.min(worldWidth - this.headRadius, this.head.x + moveX));
    const newHeadY = Math.max(this.headRadius, Math.min(worldHeight - this.headRadius, this.head.y + moveY));

    for (const obs of obstacles) {
      const dx = newHeadX - obs.x;
      const dy = newHeadY - obs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = this.headRadius + obs.radius;
      if (dist < minDist) {
        const pushX = (dx / dist) * (minDist - dist);
        const pushY = (dy / dist) * (minDist - dist);
        this.segments[0].x = newHeadX + pushX;
        this.segments[0].y = newHeadY + pushY;
        this.totalDistance += this.speed;
        this.updateBody();
        return { caughtPreyId };
      }
    }

    this.totalDistance += Math.sqrt(moveX * moveX + moveY * moveY);
    this.segments[0].x = newHeadX;
    this.segments[0].y = newHeadY;
    this.segments[0].angle = this.angle;

    this.updateBody();
    return { caughtPreyId };
  }

  updateBody() {
    this.history.unshift(this.segments.map(s => ({ ...s })));
    if (this.history.length > this.historyLength) {
      this.history.pop();
    }

    for (let i = 1; i < this.segments.length; i++) {
      const historyIndex = Math.min(i, this.history.length - 1);
      const hist = this.history[historyIndex];
      if (hist && hist[i - 1]) {
        const target = hist[i - 1];
        const prev = this.segments[i - 1];

        const dx = prev.x - this.segments[i].x;
        const dy = prev.y - this.segments[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.segmentSpacing) {
          const ratio = this.segmentSpacing / dist;
          this.segments[i].x = prev.x - dx * ratio;
          this.segments[i].y = prev.y - dy * ratio;
          this.segments[i].angle = Math.atan2(dy, dx);
        }
      }
    }
  }

  getSurvivalTime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  reset(x: number, y: number) {
    this.segments = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this.segments.push({
        x: x - i * this.segmentSpacing,
        y: y,
        angle: 0
      });
    }
    this.angle = 0;
    this.state = 'patrol';
    this.stateTimer = 0;
    this.speed = this.baseSpeed;
    this.history = [];
    this.huntCount = 0;
    this.totalDistance = 0;
    this.startTime = Date.now();
    this.mouthOpen = 0;
    this.manualControl = false;
    this.manualDirection = { up: false, down: false, left: false, right: false };
  }
}
