import { useEffect } from 'react';
import { useCardStore } from '../../store/useCardStore';
import type { Card, CardType } from '../../types';
import './CardDesigner.css';

const typeLabels: Record<CardType, string> = {
  creature: '生物',
  spell: '法术',
  equipment: '装备',
};

const effectLabels: Record<string, string> = {
  none: '无',
  doubleStrike: '连击',
  lifesteal: '吸血',
  shield: '护盾',
};

interface CardItemProps {
  card: Card;
  onDelete: (id: string) => void;
}

const CardItem = ({ card, onDelete }: CardItemProps) => {
  return (
    <div className={`card-item card-${card.type}`}>
      <div className="card-header">
        <span className="card-cost">{card.cost}</span>
        <span className="card-type">{typeLabels[card.type]}</span>
      </div>
      <h3 className="card-name">{card.name}</h3>
      <div className="card-stats">
        <span className="card-attack">⚔ {card.attack}</span>
        <span className="card-health">❤ {card.health}</span>
      </div>
      <div className="card-effect">
        <span className="effect-badge">{effectLabels[card.effect]}</span>
      </div>
      <p className="card-description">{card.description || '暂无描述'}</p>
      <button
        className="delete-btn"
        onClick={() => onDelete(card.id)}
      >
        删除
      </button>
    </div>
  );
};

const CardList = () => {
  const { cards, loading, error, fetchCards, removeCard } = useCardStore();

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  if (loading && cards.length === 0) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">错误: {error}</div>;
  }

  return (
    <div className="card-list-container">
      <h2>卡牌列表 ({cards.length})</h2>
      {cards.length === 0 ? (
        <p className="empty-text">暂无卡牌，请先创建卡牌</p>
      ) : (
        <div className="card-grid">
          {cards.map((card) => (
            <CardItem key={card.id} card={card} onDelete={removeCard} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CardList;
