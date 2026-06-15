import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAvatarStore, AvatarComponents } from '../store/avatarStore';
import { renderAvatarSVG, hsbToHex, hexToHsb } from '../utils/avatarSvg';
import { saveAvatar } from '../api/avatarApi';

const TABS = [
  { key: 'headShape', label: '头部', colorKey: 'headColor' },
  { key: 'eyes', label: '眼睛', colorKey: 'eyeColor' },
  { key: 'brows', label: '眉毛', colorKey: 'browColor' },
  { key: 'nose', label: '鼻子', colorKey: 'noseColor' },
  { key: 'mouth', label: '嘴巴', colorKey: 'mouthColor' },
  { key: 'hair', label: '发型', colorKey: 'hairColor' },
  { key: 'top', label: '上衣', colorKey: 'topColor' },
  { key: 'bottom', label: '下装', colorKey: 'bottomColor' },
  { key: 'accessory', label: '配饰', colorKey: 'accColor' },
] as const;

const OPTION_COUNTS: Record<string, number> = {
  headShape: 5,
  eyes: 5,
  brows: 5,
  nose: 5,
  mouth: 5,
  hair: 5,
  top: 5,
  bottom: 5,
  accessory: 5,
};

const PRESET_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
  '#795548', '#607d8b', '#34495e', '#ffffff',
];

function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [showWheel, setShowWheel] = useState(false);
  const [hsb, setHsb] = useState(() => hexToHsb(color));
  const wheelRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setHsb(hexToHsb(color));
  }, [color]);

  const drawWheel = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 4;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    const currentAngle = (hsb.h * Math.PI) / 180;
    const dist = (hsb.s / 100) * radius;
    const px = cx + dist * Math.cos(currentAngle);
    const py = cy + dist * Math.sin(currentAngle);
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [hsb.h, hsb.s]);

  useEffect(() => {
    if (showWheel && wheelRef.current) {
      drawWheel(wheelRef.current);
    }
  }, [showWheel, drawWheel]);

  const handleWheelClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.min(cx, cy) - 4;
    const newH = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const newS = Math.min((dist / radius) * 100, 100);
    const newHsb = { h: newH, s: newS, b: hsb.b };
    setHsb(newHsb);
    onChange(hsbToHex(newHsb.h, newHsb.s, newHsb.b));
  };

  return (
    <div style={styles.colorPickerContainer}>
      <div style={styles.presetColors}>
        {PRESET_COLORS.map((c) => (
          <div
            key={c}
            onClick={() => { onChange(c); setHsb(hexToHsb(c)); }}
            style={{
              ...styles.presetSwatch,
              backgroundColor: c,
              border: c === color ? '2px solid #e94560' : '2px solid rgba(255,255,255,0.2)',
              transform: c === color ? 'scale(1.15)' : 'scale(1)',
            }}
          />
        ))}
      </div>
      <button
        onClick={() => setShowWheel(!showWheel)}
        style={styles.wheelToggle}
      >
        🎨 色轮
      </button>
      {showWheel && (
        <div style={styles.wheelContainer}>
          <canvas
            ref={wheelRef}
            width={180}
            height={180}
            onClick={handleWheelClick}
            style={{ cursor: 'crosshair', borderRadius: '50%' }}
          />
          <div style={styles.brightnessControl}>
            <span style={{ fontSize: 12, color: '#aaa' }}>亮度</span>
            <input
              type="range"
              min={0}
              max={100}
              value={hsb.b}
              onChange={(e) => {
                const newB = Number(e.target.value);
                const newHsb = { ...hsb, b: newB };
                setHsb(newHsb);
                onChange(hsbToHex(newHsb.h, newHsb.s, newB));
              }}
              style={{ width: 120 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function OptionGrid({
  tabKey,
  selectedIndex,
  components,
  onSelect,
}: {
  tabKey: string;
  selectedIndex: number;
  components: AvatarComponents;
  onSelect: (idx: number) => void;
}) {
  const count = OPTION_COUNTS[tabKey] || 5;
  return (
    <div style={styles.optionGrid}>
      {Array.from({ length: count }, (_, i) => {
        const tempComponents = { ...components, [tabKey]: i };
        const svgStr = renderAvatarSVG(tempComponents, 64);
        return (
          <div
            key={i}
            onClick={() => onSelect(i)}
            style={{
              ...styles.optionCard,
              border: selectedIndex === i ? '2px solid #e94560' : '2px solid rgba(255,255,255,0.1)',
              background: selectedIndex === i ? 'rgba(233,69,96,0.15)' : '#16213e',
            }}
            dangerouslySetInnerHTML={{ __html: svgStr }}
          />
        );
      })}
    </div>
  );
}

export function AvatarCreator() {
  const navigate = useNavigate();
  const {
    currentComponents,
    updateComponent,
    setCurrentComponents,
    previewBg,
    setPreviewBg,
    rotation,
    setRotation,
    user,
    setNotification,
  } = useAvatarStore();

  const [activeTab, setActiveTab] = useState<string>('headShape');
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const previewRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastX = useRef(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const svgString = useMemo(() => renderAvatarSVG(currentComponents, 256), [currentComponents]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastX.current = e.clientX;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    setRotation(rotation + dx * 0.5);
  }, [rotation, setRotation]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSaving(true);
    try {
      await saveAvatar(currentComponents, user.nickname);
      setNotification({ message: '头像保存成功！', type: 'success' });
    } catch {
      setNotification({ message: '保存失败，请重试', type: 'error' });
    }
    setSaving(false);
  };

  const handleReset = () => {
    setCurrentComponents({
      headShape: 0, eyes: 0, brows: 0, nose: 0, mouth: 0,
      hair: 0, top: 0, bottom: 0, accessory: 0,
      headColor: '#fdbcb4', eyeColor: '#2c3e50', browColor: '#5d4037',
      noseColor: '#e8a88a', mouthColor: '#e74c3c', hairColor: '#3e2723',
      topColor: '#4a90d9', bottomColor: '#2c3e50', accColor: '#f1c40f',
    });
    setRotation(0);
  };

  const activeTabData = TABS.find(t => t.key === activeTab)!;

  const panel = (
    <div style={styles.panelContent}>
      <div style={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.tabButton,
              background: activeTab === tab.key ? '#e94560' : 'transparent',
              color: activeTab === tab.key ? '#fff' : '#aaa',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={styles.tabContent}>
        <OptionGrid
          tabKey={activeTab}
          selectedIndex={currentComponents[activeTab as keyof AvatarComponents] as number}
          components={currentComponents}
          onSelect={(i) => updateComponent(activeTab as keyof AvatarComponents, i)}
        />
        <div style={styles.colorSection}>
          <div style={styles.colorLabel}>颜色自定义</div>
          <ColorPicker
            color={currentComponents[activeTabData.colorKey as keyof AvatarComponents] as string}
            onChange={(c) => updateComponent(activeTabData.colorKey as keyof AvatarComponents, c)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {!isMobile && (
        <div style={styles.leftPanel}>{panel}</div>
      )}
      <div style={styles.centerArea}>
        <div style={styles.previewWrapper}>
          <div style={styles.previewControls}>
            <button
              onClick={() => setPreviewBg(previewBg === 'gray' ? 'transparent' : 'gray')}
              style={styles.bgToggle}
            >
              {previewBg === 'gray' ? '🔲 透明' : '⬜ 灰色'}
            </button>
            <button onClick={handleReset} style={styles.resetBtn}>↺ 重置</button>
          </div>
          <div
            ref={previewRef}
            style={{
              ...styles.previewArea,
              background: previewBg === 'gray'
                ? '#f0f0f0'
                : 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 16px 16px',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              style={{
                transform: `perspective(600px) rotateY(${rotation}deg)`,
                transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
              }}
              dangerouslySetInnerHTML={{ __html: svgString }}
            />
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 8, textAlign: 'center' }}>
            拖拽预览区旋转查看侧面效果
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...styles.saveButton,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? '保存中...' : '💾 保存头像'}
        </button>
      </div>
      {isMobile && (
        <>
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            style={styles.drawerToggle}
          >
            {drawerOpen ? '✕ 关闭' : '🎨 定制面板'}
          </button>
          <div style={{
            ...styles.mobileDrawer,
            transform: drawerOpen ? 'translateY(0)' : 'translateY(100%)',
          }}>
            {panel}
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: 'calc(100vh - 60px)',
    background: '#1a1a2e',
    position: 'relative',
  },
  leftPanel: {
    width: 320,
    background: '#0f3460',
    overflowY: 'auto',
    flexShrink: 0,
    borderRight: '1px solid rgba(255,255,255,0.05)',
  },
  panelContent: {
    padding: 16,
  },
  tabBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },
  tabButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  tabContent: {
    clipPath: 'inset(0)',
    animation: 'fadeIn 0.3s ease',
  },
  optionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    marginBottom: 16,
  },
  optionCard: {
    borderRadius: 8,
    padding: 8,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  colorSection: {
    marginTop: 12,
  },
  colorLabel: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 8,
  },
  colorPickerContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  presetColors: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetSwatch: {
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'transform 0.2s, border 0.2s',
  },
  wheelToggle: {
    padding: '4px 10px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6,
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 12,
    alignSelf: 'flex-start',
  },
  wheelContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  brightnessControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  centerArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 24,
  },
  previewWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  previewControls: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  bgToggle: {
    padding: '4px 12px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6,
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 12,
    transition: 'all 0.2s',
  },
  resetBtn: {
    padding: '4px 12px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6,
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 12,
    transition: 'all 0.2s',
  },
  previewArea: {
    width: 256,
    height: 256,
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  saveButton: {
    width: 160,
    height: 44,
    border: 'none',
    borderRadius: 8,
    background: 'linear-gradient(135deg, #4a90d9, #6ab7ff)',
    color: 'white',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 2px 8px rgba(74,144,217,0.3)',
  },
  mobileDrawer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '60vh',
    background: '#0f3460',
    borderRadius: '16px 16px 0 0',
    overflowY: 'auto',
    transition: 'transform 0.3s ease',
    zIndex: 1000,
  },
  drawerToggle: {
    position: 'fixed',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '10px 24px',
    background: '#e94560',
    border: 'none',
    borderRadius: 24,
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    zIndex: 1001,
    boxShadow: '0 4px 12px rgba(233,69,96,0.4)',
  },
};
