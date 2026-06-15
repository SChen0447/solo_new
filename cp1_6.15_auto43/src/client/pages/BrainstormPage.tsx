import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import IdeaCard from '../components/IdeaCard';
import type { SortType } from '../types';

export default function BrainstormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTopic, ideas, sortBy, loading, fetchTopicDetail, createIdea, setSortBy } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [ideaContent, setIdeaContent] = useState('');
  const [ideaImage, setIdeaImage] = useState('');
  const [fabPressed, setFabPressed] = useState(false);
  const [displayedIdeas, setDisplayedIdeas] = useState(ideas);
  const ideasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) fetchTopicDetail(id);
  }, [id]);

  useEffect(() => {
    let sorted = [...ideas];
    if (sortBy === 'votes') {
      sorted.sort((a, b) => (b.votesFor - b.votesAgainst) - (a.votesFor - a.votesAgainst));
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    setDisplayedIdeas(sorted);
  }, [ideas, sortBy]);

  const handleSubmitIdea = async () => {
    if (!ideaContent.trim() || !id) return;
    await createIdea(id, { content: ideaContent, imageUrl: ideaImage || undefined });
    setIdeaContent('');
    setIdeaImage('');
    setShowModal(false);
  };

  const handleFabClick = () => {
    setFabPressed(true);
    setTimeout(() => setFabPressed(false), 150);
    setTimeout(() => setShowModal(true), 150);
  };

  if (loading && !currentTopic) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#718096' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          加载中...
        </div>
      </div>
    );
  }

  if (!currentTopic) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#718096' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <p style={{ marginBottom: 12 }}>话题不存在</p>
          <button className="btn-primary" onClick={() => navigate('/')} style={{ padding: '10px 20px', fontSize: 14 }}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <style>{`
        @media (max-width: 767px) {
          .brainstorm-header { padding: 16px !important; }
          .brainstorm-content { padding: 16px !important; }
        }
      `}</style>

      <div
        className="brainstorm-header"
        style={{
          background: 'linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15))',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '24px 32px',
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a0aec0',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 16,
              transition: 'color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#667eea')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#a0aec0')}
          >
            ← 返回话题列表
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                {currentTopic.title}
              </h2>
              <p style={{ fontSize: 14, color: '#a0aec0', lineHeight: 1.6, marginBottom: 12 }}>
                {currentTopic.description}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {currentTopic.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 12,
                      padding: '3px 10px',
                      borderRadius: 20,
                      background: 'rgba(102,126,234,0.15)',
                      color: '#667eea',
                      fontWeight: 500,
                    }}
                  >
                    {tag}
                  </span>
                ))}
                <span style={{ fontSize: 12, color: '#718096', marginLeft: 8 }}>
                  👥 {currentTopic.participants} 人参与
                </span>
                <span
                  style={{
                    fontSize: 12,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: currentTopic.status === 'active' ? 'rgba(72,187,120,0.15)' : 'rgba(160,174,192,0.15)',
                    color: currentTopic.status === 'active' ? '#48bb78' : '#a0aec0',
                    fontWeight: 600,
                  }}
                >
                  {currentTopic.status === 'active' ? '进行中' : '已结束'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="brainstorm-content"
        style={{ maxWidth: 900, margin: '0 auto', padding: '24px 32px' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>
            💡 点子流 <span style={{ fontSize: 14, color: '#718096', fontWeight: 400 }}>({ideas.length})</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setSortBy('latest')}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: sortBy === 'latest' ? 'rgba(102,126,234,0.2)' : 'transparent',
                color: sortBy === 'latest' ? '#667eea' : '#a0aec0',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              最新
            </button>
            <button
              onClick={() => setSortBy('votes')}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: sortBy === 'votes' ? 'rgba(102,126,234,0.2)' : 'transparent',
                color: sortBy === 'votes' ? '#667eea' : '#a0aec0',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              热门
            </button>
          </div>
        </div>

        {displayedIdeas.length === 0 ? (
          <div
            className="glass-card"
            style={{ textAlign: 'center', padding: 48, color: '#718096' }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌟</div>
            <p style={{ fontSize: 16, marginBottom: 8 }}>还没有点子</p>
            <p style={{ fontSize: 14 }}>点击右下角按钮提交你的第一个创意</p>
          </div>
        ) : (
          <div ref={ideasContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {displayedIdeas.map((idea, index) => (
              <IdeaCard key={idea.id} idea={idea} index={index} />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleFabClick}
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: '#fff',
          fontSize: 26,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: fabPressed ? 'scale(0.9)' : 'scale(1)',
          boxShadow: '0 4px 20px rgba(102,126,234,0.4)',
          animation: 'pulseGlow 2s ease-in-out infinite',
        }}
      >
        +
      </button>

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
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>提交点子</h3>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, color: '#a0aec0', marginBottom: 6, display: 'block' }}>
                点子内容 <span style={{ color: '#f56565' }}>*</span>
              </label>
              <textarea
                maxLength={200}
                value={ideaContent}
                onChange={(e) => setIdeaContent(e.target.value)}
                placeholder="描述你的创意点子（最多200字）"
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
                {ideaContent.length}/200
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: '#a0aec0', marginBottom: 6, display: 'block' }}>
                附件图片URL（可选）
              </label>
              <input
                value={ideaImage}
                onChange={(e) => setIdeaImage(e.target.value)}
                placeholder="https://example.com/image.png"
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
                onClick={handleSubmitIdea}
                disabled={!ideaContent.trim()}
                style={{
                  padding: '10px 24px',
                  fontSize: 14,
                  opacity: ideaContent.trim() ? 1 : 0.5,
                  cursor: ideaContent.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                提交点子
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
