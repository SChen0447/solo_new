import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipeStore } from '../store/recipeStore';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useRecipeStore();
  const [recipeId, setRecipeId] = React.useState('');

  const handleJoin = () => {
    if (recipeId.trim()) {
      navigate(`/recipe/${recipeId.trim()}`);
    }
  };

  const handleCreate = () => {
    const randomId = Math.random().toString(36).substring(2, 10);
    navigate(`/recipe/${randomId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  const sampleRecipes = [
    { id: 'hongshao-rou', name: '红烧肉', desc: '经典家常菜' },
    { id: 'gongbao-jiding', name: '宫保鸡丁', desc: '麻辣鲜香' },
    { id: 'xihongshi-jidan', name: '西红柿炒鸡蛋', desc: '快手美味' },
  ];

  return (
    <div className={`home-page ${isDarkMode ? 'dark' : ''}`}>
      <header className="home-header">
        <div className="header-content">
          <h1 className="logo">🍳 食谱协作</h1>
          <button
            className="theme-toggle-btn"
            onClick={toggleDarkMode}
            title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="home-main">
        <div className="hero-section">
          <h2>一起烹饪，更有乐趣</h2>
          <p>多人实时协作编辑食谱，同步烹饪计时器，让做饭变成团队活动</p>
        </div>

        <div className="action-section">
          <div className="input-group">
            <input
              type="text"
              placeholder="输入食谱ID加入协作"
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
              onKeyDown={handleKeyDown}
              className="recipe-input"
            />
            <button className="join-btn" onClick={handleJoin}>
              加入
            </button>
          </div>

          <div className="divider">
            <span>或者</span>
          </div>

          <button className="create-btn" onClick={handleCreate}>
            🎨 创建新食谱
          </button>
        </div>

        <div className="sample-section">
          <h3>示例食谱</h3>
          <div className="sample-grid">
            {sampleRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="sample-card"
                onClick={() => navigate(`/recipe/${recipe.id}`)}
              >
                <div className="sample-icon">🍲</div>
                <h4>{recipe.name}</h4>
                <p>{recipe.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="features-section">
          <h3>功能特色</h3>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">✏️</div>
              <h4>实时协作编辑</h4>
              <p>多人同时编辑食谱内容，实时光标显示协作者位置</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">⏱️</div>
              <h4>同步计时器</h4>
              <p>每个步骤独立计时，所有协作者同步倒计时</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🥗</div>
              <h4>食材清单</h4>
              <p>实时同步的食材清单，添加删除一目了然</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📜</div>
              <h4>版本历史</h4>
              <p>自动保存编辑历史，随时恢复任意版本</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="home-footer">
        <p>© 2024 食谱协作 - 让烹饪更有乐趣</p>
      </footer>

      <style>{`
        .home-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #fdf5e6;
          transition: background-color 0.5s ease;
        }

        .home-page.dark {
          background-color: #1a1a1a;
          color: #e0e0e0;
        }

        .home-header {
          background-color: #795548;
          color: white;
          padding: 0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: background-color 0.5s ease;
        }

        .dark .home-header {
          background-color: #3e2723;
        }

        .header-content {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 20px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          font-size: 20px;
          margin: 0;
          font-weight: bold;
        }

        .theme-toggle-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          font-size: 18px;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .theme-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        .home-main {
          flex: 1;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          width: 100%;
          box-sizing: border-box;
        }

        .hero-section {
          text-align: center;
          margin-bottom: 40px;
        }

        .hero-section h2 {
          font-size: 36px;
          margin-bottom: 12px;
          color: #5d4037;
        }

        .dark .hero-section h2 {
          color: #e0e0e0;
        }

        .hero-section p {
          font-size: 16px;
          color: #888;
        }

        .action-section {
          background-color: white;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          margin-bottom: 40px;
        }

        .dark .action-section {
          background-color: #2a2a2a;
        }

        .input-group {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .recipe-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #d7ccc8;
          border-radius: 8px;
          font-size: 16px;
          background-color: #fafafa;
          transition: border-color 0.2s;
        }

        .dark .recipe-input {
          background-color: #333;
          color: #e0e0e0;
          border-color: #555;
        }

        .recipe-input:focus {
          outline: none;
          border-color: #795548;
        }

        .join-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          background-color: #795548;
          color: white;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .join-btn:hover {
          background-color: #5d4037;
        }

        .divider {
          text-align: center;
          margin: 20px 0;
          position: relative;
        }

        .divider::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 1px;
          background-color: #e0e0e0;
        }

        .dark .divider::before {
          background-color: #444;
        }

        .divider span {
          background-color: white;
          padding: 0 16px;
          color: #999;
          font-size: 14px;
          position: relative;
        }

        .dark .divider span {
          background-color: #2a2a2a;
        }

        .create-btn {
          width: 100%;
          padding: 14px 24px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #ff9800, #f57c00);
          color: white;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .create-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
        }

        .sample-section {
          margin-bottom: 40px;
        }

        .sample-section h3 {
          font-size: 20px;
          margin-bottom: 16px;
          color: #5d4037;
        }

        .dark .sample-section h3 {
          color: #e0e0e0;
        }

        .sample-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .sample-card {
          background-color: white;
          border-radius: 10px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
        }

        .dark .sample-card {
          background-color: #2a2a2a;
        }

        .sample-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .sample-icon {
          font-size: 40px;
          margin-bottom: 8px;
        }

        .sample-card h4 {
          margin: 8px 0 4px;
          font-size: 16px;
          color: #5d4037;
        }

        .dark .sample-card h4 {
          color: #e0e0e0;
        }

        .sample-card p {
          font-size: 13px;
          color: #999;
          margin: 0;
        }

        .features-section {
          margin-bottom: 40px;
        }

        .features-section h3 {
          font-size: 20px;
          margin-bottom: 16px;
          color: #5d4037;
        }

        .dark .features-section h3 {
          color: #e0e0e0;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .feature-item {
          background-color: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
        }

        .dark .feature-item {
          background-color: #2a2a2a;
        }

        .feature-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .feature-item h4 {
          margin: 8px 0 6px;
          font-size: 15px;
          color: #5d4037;
        }

        .dark .feature-item h4 {
          color: #e0e0e0;
        }

        .feature-item p {
          font-size: 13px;
          color: #888;
          margin: 0;
          line-height: 1.5;
        }

        .home-footer {
          text-align: center;
          padding: 20px;
          color: #999;
          font-size: 13px;
        }

        @media (max-width: 768px) {
          .hero-section h2 {
            font-size: 28px;
          }

          .sample-grid {
            grid-template-columns: 1fr;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .input-group {
            flex-direction: column;
          }

          .join-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
