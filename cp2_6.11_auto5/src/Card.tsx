import React, { useRef, useEffect, memo } from 'react';
import { CardData, ELEMENT_COLORS, ElementType } from './Deck';

interface CardProps {
  card: CardData;
  onClick: (id: number) => void;
}

const ElementIcon: React.FC<{ element: ElementType; size?: number }> = ({ element, size = 40 }) => {
  const color = ELEMENT_COLORS[element];

  const icons: Record<ElementType, React.ReactNode> = {
    fire: (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <path
          d="M50 10C35 35 25 50 25 65C25 80 36 90 50 90C64 90 75 80 75 65C75 50 65 35 50 10Z"
          fill={color}
          opacity="0.9"
        />
        <path
          d="M50 30C42 45 37 55 37 65C37 72 43 78 50 78C57 78 63 72 63 65C63 55 58 45 50 30Z"
          fill="#fff"
          opacity="0.4"
        />
        <path
          d="M50 50C46 57 44 62 44 67C44 70 47 73 50 73C53 73 56 70 56 67C56 62 54 57 50 50Z"
          fill="#fff"
          opacity="0.7"
        />
      </svg>
    ),
    water: (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <path
          d="M50 10C50 10 25 50 25 65C25 80 36 90 50 90C64 90 75 80 75 65C75 50 50 10 50 10Z"
          fill={color}
          opacity="0.9"
        />
        <ellipse cx="40" cy="60" rx="8" ry="5" fill="#fff" opacity="0.5" />
        <path
          d="M42 75C45 78 50 80 55 78C52 75 47 73 42 75Z"
          fill="#fff"
          opacity="0.3"
        />
      </svg>
    ),
    wind: (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <path
          d="M20 35C20 35 45 30 60 35C75 40 80 55 65 55C55 55 50 45 40 50C30 55 25 65 40 65C60 65 70 50 55 45"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
        <path
          d="M25 45C25 45 40 42 50 45C60 48 65 58 55 58"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        <circle cx="55" cy="35" r="4" fill={color} opacity="0.6" />
        <circle cx="30" cy="65" r="3" fill={color} opacity="0.4" />
      </svg>
    ),
    earth: (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <path
          d="M10 85L30 45L45 60L60 30L80 55L90 85H10Z"
          fill={color}
          opacity="0.9"
        />
        <path
          d="M20 85L35 55L45 65L55 45L70 70L80 85H20Z"
          fill="#fff"
          opacity="0.2"
        />
        <path
          d="M35 55L45 65M55 45L70 70"
          stroke="#fff"
          strokeWidth="2"
          opacity="0.4"
        />
        <circle cx="40" cy="75" r="3" fill="#fff" opacity="0.6" />
        <circle cx="60" cy="80" r="2" fill="#fff" opacity="0.5" />
      </svg>
    ),
  };

  return icons[element];
};

const Card: React.FC<CardProps> = memo(({ card, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shatterAnimRef = useRef<number | null>(null);

  useEffect(() => {
    if (!card.isShattering || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = rect.width;
    const h = rect.height;
    const color = ELEMENT_COLORS[card.element];

    const shards: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      rotation: number;
      vr: number;
      size: number;
      points: { x: number; y: number }[];
    }> = [];

    for (let i = 0; i < 8; i++) {
      const cx = w / 2 + (Math.random() - 0.5) * w * 0.5;
      const cy = h / 2 + (Math.random() - 0.5) * h * 0.5;
      const angle = (Math.random() * Math.PI * 2);
      const speed = 3 + Math.random() * 5;
      const points = [];
      const numPoints = 3 + Math.floor(Math.random() * 2);
      for (let j = 0; j < numPoints; j++) {
        const a = (j / numPoints) * Math.PI * 2 + Math.random() * 0.5;
        const r = 8 + Math.random() * 15;
        points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }
      shards.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        size: 10 + Math.random() * 15,
        points,
      });
    }

    let startTime: number | null = null;
    const duration = 300;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / duration;

      if (progress >= 1) {
        if (shatterAnimRef.current) {
          cancelAnimationFrame(shatterAnimRef.current);
        }
        return;
      }

      ctx.clearRect(0, 0, w, h);
      const alpha = 1 - progress;
      const gravity = 0.2;

      for (const shard of shards) {
        shard.x += shard.vx;
        shard.y += shard.vy;
        shard.vy += gravity;
        shard.rotation += shard.vr;

        ctx.save();
        ctx.translate(shard.x, shard.y);
        ctx.rotate(shard.rotation);
        ctx.globalAlpha = alpha;

        ctx.beginPath();
        ctx.moveTo(shard.points[0].x, shard.points[0].y);
        for (let i = 1; i < shard.points.length; i++) {
          ctx.lineTo(shard.points[i].x, shard.points[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff40';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }

      shatterAnimRef.current = requestAnimationFrame(animate);
    };

    shatterAnimRef.current = requestAnimationFrame(animate);

    return () => {
      if (shatterAnimRef.current) {
        cancelAnimationFrame(shatterAnimRef.current);
      }
    };
  }, [card.isShattering, card.element]);

  const handleClick = () => {
    if (!card.isFlipped && !card.isMatched && !card.isShattering) {
      onClick(card.id);
    }
  };

  if (card.isMatched && !card.isShattering) {
    return null;
  }

  return (
    <div
      className={`card ${card.isFlipped ? 'flipped' : ''} ${card.isShattering ? 'shattering' : ''}`}
      style={{
        transform: `rotate(${card.rotation}deg) translateY(${card.offsetY}px)`,
      }}
      onClick={handleClick}
    >
      <div className="card-inner">
        <div className="card-back">
          <div className="card-back-pattern"></div>
          <div className="card-back-border"></div>
        </div>
        <div
          className="card-front"
          style={{ borderColor: ELEMENT_COLORS[card.element] }}
        >
          <div className="card-corner top-left">
            <span className="card-value" style={{ color: ELEMENT_COLORS[card.element] }}>
              {card.value}
            </span>
          </div>
          <div className="card-element">
            <ElementIcon element={card.element} size={50} />
          </div>
          <div className="card-corner bottom-right">
            <span className="card-value" style={{ color: ELEMENT_COLORS[card.element] }}>
              {card.value}
            </span>
          </div>
        </div>
      </div>
      {card.isFlipped && !card.isShattering && (
        <div className="card-shine"></div>
      )}
      {card.isShattering && (
        <canvas ref={canvasRef} className="shatter-canvas"></canvas>
      )}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
