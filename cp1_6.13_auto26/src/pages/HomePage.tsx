import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, BookOpen } from 'lucide-react';
import RecipeCard from '../components/RecipeCard';
import RecipeModal from '../components/RecipeModal';
import { Recipe, recipeApi } from '../api/recipes';

const TAGS = ['快捷', '甜品', '辣味', '素食', '早餐', '烧烤', '汤品', '海鲜'];

const HomePage: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [animationType, setAnimationType] = useState<'fadeIn' | 'slideInRight' | 'slideOutLeft'>('fadeIn');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const loadFavorites = useCallback(async () => {
    try {
      const response = await recipeApi.getFavorites();
      setFavoriteIds(response.recipeIds);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }, []);

  const loadRecommendations = useCallback(async () => {
    setIsLoading(true);
    setAnimationType('fadeIn');
    setAnimationKey((prev) => prev + 1);
    try {
      const data = await recipeApi.getRecommendations(3);
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRecipesByTag = useCallback(async (tag: string) => {
    setAnimationType('slideOutLeft');

    setTimeout(async () => {
      try {
        const data = await recipeApi.getRecipesByTag(tag);
        setRecipes(data);
        setAnimationType('slideInRight');
        setAnimationKey((prev) => prev + 1);
      } catch (error) {
        console.error('Failed to load recipes by tag:', error);
      }
    }, 300