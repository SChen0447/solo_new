import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Heart, Star, ArrowLeft, ChevronLeft, ChevronRight, ChefHat } from 'lucide-react';

interface RecipeStep {
  description: string;
  image: string;
}

interface Recipe {
  id: number;
  title: string;
  cover_image: string;
  ingredients: string;
  taste_tags: string[];
  steps: RecipeStep[];
  avg_rating: number;
  rating_count: number;
  author: string;
  author_id: number;
}

interface RecommendedRecipe {
  id: number;
  title: string;
  cover_image: string;
  avg_rating: number;
}

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `/uploads/${url}`;
}

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [recommendedRecipes, setRecommendedRecipes] = useState<RecommendedRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  const getCurrentUser = useCallback(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchRecipe = axios.get(`/api/recipes/${id}`);
    const fetchRecommend = axios.get(`/api/recipes/${id}/recommend`);

    Promise.all([fetchRecipe, fetchRecommend])
      .then(([recipeRes, recommendRes]) => {
        setRecipe(recipeRes.data);
        setRecommendedRecipes(
          Array.isArray(recommendRes.data) ? recommendRes.data : recommendRes.data?.recipes || []
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const user = getCurrentUser();
    if (user && user.id) {
      axios
        .get(`/api/users/${user.id}/favorites`)
        .then((res) => {
          const favorites: any[] = Array.isArray(res.data) ? res.data : res.data?.favorites || [];
          const found = favorites.some((fav) => String(fav.id) === String(id) || String(fav.recipe_id) === String(id));
          setIsFavorited(found);
        })
        .catch(() => {});
    }
  }, [id, getCurrentUser]);

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleNextStep = () => {
    if (!recipe) return;
    setCurrentStep((prev) => Math.min(recipe.steps.length - 1, prev + 1));
  };

  const handleFavorite = async () => {
    const user = getCurrentUser();
    if (!user || !user.id || !id) return;

    try {
      if (isFavorited) {
        await axios.delete(`/api/recipes/${id}/favorite`, { data: { user_id: user.id } });
        setIsFavorited(false);
      } else {
        await axios.post(`/api/recipes/${id}/favorite`, { user_id: user.id });
        setIsFavorited(true);
      }
    } catch {}
  };

  const handleRate = async (score: number) => {
    const user = getCurrentUser();
    if (!user || !user.id || !id) return;

    try {
      await axios.post(`/api/recipes/${id}/rate`, { user_id: user.id, score });
      setUserRating(score);
      setRecipe((prev) => {
        if (!prev) return prev;
        const newCount = prev.rating_count + 1;
        const newAvg = (prev.avg_rating * prev.rating_count + score) / newCount;
        return { ...prev, avg_rating: Math.round(newAvg * 10) / 10, rating_count: newCount };
      });
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <ChefHat size={48} className="spin-icon" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40 }}>
        <p>菜谱不存在</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: 12 }}>
          返回
        </button>
      </div>
    );
  }

  const ingredientsList = recipe.ingredients
    ? recipe.ingredients.split(/[，,、\n]/).filter((s) => s.trim())
    : [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          fontSize: 16,
          cursor: 'pointer',
          color: '#555',
          marginBottom: 12,
          padding: 0,
        }}
      >
        <ArrowLeft size={20} />
        返回
      </button>

      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden',
          height: 400,
          marginBottom: 20,
        }}
      >
        <img
          src={resolveImageUrl(recipe.cover_image)}
          alt={recipe.title}
          style={{
            width: '100%',
            height: 400,
            objectFit: 'cover',
            display: 'block',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            padding: '24px 20px 16px',
          }}
        >
          <h1 style={{ color: '#fff', margin: 0, fontSize: 24, marginBottom: 8 }}>{recipe.title}</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {recipe.taste_tags.map((tag, i) => (
              <span
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.25)',
                  color: '#fff',
                  padding: '2px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ color: '#888', fontSize: 14 }}>作者：</span>
          <span style={{ fontWeight: 500 }}>{recipe.author}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Star size={18} fill="#f5a623" color="#f5a623" />
          <span style={{ fontWeight: 600 }}>{recipe.avg_rating.toFixed(1)}</span>
          <span style={{ color: '#999', fontSize: 13 }}>({recipe.rating_count}人评分)</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>食材用料</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}
        >
          {ingredientsList.map((item, i) => (
            <div key={i} style={{ fontSize: 14, color: '#444', padding: '4px 0' }}>
              {item.trim()}
            </div>
          ))}
        </div>
      </div>

      {recipe.steps.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>做法步骤</h2>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              style={{
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                opacity: currentStep === 0 ? 0.4 : 1,
                padding: 0,
              }}
            >
              <ChevronLeft size={20} />
            </button>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: '#ff6b35',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  lineHeight: '28px',
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                {currentStep + 1}
              </span>
              <p style={{ margin: '8px 0 12px', fontSize: 15, lineHeight: 1.6, color: '#333' }}>
                {recipe.steps[currentStep].description}
              </p>
              {recipe.steps[currentStep].image && (
                <img
                  key={currentStep}
                  src={resolveImageUrl(recipe.steps[currentStep].image)}
                  alt={`步骤${currentStep + 1}`}
                  className="step-image"
                  style={{
                    width: '100%',
                    maxHeight: 300,
                    objectFit: 'cover',
                    borderRadius: 8,
                    transition: 'opacity 0.4s ease',
                  }}
                />
              )}
            </div>

            <button
              onClick={handleNextStep}
              disabled={currentStep === recipe.steps.length - 1}
              style={{
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentStep === recipe.steps.length - 1 ? 'not-allowed' : 'pointer',
                opacity: currentStep === recipe.steps.length - 1 ? 0.4 : 1,
                padding: 0,
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
            {recipe.steps.map((_, i) => (
              <span
                key={i}
                onClick={() => setCurrentStep(i)}
                style={{
                  width: currentStep === i ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: currentStep === i ? '#ff6b35' : '#ddd',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  display: 'inline-block',
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24 }}>
        <button
          onClick={handleFavorite}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: 15,
            color: isFavorited ? '#e53e3e' : '#555',
            transition: 'all 0.2s',
          }}
        >
          <Heart size={20} fill={isFavorited ? '#e53e3e' : 'none'} color={isFavorited ? '#e53e3e' : '#555'} />
          {isFavorited ? '已收藏' : '收藏'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={24}
              fill={star <= userRating ? '#f5a623' : 'none'}
              color={star <= userRating ? '#f5a623' : '#ddd'}
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => handleRate(star)}
            />
          ))}
          {userRating > 0 && (
            <span style={{ marginLeft: 8, fontSize: 13, color: '#999' }}>我的评分: {userRating}分</span>
          )}
        </div>
      </div>

      {recommendedRecipes.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>相似推荐</h2>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
            {recommendedRecipes.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                onClick={() => navigate(`/recipe/${rec.id}`)}
                style={{
                  flex: '0 0 auto',
                  width: 'calc(33.333% - 8px)',
                  minWidth: 180,
                  borderRadius: 8,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid #eee',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <img
                  src={resolveImageUrl(rec.cover_image)}
                  alt={rec.title}
                  style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                />
                <div style={{ padding: 8 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rec.title}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 4 }}>
                    <Star size={12} fill="#f5a623" color="#f5a623" />
                    <span style={{ fontSize: 12, color: '#999' }}>{rec.avg_rating?.toFixed(1) ?? '-'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
