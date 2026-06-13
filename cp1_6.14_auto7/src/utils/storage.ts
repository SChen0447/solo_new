const LIKES_KEY = 'recipe_likes';
const FAVORITES_KEY = 'recipe_favorites';

function getObject(key: string): Record<number, boolean> {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setObject(key: string, value: Record<number, boolean>): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error('Failed to save to localStorage');
  }
}

export function isLiked(recipeId: number): boolean {
  return getObject(LIKES_KEY)[recipeId] || false;
}

export function toggleLike(recipeId: number): boolean {
  const likes = getObject(LIKES_KEY);
  likes[recipeId] = !likes[recipeId];
  setObject(LIKES_KEY, likes);
  return likes[recipeId];
}

export function isFavorited(recipeId: number): boolean {
  return getObject(FAVORITES_KEY)[recipeId] || false;
}

export function toggleFavorite(recipeId: number): boolean {
  const favorites = getObject(FAVORITES_KEY);
  favorites[recipeId] = !favorites[recipeId];
  setObject(FAVORITES_KEY, favorites);
  return favorites[recipeId];
}

export function getLikedRecipes(): number[] {
  const likes = getObject(LIKES_KEY);
  return Object.entries(likes)
    .filter(([, liked]) => liked)
    .map(([id]) => Number(id));
}

export function getFavoritedRecipes(): number[] {
  const favorites = getObject(FAVORITES_KEY);
  return Object.entries(favorites)
    .filter(([, favorited]) => favorited)
    .map(([id]) => Number(id));
}
