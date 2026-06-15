import { useEffect, useRef, useState, useMemo } from 'react';
import { useGameStore, type GestureType } from '../store/gameStore';
import { handTracker } from '../input/HandTracker';

const GESTURE_NAMES: Record<GestureType, string> = {
  fist: '握拳',
  open: '张开',
  circle: '画圈',
  swipe: '挥手',
  none: '未识别',
};

const GESTURE_EMOJIS: Record<GestureType, string> = {
  fist: '✊',
  open: '🖐️',
  circle: '⭕',
  swipe: '💨',
  none: '❓',
};

function HealthBar({
  hp,
  maxHP,
  reverse = false,
  label,
  colorFrom = '#00ff88',
  colorTo = '#ff3355',
}: {
  hp: number;
  maxHP: number;
  reverse?: boolean;
  label: string;
  colorFrom?: string;
  colorTo?: string;
}) {
  const segments = 20;
  const segmentWidth = 25;
  const filledSegments = Math.ceil((hp / maxHP) * segments);

  const getSegmentColor = (index: number) => {
    const ratio = index / segments;
    const r1 = parseInt(colorFrom.slice(1, 3), 16);
    const g1 = parseInt(colorFrom.slice(3, 5), 16);
    const b1 = parseInt(colorFrom.slice(5, 7), 16);
    const r2 = parseInt(colorTo.slice(1, 3), 16);
    const g2 = parseInt(colorTo.slice(3, 5), 16);
    const b2 = parseInt(colorTo.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const displayIndexes = useMemo(() => {
    const indexes = Array.from({ length: segments }, (_, i) => i);
    return reverse ? [...indexes].reverse() : indexes;
  }, [segments, reverse]);

  return (
    <div style={{ display: 'flex', flexDirection: reverse ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
      <div style={{ color: '#ffffff', fontSize: 14, fontWeight: 600, minWidth: 60, textAlign: reverse ? 'right' : 'left' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: reverse ? 'row-reverse' : 'row', gap: 2 }}>
        {displayIndexes.map((i) => {
          const displayIdx = reverse ? segments - 1 - i : i;
          const filled = displayIdx < filledSegments;
          return (
            <div
              key={i}
              style={{
                width: segmentWidth,
                height: 16,
                borderRadius: 3,
                background: filled ? getSegmentColor(displayIdx) : 'rgba(255,255,255,0.1)',
                boxShadow: filled ? `0 0 8px ${getSegmentColor(displayIdx)}` : 'none',
                transition: 'all 0.2s ease',
              }}
            />
          );
        })}
      </div>
      <div style={{ color: '#ffffff', fontSize: 14, fontWeight: 700, minWidth: 60, textAlign: reverse ? 'left' : 'right' }}>
        {hp}/{maxHP}
      </div>
    </div>
  );
}

function CooldownRing({ cooldown, maxCooldown }: { cooldown: number; maxCooldown: number }) {
  const size = 40;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, 1 - cooldown / maxCooldown));
  const dashOffset = circumference * (1 - progress);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ffaa00"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.1s ease', filter: 'drop-shadow(0 0 4px #ffaa00)' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: progress >= 1 ? '#00ff88' : '#ffaa00',
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {progress >= 1 ? '✓' : `${Math.ceil(cooldown * 10) / 10}s`}
      </div>
    </div>
  );
}

function GesturePreview({ videoRef, canvasRef }: { videoRef: React.RefObject<HTMLVideoElement>; canvasRef: React.RefObject<HTMLCanvasElement> }) {
  const currentGesture = useGameStore((s) => s.currentGesture);
  const gestureConfidence = useGameStore((s) => s.gestureConfidence);

  return (
    <div
      style={{
        width: 160,
        height: 120,
        border: '2px solid #00ffaa',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 0 15px rgba(0, 255, 170, 0.3)',
        background: '#000',
      }}
    >
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          display: 'block',
        }}
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        width={160}
        height={120}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: 'scaleX(-1)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          left: 4,
          right: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          color: '#fff',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}
      >
        <span>{GESTURE_EMOJIS[currentGesture]} {GESTURE_NAMES[currentGesture]}</span>
        <span style={{ fontWeight: 700, color: gestureConfidence >= 0.7 ? '#00ff88' : '#ff6644' }}>
          {Math.round(gestureConfidence * 100)}%
        </span>
      </div>
    </div>
  );
}

function Shockwaves() {
  const shocks = useGameStore((s) => s.screenShocks);

  return (
    <>
      {shocks.map((sh) => {
        const elapsed = (Date.now() - sh.timestamp) / 300;
        const progress = Math.min(1, elapsed);
        const size = 50 + progress * 2500;
        const opacity = (1 - progress) * 0.7;
        return (
          <div
            key={sh.id}
            style={{
              position: 'absolute',
              left: `${sh.hitScreenX * 100}%`,
              top: `${sh.hitScreenY * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: size,
              height: size,
              borderRadius: '50%',
              border: `4px solid rgba(255, 255, 255, ${opacity})`,
              boxShadow: `0 0 40px rgba(255, 255, 255, ${opacity * 0.5}), inset 0 0 40px rgba(255, 255, 255, ${opacity * 0.2})`,
              pointerEvents: 'none',
              zIndex: 50,
              animation: 'none',
            }}
          />
        );
      })}
    </>
  );
}

function DodgeFlash() {
  const active = useGameStore((s) => s.dodgeFlashActive);

  if (!active) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 40,
        boxShadow: 'inset 0 0 150px 30px rgba(0, 255, 136, 0.6)',
        animation: 'dodgeFlash 0.2s ease-out',
      }}
    />
  );
}

function CalibrationOverlay() {
  const phase = useGameStore((s) => s.phase);
  const calibrationFrames = useGameStore((s) => s.calibrationFrames);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (phase !== 'calibration') return;
    const interval = setInterval(() => forceUpdate((v) => v + 1), 50);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase !== 'calibration') return null;

  const progress = Math.min(1, calibrationFrames / 80);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#00000080',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 30,
          color: '#fff',
        }}
      >
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, textShadow: '0 0 20px rgba(0,255,170,0.6)' }}>
          ✋ 手势校准
        </h1>
        <p style={{ fontSize: 18, color: '#ccc', margin: 0, textAlign: 'center', maxWidth: 400 }}>
          请将手掌完整置于下方矩形区域中央，保持手势稳定
        </p>
        <div
          style={{
            width: 320,
            height: 240,
            border: '3px dashed #ffffff',
            borderRadius: 12,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: progress > 0.5 ? '0 0 30px rgba(0,255,170,0.5)' : 'none',
            transition: 'box-shadow 0.3s ease',
          }}
        >
          <div style={{ fontSize: 80, opacity: 0.6 + progress * 0.4 }}>🖐️</div>
          <div
            style={{
              position: 'absolute',
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              border: `3px solid #00ffaa`,
              borderRadius: 12,
              opacity: progress,
              transition: 'opacity 0.1s ease',
            }}
          />
        </div>
        <div style={{ width: 320 }}>
          <div
            style={{
              height: 12,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress * 100}%`,
                background: 'linear-gradient(90deg, #00ff88, #00ffaa)',
                boxShadow: '0 0 10px #00ff88',
                transition: 'width 0.05s linear',
              }}
            />
          </div>
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 14, color: '#aaa' }}>
            校准进度: {Math.round(progress * 100)}% ({calibrationFrames}/80 帧)
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 13, color: '#888' }}>
          <div>✊ 握拳 → 火球</div>
          <div>🖐️ 张开 → 冰锥</div>
          <div>⭕ 画圈 → 闪电</div>
        </div>
      </div>
    </div>
  );
}

function GameOverOverlay({ onRestart }: { onRestart: () => void }) {
  const phase = useGameStore((s) => s.phase);
  const winner = useGameStore((s) => s.winner);
  const playerScore = useGameStore((s) => s.playerScore);
  const aiScore = useGameStore((s) => s.aiScore);

  if (phase !== 'gameOver') return null;

  const isPlayerWin = winner === 'player';

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#00000099',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          color: '#fff',
          padding: 40,
          borderRadius: 20,
          background: 'rgba(26, 10, 46, 0.8)',
          border: `2px solid ${isPlayerWin ? '#00ff88' : '#ff4466'}`,
          boxShadow: `0 0 60px ${isPlayerWin ? 'rgba(0,255,136,0.4)' : 'rgba(255,68,102,0.4)'}`,
        }}
      >
        <div style={{ fontSize: 80 }}>{isPlayerWin ? '🏆' : '💀'}</div>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 900,
            margin: 0,
            color: isPlayerWin ? '#00ff88' : '#ff4466',
            textShadow: `0 0 20px ${isPlayerWin ? 'rgba(0,255,136,0.8)' : 'rgba(255,68,102,0.8)'}`,
          }}
        >
          {isPlayerWin ? '胜利！' : '失败...'}
        </h1>
        <div style={{ fontSize: 20, color: '#ccc' }}>
          {isPlayerWin ? '你击败了AI魔法师！' : 'AI击败了你，再接再厉！'}
        </div>
        <div style={{ display: 'flex', gap: 40, marginTop: 10 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#4488ff', fontSize: 16, marginBottom: 6 }}>玩家命中</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#4488ff' }}>{playerScore}</div>
          </div>
          <div style={{ fontSize: 32, color: '#666', alignSelf: 'center' }}>:</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ff4466', fontSize: 16, marginBottom: 6 }}>AI命中</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#ff4466' }}>{aiScore}</div>
          </div>
        </div>
        <button
          onClick={onRestart}
          style={{
            marginTop: 10,
            padding: '14px 40px',
            fontSize: 18,
            fontWeight: 700,
            color: '#fff',
            background: 'linear-gradient(135deg, #00ff88, #00aaff)',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(0,255,136,0.4)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,136,0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,136,0.4)';
          }}
        >
          🔄 重新开始
        </button>
      </div>
    </div>
  );
}

export default function HUD() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initializedRef = useRef(false);

  const playerHP = useGameStore((s) => s.playerHP);
  const aiHP = useGameStore((s) => s.aiHP);
  const maxHP = useGameStore((s) => s.maxHP);
  const playerScore = useGameStore((s) => s.playerScore);
  const aiScore = useGameStore((s) => s.aiScore);
  const magicCooldown = useGameStore((s) => s.magicCooldown);
  const maxCooldown = useGameStore((s) => s.maxCooldown);
  const aiState = useGameStore((s) => s.aiState);
  const aiShieldActive = useGameStore((s) => s.aiShieldActive);
  const phase = useGameStore((s) => s.phase);
  const resetGame = useGameStore((s) => s.resetGame);

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate((v) => v + 1), 16);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    if (!videoRef.current) return;

    initializedRef.current = true;
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;

    const init = async () => {
      await handTracker.init(videoEl, canvasEl);
      handTracker.start();
    };
    init();

    return () => {
      handTracker.stop();
      initializedRef.current = false;
    };
  }, []);

  const aiStateText = {
    defense: '🛡️ 防御态',
    counter: '⚔️ 反击态',
    dodge: '💨 躲避态',
  }[aiState];

  const aiStateColor = {
    defense: '#8a2be2',
    counter: '#ff4466',
    dodge: '#ffaa00',
  }[aiState];

  return (
    <>
      <style>{`
        @keyframes dodgeFlash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <CooldownRing cooldown={magicCooldown} maxCooldown={maxCooldown} />
          <div style={{ color: '#888', fontSize: 12, lineHeight: 1.3 }}>
            <div>冷却</div>
            <div>Cooldown</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 12, color: '#888', letterSpacing: 2 }}>魔法命中数 HIT SCORE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#4488ff', textShadow: '0 0 10px rgba(68,136,255,0.6)' }}>
              {playerScore}
            </span>
            <span style={{ fontSize: 24, color: '#444', fontWeight: 700 }}>VS</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#ff4466', textShadow: '0 0 10px rgba(255,68,102,0.6)' }}>
              {aiScore}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <HealthBar hp={aiHP} maxHP={maxHP} reverse label="AI" />
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: `${aiStateColor}33`,
              border: `1px solid ${aiStateColor}`,
              color: aiStateColor,
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: aiShieldActive ? `0 0 10px ${aiStateColor}` : 'none',
            }}
          >
            {aiStateText}
            {aiShieldActive ? ' 🛡️' : ''}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <HealthBar hp={playerHP} maxHP={maxHP} label="玩家" />
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#ff4500', fontWeight: 700 }}>✊ 火球</span>
              <span>伤害15</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#00bfff', fontWeight: 700 }}>🖐️ 冰锥</span>
              <span>伤害10</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#ffff00', fontWeight: 700 }}>⭕ 闪电</span>
              <span>伤害20</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#00ff88', fontWeight: 700 }}>💨 闪避</span>
              <span>紧急挥动手</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ fontSize: 11, color: '#00ffaa', fontWeight: 600 }}>🎥 手势识别</div>
          <GesturePreview videoRef={videoRef as any} canvasRef={canvasRef as any} />
        </div>
      </div>

      {phase === 'playing' && <Shockwaves />}
      <DodgeFlash />
      <CalibrationOverlay />
      <GameOverOverlay onRestart={resetGame} />
    </>
  );
}
