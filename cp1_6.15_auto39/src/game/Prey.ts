import { v4 as uuidv4 } from 'uuid';
import type { Obstacle } from './Snake';

export class Prey {
  id: string;
  x: number;
  y: number;
  radius: number = 12;
  angle: number = 0;
  speed: number = 1.5;
  baseSpeed: number = 1.5;
  fleeSpeed: number = 3;
  turnRate: number = 0.08;
  changeDirectionTimer: number = 0;
  alive: boolean = true;
  earSize: number = 5;

  constructor(x: number, y: number) {
    this.id = uuidv4();
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
  }

  update(
    snakeHead: { x: number; y: number },
    obstacles: Obstacle[],
    worldWidth: number,
    worldHeight: number
  ) {
    if (!this.alive) return;

    this.changeDirectionTimer--;

    const dxToSnake = this.x - snakeHead.x;
    const dyToSnake = this.y - snakeHead.y;
    const distToSnake = Math.sqrt(dxToSnake * dxToSnake + dyToSnake * dyToSnake);

    let targetAngle = this.angle;
    let desiredSpeed = this.baseSpeed;

    if (distToSnake < 200) {
      targetAngle = Math.atan2(dyToSnake, dxToSnake);
      desiredSpeed = this.fleeSpeed;
    } else if (this.changeDirectionTimer <= 0) {
      targetAngle = this.angle + (Math.random() - 0.5) * Math.PI * 1.2;
      this.changeDirectionTimer = 60 + Math.floor(Math.random() * 120);
    }

    for (const obs of obstacles) {
      const dx = this.x - obs.x;
      const dy = this.y - obs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dangerZone = obs.radius + this.radius + 40;
      if (dist < dangerZone) {
        const urgency = 1 - (dist - obs.radius - this.radius) / 40;
        const avoidAngle = Math.atan2(dy, dx);
        const weight = urgency * 0.8;
        targetAngle = targetAngle * (1 - weight) + avoidAngle * weight;
      }
    }

    const margin = 60;
    if (this.x < margin) targetAngle = 0;
    if (this.x > worldWidth - margin) targetAngle = Math.PI;
    if (this.y < margin) targetAngle = Math.PI / 2;
    if (this.y > worldHeight - margin) targetAngle = -Math.PI / 2;

    let angleDiff = targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turnRate);

    this.speed = desiredSpeed;
    let newX = this.x + Math.cos(this.angle) * this.speed;
    let newY = this.y + Math.sin(this.angle) * this.speed;

    newX = Math.max(this.radius, Math.min(worldWidth - this.radius, newX));
    newY = Math.max(this.radius, Math.min(worldHeight - this.radius, newY));

    for (const obs of obstacles) {
      const dx = newX - obs.x;
      const dy = newY - obs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = this.radius + obs.radius;
      if (dist < minDist) {
        const pushX = (dx / dist) * (minDist - dist);
        const pushY = (dy / dist) * (minDist - dist);
        newX += pushX;
        newY += pushY;
      }
    }

    this.x = newX;
    this.y = newY;
  }

  reset(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.alive = true;
    this.angle = Math.random() * Math.PI * 2;
    this.changeDirectionTimer = 0;
    this.speed = this.baseSpeed;
  }
}
