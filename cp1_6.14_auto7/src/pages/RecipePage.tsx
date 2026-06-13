import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { recipes } from '@/data/recipes';
import { RecipeDetail } from '@/components/RecipeDetail';

export const RecipePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const recipe = recipes.find((r) => r.id === Number(id));

  if (!recipe) {
    return (
      <div className="app-container">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>菜谱不存在</h2>
          <p style={{ marginTop: '12px', color: '#7a7a7a' }}>
            你访问的菜谱可能已被删除或不存在
          </p>
          <Link
            to="/"
            style={{
              display: 'inline-block',
              marginTop: '24px',
              padding: '10px 24px',
              background: '#ff7f50',
              color: 'white',
              borderRadius: '999px',
            }}
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ paddingTop: '20px' }}>
      <button
        className="back-btn"
        onClick={() => navigate(-1)}
        style={{ position: 'sticky', top: '20px', zIndex: 10, marginBottom: '16px' }}
      >
        ←
      </button>
      <RecipeDetail recipe={recipe} />
    </div>
  );
};
