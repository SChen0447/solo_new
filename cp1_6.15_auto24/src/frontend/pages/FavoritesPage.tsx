import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpDown,
  Star,
  Trash2,
  Edit3,
  Check,
  X,
  ChefHat,
} from 'lucide-react';
import { useStore, Favorite } from '../store/useStore';

const styles = `
.fav-wrap { padding: 40px 0 60px; }
.sort-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.sort-bar-label {
  font-size: 14px;
  color: var(--text-light);
}
.sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius);
  border: 1px solid #e0d5c6;
  background: #fff;
  color: var(--text);
  font-size: 13px;
  transition: all var(--transition);
  position: relative;
  overflow: hidden;
}
.sort-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.sort-btn.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.table-wrap {
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
}
table {
  width: 100%;
  border-collapse: collapse;
}
thead {
  background: linear-gradient(90deg, #fff0e2, #ffe0c8);
}
th {
  text-align: left;
  padding: 14px 18px;
  font-size: 13px;
  color: #7a4a1e;
  font-weight: 600;
  border-bottom: 2px solid #ffd4a8;
  white-space: nowrap;
}
td {
  padding: 14px 18px;
  font-size: 14px;
  border-bottom: 1px solid #f5ecdf;
  vertical-align: top;
}
tbody tr {
  transition: background 0.2s;
  cursor: pointer;
}
tbody tr:nth-child(even) { background: #fffaf3; }
tbody tr:hover { background: #fff0e2; }
.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  color: var(--text);
}
.time-cell {
  color: var(--text-light);
  font-size: 13px;
  white-space: nowrap;
}

.stars { display: inline-flex; gap: 3px; }
.star-btn {
  background: transparent;
  padding: 2px;
  transition: transform 0.2s ease-out;
  border-radius: 4px;
  display: inline-flex;
}
.star-btn:hover { transform: scale(1.25); }

.note-cell {
  min-width: 260px;
}
.note-display {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}
.note-display:hover {
  background: #fff5e8;
}
.note-text {
  flex: 1;
  color: var(--text);
  min-height: 24px;
  line-height: 1.5;
}
.note-placeholder {
  color: #bbb;
  font-style: italic;
}
.note-edit {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.note-edit textarea {
  width: 100%;
  min-height: 70px;
  padding: 8px 10px;
  border: 2px solid #ffd4a8;
  border-radius: 6px;
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.note-edit textarea:focus {
  border-color: var(--primary);
}
.note-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.icon-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  transition: all 0.2s;
  background: transparent;
  gap: 4px;
}
.icon-btn.primary {
  background: var(--primary);
  color: #fff;
}
.icon-btn.primary:hover { background: var(--primary-hover); }
.icon-btn.ghost {
  background: #f3ece0;
  color: var(--text);
}
.icon-btn.ghost:hover { background: #e6dcce; }
.icon-btn.danger:hover {
  background: #fdecea;
  color: var(--danger);
}
.del-btn {
  opacity: 0.5;
  transition: all 0.2s;
}
tr:hover .del-btn { opacity: 1; }
.del-btn:hover {
  color: var(--danger);
  background: #fdecea;
}

.empty-fav {
  padding: 80px 24px;
  text-align: center;
}
.empty-fav-icon { font-size: 64px; opacity: 0.4; margin-bottom: 16px; }
.empty-fav h3 { font-size: 18px; color: var(--text); margin-bottom: 6px; }
.empty-fav p { font-size: 14px; color: var(--text-light); margin-bottom: 20px; }

.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 640px) {
  th, td { padding: 10px 12px; font-size: 13px; }
  .note-cell { min-width: 200px; }
}
`;

type SortKey = 'name' | 'addedAt';
type SortDir = 'asc' | 'desc';

function RatingStars({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: 0 | 1 | 2 | 3 | 4 | 5) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div
      className="stars"
      onMouseLeave={() => setHover(0)}
      onClick={(e) => e.stopPropagation()}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover || value) >= n;
        return (
          <button
            key={n}
            className="star-btn"
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n as 0 | 1 | 2 | 3 | 4 | 5)}
            style={{ color: filled ? '#f1c40f' : '#ddd' }}
            aria-label={`${n}星`}
          >
            <Star size={18} fill={filled ? '#f1c40f' : 'none'} />
          </button>
        );
      })}
    </div>
  );
}

export default function FavoritesPage() {
  const { favorites, updateFavorite, removeFavorite } = useStore();
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('addedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState('');

  const sorted = useMemo(() => {
    const arr = [...favorites];
    arr.sort((a, b) => {
      let r = 0;
      if (sortKey === 'name') {
        r = a.recipeName.localeCompare(b.recipeName, 'zh-Hans-CN');
      } else {
        r = a.addedAt - b.addedAt;
      }
      return sortDir === 'asc' ? r : -r;
    });
    return arr;
  }, [favorites, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function formatDate(ts: number) {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function startEdit(f: Favorite, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(f.id);
    setDraftNote(f.note);
  }

  function saveEdit(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    updateFavorite(id, { note: draftNote });
    setEditingId(null);
  }

  function cancelEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(null);
  }

  function handleDelete(recipeId: string, recipeName: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm(`确定要从收藏夹中移除「${recipeName}」吗？`)) {
      removeFavorite(recipeId);
    }
  }

  return (
    <div className="fav-wrap">
      <style>{styles}</style>
      <div className="container">
        <div className="page-header">
          <h1>⭐ 我的收藏夹</h1>
          <p>珍藏你喜欢的菜谱，随时查看与回味</p>
        </div>

        {favorites.length === 0 ? (
          <div className="empty-fav card">
            <div className="empty-fav-icon">📭</div>
            <h3>收藏夹还是空的</h3>
            <p>浏览菜谱时，点击星星图标就能添加到这里</p>
            <button
              className="btn-primary"
              onClick={(e) => {
                const btn = e.currentTarget;
                const circle = document.createElement('span');
                const d = Math.max(btn.clientWidth, btn.clientHeight);
                const r = d / 2;
                circle.style.width = circle.style.height = `${d}px`;
                circle.style.left = `${e.clientX - btn.getBoundingClientRect().left - r}px`;
                circle.style.top = `${e.clientY - btn.getBoundingClientRect().top - r}px`;
                circle.classList.add('ripple');
                btn.appendChild(circle);
                setTimeout(() => circle.remove(), 500);
                navigate('/');
              }}
            >
              <ChefHat size={18} /> 去发现菜谱
            </button>
          </div>
        ) : (
          <>
            <div className="sort-bar">
              <span className="sort-bar-label">排序方式：</span>
              <button
                className={`sort-btn${sortKey === 'name' ? ' active' : ''}`}
                onClick={() => toggleSort('name')}
              >
                <ArrowUpDown size={14} />
                菜名首字母
                {sortKey === 'name' && (
                  <span style={{ marginLeft: 4 }}>
                    {sortDir === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
              <button
                className={`sort-btn${sortKey === 'addedAt' ? ' active' : ''}`}
                onClick={() => toggleSort('addedAt')}
              >
                <ArrowUpDown size={14} />
                收藏时间
                {sortKey === 'addedAt' && (
                  <span style={{ marginLeft: 4 }}>
                    {sortDir === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
              <span
                style={{ marginLeft: 'auto', color: 'var(--text-light)', fontSize: 13 }}
              >
                共 {favorites.length} 道菜谱
              </span>
            </div>

            <div className="table-wrap table-scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>菜名</th>
                    <th style={{ width: '18%' }}>收藏时间</th>
                    <th style={{ width: '18%' }}>我的评分</th>
                    <th>备注</th>
                    <th style={{ width: 80 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((f) => (
                    <tr key={f.id} onClick={() => navigate(`/recipe/${f.recipeId}`)}>
                      <td>
                        <div className="name-cell">
                          <span style={{ fontSize: 22 }}>🍽️</span>
                          <span>{f.recipeName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="time-cell">{formatDate(f.addedAt)}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <RatingStars
                          value={f.rating}
                          onChange={(v) => updateFavorite(f.id, { rating: v })}
                        />
                      </td>
                      <td className="note-cell" onClick={(e) => e.stopPropagation()}>
                        {editingId === f.id ? (
                          <div className="note-edit">
                            <textarea
                              value={draftNote}
                              onChange={(e) => setDraftNote(e.target.value)}
                              placeholder="写下这道菜的心得、调整建议..."
                              autoFocus
                            />
                            <div className="note-actions">
                              <button
                                className="icon-btn ghost"
                                onClick={cancelEdit}
                              >
                                <X size={14} /> 取消
                              </button>
                              <button
                                className="icon-btn primary"
                                onClick={(e) => saveEdit(f.id, e)}
                              >
                                <Check size={14} /> 保存
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="note-display"
                            onClick={(e) => startEdit(f, e)}
                            title="点击编辑备注"
                          >
                            <span className="note-text">
                              {f.note ? (
                                f.note
                              ) : (
                                <span className="note-placeholder">
                                  点击添加备注...
                                </span>
                              )}
                            </span>
                            <Edit3 size={14} style={{ color: '#bbb', flexShrink: 0 }} />
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          className="icon-btn del-btn"
                          onClick={(e) => handleDelete(f.recipeId, f.recipeName, e)}
                          title="移除收藏"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
