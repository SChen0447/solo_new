import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  GitCompareArrows,
  Calculator,
  Beaker,
  Clock,
  TrendingUp,
  ChefHat,
  Scale,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useRecipeStore } from '../stores/recipeStore';
import { ExperimentTimeline } from '../components/ExperimentTimeline';
import { ComparePanel } from '../components/ComparePanel';
import { RecipeFormModal } from '../components/RecipeFormModal';
import { ExperimentFormModal } from '../components/ExperimentFormModal';
import { ImageModal } from '../components/ImageModal';
import { LineChart } from '../components/charts/LineChart';
import type { Recipe, RecipeType } from '../types';
import {
  calculateRecipeCost,
  RECIPE_TYPE_LABELS
} from '../types';
import {
  BreadSlice,
  CakeSlice,
  Cookie,
  PieChart,
  Muffin
} from 'lucide-react';

const TYPE_ICONS: Record<RecipeType, React.ComponentType<{ size?: number; className?: string }>> = {
  bread: BreadSlice,
  cake: CakeSlice,
  cookie: Cookie,
  pie: PieChart,
  muffin: Muffin
};

function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoNewExp = searchParams.get('newExp') === '1';

  const {
    recipes,
    loading,
    error,
    fetchRecipe,
    updateRecipe,
    deleteRecipe,
    addExperiment,
    setSelectedRecipeId
  } = useRecipeStore();

  const recipe = recipes.find(r => r.id === id) || null;

  const [showEditForm, setShowEditForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRecipe(id);
      setSelectedRecipeId(id);
    }
    return () => setSelectedRecipeId(null);
  }, [id, fetchRecipe, setSelectedRecipeId]);

  useEffect(() => {
    if (autoNewExp && recipe) {
      setShowExpForm(true);
    }
  }, [autoNewExp, recipe]);

  const compareExps = useMemo(() => {
    if (!recipe || selectedForCompare.length !== 2) return [];
    return selectedForCompare
      .map(eid => recipe.experiments.find(e => e.id === eid))
      .filter(Boolean) as typeof recipe.experiments;
  }, [recipe, selectedForCompare]);

  const toggleCompare = (expId: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(expId)) {
        return prev.filter(x => x !== expId);
      }
      if (prev.length >= 2) {
        return [prev[1], expId];
      }
      return [...prev, expId];
    });
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedForCompare([]);
  };

  const handleDeleteRecipe = async () => {
    if (!id) return;
    if (!confirm('确定要删除此配方及其所有实验记录吗？')) return;
    setDeleting(true);
    try {
      await deleteRecipe(id);
      navigate('/');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateRecipe = async (data: Omit<Recipe, 'id' | 'experiments' | 'createdAt' | 'updatedAt'>) => {
    if (!id) return;
    await updateRecipe(id, data);
  };

  if (loading && !recipe) {
    return (
      <div className="page-loading">
        <Loader2 size={40} className="spin" />
        <p>加载配方中...</p>
      </div>
    );
  }

  if (error && !recipe) {
    return (
      <div className="page-error">
        <AlertCircle size={48} />
        <h3>加载失败</h3>
        <p>{error}</p>
        <button className="btn-primary" onClick={() => id && fetchRecipe(id)}>
          重试
        </button>
      </div>
    );
  }

  if (!recipe) return null;

  const Icon = TYPE_ICONS[recipe.type];
  const estCost = calculateRecipeCost(recipe.ingredients);
  const expsSorted = [...recipe.experiments].sort(
    (a, b) => parseISO(b.bakingDate).getTime() - parseISO(a.bakingDate).getTime()
  );
  const avgCost = expsSorted.length > 0
    ? expsSorted.reduce((s, e) => s + e.actualCost, 0) / expsSorted.length
    : 0;
  const avgBrowning = expsSorted.length > 0
    ? expsSorted.reduce((s, e) => s + e.browningScore, 0) / expsSorted.length
    : 0;
  const avgRise = expsSorted.length > 0
    ? expsSorted.reduce((s, e) => s + e.riseUniformity, 0) / expsSorted.length
    : 0;

  const costChartData = expsSorted
    .slice()
    .reverse()
    .map(e => ({ date: e.bakingDate, value: e.actualCost }));

  const inCompareView = compareExps.length === 2;

  return (
    <div className="recipe-page fade-in">
      <div className="recipe-sidebar">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
          返回配方库
        </button>

        <div className="sidebar-info-card">
          <div className="info-icon">
            <Icon size={24} />
          </div>
          <h2 className="info-name">{recipe.name}</h2>
          <span className="info-type">{RECIPE_TYPE_LABELS[recipe.type]}</span>

          <div className="info-stats">
            <div className="info-stat">
              <Calculator size={14} />
              <div>
                <label>预估成本</label>
                <strong>¥{estCost.toFixed(2)}</strong>
              </div>
            </div>
            <div className="info-stat">
              <Beaker size={14} />
              <div>
                <label>实验次数</label>
                <strong>{expsSorted.length}次</strong>
              </div>
            </div>
            {expsSorted.length > 0 && (
              <div className="info-stat">
                <Clock size={14} />
                <div>
                  <label>最近实验</label>
                  <strong>{format(parseISO(expsSorted[0].bakingDate), 'MM/dd')}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="info-actions">
            <button className="btn-secondary" onClick={() => setShowEditForm(true)}>
              <Edit2 size={14} /> 编辑配方
            </button>
            <button
              className="btn-danger"
              onClick={handleDeleteRecipe}
              disabled={deleting}
            >
              <Trash2 size={14} />
              {deleting ? '删除中...' : '删除配方'}
            </button>
          </div>
        </div>

        <div className="sidebar-ingredients">
          <h3>
            <Scale size={14} /> 配料清单
          </h3>
          <div className="ingredient-list">
            {recipe.ingredients.map(ing => (
              <div key={ing.id} className="ingredient-item">
                <span className="ing-name">{ing.name}</span>
                <span className="ing-amount">{ing.amount}g</span>
                <span className="ing-cost">¥{(ing.amount * ing.unitCost).toFixed(2)}</span>
              </div>
            ))}
            <div className="ingredient-item total">
              <span>合计</span>
              <span></span>
              <strong>¥{estCost.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {expsSorted.length > 0 && (
          <div className="sidebar-averages">
            <h3>
              <TrendingUp size={14} /> 平均指标
            </h3>
            <div className="avg-grid">
              <div className="avg-item">
                <span>平均成本</span>
                <strong>¥{avgCost.toFixed(2)}</strong>
              </div>
              <div className="avg-item">
                <span>平均焦化度</span>
                <strong>{avgBrowning.toFixed(1)}/10</strong>
              </div>
              <div className="avg-item">
                <span>平均膨胀度</span>
                <strong>{avgRise.toFixed(1)}/10</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="recipe-main">
        <div className="main-toolbar">
          <div className="toolbar-left">
            <div className="page-breadcrumb">
              <ChefHat size={16} />
              <span>{RECIPE_TYPE_LABELS[recipe.type]}</span>
              <span className="sep">/</span>
              <span className="current">{recipe.name}</span>
            </div>
          </div>
          <div className="toolbar-right">
            {!inCompareView && (
              <button
                className={`btn-compare ${compareMode ? 'active' : ''}`}
                onClick={() => {
                  if (compareMode) exitCompareMode();
                  else setCompareMode(true);
                }}
                disabled={recipe.experiments.length < 2}
              >
                <GitCompareArrows size={14} />
                {compareMode ? '取消对比' : '对比模式'}
              </button>
            )}
            {!inCompareView && (
              <button className="btn-primary" onClick={() => setShowExpForm(true)}>
                <Plus size={16} /> 记录新实验
              </button>
            )}
          </div>
        </div>

        {inCompareView ? (
          <ComparePanel
            expA={compareExps[0]}
            expB={compareExps[1]}
            onClose={exitCompareMode}
            onImageClick={url => setLightboxUrl(url)}
          />
        ) : (
          <>
            <ExperimentTimeline
              experiments={recipe.experiments}
              compareMode={compareMode}
              selectedForCompare={selectedForCompare}
              onToggleCompare={toggleCompare}
              onImageClick={url => setLightboxUrl(url)}
            />

            {expsSorted.length >= 2 && (
              <div className="chart-section">
                <div className="chart-header">
                  <h3>
                    <TrendingUp size={18} /> 成本趋势
                  </h3>
                  <span className="chart-hint">共 {expsSorted.length} 次实验数据</span>
                </div>
                <div className="chart-card">
                  <LineChart data={costChartData} unit="元" height={260} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <RecipeFormModal
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSubmit={handleUpdateRecipe}
        initialData={recipe}
      />

      <ExperimentFormModal
        isOpen={showExpForm}
        onClose={() => setShowExpForm(false)}
        onSubmit={async data => {
          if (id) await addExperiment(id, data);
        }}
        recipeId={id || ''}
        defaultCost={estCost}
      />

      <ImageModal url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}

export default RecipePage;
