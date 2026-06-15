import { useRef, useState, useEffect } from 'react';
import type { Pet } from '../modules/battle/PokemonData';
import { TYPE_NAMES } from '../modules/battle/PokemonData';

interface PetCardProps {
  pet: Pet;
  onClick?: () => void;
  isSelected?: boolean;
  forBattle?: boolean;
  showStats?: boolean;
}

export function PetCard({ pet, onClick, isSelected, forBattle, showStats = true }: PetCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showParticles, setShowParticles] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);

  const rarityStars = Array.from({ length: 5 }, (_, i) => i < pet.rarity);
  const expPercent = Math.floor((pet.exp / pet.expToNextLevel) * 100);

  useEffect(() => {
    if (showParticles && particles.length > 0) {
      const timer = setTimeout(() => {
        setShowParticles(false);
        setParticles([]);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [showParticles, particles.length]);

  const triggerParticles = () => {
    const colors = ['#FF6B35', '#FFB347', '#FF6B6B', '#4ECDC4', '#95E879'];
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 100,
      y: (Math.random() - 0.5) * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);
    setShowParticles(true);
  };

  return (
    <div
      ref={cardRef}
      className={`card pet-card ${isSelected ? 'selected' : ''} ${forBattle ? 'battle-select' : ''}`}
      onClick={() => {
        onClick?.();
      }}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'visible',
        opacity: 1,
        transform: 'translateY(0)',
        transition: 'all 0.3s ease-out',
        borderColor: isSelected ? 'var(--accent)' : undefined,
        boxShadow: isSelected ? '0 0 20px rgba(255, 107, 53, 0.3)' : undefined,
      }}
    >
      {showParticles && particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: '50%',
            top: '50%',
            background: p.color,
            ['--tx' as any]: `${p.x}px`,
            ['--ty' as any]: `${p.y}px`,
          } as React.CSSProperties}
        />
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            fontSize: 48,
            width: 60,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            borderRadius: 12,
          }}
        >
          {pet.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{pet.name}</span>
            <span className={`type-badge type-${pet.type}`}>{TYPE_NAMES[pet.type]}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Lv.{pet.level}
          </div>
          <div style={{ fontSize: 14 }}>
            {rarityStars.map((filled, i) => (
              <span key={i} className={filled ? 'star' : 'star-empty'}>★</span>
            ))}
          </div>
        </div>
      </div>

      {showStats && (
        <>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
              <span>经验</span>
              <span>{pet.exp}/{pet.expToNextLevel}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${expPercent}%` }} />
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">攻击</div>
              <div className="stat-value" style={{ color: '#FF6B6B' }}>{pet.stats.attack}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">防御</div>
              <div className="stat-value" style={{ color: '#4ECDC4' }}>{pet.stats.defense}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">速度</div>
              <div className="stat-value" style={{ color: '#FFE66D' }}>{pet.stats.speed}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">生命</div>
              <div className="stat-value" style={{ color: '#95E879' }}>{pet.stats.hp}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">暴击</div>
              <div className="stat-value" style={{ color: '#9B59B6' }}>{pet.stats.critRate.toFixed(1)}%</div>
            </div>
          </div>
        </>
      )}

      {forBattle && isSelected && (
        <div
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 28,
            height: 28,
            background: 'var(--accent)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          ✓
        </div>
      )}
    </div>
  );
}
