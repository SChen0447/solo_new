import React, { useEffect, useState, useMemo } from 'react';
import { useCardStore } from '../../stores/cardStore';
import { themes, themeKeys } from '../../themes';
import { Card, ThemeKey } from '../../types';
import { CardDetail } from '../card-detail/CardDetail';
import './CardViewer.css';

function timeAgo(dateStr: string): string {
  const now = new Date().getTime();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

interface CardItemProps {
  card: Card;
  index: number;
  onClick: () => void;
}

const CardItem: React.FC<CardItemProps> = ({ card, index, onClick }) => {
  const themeConfig = themes[card.theme as ThemeKey] || themes.minimalWhite;

  return (
    <div
      className="card-item"
      style={{
        animationDelay: `${index * 0.1}s`,
      }}
      onClick={onClick}
    >
      <div
        className="card-inner"
        style={{
          backgroundColor: themeConfig.bgColor,
          color: themeConfig.textColor,
          fontFamily: themeConfig.fontFamily,
          border: `2px solid ${themeConfig.borderColor}`,
        }}
      >
        <span
          className="theme-dot-indicator"
          style={{ backgroundColor: themeConfig.dotColor }}
        />
        <div className="card-item-header">
          <div className="card-item-avatar">
            {card.avatarUrl ? (
              <img src={card.avatarUrl} alt={card.name} />
            ) : (
              <div className="avatar-init">{card.name.charAt(0)}</div>
            )}
          </div>
          <div className="card-item-info">
            <div className="card-item-name">{card.name}</div>
            <div className="card-item-occupation">{card.occupation}</div>
          </div>
        </div>
        <div className="card-item-bio">{card.bio}</div>
        <div className="card-item-footer">
          <span className="receive-time">
            {timeAgo(card.receivedAt || card.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

export const CardViewer: React.FC = () => {
  const {
    fetchCards,
    searchText,
    setSearchText,
    selectedThemes,
    toggleTheme,
    getFilteredCards,
    exchangeCard,
    loading,
    error,
  } = useCardStore();

  const [exchangeId, setExchangeId] = useState('');
  const [exchangeMsg, setExchangeMsg] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [listKey, setListKey] = useState(0);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const filteredCards = useMemo(() => getFilteredCards(), [getFilteredCards]);

  useEffect(() => {
    setListKey((k) => k + 1);
  }, [searchText, selectedThemes]);

  const handleExchange = async () => {
    if (!exchangeId.trim()) {
      setExchangeMsg('请输入名片ID');
      return;
    }
    const result = await exchangeCard(exchangeId.trim());
    if (result) {
      setExchangeMsg(`成功添加名片：${result.name}`);
      setExchangeId('');
    } else {
      setExchangeMsg(error || '交换失败');
    }
    setTimeout(() => setExchangeMsg(''), 3000);
  };

  return (
    <div className="viewer-container">
      <div className="viewer-header">
        <h1>📇 名片簿</h1>
        <div className="exchange-section">
          <input
            type="text"
            value={exchangeId}
            onChange={(e) => setExchangeId(e.target.value)}
            placeholder="输入6位名片ID交换名片"
            maxLength={6}
            className="exchange-input"
          />
          <button className="exchange-btn" onClick={handleExchange}>
            交换名片
          </button>
        </div>
      </div>

      {exchangeMsg && <div className="exchange-msg">{exchangeMsg}</div>}

      <div className="search-bar">
        <div className="search-input-wrapper">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索姓名或职业..."
            className="search-input"
          />
        </div>
      </div>

      <div className="theme-filters">
        {themeKeys.map((key) => {
          const isActive = selectedThemes.includes(key);
          const themeConfig = themes[key];
          return (
            <button
              key={key}
              className={`theme-filter-btn ${isActive ? 'active' : ''}`}
              style={{
                boxShadow: isActive ? `0 0 14px ${themeConfig.dotColor}` : 'none',
                borderColor: isActive ? themeConfig.dotColor : '#3d4a6e',
              }}
              onClick={() => toggleTheme(key)}
            >
              <span
                className="filter-dot"
                style={{ backgroundColor: themeConfig.dotColor }}
              />
              {themeConfig.name}
            </button>
          );
        })}
      </div>

      <div className="stats-bar">
        共 {filteredCards.length} 张名片
      </div>

      {loading && <div className="loading">加载中...</div>}

      <div key={listKey} className="card-grid">
        {filteredCards.map((card, index) => (
          <CardItem
            key={card.id}
            card={card}
            index={index}
            onClick={() => setSelectedCard(card)}
          />
        ))}
      </div>

      {filteredCards.length === 0 && !loading && (
        <div className="empty-state">
          <p>暂无名片，试试创建或交换一张吧！</p>
        </div>
      )}

      {selectedCard && (
        <CardDetail card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  );
};
