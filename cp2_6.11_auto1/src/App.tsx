import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import FurnaceScene from '@/FurnaceScene';
import RuneWheel from '@/RuneWheel';
import Spellbook from '@/Spellbook';
import {
  Spell,
  RUNE_ELEMENTS,
  SlotState,
  FurnacePhase,
  mixColors,
  generateId,
  hexToRgb,
} from '@/types';

const STORAGE_KEY = 'spellforge_spells';

function loadSpells(): Spell[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return [];
}

function saveSpells(spells: Spell[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(spells));
  } catch {
    // ignore
  }
}

interface FlyingSpell {
  id: string;
  spell: Spell;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  color: string;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

export default function App() {
  const [slots, setSlots] = useState<SlotState[]>(
    Array(6).fill(null).map(() => ({ runeId: null, pulsePhase: 0 })),
  );
  const [phase, setPhase] = useState<FurnacePhase>('idle');
  const [spells, setSpells] = useState<Spell[]>(() => loadSpells());
  const [flyingSpell, setFlyingSpell] = useState<FlyingSpell | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [slotPagePositions, setSlotPagePositions] = useState<Array<{ x: number; y: number }>>(
    Array(6).fill(null).map(() => ({ x: 0, y: 0 })),
  );

  const furnaceCanvasRef = useRef<HTMLDivElement>(null);
  const spellbookRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const fusionStartTimeRef = useRef<number>(0);
  const namingTriggeredRef = useRef(false);

  const spellColor = useMemo(() => {
    const filledSlots = slots.filter((s) => s.runeId);
    if (filledSlots.length === 0) return '#ff6b35';
    const colors = filledSlots.map((s) => {
      const rune = RUNE_ELEMENTS.find((r) => r.id === s.runeId);
      return rune ? rune.color : '#888';
    });
    return mixColors(colors);
  }, [slots]);

  useEffect(() => {
    const checkResize = () => {
      setIsMobile(window.innerWidth < 1200);
      updateSlotPositions();
    };
    checkResize();
    window.addEventListener('resize', checkResize);
    return () => window.removeEventListener('resize', checkResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSlotPositions = useCallback(() => {
    const canvasContainer = furnaceCanvasRef.current;
    if (!canvasContainer) return;
    const rect = canvasContainer.getBoundingClientRect();
    const scale = rect.width / 600;
    const cx = rect.left + rect.width / 2;
    const slotY = rect.top + (600 * 0.35 - 50) * scale;
    const hexRadius = 80 * scale;
    const positions = Array.from({ length: 6 }, (_, i) => {
      const angle = (i * Math.PI) / 3 - Math.PI / 2;
      return {
        x: cx + Math.cos(angle) * hexRadius,
        y: slotY + Math.sin(angle) * hexRadius,
      };
    });
    setSlotPagePositions(positions);
  }, []);

  useEffect(() => {
    const timer = setTimeout(updateSlotPositions, 100);
    window.addEventListener('load', updateSlotPositions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', updateSlotPositions);
    };
  }, [updateSlotPositions]);

  useEffect(() => {
    let lastTime = performance.now();

    function animate(timestamp: number) {
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      setSlots((prev) =>
        prev.map((slot) => ({
          ...slot,
          pulsePhase: slot.runeId ? slot.pulsePhase + dt * (Math.PI * 2) / 0.6 : 0,
        })),
      );

      if (phase === 'fusion' && !namingTriggeredRef.current) {
        const elapsed = timestamp - fusionStartTimeRef.current;
        if (elapsed > 4500) {
          namingTriggeredRef.current = true;
          setPhase('naming');
        }
      }

      setFlyingSpell((prev) => {
        if (!prev) return null;
        const newProgress = prev.progress + dt * 2;
        const newTrail = [...prev.trail, { x: 0, y: 0, alpha: 1 }].map((t, i, arr) => ({
          ...t,
          alpha: Math.max(0, 1 - (arr.length - 1 - i) * 0.15),
        })).slice(-12);
        if (newProgress >= 1) {
          return null;
        }
        return { ...prev, progress: newProgress, trail: newTrail };
      });

      frameRef.current = requestAnimationFrame(animate);
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [phase]);

  useEffect(() => {
    const filledCount = slots.filter((s) => s.runeId).length;
    if (filledCount >= 3 && phase === 'idle') {
      fusionStartTimeRef.current = performance.now();
      namingTriggeredRef.current = false;
      setPhase('fusion');
    }
  }, [slots, phase]);

  const handleRuneDropped = useCallback((runeId: string, slotIndex: number) => {
    if (phase !== 'idle') return;
    setSlots((prev) => {
      if (prev[slotIndex].runeId) return prev;
      const newSlots = [...prev];
      newSlots[slotIndex] = { runeId, pulsePhase: 0 };
      return newSlots;
    });
  }, [phase]);

  const handleSpellNamed = useCallback((name: string) => {
    const runeIds = slots
      .filter((s) => s.runeId)
      .slice(0, 3)
      .map((s) => s.runeId as string) as [string, string, string];

    const colors = runeIds.map((id) => {
      const rune = RUNE_ELEMENTS.find((r) => r.id === id);
      return rune ? rune.color : '#888';
    });
    const dominantColor = mixColors(colors);

    const newSpell: Spell = {
      id: generateId(),
      name,
      runeIds,
      createdAt: Date.now(),
      dominantColor,
    };

    const furnaceRect = furnaceCanvasRef.current?.getBoundingClientRect();
    const spellbookRect = spellbookRef.current?.getBoundingClientRect();

    if (furnaceRect && spellbookRect) {
      const startX = furnaceRect.left + furnaceRect.width / 2;
      const startY = furnaceRect.top + furnaceRect.height * 0.75;
      const endX = spellbookRect.left + 40;
      const endY = spellbookRect.top + 120;

      setFlyingSpell({
        id: newSpell.id,
        spell: newSpell,
        startX,
        startY,
        endX,
        endY,
        progress: 0,
        color: dominantColor,
        trail: [],
      });
    }

    setTimeout(() => {
      setSpells((prev) => {
        const updated = [...prev, newSpell];
        saveSpells(updated);
        return updated;
      });
    }, 500);

    setPhase('complete');
    setTimeout(() => {
      setSlots(Array(6).fill(null).map(() => ({ runeId: null, pulsePhase: 0 })));
      setPhase('idle');
    }, 800);
  }, [slots]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setSpells((prev) => {
      const result = [...prev];
      const [moved] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, moved);
      saveSpells(result);
      return result;
    });
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1a1210 0%, #0d0808 100%)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        fontFamily: "'Noto Serif SC', Georgia, serif",
      }}
    >
      <div
        ref={furnaceCanvasRef}
        style={{
          flex: isMobile ? '1 1 60%' : '0 0 60%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 5,
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              margin: 0,
              color: '#d4a855',
              fontSize: 28,
              fontFamily: "'Cinzel', Georgia, serif",
              fontWeight: 900,
              letterSpacing: 4,
              textShadow: '0 0 12px rgba(212,168,85,0.3), 2px 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            咒语熔炉
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              color: '#7a6a5a',
              fontSize: 12,
              letterSpacing: 2,
              fontFamily: "'Cinzel', serif",
            }}
          >
            SPELL FORGE
          </p>
        </div>

        <div
          style={{
            width: '100%',
            maxWidth: 600,
            aspectRatio: '1 / 1',
            position: 'relative',
          }}
        >
          <FurnaceScene
            slots={slots}
            phase={phase}
            onSpellNamed={handleSpellNamed}
            spellColor={spellColor}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            zIndex: 5,
          }}
        >
          <RuneWheel
            onRuneDropped={handleRuneDropped}
            slotPositions={slotPagePositions}
            disabled={phase !== 'idle'}
          />
          <p
            style={{
              margin: '8px 0 0',
              textAlign: 'center',
              color: '#6a5a4a',
              fontSize: 11,
              fontFamily: "'Noto Serif SC', serif",
            }}
          >
            拖拽符文到熔炉槽位
          </p>
        </div>
      </div>

      <div
        ref={spellbookRef}
        style={{
          flex: isMobile ? '1 1 40%' : '0 0 40%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          padding: isMobile ? '10px 20px 20px' : '20px',
          gap: 12,
          borderLeft: isMobile ? 'none' : '1px solid #2a1e14',
          borderTop: isMobile ? '1px solid #2a1e14' : 'none',
          background:
            'linear-gradient(180deg, rgba(25,18,12,0.8) 0%, rgba(15,10,8,0.9) 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: '1px solid #2a1e14',
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#c4a060',
              fontSize: 18,
              fontFamily: "'Cinzel', Georgia, serif",
              letterSpacing: 2,
              textShadow: '0 0 8px rgba(196,160,96,0.2)',
            }}
          >
            法术书
          </h2>
          <div
            style={{
              color: '#8a7a6a',
              fontSize: 11,
              fontFamily: 'Georgia, serif',
            }}
          >
            共 {spells.length} 卷
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <Spellbook spells={spells} onReorder={handleReorder} />
        </div>
      </div>

      {flyingSpell && (
        <FlyingSpellOrb flying={flyingSpell} />
      )}
    </div>
  );
}

function FlyingSpellOrb({ flying }: { flying: FlyingSpell }) {
  const t = flying.progress;
  const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const arcHeight = 150;
  const x = flying.startX + (flying.endX - flying.startX) * easeT;
  const y =
    flying.startY +
    (flying.endY - flying.startY) * easeT -
    Math.sin(easeT * Math.PI) * arcHeight;

  const rgb = hexToRgb(flying.color);
  const size = 20 + Math.sin(t * Math.PI * 2) * 4;

  const trailPoints = flying.trail.map((_, i, arr) => {
    const ratio = i / Math.max(1, arr.length - 1);
    const tt = Math.max(0, t - (1 - ratio) * 0.15);
    const ease = tt < 0.5 ? 2 * tt * tt : 1 - Math.pow(-2 * tt + 2, 2) / 2;
    const tx = flying.startX + (flying.endX - flying.startX) * ease;
    const ty =
      flying.startY +
      (flying.endY - flying.startY) * ease -
      Math.sin(ease * Math.PI) * arcHeight;
    return { x: tx, y: ty, alpha: ratio * 0.7, size: size * (0.3 + ratio * 0.7) };
  });

  return (
    <>
      {trailPoints.map((pt, i) => (
        <div
          key={`trail-${i}`}
          style={{
            position: 'fixed',
            left: pt.x - pt.size / 2,
            top: pt.y - pt.size / 2,
            width: pt.size,
            height: pt.size,
            borderRadius: '50%',
            backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},${pt.alpha})`,
            boxShadow: `0 0 ${pt.size * 2}px rgba(${rgb.r},${rgb.g},${rgb.b},${pt.alpha * 0.5})`,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        />
      ))}
      <div
        style={{
          position: 'fixed',
          left: x - size,
          top: y - size,
          width: size * 2,
          height: size * 2,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${Math.min(255, rgb.r + 60)},${Math.min(255, rgb.g + 60)},${Math.min(255, rgb.b + 60)},1) 0%, rgba(${rgb.r},${rgb.g},${rgb.b},0.8) 40%, rgba(${Math.floor(rgb.r * 0.5)},${Math.floor(rgb.g * 0.5)},${Math.floor(rgb.b * 0.5)},0) 100%)`,
          boxShadow: `0 0 ${size * 3}px rgba(${rgb.r},${rgb.g},${rgb.b},0.6), 0 0 ${size * 6}px rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`,
          pointerEvents: 'none',
          zIndex: 1001,
          transition: 'width 0.05s, height 0.05s',
        }}
      />
    </>
  );
}
