import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { baseRunes, spellFormulas, RuneType, SpellFormula } from '@/data/runes';

const GrimoirePanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const unlockedSpells = useAppStore((state) => state.unlockedSpells);
  const getUnlockedCount = useAppStore((state) => state.getUnlockedCount);
  const getTotalSpells = useAppStore((state) => state.getTotalSpells);
  const [flippingSpells, setFlippingSpells] = useState<Set<string>>(new Set());
  const prevUnlockedRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    const newlyUnlocked: string[] = [];
    unlockedSpells.forEach((spellId) => {
      if (!prevUnlockedRef.current.has(spellId)) {
        newlyUnlocked.push(spellId);
      }
    });

    if (newlyUnlocked.length > 0) {
      setFlippingSpells((prev) => {
        const next = new Set(prev);
        newlyUnlocked.forEach((id) => next.add(id));
        return next;
      });

      setTimeout(() => {
        setFlippingSpells((prev) => {
          const next = new Set(prev);
          newlyUnlocked.forEach((id) => next.delete(id));
          return next;
        });
      }, 400);
    }

    prevUnlockedRef.current = new Set(unlockedSpells);
  }, [unlockedSpells]);

  const getRuneIcon = (type: RuneType, color: string, size: number = 30) => {
    const half = size / 2;

    const renderShape = () => {
      switch (type) {
        case 'line':
          return (
            <line
              x1="4"
              y1={half}
              x2={size - 4}
              y2={half}
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          );
        case 'arc':
          return (
            <path
              d={`M 4 ${half} Q ${half} 4 ${size - 4} ${half}`}
              stroke={color}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          );
        case 'triangle':
          return (
            <polygon
              points={`${half},4 ${size - 4},${size - 4} 4,${size - 4}`}
              stroke={color}
              strokeWidth="2"
              fill="none"
            />
          );
        case 'square':
          return (
            <rect
              x="4"
              y="4"
              width={size - 8}
              height={size - 8}
              stroke={color}
              strokeWidth="2"
              fill="none"
              rx="2"
            />
          );
        case 'spiral':
          return (
            <path
              d={`M ${half} ${half} Q ${half + 5} ${half - 5} ${half + 8} ${half} Q ${half + 10} ${half + 8} ${half} ${half + 10} Q ${half - 8} ${half + 8} ${half - 8} ${half}`}
              stroke={color}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          );
        case 'star':
          const starPoints = [];
          for (let i = 0; i < 5; i++) {
            const outerAngle = (i * 72 - 90) * (Math.PI / 180);
            const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180);
            starPoints.push(
              `${half + Math.cos(outerAngle) * (half - 3)},${half + Math.sin(outerAngle) * (half - 3)}`
            );
            starPoints.push(
              `${half + Math.cos(innerAngle) * (half - 8)},${half + Math.sin(innerAngle) * (half - 8)}`
            );
          }
          return (
            <polygon
              points={starPoints.join(' ')}
              stroke={color}
              strokeWidth="1.5"
              fill="none"
            />
          );
        default:
          return null;
      }
    };

    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block' }}
      >
        <circle
          cx={half}
          cy={half}
          r={half - 1}
          fill="rgba(42, 42, 62, 0.8)"
          stroke="rgba(255, 215, 0, 0.3)"
          strokeWidth="1"
        />
        {renderShape()}
      </svg>
    );
  };

  const unlockedCount = getUnlockedCount();
  const totalSpells = getTotalSpells();
  const progress = totalSpells > 0 ? (unlockedCount / totalSpells) * 100 : 0;

  const renderSpellCard = (formula: SpellFormula, isUnlocked: boolean, isFlipping: boolean) => {
    return (
      <div
        key={formula.id}
        style={{
          perspective: '1000px',
          marginBottom: '10px',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.4s',
            transform: isFlipping ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(30, 30, 50, 0.8)',
              borderRadius: '6px',
              padding: '10px',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              backfaceVisibility: 'hidden',
              position: 'relative',
            }}
          >
            {isUnlocked ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '6px',
                  }}
                >
                  {formula.runes.map((rune, idx) => (
                    <React.Fragment key={idx}>
                      {getRuneIcon(rune, formula.color, 24)}
                      {idx < formula.runes.length - 1 && (
                        <span style={{ color: '#888', fontSize: '12px' }}>+</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: formula.color,
                  }}
                >
                  = {formula.name}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#888',
                    marginTop: '4px',
                  }}
                >
                  {formula.description}
                </div>
              </>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '8px 0',
                }}
              >
                <div
                  style={{
                    fontSize: '24px',
                    color: '#999',
                    marginBottom: '4px',
                  }}
                >
                  ? ? ?
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#999',
                  }}
                >
                  尚未发现的组合
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        backgroundColor: 'rgba(42, 42, 62, 0.95)',
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'box-shadow 0.3s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 8px 32px rgba(0, 0, 0, 0.4)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: isOpen ? '1px solid rgba(255, 215, 0, 0.2)' : 'none',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: '600',
            background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          符文图鉴
        </h3>
        <span
          style={{
            color: '#ffd700',
            fontSize: '14px',
            transition: 'transform 0.3s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▼
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            padding: '12px 16px 16px',
            maxHeight: '350px',
            overflowY: 'auto',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '12px',
                color: '#aaa',
                marginBottom: '8px',
              }}
            >
              基础符文
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              {baseRunes.map((rune) => (
                <div
                  key={rune.type}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title={rune.description}
                >
                  {getRuneIcon(rune.type, rune.color)}
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#aaa',
                    }}
                  >
                    {rune.name.replace('符文', '')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              fontSize: '12px',
              color: '#aaa',
              marginBottom: '8px',
            }}
          >
            魔法组合
          </div>

          {Object.values(spellFormulas).map((formula) => {
            const isUnlocked = unlockedSpells.has(formula.id);
            const isFlipping = flippingSpells.has(formula.id);
            return renderSpellCard(formula, isUnlocked, isFlipping);
          })}

          <div style={{ marginTop: '16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#aaa',
                marginBottom: '6px',
              }}
            >
              <span>解锁进度</span>
              <span>
                {unlockedCount} / {totalSpells}
              </span>
            </div>
            <div
              style={{
                height: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background:
                    progress > 0
                      ? `linear-gradient(90deg, #888 0%, #ffd700 ${progress * 2}%)`
                      : '#555',
                  borderRadius: '3px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 215, 0, 0.3);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 215, 0, 0.5);
        }
      `}</style>
    </div>
  );
};

export default GrimoirePanel;
