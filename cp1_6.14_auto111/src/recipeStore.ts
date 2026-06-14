import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe, Product, RecipeIngredient, ProductType } from './types';
import { useGardenStore } from './gardenStore';

interface RecipeState {
  recipes: Recipe[];
  products: Product[];
  totalSynthesisCount: number;
  totalIngredientConsumed: number;

  addRecipe: (name: string, ingredients: RecipeIngredient[], productName: string, productQuantity: number, productType: ProductType) => void;
  updateRecipe: (id: string, name: string, ingredients: RecipeIngredient[], productName: string, productQuantity: number, productType: ProductType) => void;
  deleteRecipe: (id: string) => void;

  checkIngredients: (recipe: Recipe) => { sufficient: boolean; details: { ingredientId: string; needed: number; available: number }[] };
  synthesize: (recipeId: string) => boolean;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  products: [],
  totalSynthesisCount: 0,
  totalIngredientConsumed: 0,

  addRecipe: (name, ingredients, productName, productQuantity, productType) => {
    const recipe: Recipe = {
      id: uuidv4(),
      name,
      ingredients,
      productName,
      productQuantity,
      productType,
      createdAt: Date.now(),
      synthesisCount: 0,
    };
    set((state) => ({ recipes: [...state.recipes, recipe] }));
  },

  updateRecipe: (id, name, ingredients, productName, productQuantity, productType) => {
    set((state) => ({
      recipes: state.recipes.map((r) =>
        r.id === id ? { ...r, name, ingredients, productName, productQuantity, productType } : r
      ),
    }));
  },

  deleteRecipe: (id) => {
    set((state) => ({ recipes: state.recipes.filter((r) => r.id !== id) }));
  },

  checkIngredients: (recipe) => {
    const inventory = useGardenStore.getState().ingredientInventory;
    const details = recipe.ingredients.map((ri) => ({
      ingredientId: ri.ingredientId,
      needed: ri.quantity,
      available: inventory[ri.ingredientId] ?? 0,
    }));
    const sufficient = details.every((d) => d.available >= d.needed);
    return { sufficient, details };
  },

  synthesize: (recipeId) => {
    const recipe = get().recipes.find((r) => r.id === recipeId);
    if (!recipe) return false;

    const check = get().checkIngredients(recipe);
    if (!check.sufficient) return false;

    const gardenStore = useGardenStore.getState();
    for (const ri of recipe.ingredients) {
      gardenStore.consumeIngredient(ri.ingredientId, ri.quantity);
    }

    const totalConsumed = recipe.ingredients.reduce((sum, ri) => sum + ri.quantity, 0);

    set((state) => {
      const existingProduct = state.products.find(
        (p) => p.recipeId === recipeId
      );

      let updatedProducts: Product[];
      if (existingProduct) {
        updatedProducts = state.products.map((p) =>
          p.id === existingProduct.id
            ? { ...p, quantity: p.quantity + recipe.productQuantity }
            : p
        );
      } else {
        const newProduct: Product = {
          id: uuidv4(),
          name: recipe.productName,
          productType: recipe.productType,
          quantity: recipe.productQuantity,
          firstSynthesisAt: Date.now(),
          recipeId,
        };
        updatedProducts = [...state.products, newProduct];
      }

      const updatedRecipes = state.recipes.map((r) =>
        r.id === recipeId ? { ...r, synthesisCount: r.synthesisCount + 1 } : r
      );

      return {
        products: updatedProducts,
        recipes: updatedRecipes,
        totalSynthesisCount: state.totalSynthesisCount + 1,
        totalIngredientConsumed: state.totalIngredientConsumed + totalConsumed,
      };
    });

    return true;
  },
}));
