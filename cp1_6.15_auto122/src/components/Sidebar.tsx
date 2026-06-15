import { useState } from 'react';
import { useStore } from '../store';
import { colorSchemes, ColorSchemeKey } from '../utils/colorSchemes';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  isHighlight?: boolean;
}

const Slider = ({ label, value, min, max, step, onChange, isHighlight }: SliderProps) => {
  const [dragging, setDragging] = useState(false);
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span
          style={{
            fontSize: '14px',
            color: '#e0e0e0',
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: '13px',
            color: isHighlight ? '#e94560' : '#9e9e9e',
            fontFamily: 'monospace',
            background: 'rgba(255,255,255,0.05)',
            padding: '2px 8px',
            borderRadius: '4px',
            transition: 'color 0.2s',
          }}
        >
          {step < 1 ? value.toFixed(2) : value}
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: '#16213e',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: `${percent}%`,
            height: '6px',
            borderRadius: '3px',
            background: isHighlight
              ? 'linear-gradient(90deg, #e94560, #ff6b8a)'
              : 'linear-gradient(90deg, #3a3a5a, #5a5a8a)',
            transition: 'background 0.2s',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseDown={() => setDragging(true)}
          onTouchStart={() => setDragging(true)}
          onTouchEnd={() => setDragging(false)}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `calc(${percent}% - 8px)`,
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: isHighlight ? '#e94560' : '#7a7aaa',
            boxShadow: dragging
              ? `0 0 0 4px ${isHighlight ? 'rgba(233, 69, 96, 0.4)' : 'rgba(122, 122, 170, 0.4)'}`
              : '0 2px 6px rgba(0,0,0,0.3)',
            transition: 'all 0.15s ease',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  label: string;
}

const ToggleSwitch = ({ checked, onChange, label }: ToggleSwitchProps) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      padding: '12px 0',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <span style={{ fontSize: '14px', color: '#e0e0e0', fontWeight: 500 }}>
      {label}
    </span>
    <button
      onClick={onChange}
      style={{
        position: 'relative',
        width: '30px',
        height: '16px',
        borderRadius: '8px',
        background: checked ? '#00d2ff' : '#3a3a4a',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 0.2s ease, transform 0.2s ease',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.transform = 'translateY(-2px)')
      }
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '16px' : '2px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  </div>
);

const LoadingSpinner = () => (
  <div
    style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 10,
      pointerEvents: 'none',
    }}
  >
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      style={{
        animation: 'hexSpin 0.8s linear infinite',
      }}
    >
      <defs>
        <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e94560" />
          <stop offset="100%" stopColor="#00d2ff" />
        </linearGradient>
      </defs>
      <polygon
        points="32,6 54,19 54,45 32,58 10,45 10,19"
        fill="none"
        stroke="url(#hexGrad)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <polygon
        points="32,14 46,22 46,42 32,50 18,42 18,22"
        fill="none"
        stroke="url(#hexGrad)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.6"
      />
      <polygon
        points="32,22 38,26 38,38 32,42 26,38 26,26"
        fill="url(#hexGrad)"
        opacity="0.3"
      />
    </svg>
    <style>{`
      @keyframes hexSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const CameraButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      background: '#e94560',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 12px rgba(233, 69, 96, 0.4)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.width = '40px';
      e.currentTarget.style.height = '40px';
      e.currentTarget.style.background = '#c0392b';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.width = '36px';
      e.currentTarget.style.height = '36px';
      e.currentTarget.style.background = '#e94560';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  </button>
);

const ToastContainer = () => {
  const toasts = useStore((s) => s.toasts);
  const removeToast = useStore((s) => s.removeToast);

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '76px',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          style={{
            background: 'rgba(26, 26, 46, 0.92)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            animation: 'slideIn 0.3s ease-out',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '14px',
            }}
          >
            {toast.type === 'success' ? '✓' : toast.type === 'loading' ? '⏳' : 'ℹ'}
          </span>
          {toast.message}
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

const FlashOverlay = () => {
  const flashAnimation = useStore((s) => s.flashAnimation);

  if (!flashAnimation) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        pointerEvents: 'none',
        animation: 'flashAnim 0.5s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes flashAnim {
          0% {
            box-shadow: inset 0 0 0 0 rgba(0,0,0,0);
          }
          30% {
            box-shadow: inset 0 0 0 80px rgba(0,0,0,0.85);
          }
          100% {
            box-shadow: inset 0 0 0 0 rgba(0,0,0,0);
          }
        }
      `}</style>
    </div>
  );
};

interface SidebarProps {
  onSnapshot: () => void;
}

const Sidebar = ({ onSnapshot }: SidebarProps) => {
  const params = useStore((s) => s.params);
  const colorScheme = useStore((s) => s.colorScheme);
  const detailOverlay = useStore((s) => s.detailOverlay);
  const isGenerating = useStore((s) => s.isGenerating);
  const isMobile = useStore((s) => s.isMobile);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);

  const setIterations = useStore((s) => s.setIterations);
  const setScale = useStore((s) => s.setScale);
  const setHeightDecay = useStore((s) => s.setHeightDecay);
  const setColorScheme = useStore((s) => s.setColorScheme);
  const toggleDetailOverlay = useStore((s) => s.toggleDetailOverlay);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const regenerateSeed = useStore((s) => s.regenerateSeed);

  const currentColors = colorSchemes[colorScheme].colors;

  const sidebarStyle: React.CSSProperties = isMobile
    ? sidebarCollapsed
      ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: '#1a1a2e',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 150,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }
      : {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#1a1a2e',
          padding: '16px',
          zIndex: 150,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          maxHeight: 'calc(100vh - 60px)',
          overflowY: 'auto',
        }
    : {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '280px',
        height: '100vh',
        background: '#1a1a2e',
        padding: '16px',
        borderRadius: '0 8px 8px 0',
        zIndex: 50,
        overflowY: 'auto',
        boxShadow: '4px 0 20px rgba(0,0,0,0.3)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      };

  return (
    <>
      <aside style={sidebarStyle}>
        {isMobile && sidebarCollapsed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  background: 'linear-gradient(135deg, #e94560, #00d2ff)',
                  borderRadius: '6px',
                }}
              />
              <span
                style={{
                  color: '#e0e0e0',
                  fontSize: '15px',
                  fontWeight: 600,
                }}
              >
                分形地貌
              </span>
            </div>
            <button
              onClick={toggleSidebar}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#e0e0e0',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = 'translateY(-2px)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = 'translateY(0)')
              }
            >
              {sidebarCollapsed ? '展开 ▾' : '收起 ▴'}
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '28px',
                paddingBottom: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, #e94560, #00d2ff)',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(233, 69, 96, 0.3)',
                }}
              />
              <div>
                <div
                  style={{
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  分形地貌探索器
                </div>
                <div
                  style={{
                    color: '#7a7a9a',
                    fontSize: '11px',
                  }}
                >
                  Fractal Terrain
                </div>
              </div>
              {isMobile && (
                <button
                  onClick={toggleSidebar}
                  style={{
                    marginLeft: 'auto',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#e0e0e0',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  收起 ▴
                </button>
              )}
            </div>

            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: '#7a7a9a',
                marginBottom: '16px',
                fontWeight: 600,
              }}
            >
              分形参数
            </div>

            <Slider
              label="迭代深度"
              value={params.iterations}
              min={4}
              max={10}
              step={1}
              onChange={setIterations}
              isHighlight
            />

            <Slider
              label="缩放因子"
              value={params.scale}
              min={0.1}
              max={3.0}
              step={0.1}
              onChange={setScale}
            />

            <Slider
              label="高度衰减系数"
              value={params.heightDecay}
              min={0.3}
              max={0.8}
              step={0.05}
              onChange={setHeightDecay}
            />

            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: '#7a7a9a',
                margin: '28px 0 16px 0',
                fontWeight: 600,
              }}
            >
              地形细节
            </div>

            <ToggleSwitch
              checked={detailOverlay}
              onChange={toggleDetailOverlay}
              label="细节纹理叠加"
            />

            <button
              onClick={() => {
                regenerateSeed();
                useStore.getState().addToast('正在生成新地形...', 'loading');
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #16213e, #1a1a3e)',
                color: '#e0e0e0',
                border: '1px solid rgba(0, 210, 255, 0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                marginTop: '8px',
                marginBottom: '24px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = 'rgba(0, 210, 255, 0.5)';
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(0, 210, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(0, 210, 255, 0.2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              🎲 随机生成新地貌
            </button>

            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: '#7a7a9a',
                marginBottom: '16px',
                fontWeight: 600,
              }}
            >
              配色方案
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                marginBottom: '20px',
              }}
            >
              {(Object.keys(colorSchemes) as ColorSchemeKey[]).map((key) => {
                const scheme = colorSchemes[key];
                const active = colorScheme === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setColorScheme(key);
                      useStore.getState().addToast(`配色：${scheme.name}`, 'info');
                    }}
                    style={{
                      padding: '10px',
                      background: active
                        ? 'linear-gradient(135deg, rgba(233,69,96,0.15), rgba(0,210,255,0.15))'
                        : 'rgba(255,255,255,0.03)',
                      border: active
                        ? '1px solid rgba(233, 69, 96, 0.5)'
                        : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      color: active ? '#fff' : '#b0b0c8',
                      fontSize: '12px',
                      fontWeight: active ? 600 : 400,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ marginBottom: '8px' }}>{scheme.name}</div>
                    <div
                      style={{
                        display: 'flex',
                        height: '8px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      {scheme.colors.slice(0, 8).map((c: string, i: number) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            background: c,
                          }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 'auto',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  color: '#7a7a9a',
                  marginBottom: '10px',
                  fontWeight: 600,
                }}
              >
                当前色带
              </div>
              <div
                style={{
                  height: '30px',
                  borderRadius: '4px',
                  background: `linear-gradient(90deg, ${currentColors.join(', ')})`,
                  opacity: 0.85,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              />
            </div>
          </>
        )}

        {isGenerating && <LoadingSpinner />}
      </aside>

      <CameraButton
        onClick={() => {
          useStore.getState().triggerFlash();
          setTimeout(onSnapshot, 100);
        }}
      />

      <ToastContainer />
      <FlashOverlay />
    </>
  );
};

export default Sidebar;
