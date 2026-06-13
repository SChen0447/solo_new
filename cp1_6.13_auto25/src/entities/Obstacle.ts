import { generateId } from '../utils/helpers';
import { ObstacleData } from '../types';

export class Obstacle implements ObstacleData {
  id: string;
  x: number;
  y: number;
  radius: number;

  constructor(x: number, y: number, radius: number = 20) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.radius = radius;
  }

  toData(): ObstacleData {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      radius: this.radius,
    };
  }

  static fromData(data: ObstacleData): Obstacle {
    const obstacle = new Obstacle(data.x, data.y, data.radius);
    obstacle.id = data.id;
    return obstacle;
  }
}

export default Obstacle;
