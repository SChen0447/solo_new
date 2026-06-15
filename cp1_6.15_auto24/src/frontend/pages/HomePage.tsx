import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, Sparkles } from 'lucide-react';
import { useStore, SearchResult } from '../store/useStore';
import { createRipple } from '../App';

const INGREDIENT_DICT: { name: string; pinyin: string }[] = [
  { name: '番茄', pinyin: 'FQ' }, { name: '鸡蛋', pinyin: 'JD' },
  { name: '葱花', pinyin: 'CH' }, { name: '盐', pinyin: 'Y' },
  { name: '糖', pinyin: 'T' }, { name: '食用油', pinyin: 'SYY' },
  { name: '鸡胸肉', pinyin: 'JXR' }, { name: '花生', pinyin: 'HS' },
  { name: '干辣椒', pinyin: 'GLJ' }, { name: '花椒', pinyin: 'HJ' },
  { name: '葱', pinyin: 'C' }, { name: '姜', pinyin: 'J' },
  { name: '蒜', pinyin: 'S' }, { name: '生抽', pinyin: 'SC' },
  { name: '醋', pinyin: 'C' }, { name: '五花肉', pinyin: 'WHR' },
  { name: '冰糖', pinyin: 'BT' }, { name: '老抽', pinyin: 'LC' },
  { name: '料酒', pinyin: 'LJ' }, { name: '八角', pinyin: 'BJ' },
  { name: '桂皮', pinyin: 'GP' }, { name: '豆腐', pinyin: 'DF' },
  { name: '猪肉末', pinyin: 'ZRM' }, { name: '豆瓣酱', pinyin: 'DBJ' },
  { name: '花椒粉', pinyin: 'HJF' }, { name: '辣椒粉', pinyin: 'LJF' },
  { name: '蒜末', pinyin: 'SM' }, { name: '西兰花', pinyin: 'XLH' },
  { name: '大蒜', pinyin: 'DS' }, { name: '猪里脊', pinyin: 'ZLJ' },
  { name: '番茄酱', pinyin: 'FQJ' }, { name: '淀粉', pinyin: 'DF' },
  { name: '土豆', pinyin: 'TD' }, { name: '青椒', pinyin: 'QJ' },
  { name: '胡萝卜', pinyin: 'HLB' }, { name: '木耳', pinyin: 'ME' },
  { name: '鸡翅中', pinyin: 'JCZ' }, { name: '可乐', pinyin: 'KL' },
  { name: '紫菜', pinyin: 'ZC' }, { name: '虾皮', pinyin: 'XP' },
  { name: '香油', pinyin: 'XY' }, { name: '草鱼', pinyin: 'CY' },
  { name: '豆芽', pinyin: 'DY' }, { name: '猪排骨', pinyin: 'ZPG' },
  { name: '牛腩', pinyin: 'NN' }, { name: '洋葱', pinyin: 'YC' },
  { name: '豆角', pinyin: 'DJ' }, { name: '茄子', pinyin: 'QZ' },
  { name: '牛肉', pinyin: 'NR' }, { name: '大葱', pinyin: 'DC' },
  { name: '大米', pinyin: 'DM' }, { name: '皮蛋', pinyin: 'PD' },
  { name: '猪瘦肉', pinyin: 'ZSR' }, { name: '姜丝', pinyin: 'JS' },
  { name: '白胡椒粉', pinyin: 'BHJF' }, { name: '虾仁', pinyin: 'XR' },
  { name: '青豆', pinyin: 'QD' }, { name: '玉米粒', pinyin: 'YML' },
  { name: '饺子皮', pinyin: 'GZP' }, { name: '韭菜', pinyin: 'JC' },
  { name: '鸡腿肉', pinyin: 'JTR' }, { name: '咖喱块', pinyin: 'KLK' },
  { name: '椰浆', pinyin: 'YJ' }, { name: '牛奶', pinyin: 'NN' },
  { name: '扇贝', pinyin: 'SB' }, { name: '粉丝', pinyin: 'FS' },
  { name: '蒸鱼豉油', pinyin: 'ZYCY' }, { name: '鲈鱼', pinyin: 'LY' },
  { name: '奶酪', pinyin: 'NL' }, { name: '黄油', pinyin: 'HY' },
  { name: '黑胡椒粉', pinyin: 'HHJF' }, { name: '红椒', pinyin: 'HJ' },
  { name: '猪蹄', pinyin: 'ZT' }, { name: '黄豆', pinyin: 'HD' },
  { name: '面粉', pinyin: 'MF' }, { name: '蘑菇', pinyin: 'MG' },
  { name: '奶油', pinyin: 'NY' }, { name: '意面', pinyin: 'YM' },
  { name: '面条', pinyin: 'MT' }, { name: '花生酱', pinyin: 'HSJ' },
  { name: '黄瓜', pinyin: 'HG' }, { name: '黄瓜丝', pinyin: 'HGS' },
  { name: '辣椒油', pinyin: 'LLY' }, { name: '香菜', pinyin: 'XC' },
  { name: '鱼', pinyin: 'Y' }, { name: '姜片', pinyin: 'JP' },
  { name: '葱段', pinyin: 'CD' }, { name: '胡萝卜丁', pinyin: 'HLBD' },
  { name: '胡萝卜丝', pinyin: 'HLBS' }, { name: '白胡椒粉', pinyin: 'BHJF' },
];

const styles = `
.home-wrap { padding: 40px 0 60px; }
.input-section {
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow);
  margin-bottom: 32px;
}
.input-section h2 {
  font-size: 22px;
  margin-bottom: 16px;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}
.ingredient-textarea {
  display: block;
  width: 100%;
  max-width: 600px;
  height: 200px;
  margin: 0 auto 16px;
  padding: 16px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  font-size: 15px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.3s, box-shadow 0.3s;
  line-height: 1.8;
  color: var(--text);
}
.ingredient-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(255,107,53,0.1);
}
.autocomplete-panel {
  position: relative;
  max-width: 600px;
  margin: 0 auto 16px;
}
.autocomplete-list {
  position: absolute;
  top: -8px;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #eee;
  border-radius: var(--radius);
  max-height: 200px;
  overflow-y: auto;
  box-shadow: var(--shadow-hover);
  z-index: 10;
  transform: translateY(-100%);
}
.autocomplete-item {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  transition: background 0.15s;
}
.autocomplete-item:hover {
  background: #fff0e6;
  color: var(--primary);
}
.autocomplete-item .pinyin-tag {
  font-size: 11px;
  background: #fff0e6;
  color: var(--primary);
  padding: 2px 6px;
  border-radius: 4px;
}
.btn-center {
  display: flex;
  justify-content: center;
}
.tips {
  text-align: center;
  color: var(--text-light);
  font-size: 13px;
  margin-top: 12px;
}
.results-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  margin: 32px 0 20px;
  color: var(--text);
}
.results-title .count {
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  padding: 2px 10px;
  border-radius: 12px;
}
.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.recipe-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform 0.25s ease-out, box-shadow 0.25s ease-out;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid transparent;
}
.recipe-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
  border-color: #ffe0cc;
}
.recipe-card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}
.recipe-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-light);
  font-size: 13px;
}
.recipe-meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.progress-wrap {
  background: #f5e6d6;
  border-radius: 10px;
  height: 10px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  border-radius: 10px;
  width: 0;
  animation: fillBar 0.8s ease-out forwards;
}
@keyframes fillBar {
  from { width: 0; }
}
.match-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-light);
}
.match-label strong {
  color: var(--primary);
}
.error-msg {
  background: #fdecea;
  color: #c0392b;
  padding: 12px 16px;
  border-radius: var(--radius);
  margin: 16px auto 0;
  max-width: 600px;
  font-size: 14px;
  text-align: center;
}
`;

function ProgressBar({ value, delay }: { value: number; delay: number }) {
  return (
    <div
      className="progress-bar"
      style={{ animationDelay: `${delay}ms`, width: `${value}%` }}
    />
  );
}

function RecipeCard({ recipe, index }: { recipe: SearchResult; index: number }) {
  const navigate = useNavigate();
  return (
    <div
      className="recipe-card"
      onClick={() => navigate(`/recipe/${recipe.id}`)}
    >
      <div className="recipe-card-title">{recipe.name}</div>
      <div className="match-label">
        <span>食材匹配</span>
        <strong>{recipe.matchPercentage}%</strong>
      </div>
      <div className="progress-wrap">
        <ProgressBar value={recipe.matchPercentage} delay={index * 80} />
      </div>
      <div className="recipe-meta">
        <span className="recipe-meta-item">
          <Clock size={14} />
          {recipe.cookTime} 分钟
        </span>
        <span className="recipe-meta-item">
          <Sparkles size={14} />
          {recipe.matchedCount} / {recipe.totalIngredients} 食材
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { searchResults, loading, error, searchRecipes, clearError, setUserIngredients } = useStore();
  const [text, setText] = useState<string>('番茄\n鸡蛋\n葱花\n盐');
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [showSuggest, setShowSuggest] = useState(false);

  const currentLine = useMemo(() => {
    if (!taRef.current) return '';
    const val = taRef.current.value;
    const pos = taRef.current.selectionStart;
    const lines = val.split('\n');
    let acc = 0;
    for (let i = 0; i < lines.length; i++) {
      acc += lines[i].length + 1;
      if (acc > pos) return lines[i].trim();
    }
    return '';
  }, [text, activeIdx]);

  const suggestions = useMemo(() => {
    const q = currentLine.trim();
    if (!q) return [];
    const isAscii = /^[a-zA-Z]+$/.test(q);
    const upper = q.toUpperCase();
    return INGREDIENT_DICT.filter((it) =>
      isAscii ? it.pinyin.startsWith(upper) : it.name.startsWith(q)
    ).slice(0, 6);
  }, [currentLine]);

  useEffect(() => {
    setShowSuggest(suggestions.length > 0 && !!currentLine.trim());
  }, [suggestions, currentLine]);

  function handleSelect(ing: string) {
    if (!taRef.current) return;
    const val = taRef.current.value;
    const pos = taRef.current.selectionStart;
    const before = val.slice(0, pos);
    const after = val.slice(pos);
    const lastNL = before.lastIndexOf('\n');
    const newBefore = lastNL === -1 ? '' : before.slice(0, lastNL + 1);
    setText(newBefore + ing + after);
    setShowSuggest(false);
    setTimeout(() => taRef.current?.focus(), 0);
  }

  function handleClickSearch(e: React.MouseEvent<HTMLButtonElement>) {
    createRipple(e);
    const ings = text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    setUserIngredients(ings);
    if (ings.length === 0) return;
    clearError();
    searchRecipes(ings);
  }

  return (
    <div className="home-wrap">
      <style>{styles}</style>
      <div className="container">
        <div className="page-header">
          <h1>🍳 今天用什么做菜？</h1>
          <p>输入你手头的食材，每行一种，系统自动为你匹配可行菜谱</p>
        </div>
        <div className="input-section">
          <h2>
            <span>🥕</span>
            食材清单
          </h2>
          <div className="autocomplete-panel">
            <textarea
              ref={taRef}
              className="ingredient-textarea"
              value={text}
              placeholder={'例如：\n番茄\n鸡蛋\n葱花\n盐\n\n支持拼音首字母快速查找（输入 FQ 自动提示番茄）'}
              onChange={(e) => setText(e.target.value)}
              onKeyUp={() => setActiveIdx((x) => x + 1)}
            />
            {showSuggest && (
              <div className="autocomplete-list">
                {suggestions.map((s) => (
                  <div
                    key={s.name + s.pinyin}
                    className="autocomplete-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(s.name);
                    }}
                  >
                    <span>{s.name}</span>
                    <span className="pinyin-tag">{s.pinyin}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="btn-center">
            <button className="btn-primary" onClick={handleClickSearch} disabled={loading}>
              {loading ? (
                <>
                  <span className="loading" /> 匹配中...
                </>
              ) : (
                <>
                  <Search size={18} /> 搜索菜谱
                </>
              )}
            </button>
          </div>
          <div className="tips">
            提示：输入越多食材，匹配越精准。至少匹配 3 种食材才会返回结果。
          </div>
          {error && <div className="error-msg">{error}</div>}
        </div>

        {searchResults.length > 0 && (
          <>
            <div className="results-title">
              匹配结果
              <span className="count">{searchResults.length}</span>
            </div>
            <div className="recipe-grid">
              {searchResults.map((r, i) => (
                <RecipeCard key={r.id} recipe={r} index={i} />
              ))}
            </div>
          </>
        )}

        {!loading && searchResults.length === 0 && !error && (
          <div className="empty">
            <div className="empty-icon">🍽️</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              还没有搜索结果
            </div>
            <div style={{ fontSize: 13 }}>在上方输入你的食材，开始探索美味吧</div>
          </div>
        )}
      </div>
    </div>
  );
}
