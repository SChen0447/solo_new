import { useState, useMemo, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { PetCard } from './PetCard';
import type { Pet, PetType, Item } from '../modules/battle/PokemonData';
import { TYPE_NAMES } from '../modules/battle/PokemonData';

type SortType = 'level-desc' | 'level-asc' | 'rarity-desc' | 'rarity-asc';

const VISIBLE_COUNT = 10;

export function PetWarehouse() {
  const { pets, petOrder, items, selectedPetId, selectPet, showPetDetail, setShowPetDetail, useItem } = useGameStore();
  const [filterType, setFilterType] = useState<PetType | 'all'>('all');
  const [sortType, setSortType] = useState<SortType>('level-desc');
  const [scrollTop, setScrollTop] = useState(0);
  const [particlePositions, setParticlePositions] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const orderedPets = useMemo(() => {
    return petOrder
      .map((id) => pets.find((p) => p.id === id))
      .filter((p): p is Pet => p !== undefined);
  }, [pets, petOrder]);

  const filteredPets = useMemo(() => {
    let result = [...orderedPets];

    if (filterType !== 'all') {
      result = result.filter((p) => p.type === filterType);
    }

    result.sort((a, b) => {
      switch (sortType) {
        case 'level-desc':
          return b.level - a.level;
        case 'level-asc':
          return a.level - b.level;
        case 'rarity-desc':
          return b.rarity - a.rarity;
        case 'rarity-asc':
          return a.rarity - b.rarity;
        default:
          return 0;
      }
    });

    return result;
  }, [orderedPets, filterType, sortType]);

  const visiblePets = useMemo(() => {
    return filteredPets.slice(0, VISIBLE_COUNT);
  }, [filteredPets]);

  const selectedPet = pets.find((p) => p.id === selectedPetId);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handlePetClick = (pet: Pet) => {
    selectPet(pet.id);
    setShowPetDetail(true);
  };

  const handleUseItem = (item: Item) => {
    if (!selectedPet || item.count <= 0) return;

    useItem(item.id, selectedPet.id);

    const colors = ['#FF6B35', '#FFB347', '#FF6B6B', '#4ECDC4', '#95E879', '#9B59B6'];
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 150,
      y: -100 - Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticlePositions(newParticles);

    setTimeout(() => {
      setParticlePositions([]);
    }, 900);
  };

  const closeDetail = () => {
    setShowPetDetail(false);
    selectPet(null);
  };

  const filterTypes: Array<{ key: PetType | 'all'; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'fire', label: '🔥 火' },
    { key: 'water', label: '💧 水' },
    { key: 'grass', label: '🌿 草' },
    { key: 'electric', label: '⚡ 电' },
    { key: 'dark', label: '🌙 暗' },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2 className="page-title">🏠 宠物仓库</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 600 }}>共有 {pets.length} 只宠物</span>
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
            style={{
              padding: '6px 12px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <option value="level-desc">等级从高到低</option>
            <option value="level-asc">等级从低到高</option>
            <option value="rarity-desc">稀有度从高到低</option>
            <option value="rarity-asc">稀有度从低到高</option>
          </select>
        </div>

        <div className="filter-bar">
          {filterTypes.map((f) => (
            <button
              key={f.key}
              className={`filter-btn ${filterType === f.key ? 'active' : ''}`}
              onClick={() => setFilterType(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          maxHeight: 'calc(100vh - 280px)',
          overflowY: 'auto',
        }}
      >
        {filteredPets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>🐣</p>
            <p style={{ color: 'var(--text-secondary)' }}>
              还没有宠物，快去地图上探索吧！
            </p>
          </div>
        ) : (
          <div className="pet-grid">
            {visiblePets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                onClick={() => handlePetClick(pet)}
              />
            ))}
          </div>
        )}

        {filteredPets.length > VISIBLE_COUNT && (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-secondary)' }}>
            还有 {filteredPets.length - VISIBLE_COUNT} 只宠物，向下滚动查看更多
          </div>
        )}
      </div>

      {showPetDetail && selectedPet && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 24, position: 'relative' }}>
              <button
                onClick={closeDetail}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: 24,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div style={{ fontSize: 80, marginBottom: 12 }}>{selectedPet.emoji}</div>
                  {particlePositions.map((p) => (
                    <div
                      key={p.id}
                      className="particle"
                      style={{
                        left: '50%',
                        bottom: 20,
                        background: p.color,
                        ['--tx' as any]: `${p.x}px`,
                        ['--ty' as any]: `${p.y}px`,
                        width: 10,
                        height: 10,
                      } as React.CSSProperties}
                    />
                  ))}
                </div>

                <h2 style={{ marginBottom: 8 }}>{selectedPet.name}</h2>
                <div style={{ marginBottom: 8 }}>
                  <span className={`type-badge type-${selectedPet.type}`} style={{ marginRight: 8 }}>
                    {TYPE_NAMES[selectedPet.type]}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    Lv.{selectedPet.level}
                  </span>
                </div>
                <div style={{ fontSize: 18, marginBottom: 16 }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < selectedPet.rarity ? 'star' : 'star-empty'}>★</span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span>经验值</span>
                  <span>{selectedPet.exp} / {selectedPet.expToNextLevel}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${(selectedPet.exp / selectedPet.expToNextLevel) * 100}%` }}
                  />
                </div>
              </div>

              <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="stat-item">
                  <div className="stat-label">攻击</div>
                  <div className="stat-value" style={{ color: '#FF6B6B' }}>{selectedPet.stats.attack}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">防御</div>
                  <div className="stat-value" style={{ color: '#4ECDC4' }}>{selectedPet.stats.defense}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">速度</div>
                  <div className="stat-value" style={{ color: '#FFE66D' }}>{selectedPet.stats.speed}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">生命</div>
                  <div className="stat-value" style={{ color: '#95E879' }}>{selectedPet.stats.hp}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">暴击</div>
                  <div className="stat-value" style={{ color: '#9B59B6' }}>{selectedPet.stats.critRate.toFixed(1)}%</div>
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: 12 }}>🎒 使用道具</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleUseItem(item)}
                      disabled={item.count <= 0}
                      className="card"
                      style={{
                        textAlign: 'center',
                        padding: 12,
                        cursor: item.count > 0 ? 'pointer' : 'not-allowed',
                        opacity: item.count > 0 ? 1 : 0.4,
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 4 }}>{item.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>x{item.count}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedPet.skills.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h4 style={{ marginBottom: 12 }}>⚡ 技能</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedPet.skills.map((skill) => (
                      <div
                        key={skill.name}
                        className="card"
                        style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{skill.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{skill.description}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{skill.power}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>威力</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
