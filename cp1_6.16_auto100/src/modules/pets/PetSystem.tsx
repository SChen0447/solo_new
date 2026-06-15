import React, { useEffect, useCallback, useState } from 'react';
import { create } from 'zustand';
import { eventBus, CloudData, CloudRarity, EggData, PetData, ShardData } from '../../shared/eventBus';

const PET_NAMES_COMMON = ['小白', '棉花', '雪团', '云宝', '泡泡', '绒绒', '绵绵', '软软', '团子', '雪球'];
const PET_NAMES_RARE = ['金鳞', '虹翼', '星瞳', '紫霞', '凤羽', '龙息', '月华', '极光', '琉璃', '琥珀'];

interface PetState {
  eggs: EggData[];
  pets: PetData[];
  shards: ShardData[];
  addEgg: (cloud: CloudData) => void;
  feedEgg: (eggId: string) => void;
  hatchEgg: (eggId: string) => void;
  evolvePet: (petId: string) => void;
  addShards: (cloud: CloudData, count: number) => void;
}

let eggIdCounter = 0;
let petIdCounter = 0;

function generatePixelArt(rarity: CloudRarity, stage: number, color: string): string[] {
  const base: string[][] = [
    ['  ', '■■', '■■', '  '],
    [' ■', '■■', '■■', '■ '],
    ['  ', '■■', '■■', '  '],
    ['  ', ' ■', '■ ', '  '],
  ];
  if (stage >= 2) {
    base[0] = ['■ ', '■■', '■■', ' ■'];
    base[3] = [' ', '■■', '■■', ' '];
  }
  if (stage >= 3) {
    base.unshift(['  ', '◆◆', '◆◆', '  ']);
  }
  return base.map(row => row.join(''));
}

function generatePet(cloud: CloudData): PetData {
  const names = cloud.rarity === 'rare' ? PET_NAMES_RARE : PET_NAMES_COMMON;
  const stage = 1;
  const rarityMult = cloud.rarity === 'rare' ? 1.5 : 1;
  const color = cloud.rarity === 'rare' ? cloud.color : '#FFFFFF';
  return {
    id: `pet_${petIdCounter++}`,
    name: names[Math.floor(Math.random() * names.length)],
    cloudId: cloud.id,
    rarity: cloud.rarity,
    attack: Math.floor((5 + Math.random() * 10) * rarityMult),
    speed: Math.floor((3 + Math.random() * 8) * rarityMult),
    cuteness: Math.floor((6 + Math.random() * 12) * rarityMult),
    stage,
    color,
    pixelArt: generatePixelArt(cloud.rarity, stage, color),
  };
}

export const usePetStore = create<PetState>((set, get) => ({
  eggs: [],
  pets: [],
  shards: [],
  addEgg: (cloud: CloudData) => {
    const egg: EggData = {
      id: `egg_${eggIdCounter++}`,
      cloudId: cloud.id,
      rarity: cloud.rarity,
      color: cloud.rarity === 'rare' ? cloud.color : '#FFFFFF',
      progress: 0,
      maxProgress: cloud.rarity === 'rare' ? 8 : 5,
      hatched: false,
      petId: null,
    };
    set(state => ({ eggs: [...state.eggs, egg] }));
    eventBus.emit({ type: 'EGG_CREATED', egg });
  },
  feedEgg: (eggId: string) => {
    const state = get();
    const egg = state.eggs.find(e => e.id === eggId);
    if (!egg || egg.hatched) return;
    const shard = state.shards.find(s => !s.cloudId.startsWith('_') || true);
    if (!shard || shard.count <= 0) return;
    const newProgress = egg.progress + 1;
    const newShards = state.shards.map(s =>
      s.id === shard.id ? { ...s, count: s.count - 1 } : s
    ).filter(s => s.count > 0);
    if (newProgress >= egg.maxProgress) {
      const cloud: CloudData = {
        id: egg.cloudId,
        position: { x: 0, y: 0, z: 0 },
        size: 1,
        speed: 1,
        rarity: egg.rarity,
        color: egg.color,
        name: '',
      };
      const pet = generatePet(cloud);
      const newEggs = state.eggs.map(e =>
        e.id === eggId ? { ...e, progress: newProgress, hatched: true, petId: pet.id } : e
      );
      set({ eggs: newEggs, pets: [...state.pets, pet], shards: newShards });
      eventBus.emit({ type: 'EGG_FED', eggId, progress: newProgress });
      setTimeout(() => {
        eventBus.emit({ type: 'PET_HATCHED', eggId, pet });
        eventBus.emit({ type: 'PET_ADDED', pet });
      }, 800);
    } else {
      const newEggs = state.eggs.map(e =>
        e.id === eggId ? { ...e, progress: newProgress } : e
      );
      set({ eggs: newEggs, shards: newShards });
      eventBus.emit({ type: 'EGG_FED', eggId, progress: newProgress });
    }
  },
  hatchEgg: (eggId: string) => {
    get().feedEgg(eggId);
  },
  evolvePet: (petId: string) => {
    const state = get();
    const pet = state.pets.find(p => p.id === petId);
    if (!pet || pet.stage >= 3) return;
    const hasShards = state.shards.reduce((acc, s) => acc + s.count, 0) >= 3;
    if (!hasShards) return;
    const newStage = pet.stage + 1;
    const rarityMult = pet.rarity === 'rare' ? 1.5 : 1;
    const evolved: PetData = {
      ...pet,
      stage: newStage,
      attack: pet.attack + Math.floor(5 * rarityMult),
      speed: pet.speed + Math.floor(3 * rarityMult),
      cuteness: pet.cuteness + Math.floor(4 * rarityMult),
      pixelArt: generatePixelArt(pet.rarity, newStage, pet.color),
    };
    let consumed = 0;
    const newShards = state.shards.map(s => {
      if (consumed >= 3) return s;
      const take = Math.min(s.count, 3 - consumed);
      consumed += take;
      return { ...s, count: s.count - take };
    }).filter(s => s.count > 0);
    set({
      pets: state.pets.map(p => p.id === petId ? evolved : p),
      shards: newShards,
    });
    eventBus.emit({ type: 'PET_EVOLVED', petId, pet: evolved });
  },
  addShards: (cloud: CloudData, count: number) => {
    const id = `shard_${cloud.id}`;
    set(state => {
      const existing = state.shards.find(s => s.id === id);
      if (existing) {
        return {
          shards: state.shards.map(s =>
            s.id === id ? { ...s, count: s.count + count } : s
          ),
        };
      }
      return {
        shards: [...state.shards, { id, cloudId: cloud.id, count, rarity: cloud.rarity }],
      };
    });
  },
}));

const PetSystem: React.FC = () => {
  const { eggs, pets, shards, addEgg, addShards } = usePetStore();
  const [hatchingEggId, setHatchingEggId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = eventBus.on('CLOUD_CAPTURED', (e) => {
      addEgg(e.cloud);
      addShards(e.cloud, e.shards);
      eventBus.emit({
        type: 'SHARD_UPDATED',
        shard: { id: `shard_${e.cloud.id}`, cloudId: e.cloud.id, count: e.shards, rarity: e.cloud.rarity },
      });
    });
    return unsub;
  }, [addEgg, addShards]);

  const handleFeed = useCallback((eggId: string) => {
    const feed = usePetStore.getState().feedEgg;
    setHatchingEggId(eggId);
    feed(eggId);
    setTimeout(() => setHatchingEggId(null), 800);
  }, []);

  const totalShards = shards.reduce((a, s) => a + s.count, 0);

  return (
    <div style={{
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      height: '100%',
      overflowY: 'auto',
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: '#4A5568',
        textAlign: 'center',
        padding: '4px 0',
        borderBottom: '2px solid #E2E8F0',
      }}>
        🥚 孵化槽
      </div>
      <div style={{
        fontSize: 12,
        color: '#718096',
        textAlign: 'center',
        background: 'rgba(123,104,238,0.1)',
        borderRadius: 8,
        padding: '4px 8px',
      }}>
        六边形碎片: {totalShards} 💎
      </div>
      {eggs.filter(e => !e.hatched).length === 0 && (
        <div style={{
          fontSize: 12,
          color: '#A0AEC0',
          textAlign: 'center',
          padding: 16,
          fontStyle: 'italic',
        }}>
          捕捉云朵获取宠物蛋~
        </div>
      )}
      {eggs.filter(e => !e.hatched).map(egg => (
        <div
          key={egg.id}
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: `1px solid ${egg.rarity === 'rare' ? '#FFD700' : '#E2E8F0'}`,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
          }}>
            <div style={{
              width: 36,
              height: 44,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              background: egg.rarity === 'rare'
                ? `linear-gradient(135deg, ${egg.color}, #FFD700, #FF69B4)`
                : `linear-gradient(135deg, #FFF, #E8E8E8)`,
              boxShadow: egg.rarity === 'rare' ? '0 0 8px rgba(255,215,0,0.5)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              animation: hatchingEggId === egg.id ? 'eggShake 0.1s ease-in-out infinite' : 'none',
              transition: 'transform 0.2s',
            }}>
              🥚
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#4A5568' }}>
                {egg.rarity === 'rare' ? '✨ 稀有蛋' : '普通蛋'}
              </div>
              <div style={{
                height: 6,
                background: '#EDF2F7',
                borderRadius: 3,
                marginTop: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${(egg.progress / egg.maxProgress) * 100}%`,
                  background: 'linear-gradient(90deg, #7B68EE, #87CEEB)',
                  borderRadius: 3,
                  transition: 'width 0.3s ease-out',
                }} />
              </div>
              <div style={{ fontSize: 10, color: '#A0AEC0', marginTop: 2 }}>
                {egg.progress}/{egg.maxProgress}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleFeed(egg.id)}
            disabled={totalShards <= 0}
            style={{
              width: '100%',
              padding: '6px 0',
              border: 'none',
              borderRadius: 8,
              background: totalShards > 0
                ? 'linear-gradient(135deg, #7B68EE, #87CEEB)'
                : '#CBD5E0',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: totalShards > 0 ? 'pointer' : 'not-allowed',
              transition: 'transform 0.1s ease-out, background 0.2s',
            }}
          >
            💎 喂养碎片 (+1)
          </button>
        </div>
      ))}
      <style>{`
        @keyframes eggShake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
      `}</style>
    </div>
  );
};

export default PetSystem;
