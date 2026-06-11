import React from 'react';
import { Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import { CardItem } from '@/components/Card';
import type { Card } from '@/types';

interface TimelineViewProps {
  cards: Card[];
  onUpdate: (id: string, data: Partial<Card>) => void;
  onDelete: (id: string) => void;
  onAddCheckItem: (cardId: string, text: string) => void;
  onToggleCheckItem: (cardId: string, itemId: string) => void;
  onRemoveCheckItem: (cardId: string, itemId: string) => void;
  disabledCardIds?: Set<string>;
  searchKeyword?: string;
}

const TimelineView: React.FC<TimelineViewProps> = ({
  cards,
  onUpdate,
  onDelete,
  onAddCheckItem,
  onToggleCheckItem,
  onRemoveCheckItem,
  disabledCardIds = new Set(),
  searchKeyword = '',
}) => {
  const sorted = [...cards].sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

  const grouped = sorted.reduce<Record<string, Card[]>>((acc, card) => {
    const key = dayjs(card.date).format('YYYY-MM');
    if (!acc[key]) acc[key] = [];
    acc[key].push(card);
    return acc;
  }, {});

  return (
    <div className="timeline-view">
      <div className="timeline-track">
        {Object.entries(grouped).map(([month, monthCards]) => (
          <div key={month} className="timeline-group">
            <div className="timeline-group-label">
              <div className="timeline-dot" />
              <span>{month}</span>
            </div>
            <div className="timeline-cards">
              {monthCards.map((card, index) => {
                const isDisabled = disabledCardIds.has(card.id);
                return (
                  <div
                    key={card.id}
                    className="timeline-card-wrapper fly-in-item"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="timeline-card-connector" />
                    <div className="timeline-card-date">
                      <Calendar size={13} />
                      {dayjs(card.date).format('MM-DD')}
                    </div>
                    <CardItem
                      card={card}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onAddCheckItem={onAddCheckItem}
                      onToggleCheckItem={onToggleCheckItem}
                      onRemoveCheckItem={onRemoveCheckItem}
                      isDragDisabled={isDisabled}
                      isDimmed={isDisabled}
                      searchKeyword={searchKeyword}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="timeline-empty">暂无里程碑卡片</div>
        )}
      </div>
    </div>
  );
};

export default TimelineView;
