export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  token: string;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: '克' | '毫升' | '个' | '勺' | '茶匙' | '杯';
  checked?: boolean;
}

export interface RecipeStep {
  id: string;
  order: number;
  description: string;
  image?: string;
  tips?: string;
}

export interface Comment {
  id: string;
  recipeId: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  parentId?: string;
  replyTo?: string;
  likes: number;
  likedBy: string[];
  createdAt: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  cuisine: string;
  difficulty: '简单' | '中等' | '困难';
  cookTime: number;
  servings: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  tags: string[];
  favorites: number;
  favoritedBy: string[];
  comments: Comment[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CuisineType = '全部' | '中式' | '西式' | '日式' | '韩式' | '泰式' | '意式' | '其他';

export type SortType = 'newest' | 'oldest' | 'favorites';

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export interface RecipeContextType {
  recipes: Recipe[];
  loading: boolean;
  fetchRecipes: () => Promise<void>;
  getRecipe: (id: string) => Recipe | undefined;
  createRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'favorites' | 'favoritedBy' | 'comments'>) => Promise<Recipe>;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
  toggleFavorite: (recipeId: string) => Promise<void>;
  addComment: (recipeId: string, content: string, parentId?: string, replyTo?: string) => Promise<Comment>;
  likeComment: (recipeId: string, commentId: string) => Promise<void>;
}
