import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { recipes } from '@/data/recipes';
import { RecipeCard } from '@/components/RecipeCard';
import { CategoryBar, type Category, type SortType } from '@/components/CategoryBar';

const PAGE_SIZE = 8;

export const HomePage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('全部');
  const [activeSort, setActiveSort] = useState<SortType>('hot');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const filteredRecipes = useMemo(() => {
    let result = [...recipes];

    if (activeCategory !== '全部') {
      result = result.filter((r) => r.category === activeCategory);
    }

    if (activeSort === 'hot') {
      result.sort((a, b) => b.likes - a.likes);
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [activeCategory, activeSort]);

  const visibleRecipes = useMemo(() => {
    return filteredRecipes.slice(0, visibleCount);
  }, [filteredRecipes, visibleCount]);

  const hasMore = visibleCount < filteredRecipes.length;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setVisibleCount((prev) => prev + PAGE_SIZE);
    }
  }, [hasMore]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, activeSort]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore) {
            loadMore();
          }
        });
      },
      { rootMargin: '200px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="home-page">
      <header className="app-header">
        <h1>🍳 美食社区</h1>
        <p>分享你的私房菜谱，发现更多美味</p>
      </header>

      <CategoryBar
        activeCategory={activeCategory}
        activeSort={activeSort}
        onCategoryChange={setActiveCategory}
        onSortChange={setActiveSort}
      />

      <div className="recipe-grid">
        {visibleRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      {hasMore ? (
        <div className="load-more" ref={loadMoreRef}>
          <button className="load-more-btn" onClick={loadMore}>
            加载更多
          </button>
        </div>
      ) : (
        filteredRecipes.length > 0 && (
          <div className="loading-indicator">— 已经到底啦 —</div>
        )
      )}

      {filteredRecipes.length === 0 && (
        <div className="loading-indicator" style={{ padding: '60px 0' }}>
          暂无该分类的菜谱
        </div>
      )}
    </div>
  );
};
