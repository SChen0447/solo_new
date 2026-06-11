import axios from 'axios';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Star, Trash2 } from 'lucide-react';

interface Recipe {
  id: number;
  title: string;
  cover_image: string;
  taste_tags: string[];
  avg_rating: number;
  rating_count: number;
  author: string;
}

export default function MyFavorites() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    axios.get(`/api/users/${user.id}/favorites`)
      .then(res => setFavorites(res.data))
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, []);

  const handleUnfavorite = async (recipeId: number) => {
    try {
      await axios.delete(`/api/recipe/${recipeId}/favorite`, {
        data: { user_id: user.id }
      });
      setFavorites(prev => prev.filter(r => r.id !== recipeId));
    } catch {}
  };

  const getImageUrl = (img: string) => {
    if (!img) return '';
    return img.startsWith('http') ? img : `/uploads/${img}`;
  };

  if (!user) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{
        fontFamily: '"Noto Serif SC", serif',
        textAlign: 'center',
        marginBottom: '2rem',
        fontSize: '2rem',
        color: '#333'
      }}>
        我的收藏
      </h1>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#999' }}>加载中...</p>
      ) : favorites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#999' }}>
          <Heart size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <p style={{ fontSize: '1.1rem' }}>还没有收藏任何食谱</p>
        </div>
      ) : (
        <div className="grid-3">
          {favorites.map(recipe => (
            <div key={recipe.id} className="card fade-in">
              <Link to={`/recipe/${recipe.id}`}>
                <img
                  src={getImageUrl(recipe.cover_image)}
                  alt={recipe.title}
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
                />
              </Link>
              <div style={{ padding: '1rem' }}>
                <Link to={`/recipe/${recipe.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{recipe.title}</h3>
                </Link>
                <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 0.5rem' }}>
                  by {recipe.author}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  {recipe.taste_tags && recipe.taste_tags.map((tag, i) => (
                    <span key={i} style={{
                      background: '#fff3e0',
                      color: '#e65100',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#f9a825', fontSize: '0.9rem' }}>
                  <Star size={14} fill="#f9a825" />
                  <span>{recipe.avg_rating?.toFixed(1) || '0.0'}</span>
                  <span style={{ color: '#999', fontSize: '0.8rem' }}>({recipe.rating_count || 0})</span>
                </div>
              </div>
              <button
                onClick={() => handleUnfavorite(recipe.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  width: 'calc(100% - 2rem)',
                  margin: '0 1rem 1rem',
                  padding: '0.5rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  background: '#fff',
                  color: '#e53935',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <Heart size={16} />
                取消收藏
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
