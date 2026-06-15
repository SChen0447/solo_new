import {
  LIGHT_ANGLE,
  LIGHT_LENGTH,
  LIGHT_SOFT_EDGE,
  BATTERY_DRAIN_RATE,
  BATTERY_CHARGE_AMOUNT,
  LightState,
  Position,
  Item
} from './types';

export class LightSystem {
  private state: LightState;
  private mouseWorld: Position;
  private playerPosRef: Position;

  constructor(playerPos: Position) {
    this.playerPosRef = playerPos;
    this.mouseWorld = { x: 0, y: 0 };
    this.state = {
      battery: 100,
      angle: 0,
      isOn: true
    };
  }

  update(deltaTime: number, mouseX: number, mouseY: number): void {
    this.mouseWorld = { x: mouseX, y: mouseY };
    this.updateAngle();

    if (this.state.isOn) {
      const drain = (BATTERY_DRAIN_RATE * deltaTime) / 1000;
      this.state.battery = Math.max(0, this.state.battery - drain);

      if (this.state.battery <= 0) {
        this.state.isOn = false;
      }
    }
  }

  private updateAngle(): void {
    const dx = this.mouseWorld.x - this.playerPosRef.x;
    const dy = this.mouseWorld.y - this.playerPosRef.y;
    this.state.angle = Math.atan2(dy, dx);
  }

  pickUpBattery(item: Item): boolean {
    if (item.type === 'battery' && !item.collected) {
      this.state.battery = Math.min(100, this.state.battery + BATTERY_CHARGE_AMOUNT);
      if (this.state.battery > 0) {
        this.state.isOn = true;
      }
      return true;
    }
    return false;
  }

  turnOn(): void {
    if (this.state.battery > 0) {
      this.state.isOn = true;
    }
  }

  turnOff(): void {
    this.state.isOn = false;
  }

  getState(): LightState {
    return { ...this.state };
  }

  getBattery(): number {
    return this.state.battery;
  }

  getAngle(): number {
    return this.state.angle;
  }

  isLightOn(): boolean {
    return this.state.isOn;
  }

  reset(): void {
    this.state.battery = 100;
    this.state.isOn = true;
    this.state.angle = 0;
  }

  isPointInLight(px: number, py: number, playerPos: Position): boolean {
    if (!this.state.isOn) return false;

    const dx = px - playerPos.x;
    const dy = py - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > LIGHT_LENGTH + LIGHT_SOFT_EDGE) return false;

    const targetAngle = Math.atan2(dy, dx);
    let angleDiff = targetAngle - this.state.angle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    const halfAngle = LIGHT_ANGLE / 2;
    return Math.abs(angleDiff) <= halfAngle;
  }

  getLightPolygonPoints(playerPos: Position): Position[] {
    const points: Position[] = [];
    const halfAngle = LIGHT_ANGLE / 2;
    const segments = 24;

    points.push({ x: playerPos.x, y: playerPos.y });

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = this.state.angle - halfAngle + LIGHT_ANGLE * t;
      const radius = LIGHT_LENGTH;
      points.push({
        x: playerPos.x + Math.cos(angle) * radius,
        y: playerPos.y + Math.sin(angle) * radius
      });
    }

    return points;
  }

  getLightIntensityAt(px: number, py: number, playerPos: Position): number {
    if (!this.state.isOn) return 0;

    const dx = px - playerPos.x;
    const dy = py - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > LIGHT_LENGTH + LIGHT_SOFT_EDGE) return 0;
    if (distance <= 0) return 0.27;

    const targetAngle = Math.atan2(dy, dx);
    let angleDiff = targetAngle - this.state.angle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    const halfAngle = LIGHT_ANGLE / 2;
    if (Math.abs(angleDiff) > halfAngle) return 0;

    let intensity = 1;
    const angleRatio = Math.abs(angleDiff) / halfAngle;
    if (angleRatio > 0.7) {
      intensity *= 1 - (angleRatio - 0.7) / 0.3;
    }

    if (distance > LIGHT_LENGTH) {
      intensity *= 1 - (distance - LIGHT_LENGTH) / LIGHT_SOFT_EDGE;
    } else {
      const distRatio = distance / LIGHT_LENGTH;
      intensity *= 1 - distRatio * 0.6;
    }

    return Math.max(0, Math.min(1, intensity));
  }
}
