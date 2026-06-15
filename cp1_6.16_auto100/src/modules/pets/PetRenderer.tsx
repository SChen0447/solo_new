import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePetStore } from './PetSystem';
import { eventBus, PetData } from '../../shared/eventBus';

function playChirpSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (_) {}
}

interface PetSpriteProps {
  pet: PetData;
}

const PetSprite: React.FC<PetSpriteProps> = ({ pet }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 60, y: 60 });
  const [jumping, setJumping] = useState(false);
  const [jumpY, setJumpY] = useState(0);
  const [glowing, setGlowing] = useState(false);
  const mousePosRef = useRef({ x: 60, y: 60 });
  const posRef = useRef(pos);
  const animRef = useRef<number>(0);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      mousePosRef.current = {
        x: Math.max(20, Math.min(e.clientX - rect.left - 20, rect.width - 40)),
        y: Math.max(20, Math.min(e.clientY - rect.top - 20, rect.height - 40)),
      };
    };
    const el = panelRef.current;
    el?.addEventListener('mousemove', handleMouseMove);
    return () => el?.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const TRACK_SPEED = 30;
    let lastTime = performance.now();
    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      const current = posRef.current;
      const target = mousePosRef.current;
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        const step = Math.min(TRACK_SPEED * delta, dist);
        setPos({
          x: current.x + (dx / dist) * step,
          y: current.y + (dy / dist) * step,
        });
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    const unsub = eventBus.on('PET_EVOLVED', (e) => {
      if (e.petId === pet.id) {
        setGlowing(true);
        setTimeout(() => setGlowing(false), 800);
      }
    });
    return unsub;
  }, [pet.id]);

  const handleClick = useCallback(() => {
    if (jumping) return;
    setJumping(true);
    playChirpSound();
    eventBus.emit({ type: 'PET_JUMP', petId: pet.id });
    const startTime = performance.now();
    const jumpAnim = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      if (elapsed < 0.2) {
        setJumpY(-60 * (elapsed / 0.2));
        requestAnimationFrame(jumpAnim);
      } else if (elapsed < 0.4) {
        setJumpY(-60 * (1 - (elapsed - 0.2) / 0.2));
        requestAnimationFrame(jumpAnim);
      } else {
        setJumpY(0);
        setJumping(false);
      }
    };
    requestAnimationFrame(jumpAnim);
  }, [jumping, pet.id]);

  const pixelSize = 4;
  const art = pet.pixelArt;
  const artHeight = art.length * pixelSize;
  const artWidth = Math.max(...art.map(r => r.length)) * (pixelSize * 0.6);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'relative',
        width: '100%',
        height: 120,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.6)',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
      onClick={handleClick}
    >
      <div
        style={{
          position: 'absolute',
          left: pos.x - 20,
          top: pos.y - 20 + jumpY,
          transition: jumping ? 'none' : 'left 0.1s linear, top 0.1s linear',
          imageRendering: 'pixelated',
        }}
      >
        <div style={{
          display: 'inline-block',
          fontFamily: 'monospace',
          fontSize: pixelSize * 2,
          lineHeight: 1,
          color: pet.color,
          textShadow: glowing
            ? `0 0 8px ${pet.color}, 0 0 16px ${pet.color}, 0 0 24px ${pet.color}`
            : 'none',
          transition: 'text-shadow 0.3s ease-out',
          whiteSpace: 'pre',
        }}>
          {art.map((row, i) => (
            <div key={i} style={{ height: pixelSize * 2 }}>{row.replace(/■/g, '●').replace(/◆/g, '★')}</div>
          ))}
        </div>
      </div>
      <div style={{
        position: 'absolute',
        bottom: 4,
        left: 8,
        fontSize: 10,
        color: '#718096',
        fontWeight: 600,
      }}>
        {pet.name} Lv.{pet.stage}
      </div>
      <div style={{
        position: 'absolute',
        bottom: 4,
        right: 8,
        fontSize: 9,
        color: '#A0AEC0',
      }}>
        点击跳跃~
      </div>
    </div>
  );
};

const PetRenderer: React.FC = () => {
  const pets = usePetStore(s => s.pets);
  const evolvePet = usePetStore(s => s.evolvePet);
  const shards = usePetStore(s => s.shards);
  const totalShards = shards.reduce((a, s) => a + s.count, 0);

  return (
    <div style={{
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: '#4A5568',
        textAlign: 'center',
        padding: '4px 0',
        borderBottom: '2px solid #E2E8F0',
      }}>
        🐾 我的宠物
      </div>
      {pets.length === 0 && (
        <div style={{
          fontSize: 12,
          color: '#A0AEC0',
          textAlign: 'center',
          padding: 20,
          fontStyle: 'italic',
        }}>
          孵化宠物蛋来获得宠物~
        </div>
      )}
      {pets.map(pet => (
        <div
          key={pet.id}
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: `1px solid ${pet.rarity === 'rare' ? '#FFD700' : '#E2E8F0'}`,
          }}
        >
          <PetSprite pet={pet} />
          <div style={{
            display: 'flex',
            gap: 4,
            marginTop: 4,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {pet.rarity === 'rare' && <span style={{ fontSize: 10, color: '#FFD700' }}>✨稀有</span>}
              <span style={{ fontSize: 10, color: '#718096' }}>⚔{pet.attack}</span>
              <span style={{ fontSize: 10, color: '#718096' }}>💨{pet.speed}</span>
              <span style={{ fontSize: 10, color: '#718096' }}>💖{pet.cuteness}</span>
            </div>
            {pet.stage < 3 && (
              <button
                onClick={() => evolvePet(pet.id)}
                disabled={totalShards < 3}
                style={{
                  padding: '3px 8px',
                  border: 'none',
                  borderRadius: 8,
                  background: totalShards >= 3
                    ? 'linear-gradient(135deg, #FF69B4, #9370DB)'
                    : '#CBD5E0',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: totalShards >= 3 ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                }}
              >
                进化(3💎)
              </button>
            )}
            {pet.stage >= 3 && (
              <span style={{ fontSize: 10, color: '#9370DB', fontWeight: 600 }}>MAX</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PetRenderer;
