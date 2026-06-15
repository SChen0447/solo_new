import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { CARD_LIBRARY } from '../engine';
import { CardDef, SkillType } from '../types';

const SKILL_LABELS: Record<SkillType, string> = {
  doubleStrike: '连击',
  shield: '护盾',
  lifesteal: '吸血',
  freeze: '冰冻',
  burn: '灼烧',
};

const SKILL_COLORS: Record<SkillType, string> = {
  doubleStrike: '#FF6B6B',
  shield: '#4ECDC4',
  lifesteal: '#C77DFF',
  freeze: '#74C0FC',
  burn: '#FF922B',
};

export const DeckBuilder: React.FC = () => {
  const playerDeck = useStore((s) => s.playerDeck);
  const setPlayerDeck = useStore((s) => s.setPlayerDeck);
  const [costFilter, setCostFilter] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const selectedIds = useMemo(() => new Set(playerDeck.map((c) => c.id)), [playerDeck]);

  const filteredCards = useMemo(() => {
    return CARD_LIBRARY.filter((c) => {
      if (costFilter !== null && c.cost !== costFilter) return false;
      if (search && !c.name.includes(search)) return false;
      return true;
    });
  }, [costFilter, search]);

  const toggleCard = (card: CardDef) => {
    if (selectedIds.has(card.id)) {
      setPlayerDeck(playerDeck.filter((c) => c.id !== card.id));
    } else if (playerDeck.length < 6) {
      setPlayerDeck([...playerDeck, card]);
    }
  };

  const totalCost = playerDeck.reduce((s, c) => s + c.cost, 0);
  const avgCost = playerDeck.length > 0 ? (totalCost / playerDeck.length).toFixed(1) : '0';
  const overCost = totalCost > 30;

  return (
    <div className="deck-builder">
      <div className="deck-builder-header">
        <h3>卡牌库</h3>
        <input
          className="deck-search"
          type="text"
          placeholder="搜索卡牌..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="cost-filter">
        <button
          className={costFilter === null ? 'active' : ''}
          onClick={() => setCostFilter(null)}
        >
          全部
        </button>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
          <button
            key={c}
            className={costFilter === c ? 'active' : ''}
            onClick={() => setCostFilter(costFilter === c ? null : c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="card-grid">
        {filteredCards.map((card) => {
          const selected = selectedIds.has(card.id);
          return (
            <div
              key={card.id}
              className={`card-item ${selected ? 'selected' : ''}`}
              onClick={() => toggleCard(card)}
            >
              <div className="card-cost">{card.cost}</div>
              <div className="card-info">
                <div className="card-name">{card.name}</div>
                <div className="card-stats">
                  ⚔{card.attack} ❤{card.hp}
                </div>
                <div
                  className="card-skill"
                  style={{ color: SKILL_COLORS[card.skill] }}
                >
                  {SKILL_LABELS[card.skill]}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="deck-summary">
        <div className="deck-summary-header">
          <h4>
            牌组 ({playerDeck.length}/6)
            {overCost && <span className="cost-warning"> ⚠</span>}
          </h4>
          <span className={overCost ? 'cost-over' : 'cost-normal'}>
            总费: {totalCost} | 均费: {avgCost}
          </span>
        </div>
        <div className="deck-cards">
          {playerDeck.map((card) => (
            <div
              key={card.id}
              className="deck-card-mini selected"
              onClick={() => toggleCard(card)}
            >
              <span className="mini-cost">{card.cost}</span>
              <span className="mini-name">{card.name}</span>
              <span className="mini-stats">⚔{card.attack} ❤{card.hp}</span>
            </div>
          ))}
          {Array.from({ length: 6 - playerDeck.length }, (_, i) => (
            <div key={`empty-${i}`} className="deck-card-mini empty">
              空
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
