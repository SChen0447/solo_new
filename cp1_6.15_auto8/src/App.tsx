import React, { useState, useEffect } from 'react';
import RuneCanvas from './components/RuneCanvas';
import LogPanel from './components/LogPanel';
import GrimoirePanel from './components/GrimoirePanel';
import { useAppStore } from './store/useAppStore';
import { baseRunes, energyNodeColors } from './data/runes';

const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const currentRuneSequence = useAppStore((state) => state.currentRuneSequence);
  const clearRuneSequence = useAppStore((state) => state.clearRuneSequence);
  const activatedRunes = useAppStore((state) => state.activatedRunes);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getRuneIcon = (type: string, color: string, size: number = 24) => {
    const half = size / 2;
    let shape = null;

    switch (type) {
      case 'line':
        shape = (
          <line
            x1="3"
            y1={half}
            x2={size - 3}
            y2={half}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
        break;
      case 'arc':
        shape = (
          <path
            d={`M 3 ${half} Q ${half} 3 ${size - 3} ${half}`}
            stroke={color}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        );
        break;
      case 'triangle':
        shape = (
          <polygon
            points={`${half},3 ${size - 3},${size - 3} 3,${size - 3}`}
            stroke={color}
            strokeWidth="1.5"
            fill="none"
          />
        );
        break;
      case 'square':
        shape = (
          <rect
            x="3"
            y="3"
            width={size - 6}
            height={size - 6}
            stroke={color}
            strokeWidth="1.5"
            fill="none"
            rx="2"
          />
        );
        break;
      case 'spiral':
        shape = (
          <path
            d={`M ${half} ${half} Q ${half + 4} ${half - 4} ${half + 6} ${half} Q ${half + 8} ${half + 6} ${half} ${half + 8} Q ${half - 6} ${half + 6} ${half - 6} ${half}`}
            stroke={color}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        );
        break;
      case 'star':
        const starPoints = [];
        for (let i = 0; i < 5; i++) {
          const outerAngle = (i * 72 - 90) * (Math.PI / 180);
          const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180);
          starPoints.push(
            `${half + Math.cos(outerAngle) * (half - 2)},${half + Math.sin(outerAngle) * (half - 2)}`
          );
          starPoints.push(
            `${half + Math.cos(innerAngle) * (half - 6)},${half + Math.sin(innerAngle) * (half - 6)}`
          );
        }
        shape = (
          <polygon
            points={starPoints.join(' ')}
            stroke={color}
            strokeWidth="1.2"
            fill="none"
          />
        );
        break;
    }

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {shape}
      </svg>
    );
  };

  const LeftPanel = () => (
    <div
      style={{
        width: '200px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(42, 42, 62, 0.9)',
          borderRadius: '8px',
          padding: '16px',
          color: '#ffffff',
          transition: 'box-shadow 0.3s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow =
            '0 8px 32px rgba(0, 0, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: '15px',
            fontWeight: '600',
            background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          符文指南
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {baseRunes.map((rune) => (
            <div
              key={rune.type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                fontSize: '12px',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                }}
              >
                {getRuneIcon(rune.type, rune.color, 20)}
              </div>
              <div>
                <div style={{ color: '#ddd', fontSize: '12px' }}>
                  {rune.name}
                </div>
                <div style={{ color: '#888', fontSize: '10px' }}>
                  {rune.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'rgba(42, 42, 62, 0.9)',
          borderRadius: '8px',
          padding: '16px',
          color: '#ffffff',
          transition: 'box-shadow 0.3s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow =
            '0 8px 32px rgba(0, 0, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: '#ffd700',
          }}
        >
          当前序列
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '32px' }}>
          {currentRuneSequence.length === 0 ? (
            <span style={{ color: '#666', fontSize: '11px' }}>
              在祭坛上绘制符文
            </span>
          ) : (
            currentRuneSequence.map((rune, idx) => {
              const runeData = baseRunes.find((r) => r.type === rune);
              return (
                <div
                  key={idx}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${runeData?.color || '#888'}`,
                    boxShadow: `0 0 8px ${runeData?.color || '#888'}50`,
                  }}
                >
                  {getRuneIcon(rune, runeData?.color || '#fff', 18)}
                </div>
              );
            })
          )}
        </div>
        {currentRuneSequence.length > 0 && (
          <button
            onClick={clearRuneSequence}
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '6px 12px',
              backgroundColor: '#2e2e3e',
              color: '#ff8888',
              border: '1px solid rgba(255, 136, 136, 0.3)',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(1px)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            清除序列
          </button>
        )}
      </div>
    </div>
  );

  const RightPanel = () => (
    <div
      style={{
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(42, 42, 62, 0.9)',
          borderRadius: '8px',
          padding: '16px',
          color: '#ffffff',
          transition: 'box-shadow 0.3s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow =
            '0 8px 32px rgba(0, 0, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: '15px',
            fontWeight: '600',
            background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          能量节点
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
          }}
        >
          {energyNodeColors.map((color, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  boxShadow: `0 0 12px ${color}80`,
                  animation: 'pulse 2s ease-in-out infinite',
                  animationDelay: `${idx * 0.3}s`,
                }}
              />
              <span style={{ fontSize: '10px', color: '#888' }}>
                {['火', '土', '光', '自然', '水', '暗'][idx]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <LogPanel />
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1a1a2e',
        color: '#ffffff',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        padding: '20px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'radial-gradient(ellipse at center, rgba(255, 215, 0, 0.03) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          textAlign: 'center',
          marginBottom: '20px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: 'bold',
            background: 'linear-gradient(90deg, #ffd700, #ff8c00, #ffd700)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 30px rgba(255, 215, 0, 0.3)',
            letterSpacing: '4px',
          }}
        >
          RUNEFORGE
        </h1>
        <p
          style={{
            margin: '8px 0 0 0',
            color: '#888',
            fontSize: '13px',
            letterSpacing: '2px',
          }}
        >
          符文锻造 · 远古魔法阵
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: '24px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {!isMobile && <LeftPanel />}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            flex: 1,
            maxWidth: '600px',
          }}
        >
          <RuneCanvas />

          <div
            style={{
              color: '#666',
              fontSize: '12px',
              textAlign: 'center',
            }}
          >
            按住鼠标左键在祭坛上绘制符文 · 依次绘制3个符文触发魔法
          </div>
        </div>

        {!isMobile && <RightPanel />}
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '300px',
          zIndex: 10,
        }}
      >
        <GrimoirePanel />
      </div>

      {isMobile && (
        <>
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            style={{
              position: 'fixed',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(42, 42, 62, 0.95)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              color: '#ffd700',
              fontSize: '20px',
              cursor: 'pointer',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
          >
            ✦
          </button>

          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            style={{
              position: 'fixed',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(42, 42, 62, 0.95)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              color: '#ffd700',
              fontSize: '20px',
              cursor: 'pointer',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
          >
            📜
          </button>

          {leftPanelOpen && (
            <div
              style={{
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                width: '240px',
                backgroundColor: 'rgba(26, 26, 46, 0.98)',
                zIndex: 99,
                padding: '60px 16px 16px',
                boxShadow: '4px 0 20px rgba(0, 0, 0, 0.3)',
              }}
            >
              <LeftPanel />
            </div>
          )}

          {rightPanelOpen && (
            <div
              style={{
                position: 'fixed',
                right: 0,
                top: 0,
                bottom: 0,
                width: '280px',
                backgroundColor: 'rgba(26, 26, 46, 0.98)',
                zIndex: 99,
                padding: '60px 16px 16px',
                boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
              }}
            >
              <RightPanel />
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 8px currentColor;
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 16px currentColor;
          }
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
        }
      `}</style>
    </div>
  );
};

export default App;
