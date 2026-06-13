import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import EtymologyTree from './EtymologyTree';

interface HaloParticle {
  x: number; y: number;
  vx: number; vy: number;
  angle: number; radius: number;
  speed: number; size: number;
  color: string; alpha: number;
}

const WordCard = () => {
  const { wordData, isEtymologyExpanded, toggleEtymology, enterFireworksMode, currentWord } = useApp();
  const haloRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<HaloParticle[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isBreakdownHover, setIsBreakdownHover] = useState(false);
  const [isFireworkHover, setIsFireworkHover] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(t);
  }, [currentWord]);

  useEffect(() => {
    const canvas = haloRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = canvas.width = canvas.offsetWidth * dpr;
    const H = canvas.height = canvas.offsetHeight * dpr;
    const w = W / dpr;
    const h = H / dpr;
    ctx.scale(dpr, dpr);

    const count = isMobile ? 16 : 28;
    const colors = ['#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6'];
    const particles: HaloParticle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const rMin = Math.min(w, h) * 0.32;
      const rMax = Math.min(w, h) * 0.48;
      particles.push({
        x: w / 2, y: h / 2,
        vx: 0, vy: 0,
        angle,
        radius: rMin + Math.random() * (rMax - rMin),
        speed: 0.35 + Math.random() * 0.55,
        size: (isMobile ? 1.3 : 1.8) + Math.random() * 1.6,
        color: colors[i % colors.length],
        alpha: 0.35 + Math.random() * 0.4,
      });
    }
    particlesRef.current = particles;

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;

      const glow = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.2, cx, cy, Math.min(w, h) * 0.55);
      glow.addColorStop(0, 'rgba(139, 92, 246, 0.10)');
      glow.addColorStop(0.5, 'rgba(99, 102, 241, 0.04)');
      glow.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        p.angle += p.speed * 0.012;
        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * p.radius * 0.85;
        const pA = p.alpha * (0.7 + 0.3 * Math.sin(p.angle * 2.2));

        const g = ctx.createRadialGradient(px, py, 0, px, py, p.size * 5);
        g.addColorStop(0, p.color + Math.floor(pA * 255).toString(16).padStart(2, '0'));
        g.addColorStop(0.35, p.color + Math.floor(pA * 0.4 * 255).toString(16).padStart(2, '0'));
        g.addColorStop(1, p.color + '00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, p.size * 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255,255,255,${pA * 0.8})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isMobile]);

  if (!wordData) return null;

  const cardPadding = isMobile ? '22px 20px 18px' : '36px 40px 28px';
  const wordFontSize = isMobile
    ? Math.max(26, Math.min(44, 260 / Math.max(wordData.word.length, 5)))
    : Math.max(38, Math.min(64, 520 / Math.max(wordData.word.length, 5)));

  return (
    <div
      style={{
        width: '100%',
        maxWidth: isMobile ? '95%' : '760px',
        margin: '0 auto',
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
        opacity: isVisible ? 1 : 0,
        transition: 'transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.45s ease',
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: isMobile ? '24px' : '32px',
          padding: cardPadding,
          background: 'linear-gradient(145deg, #16213e 0%, #1e1b4b 40%, #312e81 80%, #16213e 100%)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          boxShadow:
            '0 32px 80px -20px rgba(99, 102, 241, 0.35), 0 12px 40px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '180px',
            background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.12), transparent)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-60%',
            right: '-20%',
            width: '60%',
            aspectRatio: '1',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.18), transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-40%',
            left: '-15%',
            width: '50%',
            aspectRatio: '1',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15), transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            marginBottom: isMobile ? '20px' : '28px',
            textAlign: 'center',
          }}
        >
          <canvas
            ref={haloRef}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? '280px' : '520px',
              height: isMobile ? '280px' : '420px',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                fontSize: `${wordFontSize}px`,
                fontWeight: 800,
                letterSpacing: '0.01em',
                background: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 40%, #a78bfa 70%, #e879f9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1.2,
                padding: isMobile ? '30px 0 14px' : '50px 0 20px',
                filter: 'drop-shadow(0 4px 20px rgba(139, 92, 246, 0.25))',
              }}
            >
              {wordData.word}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: isMobile ? '10px' : '16px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: '"SF Mono", Monaco, Consolas, monospace',
                  color: '#a5b4fc',
                  fontSize: isMobile ? '14px' : '16px',
                  padding: isMobile ? '4px 12px' : '6px 16px',
                  borderRadius: '999px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(139, 92, 246, 0.22)',
                }}
              >
                {wordData.phonetic}
              </span>
              <span
                style={{
                  color: '#c4b5fd',
                  fontSize: isMobile ? '12px' : '13px',
                  fontWeight: 600,
                  padding: isMobile ? '4px 10px' : '5px 13px',
                  borderRadius: '999px',
                  background: 'rgba(168, 85, 247, 0.12)',
                  border: '1px solid rgba(192, 132, 252, 0.22)',
                  fontStyle: 'italic',
                  letterSpacing: '0.02em',
                }}
              >
                {wordData.partOfSpeech}
              </span>
            </div>

            <div
              style={{
                marginTop: isMobile ? '16px' : '22px',
                padding: isMobile ? '12px 16px' : '16px 24px',
                borderRadius: isMobile ? '14px' : '18px',
                background: 'rgba(30, 41, 59, 0.45)',
                border: '1px solid rgba(148, 163, 184, 0.12)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <p
                style={{
                  color: '#e0e7ff',
                  fontSize: isMobile ? '13.5px' : '15px',
                  lineHeight: 1.7,
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                {wordData.meaning}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: isMobile ? '10px' : '14px',
            justifyContent: 'center',
            marginBottom: isEtymologyExpanded ? (isMobile ? '12px' : '16px') : 0,
          }}
        >
          <button
            onClick={toggleEtymology}
            onMouseEnter={() => setIsBreakdownHover(true)}
            onMouseLeave={() => setIsBreakdownHover(false)}
            style={{
              flex: 1,
              maxWidth: isMobile ? '100%' : '240px',
              padding: isMobile ? '14px 16px' : '15px 22px',
              borderRadius: '16px',
              border: isEtymologyExpanded
                ? '1px solid rgba(168, 85, 247, 0.55)'
                : '1px solid rgba(99, 102, 241, 0.3)',
              background: isEtymologyExpanded
                ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(99, 102, 241, 0.25))'
                : isBreakdownHover
                  ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(168, 85, 247, 0.18))'
                  : 'rgba(99, 102, 241, 0.12)',
              color: isEtymologyExpanded ? '#ffffff' : '#c7d2fe',
              fontSize: isMobile ? '14px' : '15px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              letterSpacing: '0.02em',
              boxShadow: isEtymologyExpanded ? '0 6px 20px rgba(168, 85, 247, 0.3)' : 'none',
              transform: isBreakdownHover && !isEtymologyExpanded ? 'translateY(-2px)' : 'translateY(0)',
            }}
          >
            <svg
              width={isMobile ? 16 : 18}
              height={isMobile ? 16 : 18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isEtymologyExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
              <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              <path d="M9 12h6" />
              <path d="M12 9v6" />
            </svg>
            拆解
          </button>

          <button
            onClick={enterFireworksMode}
            onMouseEnter={() => setIsFireworkHover(true)}
            onMouseLeave={() => setIsFireworkHover(false)}
            style={{
              flex: 1,
              maxWidth: isMobile ? '100%' : '240px',
              padding: isMobile ? '14px 16px' : '15px 22px',
              borderRadius: '16px',
              border: 'none',
              background: isFireworkHover
                ? 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
              color: '#ffffff',
              fontSize: isMobile ? '14px' : '15px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              letterSpacing: '0.02em',
              boxShadow: isFireworkHover
                ? '0 10px 32px rgba(139, 92, 246, 0.55)'
                : '0 6px 24px rgba(99, 102, 241, 0.35)',
              transform: isFireworkHover ? 'translateY(-2px)' : 'translateY(0)',
              backgroundSize: '200% 200%',
              animation: 'gradientShift 4s ease infinite',
            }}
          >
            <svg
              width={isMobile ? 16 : 18}
              height={isMobile ? 16 : 18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                animation: isFireworkHover ? 'spinSlow 3s linear infinite' : 'none',
              }}
            >
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="m4.93 4.93 2.83 2.83" />
              <path d="m16.24 16.24 2.83 2.83" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
              <path d="m4.93 19.07 2.83-2.83" />
              <path d="m16.24 7.76 2.83-2.83" />
              <circle cx="12" cy="12" r="4" />
            </svg>
            花火
          </button>
        </div>

        <style>{`
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes spinSlow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      <EtymologyTree breakdown={wordData.breakdown} isExpanded={isEtymologyExpanded} />
    </div>
  );
};

export default WordCard;
