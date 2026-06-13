import React, { useState, useEffect, useCallback } from 'react';
import { Share2, Trash2, Copy, Check } from 'lucide-react';
import RecipeCard from '../components/RecipeCard';
import RecipeModal from '../components/RecipeModal';
import { Recipe, recipeApi, ShareResponse } from '../api/recipes';

const FavoritesPage: React.FC = () => {
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [shareInfo, setShareInfo] = useState<ShareResponse | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await recipeApi.getFavorites();
      setFavoriteRecipes(response.recipes);
      setFavoriteIds(response.recipeIds);
      setOrder(response.order.length > 0 ? response.order : response.recipeIds);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRemoveFavorite = async (recipeId: string) => {
    try {
      await recipeApi.removeFavorite(recipeId);
      await loadFavorites();
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  const handleShare = async () => {
    if (favoriteRecipes.length === 0) return;
    setIsSharing(true);
    try {
      const result = await recipeApi.createShare();
      setShareInfo(result);
    } catch (error) {
      console.error('Failed to create share:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareInfo) return;
    const link = `${window.location.origin}${shareInfo.shareUrl}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDragStart = (e: React.DragEvent, recipeId: string) => {
    setDragId(recipeId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', recipeId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }

    const newOrder = [...order];
    const dragIndex = newOrder.indexOf(dragId);
    const dropIndex = newOrder.indexOf(targetId);

    if (dragIndex === -1 || dropIndex === -1) {
      setDragId(null);
      setDragOverId(null);
      return;
    }

    newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, dragId);

    setOrder(newOrder);

    const reorderedRecipes = newOrder
      .map((id) => favoriteRecipes.find((r) => r.id === id))
      .filter((r): r is Recipe => r !== undefined);
    setFavoriteRecipes(reorderedRecipes);

    try {
      await recipeApi.updateFavoriteOrder(newOrder);
    } catch (error) {
      console.error('Failed to update order:', error);
    }

    setDragId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  const handleCardClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const getOrderedRecipes = (): Recipe[] => {
    const recipeMap = new Map(favoriteRecipes.map((r) => [r.id, r]));
    return order
      .map((id) => recipeMap.get(id))
      .filter((r): r is Recipe => r !== undefined);
  };

  const displayRecipes = getOrderedRecipes();

  return (
    <div className="page-container">
      <section className="favorites-header">
        <h1 className="page-title">我的收藏夹</h1>
        <p className="page-subtitle">{favoriteRecipes.length} 道精选食谱</p>
      </section>

      {favoriteRecipes.length > 0 && (
        <div className="favorites-actions">
          <button
            className="share-btn"
            onClick={handleShare}
            disabled={isSharing}
          >
            <Share2 size={18} />
            {isSharing ? '生成中...' : '分享收藏夹'}
          </button>
        </div>
      )}

      {shareInfo && (
        <div className="share-result">
          <div className="share-link-box">
            <span className="share-code">短码: {shareInfo.shortCode}</span>
            <span className="share-expires">有效期至: {new Date(shareInfo.expiresAt).toLocaleString('zh-CN')}</span>
            <button className="copy-btn" onClick={handleCopyLink}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '已复制' : '复制链接'}
            </button>
          </div>
        </div>
      )}

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
      ) : displayRecipes.length > 0 ? (
        <div className="recipes-grid favorites-grid">
          {displayRecipes.map((recipe, index) => (
            <div
              key={recipe.id}
              className={`favorite-card-wrapper ${dragId === recipe.id ? 'dragging' : ''} ${dragOverId === recipe.id ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                handleDragOver(e);
                setDragOverId(recipe.id);
              }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => handleDrop(e, recipe.id)}
              onDragEnd={handleDragEnd}
            >
              <RecipeCard
                recipe={recipe}
                index={index}
                isFavorite={true}
                animationType="fadeIn"
                onFavoriteChange={loadFavorites}
                onClick={() => handleCardClick(recipe)}
                draggable={true}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={dragId === recipe.id}
              />
              <button
                className="remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFavorite(recipe.id);
                }}
                aria-label="移除收藏"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state favorites-empty">
          <div className="empty-icon">♡</div>
          <p>还没有收藏任何食谱</p>
          <p className="empty-hint">去首页发现你喜欢的美食吧</p>
        </div>
      )}

      <RecipeModal
        recipe={selectedRecipe}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
};

export default FavoritesPage;
