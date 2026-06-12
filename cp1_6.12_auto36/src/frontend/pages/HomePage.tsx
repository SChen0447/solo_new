import { useState, useEffect } from 'react';
import { FormTemplate } from '../../shared/types';

interface TemplateWithCount extends FormTemplate {
  responseCount: number;
}

interface HomePageProps {
  onEdit: (id: string) => void;
  onViewData: (id: string) => void;
  onPreview: (id: string) => void;
}

export default function HomePage({ onEdit, onViewData, onPreview }: HomePageProps) {
  const [templates, setTemplates] = useState<TemplateWithCount[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'responses'>('newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(data);
    } catch (e) {
      console.error('Failed to load templates', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = templates
    .filter((t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'responses':
          return b.responseCount - a.responseCount;
      }
    });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h2>我的问卷</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            {templates.length} 个问卷模板 · 共收集 {templates.reduce((s, t) => s + t.responseCount, 0)} 份响应
          </p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            placeholder="搜索问卷标题或描述..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
        >
          <option value="newest">按创建时间（最新）</option>
          <option value="oldest">按创建时间（最早）</option>
          <option value="responses">按响应数量</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>{search ? '没有匹配的问卷' : '还没有创建问卷'}</h3>
          <p style={{ marginTop: 8 }}>点击右上角"新建问卷"按钮开始创建</p>
        </div>
      ) : (
        <div className="template-grid">
          {filtered.map((t) => (
            <div key={t.id} className="template-card">
              <div className="template-card-title">{t.title}</div>
              <div className="template-card-desc">
                {t.description || '暂无描述'}
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <span className="badge badge-primary">{t.questions.length} 个问题</span>
                <span className="badge badge-primary">{t.responseCount} 份响应</span>
              </div>
              <div className="template-card-meta">
                <span>创建于 {formatDate(t.createdAt)}</span>
              </div>
              <div className="template-card-actions">
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                  onClick={(e) => { e.stopPropagation(); onEdit(t.id); }}
                >
                  ✏️ 编辑
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                  onClick={(e) => { e.stopPropagation(); onPreview(t.id); }}
                >
                  👁 预览
                </button>
                <button
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                  onClick={(e) => { e.stopPropagation(); onViewData(t.id); }}
                >
                  📊 数据
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
