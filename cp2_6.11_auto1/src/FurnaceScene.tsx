import { useRef, useEffect, useState, useCallback } from 'react';
import {
  RUNE_ELEMENTS,
  Particle,
  hexToRgb,
  mixColors,
  complementaryColor,
} from '@/types';

interface SlotState {
  runeId: string | null;
  pulsePhase: number;
}

interface FurnaceSceneProps {
  slots: SlotState[];
  phase: 'idle' | 'fusion' | 'naming' | 'complete';
  onSpellNamed: (name: string) => void;
  spellColor: string;
}

const SLOT_RADIUS = 30;
const SLOT_SPACING = 80;
const FIRE_COLORS = ['#ff3d00', '#ff6b35', '#ff9800', '#ffc107'];
const MAX_FIRE_PARTICLES = 80;

interface StoneBlock {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  color: string;
}

interface FusionState {
  stage: 'idle' | 'beam' | 'sphere' | 'split' | 'stable';
  stageTime: number;
  beamHeight: number;
  sphereY: number;
  sphereRadius: number;
  sphereRotation: number;
  sparkles: Array<{ x: number; y: number; size: number; alpha: number; speed: number }>;
  splitParticles: Particle[];
  spellParticles: Particle[];
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function generateStones(cx: number, furnaceTop: number, furnaceBottom: number): StoneBlock[] {
  const stones: StoneBlock[] = [];
  const furnaceWidth = 180;
  const stoneHeight = (furnaceBottom - furnaceTop) / 3;

  const positions = [
    { x: cx - furnaceWidth / 2 - 5, y: furnaceTop, w: 55, h: stoneHeight + 10 },
    { x: cx + furnaceWidth / 2 - 50, y: furnaceTop, w: 55, h: stoneHeight + 10 },
    { x: cx - furnaceWidth / 2 - 15, y: furnaceTop + stoneHeight - 5, w: 60, h: stoneHeight + 10 },
    { x: cx + furnaceWidth / 2 - 45, y: furnaceTop + stoneHeight - 5, w: 60, h: stoneHeight + 10 },
    { x: cx - furnaceWidth / 2 + 10, y: furnaceTop + stoneHeight * 2 - 10, w: 55, h: stoneHeight + 10 },
    { x: cx + furnaceWidth / 2 - 65, y: furnaceTop + stoneHeight * 2 - 10, w: 55, h: stoneHeight + 10 },
  ];

  const colors = [
    '#3d2817',
    '#4a3525',
    '#5a3d2a',
    '#453020',
    '#3a2515',
    '#553828',
  ];

  for (let i = 0; i < 6; i++) {
    const p = positions[i];
    stones.push({
      x: p.x + (Math.random() - 0.5) * 8,
      y: p.y + (Math.random() - 0.5) * 4,
      w: p.w + (Math.random() - 0.5) * 10,
      h: p.h + (Math.random() - 0.5) * 8,
      rotation: (Math.random() - 0.5) * 1.5 * (Math.PI / 180),
      color: colors[i],
    });
  }

  return stones;
}

function drawStone(ctx: CanvasRenderingContext2D, stone: StoneBlock) {
  ctx.save();
  ctx.translate(stone.x + stone.w / 2, stone.y + stone.h / 2);
  ctx.rotate(stone.rotation);

  const grad = ctx.createLinearGradient(-stone.w / 2, -stone.h / 2, stone.w / 2, stone.h / 2);
  grad.addColorStop(0, stone.color);
  grad.addColorStop(0.5, '#2a1a10');
  grad.addColorStop(1, stone.color);
  ctx.fillStyle = grad;

  ctx.beginPath();
  const hw = stone.w / 2;
  const hh = stone.h / 2;
  const r = 6;
  ctx.moveTo(-hw + r, -hh);
  ctx.quadraticCurveTo(-hw, -hh, -hw, -hh + r);
  ctx.lineTo(-hw + 3, hh - r);
  ctx.quadraticCurveTo(-hw + 5, hh, -hw + r + 3, hh);
  ctx.lineTo(hw - r - 2, hh + 2);
  ctx.quadraticCurveTo(hw, hh, hw - 2, hh - r);
  ctx.lineTo(hw, -hh + r + 2);
  ctx.quadraticCurveTo(hw, -hh, hw - r, -hh - 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-hw + 10, -hh + 8);
  ctx.quadraticCurveTo(0, -hh + 5, hw - 15, -hh + 10);
  ctx.stroke();

  ctx.restore();
}

function getSlotPositions(cx: number, slotY: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const hexRadius = SLOT_SPACING;
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 - Math.PI / 2;
    positions.push({
      x: cx + Math.cos(angle) * hexRadius,
      y: slotY + Math.sin(angle) * hexRadius,
    });
  }
  return positions;
}

export default function FurnaceScene({
  slots,
  phase,
  onSpellNamed,
  spellColor,
}: FurnaceSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fireParticlesRef = useRef<Particle[]>([]);
  const stonesRef = useRef<StoneBlock[]>([]);
  const fusionRef = useRef<FusionState>({
    stage: 'idle',
    stageTime: 0,
    beamHeight: 0,
    sphereY: 0,
    sphereRadius: 0,
    sphereRotation: 0,
    sparkles: [],
    splitParticles: [],
    spellParticles: [],
  });
  const frameRef = useRef<number>(0);
  const prevPhaseRef = useRef(phase);
  const [showNaming, setShowNaming] = useState(false);
  const [spellName, setSpellName] = useState('');

  const getRuneColor = useCallback((runeId: string | null): string => {
    if (!runeId) return '#444';
    const rune = RUNE_ELEMENTS.find((r) => r.id === runeId);
    return rune ? rune.color : '#444';
  }, []);

  const getFusionColors = useCallback((): string[] => {
    return slots
      .filter((s) => s.runeId)
      .map((s) => getRuneColor(s.runeId));
  }, [slots, getRuneColor]);

  const spawnFireParticle = useCallback((fireX: number, fireY: number, fireW: number) => {
    if (fireParticlesRef.current.length >= MAX_FIRE_PARTICLES) return;
    const color = FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)];
    fireParticlesRef.current.push({
      x: fireX + (Math.random() - 0.5) * fireW * 0.7,
      y: fireY,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(0.8 + Math.random() * 1.5),
      life: 1,
      maxLife: 0.8 + Math.random() * 0.6,
      color,
      size: 3 + Math.random() * 4,
    });
  }, []);

  const initFusionSpellParticles = useCallback((cx: number, cy: number): Particle[] => {
    const colors = getFusionColors();
    const particles: Particle[] = [];
    const count = 80 + Math.floor(Math.random() * 41);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 35;
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 0.3 + (Math.random() - 0.5) * 0.3,
        vy: Math.sin(angle) * 0.3 + (Math.random() - 0.5) * 0.3,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        color,
        size: 1.5 + Math.random() * 2.5,
      });
    }
    return particles;
  }, [getFusionColors]);

  const handleConfirmName = useCallback(() => {
    const name = spellName.trim() || '未命名法术';
    onSpellNamed(name);
    setSpellName('');
    setShowNaming(false);
  }, [spellName, onSpellNamed]);

  useEffect(() => {
    if (phase === 'naming' && prevPhaseRef.current !== 'naming') {
      setShowNaming(true);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const cx = cw / 2;
    const furnaceTop = ch * 0.35;
    const furnaceBottom = ch * 0.85;
    const fireX = cx;
    const fireY = furnaceBottom - 20;
    const fireW = 100;
    const slotY = furnaceTop - 50;

    stonesRef.current = generateStones(cx, furnaceTop, furnaceBottom);
    const slotPositions = getSlotPositions(cx, slotY);

    let lastTime = performance.now();
    let fireSpawnAccum = 0;
    let running = true;

    function resetFusion() {
      const fusion = fusionRef.current;
      fusion.stage = 'idle';
      fusion.stageTime = 0;
      fusion.beamHeight = 0;
      fusion.sphereY = slotY;
      fusion.sphereRadius = 0;
      fusion.sphereRotation = 0;
      fusion.sparkles = [];
      fusion.splitParticles = [];
      fusion.spellParticles = [];
    }

    function startFusion() {
      const fusion = fusionRef.current;
      fusion.stage = 'beam';
      fusion.stageTime = 0;
      fusion.beamHeight = 0;
    }

    function updateFusion(dt: number) {
      const fusion = fusionRef.current;
      fusion.stageTime += dt;

      if (fusion.stage === 'beam') {
        const t = Math.min(1, fusion.stageTime / 0.8);
        const targetHeight = furnaceBottom - furnaceTop + 40;
        fusion.beamHeight = easeInOutQuad(t) * targetHeight;
        if (fusion.stageTime >= 0.8) {
          fusion.stage = 'sphere';
          fusion.stageTime = 0;
          fusion.sphereRadius = 10;
          for (let i = 0; i < 15; i++) {
            fusion.sparkles.push({
              x: (Math.random() - 0.5) * 40,
              y: (Math.random() - 0.5) * 40,
              size: 2 + Math.random() * 2,
              alpha: Math.random(),
              speed: 1 + Math.random() * 2,
            });
          }
        }
      } else if (fusion.stage === 'sphere') {
        fusion.sphereRotation += dt * Math.PI;
        const t = Math.min(1, fusion.stageTime / 2);
        fusion.sphereRadius = 10 + easeInOutQuad(t) * 30;
        fusion.sphereY = slotY - 20 + Math.sin(fusion.stageTime * 3) * 5;

        for (const s of fusion.sparkles) {
          s.alpha += (Math.random() - 0.3) * 0.1;
          s.alpha = Math.max(0.2, Math.min(1, s.alpha));
        }

        if (fusion.stageTime >= 2) {
          fusion.stage = 'split';
          fusion.stageTime = 0;
          const splitCount = 5 + Math.floor(Math.random() * 4);
          const colors = getFusionColors();
          const baseColor = mixColors(colors);
          const compColor = complementaryColor(baseColor);
          const compRgb = hexToRgb(compColor);
          for (let i = 0; i < splitCount; i++) {
            const angle = (i / splitCount) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 80 + Math.random() * 50;
            fusion.splitParticles.push({
              x: cx,
              y: fusion.sphereY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1,
              maxLife: 1,
              color: `rgb(${compRgb.r},${compRgb.g},${compRgb.b})`,
              size: 4 + Math.random() * 4,
            });
          }
        }
      } else if (fusion.stage === 'split') {
        for (let i = fusion.splitParticles.length - 1; i >= 0; i--) {
          const p = fusion.splitParticles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 30 * dt;
          p.life -= dt * 1.2;
          if (p.life <= 0) {
            fusion.splitParticles.splice(i, 1);
          }
        }
        fusion.sphereRotation += dt * Math.PI * 2;
        fusion.sphereRadius = 35 - fusion.stageTime * 8;
        if (fusion.sphereRadius < 25) fusion.sphereRadius = 25;

        if (fusion.stageTime >= 1) {
          fusion.stage = 'stable';
          fusion.stageTime = 0;
          fusion.spellParticles = initFusionSpellParticles(cx, furnaceBottom - 30);
        }
      } else if (fusion.stage === 'stable') {
        for (const p of fusion.spellParticles) {
          p.x += p.vx;
          p.y += p.vy;
          p.life += 0.01;
          if (p.life > 1) p.life = 0;

          const dx = cx - p.x;
          const dy = furnaceBottom - 30 - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 35) {
            p.vx += dx * 0.003;
            p.vy += dy * 0.003;
          }
        }
      }
    }

    function drawBackground() {
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, '#3a1c1c');
      grad.addColorStop(0.6, '#1a1a1a');
      grad.addColorStop(1, '#0d0d0d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);

      const floorY = ch * 0.88;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, floorY, cw, ch - floorY);
      ctx.clip();

      const floorGrad = ctx.createLinearGradient(0, floorY, 0, ch);
      floorGrad.addColorStop(0, '#2a2018');
      floorGrad.addColorStop(1, '#181008');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, floorY, cw, ch - floorY);

      ctx.strokeStyle = 'rgba(80,60,40,0.3)';
      ctx.lineWidth = 1;
      for (let y = floorY; y < ch; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= cw; x += 40) {
          const yy = y + (Math.random() - 0.5) * 2;
          ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(40,30,20,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(40, 0);
      ctx.quadraticCurveTo(50, 100, 35, 200);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cw - 40, 0);
      ctx.quadraticCurveTo(cw - 50, 80, cw - 30, 180);
      ctx.stroke();

      function drawTorch(tx: number, ty: number) {
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(tx - 3, ty, 6, 30);
        ctx.fillStyle = '#5a4030';
        ctx.fillRect(tx - 5, ty - 5, 10, 8);
        const flicker = Math.sin(Date.now() * 0.01) * 2;
        const torchGrad = ctx.createRadialGradient(tx, ty - 8 + flicker, 0, tx, ty - 8, 25);
        torchGrad.addColorStop(0, 'rgba(255,200,100,0.4)');
        torchGrad.addColorStop(1, 'rgba(255,100,50,0)');
        ctx.fillStyle = torchGrad;
        ctx.fillRect(tx - 25, ty - 30, 50, 40);
      }
      drawTorch(60, 80);
      drawTorch(cw - 60, 70);
    }

    function drawFire() {
      for (let i = fireParticlesRef.current.length - 1; i >= 0; i--) {
        const p = fireParticlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.02;
        p.life -= 1 / (p.maxLife * 60);

        if (p.life <= 0) {
          fireParticlesRef.current.splice(i, 1);
          continue;
        }

        const alpha = p.life * 0.9;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const size = p.size * p.life;
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const glowGrad = ctx.createRadialGradient(fireX, fireY - 10, 0, fireX, fireY - 10, 80);
      glowGrad.addColorStop(0, 'rgba(255,100,30,0.25)');
      glowGrad.addColorStop(1, 'rgba(255,50,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(fireX, fireY - 10, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawSlots() {
      for (let i = 0; i < 6; i++) {
        const pos = slotPositions[i];
        const slot = slots[i];
        const runeColor = getRuneColor(slot.runeId);
        const pulse = slot.runeId ? 0.5 + 0.5 * Math.sin(slot.pulsePhase) : 0;

        ctx.save();
        ctx.translate(pos.x, pos.y);

        if (slot.runeId) {
          const glowGrad = ctx.createRadialGradient(
            0,
            0,
            SLOT_RADIUS * 0.5,
            0,
            0,
            SLOT_RADIUS + 15 + pulse * 10,
          );
          glowGrad.addColorStop(0, `${runeColor}33`);
          glowGrad.addColorStop(1, `${runeColor}00`);
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(0, 0, SLOT_RADIUS + 15 + pulse * 10, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(0, 0, SLOT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(20,15,10,0.7)';
        ctx.fill();

        ctx.strokeStyle = slot.runeId ? runeColor : 'rgba(120,100,80,0.4)';
        ctx.lineWidth = slot.runeId ? 2 + pulse : 1.5;
        ctx.stroke();

        if (slot.runeId) {
          const rune = RUNE_ELEMENTS.find((r) => r.id === slot.runeId);
          if (rune) {
            ctx.fillStyle = rune.color;
            ctx.shadowColor = rune.color;
            ctx.shadowBlur = 8 + pulse * 6;
            ctx.font = 'bold 18px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(rune.name, 0, 1);
            ctx.shadowBlur = 0;
          }
        }

        ctx.restore();
      }
    }

    function drawFusion() {
      const fusion = fusionRef.current;
      const colors = getFusionColors();
      const baseColor = mixColors(colors);
      const rgb = hexToRgb(baseColor);

      if (fusion.stage === 'beam' || fusion.stage === 'sphere' || fusion.stage === 'split') {
        if (fusion.beamHeight > 0) {
          ctx.save();
          const beamGrad = ctx.createLinearGradient(
            0,
            fireY - fusion.beamHeight,
            0,
            fireY,
          );
          beamGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
          beamGrad.addColorStop(0.3, `rgba(${rgb.r},${rgb.g},${rgb.b},0.6)`);
          beamGrad.addColorStop(0.7, `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`);
          beamGrad.addColorStop(1, `rgba(${Math.floor(rgb.r * 0.7)},${Math.floor(rgb.g * 0.5)},${Math.floor(rgb.b * 0.3)},1)`);
          ctx.fillStyle = beamGrad;

          ctx.beginPath();
          const beamTop = fireY - fusion.beamHeight;
          const topW = 20;
          const botW = 50;
          ctx.moveTo(-topW / 2, beamTop);
          ctx.lineTo(topW / 2, beamTop);
          ctx.lineTo(botW / 2, fireY);
          ctx.lineTo(-botW / 2, fireY);
          ctx.closePath();
          ctx.translate(cx, 0);
          ctx.fill();

          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.moveTo(-topW / 4, beamTop);
          ctx.lineTo(topW / 4, beamTop);
          ctx.lineTo(botW / 4, fireY);
          ctx.lineTo(-botW / 4, fireY);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      if (fusion.stage === 'sphere' || fusion.stage === 'split') {
        ctx.save();
        ctx.translate(cx, fusion.sphereY);
        ctx.rotate(fusion.sphereRotation);

        const sphereGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, fusion.sphereRadius);
        sphereGrad.addColorStop(
          0,
          `rgba(${Math.min(255, rgb.r + 50)},${Math.min(255, rgb.g + 50)},${Math.min(255, rgb.b + 50)},1)`,
        );
        sphereGrad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`);
        sphereGrad.addColorStop(
          1,
          `rgba(${Math.floor(rgb.r * 0.5)},${Math.floor(rgb.g * 0.5)},${Math.floor(rgb.b * 0.5)},0.3)`,
        );
        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(0, 0, fusion.sphereRadius, 0, Math.PI * 2);
        ctx.fill();

        for (const s of fusion.sparkles) {
          ctx.globalAlpha = s.alpha;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      if (fusion.stage === 'split') {
        for (const p of fusion.splitParticles) {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (fusion.stage === 'stable') {
        for (const p of fusion.spellParticles) {
          const alpha = Math.sin(p.life * Math.PI) * 0.9;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        const glowGrad = ctx.createRadialGradient(
          cx,
          furnaceBottom - 30,
          0,
          cx,
          furnaceBottom - 30,
          50,
        );
        glowGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`);
        glowGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, furnaceBottom - 30, 50, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function animate(timestamp: number) {
      if (!running) return;
      const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
      lastTime = timestamp;

      ctx.clearRect(0, 0, cw, ch);
      drawBackground();

      fireSpawnAccum += dt;
      while (fireSpawnAccum > 1 / 30) {
        spawnFireParticle(fireX, fireY, fireW);
        spawnFireParticle(fireX, fireY, fireW);
        if (Math.random() > 0.5) spawnFireParticle(fireX, fireY, fireW);
        fireSpawnAccum -= 1 / 30;
      }

      if (phase === 'fusion' && fusionRef.current.stage === 'idle') {
        startFusion();
      }

      if (phase === 'idle' && fusionRef.current.stage !== 'idle') {
        resetFusion();
      }

      if (phase !== 'idle') {
        updateFusion(dt);
      }

      drawFire();

      for (const stone of stonesRef.current) {
        drawStone(ctx, stone);
      }

      drawSlots();
      drawFusion();

      frameRef.current = requestAnimationFrame(animate);
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [slots, phase, spellColor, getRuneColor, getFusionColors, spawnFireParticle, initFusionSpellParticles]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      {showNaming && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 300,
              height: 200,
              backgroundColor: 'rgba(30,24,18,0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: 8,
              border: '1px solid #5a4a3a',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6), 0 0 30px rgba(255,150,50,0.1)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h3
              style={{
                margin: 0,
                color: '#ffe66d',
                fontSize: 18,
                fontFamily: "'Cinzel', Georgia, serif",
                textAlign: 'center',
                textShadow: '0 0 8px rgba(255,230,109,0.3)',
              }}
            >
              为法术命名
            </h3>
            <input
              type="text"
              maxLength={12}
              value={spellName}
              onChange={(e) => setSpellName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmName()}
              placeholder="输入法术名称..."
              autoFocus
              style={{
                padding: '10px 12px',
                fontSize: 14,
                fontFamily: "'Noto Serif SC', Georgia, serif",
                backgroundColor: 'rgba(0,0,0,0.4)',
                border: '1px solid #5a4a3a',
                borderRadius: 4,
                color: '#f0e6d2',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
              <button
                onClick={() => {
                  setShowNaming(false);
                  setSpellName('');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: 13,
                  fontFamily: "'Noto Serif SC', Georgia, serif",
                  backgroundColor: 'rgba(80,60,40,0.6)',
                  border: '1px solid #5a4a3a',
                  borderRadius: 4,
                  color: '#c4b8a0',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmName}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: 13,
                  fontFamily: "'Noto Serif SC', Georgia, serif",
                  backgroundColor: 'rgba(180,120,40,0.7)',
                  border: '1px solid #b47828',
                  borderRadius: 4,
                  color: '#fff8e0',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 6px rgba(180,120,40,0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function getSlotPositionCenter(canvasWidth: number, canvasHeight: number): {
  cx: number;
  slotY: number;
  positions: Array<{ x: number; y: number }>;
} {
  const cx = canvasWidth / 2;
  const slotY = canvasHeight * 0.35 - 50;
  return { cx, slotY, positions: getSlotPositions(cx, slotY) };
}
