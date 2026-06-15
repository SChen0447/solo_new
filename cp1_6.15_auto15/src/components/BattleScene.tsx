import React, { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';

const BattleScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const enemies = useAppStore((s) => s.enemies);
  const particles = useAppStore((s) => s.particles);
  const skillNamePopup = useAppStore((s) => s.skillNamePopup);
  const shake = useAppStore((s) => s.shake);
  const shieldActive = useAppStore((s) => s.shieldActive);
  const audioFeatures = useAppStore((s) => s.audioFeatures);
  const updateParticles = useAppStore((s) => s.updateParticles);
  const clearSkillEffects = useAppStore((s) => s.clearSkillEffects);

  const playerX = 120;
  const playerSize = 80;
  const lastTimeRef = useRef(0);

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D, groundY: number, time: number) => {
    const py = groundY - playerSize;
    const bobY = Math.sin(time / 300) * 3;

    ctx.save();
    ctx.shadowColor = '#58a6ff';
    ctx.shadowBlur = 15;

    ctx.fillStyle = '#58a6ff';
    ctx.fillRect(playerX, py + bobY, playerSize, playerSize);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0d1117';
    const eyeSize = 8;
    const eyeY = py + bobY + 22;
    ctx.fillRect(playerX + 18, eyeY, eyeSize, eyeSize);
    ctx.fillRect(playerX + 50, eyeY, eyeSize, eyeSize);

    ctx.fillStyle = '#79c0ff';
    const mouthY = py + bobY + 48;
    ctx.fillRect(playerX + 22, mouthY, 36, 4);

    ctx.restore();

    if (shieldActive) {
      ctx.save();
      ctx.strokeStyle = '#3fb950';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.4 + Math.sin(time / 200) * 0.2;
      ctx.beginPath();
      ctx.ellipse(
        playerX + playerSize / 2,
        py + playerSize / 2,
        playerSize * 0.9,
        playerSize * 0.9,
        0, 0, Math.PI * 2
      );
      ctx.stroke();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#3fb950';
      ctx.fill();
      ctx.restore();
    }

    if (audioFeatures && audioFeatures.volume > 0.1) {
      ctx.save();
      ctx.globalAlpha = audioFeatures.volume * 0.5;
      ctx.strokeStyle = '#58a6ff';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const radius = playerSize * 0.6 + i * 12 + Math.sin(time / 100 + i) * 5;
        ctx.beginPath();
        ctx.arc(playerX + playerSize / 2, py + playerSize / 2, radius, -0.5, 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [shieldActive, audioFeatures]);

  const drawEnemy = useCallback((ctx: CanvasRenderingContext2D, enemy: typeof enemies[0], time: number) => {
    ctx.save();
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = 8;

    if (enemy.type === 'flying') {
      const wingOffset = Math.sin(time / 150) * 8;
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.x - enemy.width / 2, enemy.y - wingOffset);
      ctx.lineTo(enemy.x - enemy.width, enemy.y);
      ctx.lineTo(enemy.x - enemy.width / 2, enemy.y + wingOffset);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(enemy.x - 10, enemy.y - 5, 5, 5);
    } else if (enemy.type === 'boss') {
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height, enemy.width, enemy.height);
      ctx.fillStyle = '#f85149';
      ctx.fillRect(enemy.x - enemy.width / 2 + 8, enemy.y - enemy.height + 12, 14, 10);
      ctx.fillRect(enemy.x + 8, enemy.y - enemy.height + 12, 14, 10);
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(enemy.x - enemy.width / 2 + 12, enemy.y - enemy.height + 15, 6, 5);
      ctx.fillRect(enemy.x + 12, enemy.y - enemy.height + 15, 6, 5);
    } else {
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height, enemy.width, enemy.height);
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(enemy.x - 6, enemy.y - enemy.height + 10, 5, 5);
      ctx.fillRect(enemy.x + 4, enemy.y - enemy.height + 10, 5, 5);
    }

    ctx.shadowBlur = 0;
    if (enemy.hp < enemy.maxHp) {
      const barW = enemy.width + 10;
      const barH = 4;
      const barX = enemy.x - barW / 2;
      const barY = enemy.y - enemy.height - 10;
      ctx.fillStyle = '#21262d';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = enemy.hp / enemy.maxHp > 0.5 ? '#3fb950' : '#da3633';
      ctx.fillRect(barX, barY, barW * (enemy.hp / enemy.maxHp), barH);
    }

    ctx.restore();
  }, []);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, particlesList: typeof particles) => {
    for (const p of particlesList) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, []);

  const drawGround = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const groundY = h - 80;
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, groundY, w, 80);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 30, groundY + 80);
      ctx.stroke();
    }
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0d1117');
    gradient.addColorStop(0.7, '#161b22');
    gradient.addColorStop(1, '#0d1117');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(88, 166, 255, 0.03)';
    for (let i = 0; i < 5; i++) {
      const bx = ((time / (5000 + i * 1000)) % 1) * w;
      const by = 50 + i * 80;
      ctx.fillRect(bx, by, 200, 2);
    }
  }, []);

  const drawSkillPopup = useCallback((ctx: CanvasRenderingContext2D, w: number, time: number) => {
    if (!skillNamePopup) return;
    const elapsed = time - skillNamePopup.timestamp;
    if (elapsed > 2000) return;
    const alpha = elapsed < 200 ? elapsed / 200 : elapsed > 1500 ? 1 - (elapsed - 1500) / 500 : 1;
    const scale = elapsed < 200 ? 0.5 + (elapsed / 200) * 0.5 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${24 * scale}px 'Segoe UI', 'Microsoft YaHei', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#58a6ff';
    ctx.shadowBlur = 20;
    ctx.fillText(skillNamePopup.name, w / 2, 60);
    ctx.restore();
  }, [skillNamePopup]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resizeCanvas();
    const resizeObs = new ResizeObserver(resizeCanvas);
    resizeObs.observe(container);

    let animId: number;
    const render = (time: number) => {
      const dt = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0.016;
      lastTimeRef.current = time;

      updateParticles(dt);
      clearSkillEffects();

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const groundY = h - 80;

      let offsetX = 0;
      let offsetY = 0;
      if (shake) {
        const elapsed = time - shake.startTime;
        if (elapsed < shake.duration) {
          const intensity = 1 - elapsed / shake.duration;
          offsetX = (Math.random() - 0.5) * shake.amplitude * 2 * intensity;
          offsetY = (Math.random() - 0.5) * shake.amplitude * 2 * intensity;
        }
      }

      ctx.save();
      ctx.translate(offsetX, offsetY);

      drawBackground(ctx, w, h, time);
      drawGround(ctx, w, h);
      drawPlayer(ctx, groundY, time);

      for (const enemy of enemies) {
        drawEnemy(ctx, enemy, time);
      }

      drawParticles(ctx, particles);
      drawSkillPopup(ctx, w, time);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      resizeObs.disconnect();
    };
  }, [enemies, particles, shake, skillNamePopup, shieldActive, audioFeatures, updateParticles, clearSkillEffects, drawPlayer, drawEnemy, drawParticles, drawGround, drawBackground, drawSkillPopup]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};

export default BattleScene;
