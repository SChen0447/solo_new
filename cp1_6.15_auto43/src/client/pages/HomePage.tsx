import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

const TAGS = [
  { key: '产品设计', icon: '🎨', color: '#667eea' },
  { key: '营销创意', icon: '📢', color: '#f56565' },
  { key: '技术方案', icon: '⚙️', color: '#48bb78' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { topics, selectedTag, loading, fetchTopics, createTopic, setSelectedTag } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', tags: [] as string[] });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchTopics();
  }, [selectedTag]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    await createTopic({ title: form.title, description: form.description, tags: form.tags });
    setShowModal(false);
    setForm({ title: '', description: '', tags: [] });
    fetchTopics();
  };

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const tagCounts = TAGS.map((t) => ({
    ...t,
    count: topics.filter((tp) => tp.tags.includes(t.key)).length,
  }));
  const allCount = topics.length;
  const activeCount = topics.filter((t) => t.status === 'active').length;

  const filteredTopics = selectedTag
    ? topics.filter((t) => t.tags.includes(selectedTag))
    : topics;

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '…' : text;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 767px) {
          .sidebar { display: none !important; }
          .mobile-tabs { display: flex !important; }
          .content-area { margin-left: 0 !important; }
        }
      `}</style>

      <aside
        className="sidebar"
        style={{
          width: 260,
          minHeight: '100vh',
          background: '#2d3748',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          padding: '24px 16px',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          overflowY: 'auto',
          zIndex: 20,
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#667eea', marginBottom: 4 }}>
            💡 脑暴投票
          </h1>
          <p style={{ fontSize: 12, color: '#a0aec0' }}>创意碰撞，智慧投票</p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div
            onClick={() => setSelectedTag(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 10,
              cursor: 'pointer',
              background: selectedTag === null ? 'rgba(102,126,234,0.15)' : 'transparent',
              color: selectedTag === null ? '#667eea' : '#a0aec0',
              transition: 'all 0.2s',
              marginBottom: 4,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📋</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>全部话题</span>
            </span>
            <span
              style={{
                background: selectedTag === null ? '#667eea' : '#4a5568',
                color: '#fff',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 10,
                fontWeight: 600,
              }}
            >
              {allCount}
            </span>
          </div>

          {tagCounts.map((tag) => (
            <div
              key={tag.key}
              onClick={() => setSelectedTag(selectedTag === tag.key ? null : tag.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 10,
                cursor: 'pointer',
                background: selectedTag === tag.key ? 'rgba(102,126,234,0.15)' : 'transparent',
                color: selectedTag === tag.key ? '#667eea' : '#a0aec0',
                transition: 'all 0.2s',
                marginBottom: 4,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{tag.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{tag.key}</span>
              </span>
              <span
                style={{
                  background: selectedTag === tag.key ? '#667eea' : '#4a5568',
                  color: '#fff',
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                {tag.count}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: '12px',
            background: 'rgba(102,126,234,0.1)',
            borderRadius: 12,
            border: '1px solid rgba(102,126,234,0.2)',
          }}
        >
          <div style={{ fontSize: 12, color: '#a0aec0', marginBottom: 8 }}>进行中的话题</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#667eea' }}>{activeCount}</div>
        </div>
      </aside>

      <div
        className="mobile-tabs"
        style={{
          display: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: '#2d3748',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 12px',
          gap: 8,
          overflowX: 'auto',
        }}
      >
        <div
          onClick={() => setSelectedTag(null)}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: selectedTag === null ? '#667eea' : 'rgba(255,255,255,0.05)',
            color: selectedTag === null ? '#fff' : '#a0aec0',
          }}
        >
          全部
        </div>
        {tagCounts.map((tag) => (
          <div
            key={tag.key}
            onClick={() => setSelectedTag(selectedTag === tag.key ? null : tag.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: selectedTag === tag.key ? '#667eea' : 'rgba(255,255,255,0.05)',
              color: selectedTag === tag.key ? '#fff' : '#a0aec0',
            }}
          >
            {tag.icon} {tag.key}
          </div>
        ))}
      </div>

      <main
        className="content-area"
        style={{
          marginLeft: 260,
          flex: 1,
          padding: '24px 32px',
          maxWidth: 1100,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 28,
          }}
        >
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
              {selectedTag ? `${selectedTag}话题` : '全部话题'}
            </h2>
            <p style={{ fontSize: 14, color: '#718096' }}>
              {filteredTopics.length} 个话题 · {activeCount} 个进行中
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => setShowModal(true)}
            style={{
              padding: '12px 24px',
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>+</span> 新建话题
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#718096' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            加载中...
          </div>
        ) : filteredTopics.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#718096' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💭</div>
            <p style={{ fontSize: 16, marginBottom: 8 }}>还没有话题</p>
            <p style={{ fontSize: 14 }}>点击"新建话题"开始你的第一次脑暴</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {filteredTopics.map((topic, index) => (
              <div
                key={topic.id}
                className="glass-card glass-card-hover stagger-item"
                onClick={() => navigate(`/topic/${topic.id}`)}
                style={{
                  padding: 20,
                  cursor: 'pointer',
                  animationDelay: `${index * 0.06}s`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 600, flex: 1, marginRight: 12 }}>
                    {topic.title}
                  </h3>
                  <span
                    style={{
                      fontSize: 12,
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      background: topic.status === 'active' ? 'rgba(72,187,120,0.15)' : 'rgba(160,174,192,0.15)',
                      color: topic.status === 'active' ? '#48bb78' : '#a0aec0',
                    }}
                  >
                    {topic.status === 'active' ? '进行中' : '已结束'}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: '#a0aec0', marginBottom: 14, lineHeight: 1.5 }}>
                  {truncate(topic.description, 80)}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {topic.tags.map((tag) => {
                      const tagInfo = TAGS.find((t) => t.key === tag);
                      return (
                        <span
                          key={tag}
                          style={{
                            fontSize: 12,
                            padding: '3px 10px',
                            borderRadius: 20,
                            background: `${tagInfo?.color || '#667eea'}20`,
                            color: tagInfo?.color || '#667eea',
                            fontWeight: 500,
                          }}
                        >
                          {tagInfo?.icon} {tag}
                        </span>
                      );
                    })}
                  </div>
                  <span style={{ fontSize: 13, color: '#718096' }}>
                    👥 {topic.participants} 人参与
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="glass-card"
            style={{
              width: '90%',
              maxWidth: 520,
              padding: 28,
              animation: 'modalIn 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>新建脑暴话题</h3>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, color: '#a0aec0', marginBottom: 6, display: 'block' }}>
                话题标题 <span style={{ color: '#f56565' }}>*</span>
              </label>
              <input
                maxLength={50}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="输入话题标题（最多50字）"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#e2e8f0',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#667eea')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
              />
              <div style={{ fontSize: 11, color: '#718096', marginTop: 4, textAlign: 'right' }}>
                {form.title.length}/50
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, color: '#a0aec0', marginBottom: 6, display: 'block' }}>
                话题描述
              </label>
              <textarea
                maxLength={500}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="描述话题背景和目标（最多500字）"
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#e2e8f0',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#667eea')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
              />
              <div style={{ fontSize: 11, color: '#718096', marginTop: 4, textAlign: 'right' }}>
                {form.description.length}/500
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: '#a0aec0', marginBottom: 8, display: 'block' }}>
                选择标签
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {TAGS.map((tag) => (
                  <button
                    key={tag.key}
                    onClick={() => toggleTag(tag.key)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: 13,
                      border: `1px solid ${form.tags.includes(tag.key) ? tag.color : 'rgba(255,255,255,0.15)'}`,
                      background: form.tags.includes(tag.key) ? `${tag.color}20` : 'transparent',
                      color: form.tags.includes(tag.key) ? tag.color : '#a0aec0',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontWeight: 500,
                    }}
                  >
                    {tag.icon} {tag.key}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: '#a0aec0',
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'all 0.2s',
                }}
              >
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={!form.title.trim()}
                style={{
                  padding: '10px 24px',
                  fontSize: 14,
                  opacity: form.title.trim() ? 1 : 0.5,
                  cursor: form.title.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                创建话题
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
