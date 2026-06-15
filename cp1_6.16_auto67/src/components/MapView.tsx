import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { MapEngine } from '../modules/explorer/MapEngine';
import type { Egg, Pet } from '../modules/battle/PokemonData';
import { TYPE_NAMES } from '../modules/battle/PokemonData';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [hatchedPet, setHatchedPet] = useState<Pet | null>(null);
  const [isHatching, setIsHatching] = useState(false);
  const [hatchingEgg, setHatchingEgg] = useState<Egg | null>(null);

  const { mapState, addEgg, removeEgg, addPet } = useGameStore();

  useEffect(() => {
    const engine = new MapEngine(10, 50);
    engineRef.current = engine;

    engine.setOnEggSpawn((egg) => {
      addEgg(egg);
    });

    engine.startSpawning(5000);

    return () => {
      engine.stopSpawning();
    };
  }, [addEgg]);

  const handleEggClick = useCallback(
    (egg: Egg, event: React.MouseEvent) => {
      if (isHatching) return;

      const rect = mapRef.current?.getBoundingClientRect();
      if (rect) {
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const rippleId = Date.now();
        setRipples((prev) => [...prev, { id: rippleId, x, y }]);
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== rippleId));
        }, 600);
      }

      setIsHatching(true);
      setHatchingEgg(egg);

      setTimeout(() => {
        if (engineRef.current) {
          const pet = engineRef.current.collectEgg(egg.id);
          if (pet) {
            addPet(pet);
            setHatchedPet(pet);
            removeEgg(egg.id);
          }
        }
        setIsHatching(false);
        setHatchingEgg(null);
      }, 1500);
    },
    [isHatching, addPet, removeEgg]
  );

  const closePetModal = () => {
    setHatchedPet(null);
  };

  const gridSize = 10;
  const cellSize = 50;
  const mapWidth = gridSize * cellSize;
  const mapHeight = gridSize * cellSize;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 className="page-title" style={{ textAlign: 'center', marginBottom: 16 }}>
        🗺️ 探索地图
      </h2>

      <div
        ref={mapRef}
        style={{
          position: 'relative',
          width: mapWidth,
          height: mapHeight,
          background: 'var(--map-bg)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <svg
          width={mapWidth}
          height={mapHeight}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          {Array.from({ length: gridSize + 1 }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={i * cellSize}
              y1={0}
              x2={i * cellSize}
              y2={mapHeight}
              stroke="var(--map-grid)"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: gridSize + 1 }, (_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={i * cellSize}
              x2={mapWidth}
              y2={i * cellSize}
              stroke="var(--map-grid)"
              strokeWidth="1"
            />
          ))}
        </svg>

        {mapState.eggs.map((egg) => (
          <div
            key={egg.id}
            className="egg-icon"
            onClick={(e) => handleEggClick(egg, e)}
            style={{
              position: 'absolute',
              left: egg.x * cellSize + cellSize / 2 - 20,
              top: egg.y * cellSize + cellSize / 2 - 20,
              width: 40,
              height: 40,
              fontSize: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.2))`,
            }}
          >
            🥚
          </div>
        ))}

        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="ripple-effect"
            style={{
              left: ripple.x - 20,
              top: ripple.y - 20,
              width: 40,
              height: 40,
            }}
          />
        ))}

        {isHatching && hatchingEgg && (
          <div
            style={{
              position: 'absolute',
              left: hatchingEgg.x * cellSize + cellSize / 2 - 30,
              top: hatchingEgg.y * cellSize + cellSize / 2 - 30,
              width: 60,
              height: 60,
              fontSize: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'shellBreak 1.5s ease-out forwards',
              zIndex: 20,
            }}
          >
            🥚
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
        <p>地图上每隔5秒会出现宠物蛋</p>
        <p>点击宠物蛋来孵化新宠物！</p>
        <p style={{ marginTop: 8, color: 'var(--accent)' }}>
          当前地图上有 {mapState.eggs.length} 个宠物蛋
        </p>
      </div>

      {hatchedPet && (
        <div className="modal-overlay" onClick={closePetModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 24, textAlign: 'center' }}>
              <h3 style={{ marginBottom: 16, fontSize: 24 }}>🎉 恭喜获得新宠物！</h3>

              <div style={{ fontSize: 80, marginBottom: 16 }}>{hatchedPet.emoji}</div>

              <h2 style={{ marginBottom: 8 }}>{hatchedPet.name}</h2>

              <div style={{ marginBottom: 12 }}>
                <span className={`type-badge type-${hatchedPet.type}`} style={{ marginRight: 8 }}>
                  {TYPE_NAMES[hatchedPet.type]}
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Lv.{hatchedPet.level}
                </span>
              </div>

              <div style={{ fontSize: 18, marginBottom: 16 }}>
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={i < hatchedPet.rarity ? 'star' : 'star-empty'}>★</span>
                ))}
              </div>

              <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-item">
                  <div className="stat-label">攻击</div>
                  <div className="stat-value" style={{ color: '#FF6B6B' }}>{hatchedPet.stats.attack}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">防御</div>
                  <div className="stat-value" style={{ color: '#4ECDC4' }}>{hatchedPet.stats.defense}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">速度</div>
                  <div className="stat-value" style={{ color: '#FFE66D' }}>{hatchedPet.stats.speed}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">生命</div>
                  <div className="stat-value" style={{ color: '#95E879' }}>{hatchedPet.stats.hp}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">暴击</div>
                  <div className="stat-value" style={{ color: '#9B59B6' }}>{hatchedPet.stats.critRate.toFixed(1)}%</div>
                </div>
              </div>

              <button className="btn" onClick={closePetModal} style={{ width: '100%', padding: 12 }}>
                收下宠物
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
