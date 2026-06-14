import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useRecipeStore } from './store';
import type { Recipe, Difficulty, Unit, AdjustedIngredient } from './types';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const difficultyColors: Record<Difficulty, string> = {
  简单: 'difficulty-easy',
  中等: 'difficulty-medium',
  困难: 'difficulty-hard',
};

const allUnits: Unit[] = ['克', '毫升', '个', '茶匙', '汤匙'];

function RecipeDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const recipes = useRecipeStore((s) => s.recipes);
  const currentRecipe = useRecipeStore((s) => s.currentRecipe);
  const favorites = useRecipeStore((s) => s.favorites);
  const fetchRecipeById = useRecipeStore((s) => s.fetchRecipeById);
  const deleteRecipe = useRecipeStore((s) => s.deleteRecipe);
  const toggleFavorite = useRecipeStore((s) => s.toggleFavorite);
  const settings = useRecipeStore((s) => s.settings);

  const recipe: Recipe | undefined = useMemo(() => {
    return currentRecipe?.id === id ? currentRecipe : recipes.find((r) => r.id === id);
  }, [id, currentRecipe, recipes]);

  const isFavorite = favorites.includes(id || '');
  const [targetServings, setTargetServings] = useState<number>(recipe?.originalServings || 4);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!recipe && id) {
        await fetchRecipeById(id);
      }
      setLoading(false);
    };
    loadData();
  }, [recipe, id, fetchRecipeById]);

  useEffect(() => {
    if (recipe) {
      setTargetServings(recipe.originalServings);
    }
  }, [recipe]);

  const adjustedIngredients: AdjustedIngredient[] = useMemo(() => {
    if (!recipe) return [];
    const ratio = targetServings / recipe.originalServings;
    return recipe.ingredients.map((ing) => ({
      ...ing,
      adjustedAmount: Math.round(ing.amount * ratio * 10) / 10,
    }));
  }, [recipe, targetServings]);

  const scalingRatio = useMemo(() => {
    if (!recipe) return 1;
    return targetServings / recipe.originalServings;
  }, [recipe, targetServings]);

  const doughnutData = useMemo(() => {
    if (!recipe) return { labels: [], datasets: [] };

    const originalAmounts = recipe.ingredients.map((ing) => ing.amount);
    const adjustedAmounts = adjustedIngredients.map((ing) => ing.adjustedAmount);
    const labels = recipe.ingredients.map((ing) => ing.name);

    const warmColors = [
      '#FF8C00', '#FFA500', '#FFB732', '#FFC966', '#FFDB99',
      '#FF7F50', '#FF6347', '#FF4500', '#FFA07A', '#F4A460',
    ];

    const leftData = originalAmounts.map((_, i) => i === 0 ? originalAmounts[0] : 0);
    const rightData = adjustedAmounts.map((_, i) => i === 0 ? adjustedAmounts[0] : 0);

    return {
      labels: labels,
      datasets: [
        {
          label: '原配方',
          data: originalAmounts,
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const chartArea = context.chart.chartArea;
            if (!chartArea) return warmColors[context.dataIndex % warmColors.length];
            const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            gradient.addColorStop(0, '#FF8C00');
            gradient.addColorStop(1, '#FFA500');
            return warmColors[context.dataIndex % warmColors.length];
          },
          borderColor: '#FFFFFF',
          borderWidth: 2,
          circumference: 180,
          rotation: 270,
        },
        {
          label: '调整后',
          data: adjustedAmounts,
          backgroundColor: warmColors.map((c, i) => c).reverse(),
          borderColor: '#FFFFFF',
          borderWidth: 2,
          circumference: 180,
          rotation: 90,
        },
      ],
    };
  }, [recipe, adjustedIngredients]);

  const doughnutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    cutout: '55%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          font: { size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const idx = context.dataIndex;
            if (!recipe) return '';
            const ing = recipe.ingredients[idx];
            if (context.dataset.label === '原配方') {
              return `原配方：${ing.name} ${ing.amount}${ing.unit} (${ing.percentage}%)`;
            }
            return `调整后：${ing.name} ${adjustedIngredients[idx].adjustedAmount}${ing.unit}`;
          },
        },
      },
    },
  }), [recipe, adjustedIngredients]);

  const unitChartData = useMemo(() => {
    if (!recipe) return { labels: [], datasets: [] };
    const unitCounts: Record<Unit, number> = { 克: 0, 毫升: 0, 个: 0, 茶匙: 0, 汤匙: 0 };
    recipe.ingredients.forEach((ing) => {
      unitCounts[ing.unit] = (unitCounts[ing.unit] || 0) + 1;
    });
    return {
      labels: allUnits,
      datasets: [
        {
          label: '使用次数',
          data: allUnits.map((u) => unitCounts[u]),
          backgroundColor: allUnits.map((_, i) => {
            const gradient = ['#FF8C00', '#FF9933', '#FFA64D', '#FFB366', '#FFC080'];
            return gradient[i % gradient.length];
          }),
          borderColor: '#FF8C00',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }, [recipe]);

  const unitChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: '单位使用频率统计',
        font: { size: 14, weight: 'bold' as const },
        color: '#333',
        padding: { bottom: 15 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0,
        },
        grid: {
          color: 'rgba(0,0,0,0.05)',
        },
      },
      x: {
        grid: { display: false },
      },
    },
  }), []);

  const handleDelete = async () => {
    if (!id) return;
    const success = await deleteRecipe(id);
    if (success) {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>正在加载食谱详情...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="empty-state">
        <div className="empty-icon">❓</div>
        <h3>食谱不存在</h3>
        <p>找不到你要查看的食谱，可能已被删除。</p>
        <button className="btn btn-primary ripple" onClick={() => navigate('/')}>
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="recipe-detail-page">
      <div className="detail-hero" style={{ background: `linear-gradient(135deg, ${recipe.color || '#FFA500'}22, ${recipe.color || '#FF8C00'}44)` }}>
        <div className="hero-content">
          <div className="hero-title-row">
            <h1 className="detail-title">{recipe.name}</h1>
            <div className="hero-actions">
              <button
                className={`favorite-btn heart-btn large ${isFavorite ? 'active' : ''} ripple`}
                onClick={() => toggleFavorite(recipe.id)}
                title={isFavorite ? '取消收藏' : '添加收藏'}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill={isFavorite ? '#FF6B6B' : 'none'}
                  stroke={isFavorite ? '#FF6B6B' : '#888'}
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className="fav-text">{isFavorite ? '已收藏' : '收藏'}</span>
              </button>
              <button
                className="btn btn-secondary ripple"
                onClick={() => navigate(`/recipe/${recipe.id}/edit`)}
              >
                ✏️ 编辑
              </button>
              <button
                className="btn btn-danger ripple"
                onClick={() => setShowDeleteConfirm(true)}
              >
                🗑️ 删除
              </button>
            </div>
          </div>

          {recipe.description && (
            <p className="detail-description">{recipe.description}</p>
          )}

          <div className="detail-tags">
            <span className={`difficulty-tag ${difficultyColors[recipe.difficulty]}`}>
              {recipe.difficulty}
            </span>
            <span className="info-tag">
              🔥 准备 {recipe.prepTime} 分钟
            </span>
            <span className="info-tag">
              🌡️ {recipe.bakeTemp}°C
            </span>
            <span className="info-tag">
              ⏰ 烘焙 {recipe.bakeTime} 分钟
            </span>
            <span className="info-tag">
              👥 原份量 {recipe.originalServings} 人份
            </span>
          </div>
        </div>
      </div>

      <div className="detail-body">
        <div className="detail-section">
          <div className="calculator-card">
            <h3 className="section-title">⚖️ 份量调整计算器</h3>

            <div className="servings-control">
              <div className="serving-input-group">
                <label>原份量：</label>
                <div className="serving-display">
                  <span className="serving-num">{recipe.originalServings}</span>
                  <span className="serving-unit">人份</span>
                </div>
              </div>

              <div className="ratio-arrow">
                <div className="ratio-line"></div>
                <div className="ratio-value">×{scalingRatio.toFixed(2)}</div>
                <div className="ratio-line"></div>
              </div>

              <div className="serving-input-group">
                <label>目标份量：</label>
                <div className="serving-adjuster">
                  <button
                    type="button"
                    className="adj-btn ripple"
                    onClick={() => setTargetServings(Math.max(1, targetServings - 1))}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={targetServings}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setTargetServings(Math.max(1, Math.min(100, val)));
                    }}
                    className="serving-input"
                  />
                  <button
                    type="button"
                    className="adj-btn ripple"
                    onClick={() => setTargetServings(Math.min(100, targetServings + 1))}
                  >
                    +
                  </button>
                  <span className="serving-unit">人份</span>
                </div>
              </div>
            </div>

            <div className="quick-servings">
              <span>快捷选择：</span>
              {[1, 2, 4, 6, 8, 12].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`quick-btn ripple ${targetServings === n ? 'active' : ''}`}
                  onClick={() => setTargetServings(n)}
                >
                  {n}人份
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3 className="section-title">🧾 配料清单
            {targetServings !== recipe.originalServings && (
              <span className="adjustment-badge">已调整</span>
            )}
          </h3>

          <div className="ingredients-table">
            <div className="table-header">
              <span className="col-name">配料名称</span>
              <span className="col-original">原份量</span>
              <span className="col-adjusted">调整后份量</span>
              <span className="col-percent">占比</span>
            </div>
            {adjustedIngredients.map((ing, idx) => (
              <div key={ing.id} className="table-row">
                <span className="col-name">
                  <span className="ing-index" style={{ backgroundColor: ['#FF8C00', '#FF9933', '#FFA64D', '#FFB366', '#FFC080', '#FFCD99'][idx % 6] }}>
                    {idx + 1}
                  </span>
                  {ing.name}
                </span>
                <span className="col-original">
                  {ing.amount} {ing.unit}
                </span>
                <span className={`col-adjusted ${ing.adjustedAmount !== ing.amount ? 'changed' : ''}`}>
                  {ing.adjustedAmount !== ing.amount ? '→ ' : ''}
                  <strong>{ing.adjustedAmount.toFixed(1)}</strong> {ing.unit}
                </span>
                <span className="col-percent">
                  <span className="percent-bar">
                    <span className="percent-fill" style={{ width: `${ing.percentage}%` }}></span>
                  </span>
                  <span className="percent-text">{ing.percentage.toFixed(2)}%</span>
                </span>
              </div>
            ))}
            <div className="table-footer">
              <span className="col-name">合计</span>
              <span className="col-original">
                {recipe.ingredients.reduce((s, i) => s + i.amount, 0).toFixed(1)}
              </span>
              <span className="col-adjusted changed">
                <strong>
                  {adjustedIngredients.reduce((s, i) => s + i.adjustedAmount, 0).toFixed(1)}
                </strong>
              </span>
              <span className="col-percent">
                <span className="percent-text"><strong>100%</strong></span>
              </span>
            </div>
          </div>
        </div>

        <div className="detail-section charts-section">
          <div className="chart-card">
            <h4 className="chart-title">📊 调整前后配料总量对比</h4>
            <div className="chart-legend-info">
              <div className="legend-item">
                <span className="legend-dot" style={{ background: 'linear-gradient(90deg, #FF8C00, #FFA500)' }}></span>
                <span>左半圆：原配方（{recipe.originalServings}人份）</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: 'linear-gradient(90deg, #FFC080, #FFDB99)' }}></span>
                <span>右半圆：调整后（{targetServings}人份）</span>
              </div>
            </div>
            <div className="chart-wrapper doughnut-chart">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-wrapper bar-chart">
              <Bar data={unitChartData} options={unitChartOptions} />
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ 确认删除</h3>
            <p>确定要删除食谱「{recipe.name}」吗？此操作无法撤销。</p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary ripple"
                onClick={() => setShowDeleteConfirm(false)}
              >
                取消
              </button>
              <button
                className="btn btn-danger ripple"
                onClick={handleDelete}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipeDetail;
