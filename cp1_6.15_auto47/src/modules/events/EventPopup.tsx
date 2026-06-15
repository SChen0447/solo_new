import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { EventOption, Star } from '../../utils/constants';
import { getStarById } from '../starMap/starGenerator';

const EVENT_ICONS: Record<string, string> = {
  trade: '🛸',
  disaster: '☄️',
  mystery: '🌀',
  discovery: '🏛️',
  flare: '☀️',
  asteroid: '☄️',
  ruins: '🏛️',
  rift: '🌀',
};

export const EventPopup: React.FC = () => {
  const {
    activeEvent,
    isEventAnimating,
    closeEvent,
    addResources,
    addFloatMessage,
    setCurrentStar,
    stars,
    addVisitedStar,
  } = useGameStore();

  const [animClass, setAnimClass] = useState('');

  useEffect(() => {
    if (activeEvent) {
      setAnimClass('event-popup-enter');
    }
  }, [activeEvent]);

  if (!activeEvent) return null;

  const handleCloseWithAnim = () => {
    setAnimClass('event-popup-exit');
    closeEvent();
  };

  const handleOptionSelect = (option: EventOption) => {
    const { result } = option;

    if (result.resources) {
      addResources(result.resources);

      const changes: string[] = [];
      Object.entries(result.resources).forEach(([key, val]) => {
        if (val !== undefined && val !== 0) {
          const sign = val > 0 ? '+' : '';
          const name = key === 'fuel' ? '燃料' : key === 'ore' ? '矿石' : '能量';
          changes.push(`${name} ${sign}${val}`);
        }
      });
    }

    if (result.teleportTo === 'random') {
      const randomStar: Star = stars[Math.floor(Math.random() * stars.length)];
      if (randomStar) {
        setCurrentStar(randomStar.id);
        addVisitedStar(randomStar.id);
      }
    }

    addFloatMessage(result.message, result.isPositive);
    handleCloseWithAnim();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className={animClass}
        style={{
          width: '90%',
          maxWidth: 480,
          padding: 32,
          borderRadius: 24,
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
          border: '2px solid',
          borderImage: 'linear-gradient(135deg, #8844aa 0%, #aa44cc 100%) 1',
          boxShadow: '0 0 40px rgba(136, 68, 204, 0.4), 0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          style={{
            fontSize: 64,
            textAlign: 'center',
            marginBottom: 16,
            filter: 'drop-shadow(0 0 20px rgba(136, 68, 204, 0.6))',
          }}
        >
          {EVENT_ICONS[activeEvent.icon] || EVENT_ICONS[activeEvent.type] || '✨'}
        </div>

        <div
          style={{
            fontSize: 24,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#fff',
            marginBottom: 12,
            textShadow: '0 0 10px rgba(233, 69, 96, 0.3)',
          }}
        >
          {activeEvent.title}
        </div>

        <div
          style={{
            fontSize: 14,
            color: '#bbb',
            textAlign: 'center',
            lineHeight: 1.7,
            marginBottom: 28,
            padding: '0 12px',
          }}
        >
          {activeEvent.description}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeEvent.options.map((option) => (
            <button
              key={option.id}
              className="btn-primary"
              onClick={() => handleOptionSelect(option)}
              style={{
                padding: '14px 20px',
                fontSize: 14,
                borderRadius: 10,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
