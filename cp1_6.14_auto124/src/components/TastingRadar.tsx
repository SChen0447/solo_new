import { useEffect, useRef, useState } from 'react';
import type { Tasting } from '../types';

interface TastingRadarProps {
  tastings: Tasting[];
  batchNumber?: string;
}

const DIMENSIONS = ['酸度', '苦度', '甜度', '醇厚度', '余韵'];
const DIMENSION_KEYS: (keyof Pick<Tasting, 'acidity' | 'bitterness' | 'sweetness' | 'body' | 'aftertaste'>)[] = [
  'acidity', 'bitterness', 'sweetness', 'body', 'aftertaste',
];

export default function TastingRadar({ tastings, batchNumber }: TastingRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [tastings.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 200;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const maxR = 75;
    const sides = 5;
    const angleStep = (Math.PI * 2) / sides;

    let startTime: number | null = null;

    function draw(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      ctx.clearRect(0, 0, size, size);

      const rotationAnim = Math.min(elapsed / 600, 1);
      const easedRotation = 1 - Math.pow(1 - rotationAnim, 3);
      const rotationOffset = -Math.PI / 2 + (1 - easedRotation) * (-Math.PI / 2);

      const scaleAnim = Math.min(elapsed / 500, 1);
      const easedScale = 1 - Math.pow(1 - scaleAnim, 3);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(easedScale, easedScale);
      ctx.rotate((1 - easedRotation) * (-Math.PI / 4));

      for (let level = 1; level <= 5; level++) {
        const r = (maxR / 5) * level;
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
          const angle = rotationOffset + i * angleStep;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = level === 5 ? '#C4A67A' : '#E8DDD3';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (let i = 0; i < sides; i++) {
        const angle = rotationOffset + i * angleStep;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * maxR, Math.sin(angle) * maxR);
        ctx.strokeStyle = '#E8DDD3';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const tasting = tastings[activeIndex];
      if (tasting) {
        const points: { x: number; y: number }[] = [];
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const key = DIMENSION_KEYS[i];
          const val = (tasting[key] as number) / 5;
          const angle = rotationOffset + i * angleStep;
          const r = maxR * val;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          points.push({ x, y });
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR);
        gradient.addColorStop(0, 'rgba(111, 78, 55, 0.35)');
        gradient.addColorStop(1, 'rgba(210, 180, 140, 0.15)');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = 'var(--coffee-brown)';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#6F4E37';
        ctx.stroke();

        points.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#6F4E37';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#F5DEB3';
          ctx.fill();
        });
      }

      for (let i = 0; i < sides; i++) {
        const angle = rotationOffset + i * angleStep;
        const labelR = maxR + 16;
        const x = Math.cos(angle) * labelR;
        const y = Math.sin(angle) * labelR;
        ctx.fillStyle = '#8D7B68';
        ctx.font = '500 11px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(DIMENSIONS[i], x, y);
      }

      ctx.restore();

      if (rotationAnim < 1 || scaleAnim < 1) {
        animRef.current = requestAnimationFrame(draw);
      }
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [activeIndex, tastings]);

  if (tastings.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '32px' }}>
        <div className="empty-icon">⭐</div>
        <p>暂无品鉴记录</p>
      </div>
    );
  }

  return (
    <div className="tasting-radar">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
        <canvas ref={canvasRef} />
      </div>

      <div className="tasting-carousel">
        {tastings.map((t, i) => (
          <div
            key={t.id}
            className={`tasting-thumb ${i === activeIndex ? 'active' : ''}`}
            onClick={() => setActiveIndex(i)}
          >
            <div className="thumb-scores">
              {DIMENSION_KEYS.map((key) => (
                <span key={key} className="thumb-dot" style={{
                  opacity: 0.3 + ((t[key] as number) / 5) * 0.7,
                  backgroundColor: i === activeIndex ? '#6F4E37' : '#D2B48C',
                }} />
              ))}
            </div>
            <span className="thumb-name">{t.tasterName || `品鉴 ${i + 1}`}</span>
          </div>
        ))}
      </div>

      {tastings[activeIndex] && (
        <div className="tasting-detail-panel">
          <div className="detail-scores">
            {DIMENSIONS.map((dim, i) => {
              const key = DIMENSION_KEYS[i];
              const val = tastings[activeIndex][key] as number;
              return (
                <div key={dim} className="detail-score-row">
                  <span className="detail-dim">{dim}</span>
                  <div className="detail-stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} style={{ color: s <= val ? '#6F4E37' : '#E8DDD3', fontSize: '14px' }}>★</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {tastings[activeIndex].notes && (
            <p className="tasting-notes">{tastings[activeIndex].notes}</p>
          )}
        </div>
      )}

      <style>{`
        .tasting-radar {
          background: var(--cream);
          border-radius: var(--card-radius);
          padding: 16px;
          box-shadow: var(--card-shadow);
        }
        .tasting-carousel {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 12px 4px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .tasting-thumb {
          flex-shrink: 0;
          padding: 8px 12px;
          border-radius: 8px;
          background: white;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          scroll-snap-align: start;
        }
        .tasting-thumb.active {
          border-color: var(--coffee-brown);
          background: #FFF8F0;
        }
        .tasting-thumb:hover {
          transform: translateY(-2px);
          box-shadow: 0 2px 8px rgba(111, 78, 55, 0.15);
        }
        .thumb-scores {
          display: flex;
          gap: 3px;
          margin-bottom: 4px;
        }
        .thumb-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: opacity 0.2s;
        }
        .thumb-name {
          font-size: 11px;
          color: var(--warm-gray);
          font-weight: 500;
        }
        .tasting-detail-panel {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--light-brown);
        }
        .detail-scores {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }
        .detail-score-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .detail-dim {
          font-size: 11px;
          color: var(--warm-gray);
          font-weight: 500;
        }
        .detail-stars {
          display: flex;
          gap: 1px;
        }
        .tasting-notes {
          margin-top: 12px;
          font-size: 13px;
          color: var(--dark-brown);
          line-height: 1.6;
          padding: 10px;
          background: white;
          border-radius: 8px;
          font-style: italic;
        }
        @media (max-width: 768px) {
          .detail-scores {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
