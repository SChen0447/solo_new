import { useGameStore } from '@/store/gameStore';
import { TarotCard } from '@/data/cards';
import '@/components/CardSpread.css';

const positionLabels = [
  { label: '过去', sub: 'Past', theme: '事业运势' },
  { label: '现在', sub: 'Present', theme: '感情走向' },
  { label: '未来', sub: 'Future', theme: '近期机遇' },
];

interface CardItemProps {
  card: TarotCard | null;
  index: number;
  flipped: boolean;
  selected: boolean;
  onClick: () => void;
  position: typeof positionLabels[number];
}

function CardItem({ card, index, flipped, selected, onClick, position }: CardItemProps) {
  if (!card) return null;

  const animDelay = `${index * 0.2}s`;

  return (
    <div
      className={`card-slot ${selected ? 'selected' : ''}`}
      style={{ animationDelay: animDelay }}
      onClick={onClick}
    >
      <div className="card-pedestal">
        <div className="pedestal-ring" />
        <div className="pedestal-glow" />
        <div className="pedestal-label">
          <span className="position-label">{position.label}</span>
          <span className="position-sub">{position.sub}</span>
        </div>
      </div>

      <div className={`tarot-card ${flipped ? 'flipped' : ''} ${selected ? 'selected' : ''}`}>
        <div className="card-inner">
          <div className="card-face card-back-face">
            <div className="spiral-pattern" />
            <div className="spiral-pattern-inner" />
            <div className="corner-decoration top-left" />
            <div className="corner-decoration top-right" />
            <div className="corner-decoration bottom-left" />
            <div className="corner-decoration bottom-right" />
            <div className="back-center-symbol">✵</div>
          </div>

          <div
            className="card-face card-front-face"
            style={{
              background: `linear-gradient(160deg, ${card.primaryColor}15 0%, #ffffff 40%, #faf8ff 100%)`,
              borderColor: card.primaryColor,
            }}
          >
            {card.isSpecial && <div className="special-badge">✦ 命运 ✦</div>}
            
            <div
              className="card-header"
              style={{ color: card.primaryColor }}
            >
              <span className="card-symbol">{card.symbol}</span>
            </div>

            <div className="card-body">
              <div
                className="card-main-symbol"
                style={{
                  color: card.primaryColor,
                  textShadow: `0 0 20px ${card.primaryColor}40`,
                }}
              >
                {card.symbol}
              </div>
              <div className="card-geometry">
                <svg viewBox="0 0 80 80" className="geometry-svg">
                  <polygon
                    points="40,5 75,25 75,55 40,75 5,55 5,25"
                    fill="none"
                    stroke={card.primaryColor}
                    strokeWidth="1"
                    opacity="0.4"
                  />
                  <polygon
                    points="40,15 65,30 65,50 40,65 15,50 15,30"
                    fill="none"
                    stroke={card.primaryColor}
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="8"
                    fill={card.primaryColor}
                    opacity="0.2"
                  />
                </svg>
              </div>
            </div>

            <div className="card-footer">
              <div className="card-name" style={{ color: card.primaryColor }}>
                {card.name}
              </div>
              <div className="card-keyword">
                <span className="divider" style={{ background: card.primaryColor }} />
                <span style={{ color: card.primaryColor }}>{card.keyword}</span>
                <span className="divider" style={{ background: card.primaryColor }} />
              </div>
            </div>

            <div className="card-corner-tl" style={{ color: card.primaryColor }}>
              <span className="corner-symbol">{card.symbol}</span>
            </div>
            <div className="card-corner-br" style={{ color: card.primaryColor }}>
              <span className="corner-symbol">{card.symbol}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="theme-label" style={{ animationDelay: `calc(${animDelay} + 0.6s)` }}>
        <span className="theme-dot" style={{ background: card.primaryColor }} />
        {position.theme}
      </div>
    </div>
  );
}

export default function CardSpread() {
  const { drawnCards, flippedCards, phase, selectedCardIndex, selectCard } = useGameStore();

  if (phase === 'idle' || phase === 'shuffling' || phase === 'ready') return null;

  return (
    <div className="card-spread-container">
      <div className="card-spread">
        {drawnCards.map((card, index) => (
          <CardItem
            key={`${card?.id || index}-${index}`}
            card={card || null}
            index={index}
            flipped={flippedCards[index]}
            selected={selectedCardIndex === index && phase === 'complete'}
            onClick={() => phase === 'complete' && selectCard(index)}
            position={positionLabels[index]}
          />
        ))}
      </div>
    </div>
  );
}
