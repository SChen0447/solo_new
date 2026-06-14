import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  ChefHat,
  Search,
  SlidersHorizontal,
  FilterX,
  Croissant,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useRecipeStore } from '../stores/recipeStore';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeFormModal } from '../components/RecipeFormModal';
import type { Recipe, RecipeType } from '../types';
import { RECIPE_TYPE_LABELS } from '../types';

type FilterType = RecipeType | 'all';

function HomePage() {
  const navigate = useNavigate();
  const { recipes, loading, error, fetchRecipes, createRecipe } = useRecipeStore();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const filtered = recipes.filter(r => {
    if (filter !== 'all' && r.type !== filter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async (data: Omit<Recipe, 'id' | 'experiments' | 'createdAt' | 'updatedAt'>) => {
    const created = await createRecipe(data);
    navigate(`/recipe/${created.id}`);
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: '全部' },
    ...(Object.keys(RECIPE_TYPE_LABELS) as RecipeType[]).map(k => ({
      key: k as FilterType,
      label: RECIPE_TYPE_LABELS[k]
    }))
  ];

  return (
    <div className="home-layout fade-in">
      <div className="home-sidebar">
        <div className="sidebar-header">
          <div className="app-logo">
            <ChefHat size={28} />
            <div>
              <h1>烘焙实验室</h1>
              <span>Baking Lab</span>
            </div>
          </div>
          <button className="btn-primary create-btn" onClick={() => setShowForm(true)}>
            <Plus size={16} />
            新建配方
          </button>
        </div>

        <div className="sidebar-search">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="搜索配方..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="sidebar-filters">
          <div className="filter-header">
            <SlidersHorizontal size={14} />
            <span>分类筛选</span>
            {filter !== 'all' && (
              <button className="filter-clear" onClick={() => setFilter('all')}>
                <FilterX size={12} /> 清除
              </button>
            )}
          </div>
          <div className="filter-tags">
            {filters.map(f => (
              <button
                key={f.key}
                className={`filter-tag ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-recipes-header">
          <Croissant size={16} />
          <span>配方列表</span>
          <em>({filtered.length})</em>
        </div>

        <div className="sidebar-recipes-list">
          {loading && recipes.length === 0 ? (
            <div className="sidebar-loading">
              <Loader2 size={20} className="spin" />
              <span>加载中...</span>
            </div>
          ) : error ? (
            <div className="sidebar-error">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button className="btn-secondary small" onClick={fetchRecipes}>
                重试
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="sidebar-empty">
              <Croissant size={36} />
              <p>暂无配方</p>
              <span>点击"新建配方"开始记录</span>
            </div>
          ) : (
            filtered.map(r => (
              <RecipeCard
                key={r.id}
                recipe={r}
                compact
                onClick={() => navigate(`/recipe/${r.id}`)}
              />
            ))
          )}
        </div>
      </div>

      <div className="home-main">
        <div className="main-header">
          <div>
            <h2>我的配方库</h2>
            <p>共 {recipes.length} 个配方 · {recipes.reduce((s, r) => s + r.experiments.length, 0)} 次实验记录</p>
          </div>
        </div>

        {loading && recipes.length === 0 ? (
          <div className="main-loading">
            <Loader2 size={40} className="spin" />
            <p>正在加载配方...</p>
          </div>
        ) : error ? (
          <div className="main-error">
            <AlertCircle size={40} />
            <h3>加载失败</h3>
            <p>{error}</p>
            <button className="btn-primary" onClick={fetchRecipes}>
              重新加载
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="main-empty fade-in-up">
            <Croissant size={64} />
            <h3>还没有配方</h3>
            <p>创建您的第一个烘焙配方，开始记录实验</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} />
              创建第一个配方
            </button>
          </div>
        ) : (
          <div className="recipe-grid">
            {filtered.map((r, i) => (
              <div key={r.id} className="fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <RecipeCard recipe={r} />
              </div>
            ))}
          </div>
        )}
      </div>

      <RecipeFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default HomePage;
