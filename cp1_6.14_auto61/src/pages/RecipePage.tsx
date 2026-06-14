import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipeStore } from '../stores/useRecipeStore';
import RecipeCard from '../components/RecipeCard';
import type { Difficulty } from '../types';

export default function RecipePage() {
  const navigate = useNavigate();
  const {
    loading,
    searchQuery,
    selectedTags,
    selectedDifficulty,
    maxTime,
    fetchRecipes,
    setSearchQuery,
    setSelectedTags,
    setSelectedDifficulty,
    setMaxTime,
    getFilteredRecipes,
  } = useRecipeStore();

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalQuery(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setSearchQuery(val), 200);
    },
    [setSearchQuery]
  );

  const allTags = ['川菜', '日料', '烘焙', '快手菜', '低卡', '粤菜', '湘菜', '西餐'];
  const difficulties: (Difficulty | '')[] = ['', '简单', '中等', '困难'];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const filtered = getFilteredRecipes();

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">我的菜谱</h1>
        <button className="btn btn--primary" onClick={() => navigate('/recipe/new')}>
          + 新建菜谱
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="搜索菜谱名称..."
          value={localQuery}
          onChange={handleSearchChange}
        />
      </div>

      <div className="filters">
        <div className="filter-group">
          <span className="filter-label">难度：</span>
          {difficulties.map((d) => (
            <button
              key={d || 'all'}
              className={`filter-chip${selectedDifficulty === d ? ' filter-chip--active' : ''}`}
              onClick={() => setSelectedDifficulty(d)}
            >
              {d || '全部'}
            </button>
          ))}
        </div>
        <div className="filter-group">
          <span className="filter-label">标签：</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`filter-chip${selectedTags.includes(tag) ? ' filter-chip--active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="filter-group">
          <span className="filter-label">最大时间：</span>
          <input
            type="number"
            className="filter-number"
            placeholder="分钟"
            value={maxTime ?? ''}
            onChange={(e) => setMaxTime(e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-illustration">🎨</div>
          <p className="empty-text">没有找到匹配的菜谱</p>
          <p className="empty-hint">换个关键词试试？</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
