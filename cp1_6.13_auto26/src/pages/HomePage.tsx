import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import RecipeCard from '../components/RecipeCard';
import RecipeModal from '../components/RecipeModal';
import { Recipe, recipeApi } from '../api/recipes';

const TAGS = ['快捷', '甜品', '辣味', '素食', '早餐', '烧烤', '汤品', '海鲜'];

const HomePage: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [animationType, setAnimationType] = useState<'fadeIn' | 'slideInRight' | 'slideOutLeft' | 'none'>('fadeIn');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  const handleTagClick = useCallback(async (tag: string) => {
    if (isTransitioning) return;

    if (selectedTag === tag) {
      setIsTransitioning(true);
      setAnimationType('slideOutLeft');
      setAnimationKey((prev) => prev + 1);

      setTimeout(async () => {
        try {
          const data = await recipeApi.getRecommendations(3);
          setRecipes(data);
          setSelectedTag(null);
          setAnimationType('slideInRight');
          setAnimationKey((prev) => prev + 1);
        } catch (error) {
          console.error('Failed to load recommendations:', error);
        } finally {
          setIsTransitioning(false);
        }
      }, 400);
      return;
    }

    setIsTransitioning(true);
    setAnimationType('slideOutLeft');
    setAnimationKey((prev) => prev + 1);

    setTimeout(async () => {
      try {
        const data = await recipeApi.getRecipesByTag(tag);
        setRecipes(data);
        setSelectedTag(tag);
        setAnimationType('slideInRight');
        setAnimationKey((prev) => prev + 1);
      } catch (error) {
        console.error('Failed to load recipes by tag:', error);
      } finally {
        setIsTransitioning(false);
      }
    }, 400);
  }, [selectedTag, isTransitioning]);

  const handleCardClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    loadRecommendations();
    loadFavorites();
  }, [loadRecommendations, loadFavorites]);

  return (
    <div className="page-container">
      <section className="hero-section">
        <h1 className="hero-title">
          <span className="title-accent">食谱</span>探险家
        </h1>
        <p className="hero-subtitle">发现美食的乐趣，开启你的味蕾之旅</p>
      </section>

      <section className="tags-section">
        <div className="tags-scroll">
          {TAGS.map((tag) => (
            <button
              key={tag}
              className={`tag-btn ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => handleTagClick(tag)}
              disabled={isTransitioning}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      <section className="recipes-section">
        <div className="section-header">
          <h2 className="section-title">
            {selectedTag ? `${selectedTag}食谱` : '今日推荐'}
          </h2>
          {!selectedTag && (
            <button
              className="refresh-btn"
              onClick={loadRecommendations}
              disabled={isLoading}
            >
              <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
              换一批
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="loading-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-image" />
                <div className="skeleton-content">
                  <div className="skeleton-title" />
                  <div className="skeleton-meta" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="recipes-grid" key={animationKey}>
            {recipes.map((recipe, index) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                index={index}
                isFavorite={favoriteIds.includes(recipe.id)}
                animationType={animationType}
                onFavoriteChange={loadFavorites}
                onClick={() => handleCardClick(recipe)}
              />
            ))}
          </div>
        )}

        {!isLoading && recipes.length === 0 && (
          <div className="empty-state">
            <p>暂无相关食谱，试试其他标签吧</p>
          </div>
        )}
      </section>

      <RecipeModal
        recipe={selectedRecipe}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
};

export default HomePage;
