export interface Recipe {
  id: string;
  name: string;
  beanOrigin: string;
  roastLevel: 'light' | 'medium' | 'dark';
  grindSize: 'coarse' | 'medium-coarse' | 'medium' | 'fine' | 'extra-fine';
  waterTemp: number;
  ratio: number;
  brewTime: number;
  flavorRating: number;
  notes: string;
  createdAt: string;
}

export interface RecipeFormData {
  name: string;
  beanOrigin: string;
  roastLevel: 'light' | 'medium' | 'dark';
  grindSize: 'coarse' | 'medium-coarse' | 'medium' | 'fine' | 'extra-fine';
  waterTemp: number;
  ratio: number;
  brewTime: number;
  flavorRating: number;
  notes: string;
}
