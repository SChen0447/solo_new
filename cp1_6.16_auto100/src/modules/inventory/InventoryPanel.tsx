import React, { useState, useEffect, useCallback } from 'react';
import { usePetStore } from '../pets/PetSystem';
import { eventBus, CloudData, PetData, CloudRarity } from '../../shared/eventBus';

const LOCATIONS = [
  '欢乐云海', '星辉平原', '晨曦峡谷', '彩虹瀑布', '月光湖畔',
  '风语山丘', '梦境森林', '天空之城', '云端花园', '极光之巅',
];

interface CloudRecord {
  cloud: CloudData;
  location: string;
  capturedAt: number;
}

interface DetailData {
  type: 'cloud' | 'pet';
  data: CloudRecord | PetData;
  location?: string;
}

const ITEMS_PER_PAGE = 6;

const StarRating: React.FC<{ rarity: CloudRarity; count: number }> = ({ rarity, count }) => {
  const stars = rarity === 'rare' ? Math.min(count, 5) : Math.min(Math.max(count - 1, 1), 3);
  return (
    <span>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < stars ? '#FFD700' : '#CBD5E0', fontSize: 12 }}>
          ★
        </span>
      ))}
    </span>
  );
};

const StatBar: React.FC<{ label: string; value: number; max: number; color: string }> = ({
  label,
  value,
  max,
  color,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
    <span style={{ fontSize: 11, color: '#718096', width: 48, textAlign: 'right' }}>{label}</span>
    <div style={{
      flex: 1,
      height: 8,
      background: '#EDF2F7',
      borderRadius: 4,
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${Math.min((value / max) * 100, 100)}%`,
        background: color,
        borderRadius: 4,
        transition: 'width 0.3s ease-out',
      }} />
    </div>
    <span style={{ fontSize: 11, color: '#4A5568', fontWeight: 600, width: 24 }}>{value}</span>
  </div>
);

const InventoryPanel: React.FC = () => {
  const [tab, setTab] = useState<'clouds' | 'pets'>('clouds');
  const [cloudPage, setCloudPage] = useState(0);
  const [petPage, setPetPage] = useState(0);
  const [cloudRecords, setCloudRecords] = useState<CloudRecord[]>([]);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const pets = usePetStore(s => s.pets);
  const eggs = usePetStore(s => s.eggs);

  useEffect(() => {
    const unsub = eventBus.on('CLOUD_CAPTURED', (e) => {
      setCloudRecords(prev => {
        if (prev.find(r => r.cloud.id === e.cloud.id)) return prev;
        return [...prev, {
          cloud: e.cloud,
          location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
          capturedAt: Date.now(),
        }];
      });
    });
    return unsub;
  }, []);

  const sortedClouds = [...cloudRecords].sort((a, b) => {
    if (a.cloud.rarity === 'rare' && b.cloud.rarity !== 'rare') return -1;
    if (a.cloud.rarity !== 'rare' && b.cloud.rarity === 'rare') return 1;
    return b.capturedAt - a.capturedAt;
  });

  const sortedPets = [...pets].sort((a, b) => {
    if (a.rarity === 'rare' && b.rarity !== 'rare') return -1;
    if (a.rarity !== 'rare' && b.rarity === 'rare') return 1;
    return 0;
  });

  const totalCloudPages = Math.max(1, Math.ceil(sortedClouds.length / ITEMS_PER_PAGE));
  const totalPetPages = Math.max(1, Math.ceil(sortedPets.length / ITEMS_PER_PAGE));

  const currentCloudPage = sortedClouds.slice(
    cloudPage * ITEMS_PER_PAGE,
    (cloudPage + 1) * ITEMS_PER_PAGE
  );
  const currentPetPage = sortedPets.slice(
    petPage * ITEMS_PER_PAGE,
    (petPage + 1) * ITEMS_PER_PAGE
  );

  const openDetail = useCallback((data: DetailData) => {
    setDetail(data);
  }, []);

  const closeDetail = useCallback(() => {
    setDetail(null);
  }, []);

  const placeholderItems = (count: number) =>
    Array.from({ length: count }, (_, i) => (
      <div
        key={`ph_${i}`}
        style={{
          width: '100%',
          aspectRatio: '1',
          background: '#EDF2F7',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          color: '#CBD5E0',
          border: '1px dashed #CBD5E0',
        }}
      >
        ?
      </div>
    ));

  return (
    <div style={{
      padding: 12,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      overflow: 'hidden',
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: '#4A5568',
        textAlign: 'center',
        padding: '4px 0',
        borderBottom: '2px solid #E2E8F0',
      }}>
        📖 图鉴 & 背包
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={() => setTab('clouds')}
          style={{
            flex: 1,
            padding: '6px 0',
            border: 'none',
            borderRadius: 8,
            background: tab === 'clouds' ? 'linear-gradient(135deg, #87CEEB, #7B68EE)' : '#EDF2F7',
            color: tab === 'clouds' ? '#fff' : '#718096',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s ease-out, color 0.2s',
          }}
        >
          ☁️ 云朵
        </button>
        <button
          onClick={() => setTab('pets')}
          style={{
            flex: 1,
            padding: '6px 0',
            border: 'none',
            borderRadius: 8,
            background: tab === 'pets' ? 'linear-gradient(135deg, #FF69B4, #9370DB)' : '#EDF2F7',
            color: tab === 'pets' ? '#fff' : '#718096',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s ease-out, color 0.2s',
          }}
        >
          🐾 宠物
        </button>
      </div>

      <div style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {tab === 'clouds' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 6,
            transition: 'transform 0.3s ease-in-out',
            transform: `translateX(-${cloudPage * 100}%)`,
          }}>
            {currentCloudPage.map(record => (
              <div
                key={record.cloud.id}
                onClick={() => openDetail({ type: 'cloud', data: record, location: record.location })}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  background: record.cloud.rarity === 'rare'
                    ? `linear-gradient(135deg, ${record.cloud.color}33, #FFD70033)`
                    : '#fff',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: `1px solid ${record.cloud.rarity === 'rare' ? '#FFD700' : '#E2E8F0'}`,
                  transition: 'transform 0.2s ease-out',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <div style={{
                  fontSize: 24,
                  filter: record.cloud.rarity === 'rare' ? 'drop-shadow(0 0 4px gold)' : 'none',
                }}>
                  ☁️
                </div>
                <div style={{
                  fontSize: 9,
                  color: '#4A5568',
                  marginTop: 2,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  padding: '0 2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}>
                  {record.cloud.name}
                </div>
                {record.cloud.rarity === 'rare' && (
                  <span style={{ fontSize: 8, color: '#FFD700' }}>✨</span>
                )}
              </div>
            ))}
            {currentCloudPage.length < ITEMS_PER_PAGE &&
              placeholderItems(ITEMS_PER_PAGE - currentCloudPage.length)}
          </div>
        )}

        {tab === 'pets' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 6,
            transition: 'transform 0.3s ease-in-out',
            transform: `translateX(-${petPage * 100}%)`,
          }}>
            {currentPetPage.map(pet => (
              <div
                key={pet.id}
                onClick={() => openDetail({ type: 'pet', data: pet })}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  background: pet.rarity === 'rare'
                    ? `linear-gradient(135deg, ${pet.color}33, #FF69B433)`
                    : '#fff',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: `1px solid ${pet.rarity === 'rare' ? '#FFD700' : '#E2E8F0'}`,
                  transition: 'transform 0.2s ease-out',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <div style={{
                  fontSize: 22,
                  filter: pet.rarity === 'rare' ? 'drop-shadow(0 0 4px gold)' : 'none',
                }}>
                  🐾
                </div>
                <div style={{
                  fontSize: 9,
                  color: '#4A5568',
                  marginTop: 2,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}>
                  {pet.name}
                </div>
                <div style={{ fontSize: 8, color: '#718096' }}>Lv.{pet.stage}</div>
              </div>
            ))}
            {currentPetPage.length < ITEMS_PER_PAGE &&
              placeholderItems(ITEMS_PER_PAGE - currentPetPage.length)}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
      }}>
        <button
          onClick={() => tab === 'clouds' ? setCloudPage(Math.max(0, cloudPage - 1)) : setPetPage(Math.max(0, petPage - 1))}
          disabled={tab === 'clouds' ? cloudPage === 0 : petPage === 0}
          style={{
            padding: '4px 10px',
            border: 'none',
            borderRadius: 8,
            background: (tab === 'clouds' ? cloudPage : petPage) === 0 ? '#EDF2F7' : '#7B68EE',
            color: (tab === 'clouds' ? cloudPage : petPage) === 0 ? '#A0AEC0' : '#fff',
            fontSize: 11,
            cursor: (tab === 'clouds' ? cloudPage : petPage) === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          ◀
        </button>
        <span style={{ fontSize: 11, color: '#718096' }}>
          {tab === 'clouds' ? `${cloudPage + 1}/${totalCloudPages}` : `${petPage + 1}/${totalPetPages}`}
        </span>
        <button
          onClick={() => tab === 'clouds' ? setCloudPage(Math.min(totalCloudPages - 1, cloudPage + 1)) : setPetPage(Math.min(totalPetPages - 1, petPage + 1))}
          disabled={tab === 'clouds' ? cloudPage >= totalCloudPages - 1 : petPage >= totalPetPages - 1}
          style={{
            padding: '4px 10px',
            border: 'none',
            borderRadius: 8,
            background: (tab === 'clouds' ? cloudPage >= totalCloudPages - 1 : petPage >= totalPetPages - 1) ? '#EDF2F7' : '#7B68EE',
            color: (tab === 'clouds' ? cloudPage >= totalCloudPages - 1 : petPage >= totalPetPages - 1) ? '#A0AEC0' : '#fff',
            fontSize: 11,
            cursor: (tab === 'clouds' ? cloudPage >= totalCloudPages - 1 : petPage >= totalPetPages - 1) ? 'not-allowed' : 'pointer',
          }}
        >
          ▶
        </button>
      </div>

      {detail && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '45%',
            background: '#fff',
            borderRadius: '16px 16px 0 0',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
            padding: 20,
            zIndex: 100,
            animation: 'slideUp 0.2s ease-out',
            overflow: 'auto',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#4A5568' }}>
              {detail.type === 'cloud'
                ? (detail.data as CloudRecord).cloud.name
                : (detail.data as PetData).name}
            </div>
            <button
              onClick={closeDetail}
              style={{
                border: 'none',
                background: '#EDF2F7',
                borderRadius: '50%',
                width: 28,
                height: 28,
                fontSize: 14,
                cursor: 'pointer',
                color: '#718096',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          {detail.type === 'cloud' && (() => {
            const rec = detail.data as CloudRecord;
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 36 }}>
                    ☁️
                  </span>
                  <div>
                    <StarRating rarity={rec.cloud.rarity} count={rec.cloud.rarity === 'rare' ? 4 : 2} />
                    <div style={{ fontSize: 11, color: '#718096' }}>
                      {rec.cloud.rarity === 'rare' ? '✨ 稀有' : '普通'}
                    </div>
                  </div>
                </div>
                <div style={{
                  background: '#F7FAFC',
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 12,
                  color: '#4A5568',
                  marginBottom: 8,
                }}>
                  📍 捕捉地点: {detail.location || LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)]}
                </div>
                <div style={{
                  background: '#F7FAFC',
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 12,
                  color: '#4A5568',
                }}>
                  🎨 云朵颜色: <span style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: rec.cloud.color,
                    verticalAlign: 'middle',
                    border: '1px solid #E2E8F0',
                  }} />
                </div>
              </div>
            );
          })()}

          {detail.type === 'pet' && (() => {
            const pet = detail.data as PetData;
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 36 }}>🐾</span>
                  <div>
                    <StarRating rarity={pet.rarity} count={pet.rarity === 'rare' ? 4 : 2} />
                    <div style={{ fontSize: 11, color: '#718096' }}>
                      {pet.rarity === 'rare' ? '✨ 稀有宠物' : '普通宠物'} · 等级 {pet.stage}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <StatBar label="攻击力" value={pet.attack} max={60} color="#FF6B6B" />
                  <StatBar label="速度" value={pet.speed} max={40} color="#4ECDC4" />
                  <StatBar label="可爱度" value={pet.cuteness} max={50} color="#FF69B4" />
                </div>
                <div style={{
                  background: '#F7FAFC',
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 12,
                  color: '#4A5568',
                  marginTop: 8,
                }}>
                  进化阶段: {'⭐'.repeat(pet.stage)}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {detail && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 99,
          }}
          onClick={closeDetail}
        />
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default InventoryPanel;
