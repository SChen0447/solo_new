import { useState } from 'react';

interface StartScreenProps {
  fadeOut: boolean;
  onStart: () => void;
}

export default function StartScreen({ fadeOut, onStart }: StartScreenProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, #1a2a3a 0%, #0d1117 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        transition: 'opacity 0.5s ease-out',
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'auto'
      }}
    >
      <div
        style={{
          fontSize: 48,
          fontWeight: 'bold',
          color: 'white',
          marginBottom: 12,
          textShadow: '0 0 20px rgba(0, 229, 255, 0.6)',
          letterSpacing: 2
        }}
      >
        弹幕闪避 Demo
      </div>
      <div style={{ fontSize: 16, color: '#aaa', marginBottom: 60 }}>
        Bullet Hell Pattern Tester
      </div>

      <div style={{ fontSize: 14, color: '#888', marginBottom: 16, lineHeight: 1.8, textAlign: 'center' }}>
        <div>WASD / 方向键 — 移动</div>
        <div>鼠标瞄准，左键发射激光</div>
        <div>躲避弹幕，击败Boss</div>
      </div>

      <button
        onClick={onStart}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 160,
          height: 50,
          borderRadius: 12,
          background: 'linear-gradient(180deg, #3a3a3a, #1a1a1a)',
          color: 'white',
          fontSize: 20,
          fontWeight: 'bold',
          border: hovered ? '2px solid #00e5ff' : '2px solid #555',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: hovered ? '0 0 15px rgba(0, 229, 255, 0.5)' : 'none',
          letterSpacing: 1
        }}
      >
        Start
      </button>

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          fontSize: 12,
          color: '#555'
        }}
      >
        4种弹幕模式 · 实时闪避对比
      </div>
    </div>
  );
}
