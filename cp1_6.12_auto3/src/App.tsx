import React, { useState, useCallback, useMemo } from 'react';
import CardForm from './components/CardForm';
import ReviewMode from './components/ReviewMode';
import StatsDashboard from './components/StatsDashboard';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Card, ReviewSession, ReviewRecord, Classification } from './types';
import { TAG_PRESETS } from './types';

type Tab = 'cards' | 'review' | 'stats';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('cards');
  const [cards, setCards] = useLocalStorage<Card[]>('flashmind-cards', []);
  const [sessions, setSessions] = useLocalStorage<ReviewSession[]>('flashmind-sessions', []);
  const [tags] = useLocalStorage<Classification[]>('flashmind-tags', TAG_PRESETS);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [reviewActive, setReviewActive] = useState(false);

  const tagColors = useMemo(() => {
    const map: Record<string, string> = {};
    tags.forEach((t) => {
      map[t.name] = t.color;
    });
    return map;
  }, [tags]);

  const filteredCards = useMemo(() => {
    if (filterTag === 'all') return cards;
    return cards.filter((c) => c.tags.includes(filterTag));
  }, [cards, filterTag]);

  const handleSaveCard = useCallback(
    (card: Card) => {
      setCards((prev) => {
        const existing = prev.findIndex((c) => c.id === card.id);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = card;
          return next;
        }
        return [...prev, card];
      });
    },
    [setCards]
  );

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    },
    [setCards]
  );

  const handleReviewComplete = useCallback(
    (session: ReviewSession, records: ReviewRecord[]) => {
      setSessions((prev) => [...prev, session]);
      setCards((prev) =>
        prev.map((card) => {
          const cardRecords = records.filter((r) => r.cardId === card.id);
          if (cardRecords.length === 0) return card;
          return {
            ...card,
            reviewCount: card.reviewCount + cardRecords.length,
            correctCount:
              card.correctCount + cardRecords.filter((r) => r.correct).length,
          };
        })
      );
      setReviewActive(false);
    },
    [setSessions, setCards]
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'cards':
        return (
          <div className="cards-page">
            <CardForm onSave={handleSaveCard} tags={tags} />
            <div className="card-list-section">
              <div className="card-list-header">
                <h3>我的卡片 ({filteredCards.length})</h3>
                <div className="filter-tags">
                  <button
                    className={`filter-btn ${filterTag === 'all' ? 'filter-btn-active' : ''}`}
                    onClick={() => setFilterTag('all')}
                  >
                    全部
                  </button>
                  {tags.map((tag) => (
                    <button
                      key={tag.name}
                      className={`filter-btn ${filterTag === tag.name ? 'filter-btn-active' : ''}`}
                      style={{
                        '--filter-color': tag.color,
                      } as React.CSSProperties}
                      onClick={() => setFilterTag(tag.name)}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
              {filteredCards.length === 0 ? (
                <div className="empty-state">
                  <p>还没有卡片</p>
                  <p className="empty-state-sub">使用上方表单创建你的第一张知识卡片</p>
                </div>
              ) : (
                <div className="card-list">
                  {filteredCards.map((card) => (
                    <div key={card.id} className="card-list-item">
                      <div className="card-list-content">
                        <div className="card-list-tags">
                          {card.tags.map((tag) => (
                            <span
                              key={tag}
                              className="card-list-tag"
                              style={{ backgroundColor: tagColors[tag] || '#95A5A6' }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="card-list-text">
                          <p className="card-list-front">{card.front}</p>
                          <p className="card-list-back">{card.back}</p>
                        </div>
                        <div className="card-list-stats">
                          <span>复习 {card.reviewCount} 次</span>
                          <span>
                            正确率{' '}
                            {card.reviewCount > 0
                              ? Math.round((card.correctCount / card.reviewCount) * 100)
                              : 0}
                            %
                          </span>
                        </div>
                      </div>
                      <div className="card-list-actions">
                        <button
                          className="btn btn-icon"
                          onClick={() => handleDeleteCard(card.id)}
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'review':
        if (!reviewActive) {
          return (
            <div className="review-start">
              <h2>准备复习</h2>
              <p className="review-start-desc">
                将从 {cards.length} 张卡片中随机抽题，点击卡片翻转查看答案，然后标记是否记住。
              </p>
              <button
                className="btn btn-primary btn-start-review"
                disabled={cards.length === 0}
                onClick={() => setReviewActive(true)}
              >
                开始复习
              </button>
            </div>
          );
        }
        return (
          <ReviewMode
            cards={cards}
            onComplete={handleReviewComplete}
            tagColors={tagColors}
          />
        );
      case 'stats':
        return <StatsDashboard cards={cards} sessions={sessions} tags={tags} />;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-logo">
          <span className="logo-icon">🧠</span> FlashMind
        </h1>
        <p className="app-subtitle">知识闪卡记忆工具</p>
      </header>
      <nav className="app-nav">
        <button
          className={`nav-btn ${activeTab === 'cards' ? 'nav-btn-active' : ''}`}
          onClick={() => {
            setActiveTab('cards');
            setReviewActive(false);
          }}
        >
          卡片管理
        </button>
        <button
          className={`nav-btn ${activeTab === 'review' ? 'nav-btn-active' : ''}`}
          onClick={() => {
            setActiveTab('review');
            setReviewActive(false);
          }}
        >
          复习模式
        </button>
        <button
          className={`nav-btn ${activeTab === 'stats' ? 'nav-btn-active' : ''}`}
          onClick={() => {
            setActiveTab('stats');
            setReviewActive(false);
          }}
        >
          统计看板
        </button>
      </nav>
      <main className="app-content">{renderContent()}</main>
    </div>
  );
};

export default App;
