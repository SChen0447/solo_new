import type { TrafficLight as TrafficLightData, TrafficLightColor } from '../store';

export class TrafficLightController {
  private lights: Map<string, TrafficLightData> = new Map();
  private cycleDuration: number;
  private yellowDuration: number;
  private globalTime: number = 0;

  constructor(cycleDuration: number = 30) {
    this.cycleDuration = cycleDuration;
    this.yellowDuration = Math.max(2, cycleDuration * 0.1);
  }

  setCycleDuration(duration: number): void {
    this.cycleDuration = duration;
    this.yellowDuration = Math.max(2, duration * 0.1);
  }

  createLight(
    id: string,
    position: { x: number; y: number; z: number },
    intersection: { x: number; y: number },
    phaseOffset: number = 0
  ): TrafficLightData {
    const light: TrafficLightData = {
      id,
      position: { ...position },
      intersection: { ...intersection },
      nsColor: 'red',
      ewColor: 'green',
      phase: phaseOffset,
      cycleProgress: 0,
      remainingTime: cycleDuration,
    };
    this.lights.set(id, light);
    return light;
  }

  getAllLights(): TrafficLightData[] {
    return Array.from(this.lights.values());
  }

  getLight(id: string): TrafficLightData | undefined {
    return this.lights.get(id);
  }

  getLightAtIntersection(ix: number, iy: number): TrafficLightData | undefined {
    for (const light of this.lights.values()) {
      if (light.intersection.x === ix && light.intersection.y === iy) {
        return light;
      }
    }
    return undefined;
  }

  update(deltaTime: number): void {
    this.globalTime += deltaTime;

    for (const light of this.lights.values()) {
      const adjustedTime = this.globalTime + light.phase * this.cycleDuration;
      const cyclePos = (adjustedTime % this.cycleDuration) / this.cycleDuration;
      light.cycleProgress = cyclePos;

      const greenEnd = 0.5 - (this.yellowDuration / this.cycleDuration) * 0.5;
      const yellowEnd = 0.5;
      const ewGreenEnd = 1.0 - (this.yellowDuration / this.cycleDuration) * 0.5;

      if (cyclePos < greenEnd) {
        light.nsColor = 'green';
        light.ewColor = 'red';
        if (cyclePos < greenEnd * 0.5) {
          light.remainingTime = (greenEnd - cyclePos) * this.cycleDuration;
        } else {
          light.remainingTime = (yellowEnd - cyclePos) * this.cycleDuration;
        }
      } else if (cyclePos < yellowEnd) {
        light.nsColor = 'yellow';
        light.ewColor = 'red';
        light.remainingTime = (yellowEnd - cyclePos) * this.cycleDuration;
      } else if (cyclePos < ewGreenEnd) {
        light.nsColor = 'red';
        light.ewColor = 'green';
        if (cyclePos < (yellowEnd + ewGreenEnd) * 0.5) {
          light.remainingTime = (ewGreenEnd - cyclePos) * this.cycleDuration;
        } else {
          light.remainingTime = (1.0 - cyclePos) * this.cycleDuration;
        }
      } else {
        light.nsColor = 'red';
        light.ewColor = 'yellow';
        light.remainingTime = (1.0 - cyclePos) * this.cycleDuration;
      }

      light.remainingTime = Math.max(0, light.remainingTime);
    }
  }

  getMinRemainingTime(): number {
    let min = Infinity;
    for (const light of this.lights.values()) {
      if (light.remainingTime < min) {
        min = light.remainingTime;
      }
    }
    return min === Infinity ? 0 : min;
  }

  getColorHex(color: TrafficLightColor): number {
    const colors: Record<TrafficLightColor, number> = {
      red: 0xff4444,
      yellow: 0xffff44,
      green: 0x44ff44,
    };
    return colors[color];
  }

  reset(): void {
    this.lights.clear();
    this.globalTime = 0;
  }
}
