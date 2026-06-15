import { eventBus } from './eventBus';
import type { Ship, Debris, EnergyCore, TractorBeam, Vec2 } from './types';

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function angleBetween(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function isAngleInCone(beamAngle: number, coneHalf: number, targetAngle: number): boolean {
  let diff = targetAngle - beamAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= coneHalf;
}

export class Interaction {
  private beam: TractorBeam = {
    active: false,
    angle: 0,
    length: 120,
    coneAngle: (15 / 180) * Math.PI,
  };
  private pullSpeedMin = 40;
  private pullSpeedMax = 60;
  private captureThreshold = 1.0;
  private captureRate = 0.4;

  getBeam(): TractorBeam {
    return this.beam;
  }

  update(dt: number, ship: Ship, mouseDown: boolean, mousePos: Vec2, debrisList: Debris[], coreList: EnergyCore[]): void {
    this.beam.active = mouseDown;
    if (mouseDown) {
      this.beam.angle = angleBetween(ship.pos, mousePos);
    }

    if (!mouseDown) {
      for (const d of debrisList) {
        if (!d.captured) {
          d.captureProgress = Math.max(0, d.captureProgress - dt * 2);
        }
      }
      for (const c of coreList) {
        if (!c.captured) {
          c.captureProgress = Math.max(0, c.captureProgress - dt * 2);
        }
      }
      return;
    }

    const beamTip: Vec2 = {
      x: ship.pos.x + Math.cos(this.beam.angle) * this.beam.length,
      y: ship.pos.y + Math.sin(this.beam.angle) * this.beam.length,
    };

    for (const d of debrisList) {
      if (d.captured) continue;
      const dDist = dist(ship.pos, d.pos);
      const dAngle = angleBetween(ship.pos, d.pos);
      const inCone = isAngleInCone(this.beam.angle, this.beam.coneAngle, dAngle);
      const inRange = dDist <= this.beam.length + 20;

      if (inCone && inRange) {
        d.captureProgress += this.captureRate * dt;
        if (d.captureProgress >= this.captureThreshold) {
          d.captured = true;
          eventBus.emit('debris:captured', d.id);
        } else {
          const pullSpeed = this.pullSpeedMin + Math.random() * (this.pullSpeedMax - this.pullSpeedMin);
          const angleToShip = angleBetween(d.pos, ship.pos);
          d.vel.x += Math.cos(angleToShip) * pullSpeed * dt;
          d.vel.y += Math.sin(angleToShip) * pullSpeed * dt;
          d.vel.x *= 0.98;
          d.vel.y *= 0.98;
        }
      } else {
        d.captureProgress = Math.max(0, d.captureProgress - dt * 2);
      }
    }

    for (const c of coreList) {
      if (c.captured) continue;
      const cDist = dist(ship.pos, c.pos);
      const cAngle = angleBetween(ship.pos, c.pos);
      const inCone = isAngleInCone(this.beam.angle, this.beam.coneAngle, cAngle);
      const inRange = cDist <= this.beam.length + 20;

      if (inCone && inRange) {
        c.captureProgress += this.captureRate * dt;
        if (c.captureProgress >= this.captureThreshold) {
          c.captured = true;
          eventBus.emit('core:captured', c.id);
        } else {
          const pullSpeed = this.pullSpeedMin + Math.random() * (this.pullSpeedMax - this.pullSpeedMin);
          const angleToShip = angleBetween(c.pos, ship.pos);
          c.vel.x += Math.cos(angleToShip) * pullSpeed * dt;
          c.vel.y += Math.sin(angleToShip) * pullSpeed * dt;
          c.vel.x *= 0.98;
          c.vel.y *= 0.98;
        }
      } else {
        c.captureProgress = Math.max(0, c.captureProgress - dt * 2);
      }
    }
  }

  drawBeam(ctx: CanvasRenderingContext2D, ship: Ship): void {
    if (!this.beam.active) return;
    const angle = this.beam.angle;
    const length = this.beam.length;
    const halfCone = this.beam.coneAngle;
    const tipX = ship.pos.x + Math.cos(angle) * length;
    const tipY = ship.pos.y + Math.sin(angle) * length;
    const leftX = ship.pos.x + Math.cos(angle - halfCone) * length;
    const leftY = ship.pos.y + Math.sin(angle - halfCone) * length;
    const rightX = ship.pos.x + Math.cos(angle + halfCone) * length;
    const rightY = ship.pos.y + Math.sin(angle + halfCone) * length;

    ctx.save();
    const gradient = ctx.createRadialGradient(
      ship.pos.x, ship.pos.y, 0,
      ship.pos.x, ship.pos.y, length
    );
    gradient.addColorStop(0, 'rgba(241,196,15,0.6)');
    gradient.addColorStop(0.5, 'rgba(241,196,15,0.25)');
    gradient.addColorStop(1, 'rgba(241,196,15,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(ship.pos.x, ship.pos.y);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
