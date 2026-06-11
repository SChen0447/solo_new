import axios from 'axios';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Flame, Leaf, Droplets, ChefHat, Star } from 'lucide-react';

interface Recipe {
  id: number;
  title: string;
  cover_image: string;
  taste_tags: string[];
  avg_rating: number;
  rating_count: number;
  author: string;
}

const TASTE_TAGS = ['酸甜', '麻辣', '清淡', '香辣', '鲜咸', '甜点'];

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (selectedTag) params.set('tag', selectedTag);
    axios
      .get<Recipe[]>(`/api/recipes?${params.toString()}`)
      .then((res) => setRecipes(res.data))
      .catch(() => setRecipes([]));
  }, [keyword, selectedTag]);

  const renderStars = (rating: number) => {
    const full = Math.round(rating);
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={14}
            fill={i < full ? '#f97316' : 'none'}
            stroke={i < full ? '#f97316' : '#d1d5db'}
          />
        ))}
      </span>
    );
  };

  const resolveImage = (cover_image: string) =>
    cover_image.startsWith('http') ? cover_image : `/uploads/${cover_image}`;

  return (
    <div>
      <section
        style={{
          background: 'linear-gradient(135deg, #f97316 0%, #fed7aa 50%, #fff7ed 100%)',
          padding: '60px 20px 50px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 36,
            fontWeight: 700,
            color: '#7c2d12',
            marginBottom: 12,
          }}
        >
          发现美味食谱
        </h1>
        <p style={{ fontSize: 16, color: '#9a3412', opacity: 0.85 }}>
          探索万千风味，分享你的拿手好菜
        </p>
      </section>

      <section style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 0' }}>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
            }}
          />
          <input
            className="input"
            placeholder="搜索食谱名称..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 40,
              borderRadius: 24,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {TASTE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
              style={{
                border: 'none',
                borderRadius: 20,
                padding: '6px 16px',
                fontSize: 13,
                cursor: 'pointer',
                background: selectedTag === tag ? '#f97316' : '#f3f4f6',
                color: selectedTag === tag ? '#fff' : '#374151',
                transition: 'all 0.2s',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 960, margin: '0 auto', padding: '16px 20px 40px' }}>
        {recipes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            <ChefHat size={48} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 16 }}>暂无食谱，快来分享你的拿手好菜吧！</p>
          </div>
        ) : (
          <div className="grid-3">
            {recipes.map((recipe) => (
              <Link
                key={recipe.id}
                to={`/recipe/${recipe.id}`}
                className="card fade-in"
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <img
                  src={resolveImage(recipe.cover_image)}
                  alt={recipe.title}
                  style={{
                    width: '100%',
                    height: 200,
                    objectFit: 'cover',
                    borderRadius: '12px 12px 0 0',
                    display: 'block',
                  }}
                />
                <div style={{ padding: 14 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                    {recipe.title}
                  </h3>
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                    by {recipe.author}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {recipe.taste_tags.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      color: '#6b7280',
                    }}
                  >
                    {renderStars(recipe.avg_rating)}
                    <span>({recipe.rating_count})</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
