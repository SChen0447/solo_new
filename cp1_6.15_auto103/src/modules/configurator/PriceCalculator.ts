import axios from 'axios';
import type { CustomizationState, PriceRules, ProductInfo, HardwareOption } from '../../types';

export class PriceCalculator {
  private priceRules: PriceRules | null = null;

  async fetchPriceRules(): Promise<PriceRules> {
    if (this.priceRules) {
      return this.priceRules;
    }
    const response = await axios.get('/api/price-rules');
    this.priceRules = response.data;
    return this.priceRules;
  }

  async calculateFromAPI(
    materialId: string,
    colorId: string,
    hardware: HardwareOption
  ): Promise<number> {
    const response = await axios.post('/api/calculate-price', {
      materialId,
      colorId,
      hardware,
    });
    return response.data.price;
  }

  calculateLocally(
    rules: PriceRules,
    materialId: string,
    isCustomColor: boolean,
    isGoldHardware: boolean
  ): number {
    let price = rules.basePrice;

    const materialMultiplier = rules.materialMultipliers[materialId] || 0;
    price *= 1 + materialMultiplier;

    if (isCustomColor) {
      price *= 1 + rules.customColorPremium;
    }

    if (isGoldHardware) {
      price *= 1 + rules.goldHardwarePremium;
    }

    return Math.round(price * 100) / 100;
  }
}

export const priceCalculator = new PriceCalculator();

export async function fetchProductInfo(): Promise<ProductInfo> {
  const response = await axios.get('/api/products/totebag-001');
  return response.data;
}

export async function restoreFromShareCode(code: string): Promise<CustomizationState> {
  const response = await axios.get(`/api/share/${code}`);
  return response.data;
}
