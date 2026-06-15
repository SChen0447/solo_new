export interface LeatherMaterial {
  id: string;
  name: string;
  grade: 'basic' | 'mid' | 'premium';
  description: string;
}

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  isCustom: boolean;
}

export interface HardwareOption {
  zipperColor: 'gold' | 'silver' | 'bronze';
  buckleShape: 'circle' | 'square' | 'dshape';
  rivetStyle: 'round' | 'flat' | 'cross';
}

export interface CustomizationState {
  materialId: string;
  colorId: string;
  hardware: HardwareOption;
  price: number;
}

export interface PriceRules {
  basePrice: number;
  materialMultipliers: Record<string, number>;
  customColorPremium: number;
  goldHardwarePremium: number;
}

export interface ProductInfo {
  id: string;
  name: string;
  description: string;
  materials: LeatherMaterial[];
  colors: ColorOption[];
  priceRules: PriceRules;
}
