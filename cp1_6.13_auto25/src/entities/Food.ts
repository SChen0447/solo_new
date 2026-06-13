import { generateId } from '../utils/helpers';
import { SIMULATION_CONFIG } from '../config/envConfig';
import { FoodData } from '../types';

export class Food implements FoodData {
  id: string;
  x: number;
  y: number;
  energy: number;
  type: 'plant' | 'meat';

  constructor(x: number, y: number, type: 'plant' | 'meat' = 'plant') {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.type = type;
    this.energy = type === 'plant' ? SIMULATION_CONFIG.FOOD_ENERGY : SIMULATION_CONFIG.MEAT_ENERGY;
  }

  toData(): FoodData {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      energy: this.energy,
      type: this.type,
    };
  }

  static fromData(data: FoodData): Food {
    const food = new Food(data.x, data.y, data.type);
    food.id = data.id;
    food.energy = data.energy;
    return food;
  }
}

export default Food;
