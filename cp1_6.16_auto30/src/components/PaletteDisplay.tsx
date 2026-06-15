import React, { useState, useCallback, useEffect, useRef } from 'react';
import TinyColor from 'tinycolor2';
import { ColorPalette, PaletteVariant } from '../core/paletteGenerator';

interface PaletteDisplayProps {
  palettes: ColorPalette[];
  lockedColors: Map<string, boolean>;
  onLockToggle: (hex: string) => void;
  onColorEdit: (paletteIndex: number, variantIndex: number, newHex: string) => void;
}

const EditPanel: React.FC<{
  color: string;
  onClose: () => void;
  onApply: (newHex: string) => void;
}> = ({ color, onClose, onApply }) => {
  const [editColor, setEditColor] = useState(color);
  const [brightness, setBrightness] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tc = TinyColor(color);
    const hsl = tc.toHsl();
    setBrightness(Math.round((hsl.l - 0.5) * 100));
    setSaturation(Math.round((hsl.s - 0.5) * 100));
    setEditColor(color);
  }, [color]);

  const applyAdjustments = useCallback(
    (hex: string, bri: number, sat: number) => {
      let tc = TinyColor(hex);
      const hsl = tc.toHsl();
      hsl.l = Math.max(0, Math.min(1, 0.5 + bri / 100));
      hsl.s = Math.max(0, Math.min(1, 0.5 + sat / 100));
      tc = TinyColor(hsl);
      return tc.toHexString();
    },
    []
  );

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setEditColor(newHex);
    const tc = TinyColor(newHex);
    const hsl = tc.toHsl();
    setBrightness(Math.round((hsl.l - 0.5) * 100));
    setSaturation(Math.round((hsl.s - 0.5) * 100));
  };

  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setBrightness(val);
    setEditColor(applyAdjustments(editColor, val, saturation));
  };

  const handleSaturationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSaturation(val);
    setEditColor(applyAdjustments(editColor, brightness, val));
  };

  const handleApply = () => {
    onApply(editColor);
    onClose();
  };

  return (
    <div style={styles.editOverlay} onClick={onClose}>
      <div
        ref={panelRef}
        style={styles.editPanel}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.editHeader}>
          <span style={styles.editTitle}>编辑颜色</span>
          <button style={styles.editCloseBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.editBody}>
          <div style={styles.editPreviewRow}>
            <div
              style={{
                ...styles.editPreviewBlock,
                backgroundColor: editColor,
                border: TinyColor(editColor).isLight() ? '1px solid rgba(255,255,255,0.3)' : 'none',
              }}
            />
            <span style={styles.editHexLabel}>{editColor}</span>
          </div>
          <div style={styles.editControl}>
            <label style={styles.editLabel}>颜色拾取</label>
            <input
              type="color"
              value={editColor}
              onChange={handleColorPickerChange}
              style={styles.colorPicker}
            />
          </div>
          <div style={styles.editControl}>
            <label style={styles.editLabel}>
              亮度 <span style={styles.sliderValue}>{brightness > 0 ? '+' : ''}{brightness}</span>
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              value={brightness}
              onChange={handleBrightnessChange}
              style={styles.slider}
            />
          </div>
          <div style={styles.editControl}>
            <label style={styles.editLabel}>
              饱和度 <span style={styles.sliderValue}>{saturation > 0 ? '+' : ''}{saturation}</span>
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              value={saturation}
              onChange={handleSaturationChange}
              style={styles.slider}
            />
          </div>
          <button style={styles.applyBtn} onClick={handleApply}>
            应用
          </button>
        </div>
      </div>
    </div>
  );
};

const ColorBlock: React.FC<{
  variant: PaletteVariant;
  paletteIndex: number;
  variantIndex: number;
  isLocked: boolean;
  animDelay: number;
  onLockToggle: () => void;
  onClick: () => void;
}> = ({ variant, isLocked, animDelay, onLockToggle, onClick }) => {
  const tc = TinyColor(variant.hex);
  const isLight = tc.isLight();

  return (
    <div
      style={{
        ...styles.colorBlockWrapper,
        animation: `fadeSlideIn 0.4s ${animDelay}s both cubic-bezier(0.34, 1.56, 0.64, 1)`,
      }}
    >
      <div
        style={{
          ...styles.colorBlock,
          backgroundColor: variant.hex,
          border: isLight ? '1px solid rgba(255,255,255,0.3)' : 'none',
        }}
        className="color-block"
        onClick={onClick}
        title={variant.hex}
      />
      <span style={styles.colorHex}>{variant.hex}</span>
      <button
        style={{
          ...styles.lockBtn,
          color: isLocked ? '#ffc107' : '#666',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onLockToggle();
        }}
        title={isLocked ? '解锁颜色' : '锁定颜色'}
      >
        {isLocked ? '🔒' : '🔓'}
      </button>
    </div>
  );
};

const PaletteCard: React.FC<{
  palette: ColorPalette;
  paletteIndex: number;
  lockedColors: Map<string, boolean>;
  onLockToggle: (hex: string) => void;
  onColorEdit: (paletteIndex: number, variantIndex: number, newHex: string) => void;
}> = ({ palette, paletteIndex, lockedColors, onLockToggle, onColorEdit }) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleEdit = (variantIndex: number) => {
    setEditingIndex(variantIndex);
  };

  const handleApplyEdit = (variantIndex: number, newHex: string) => {
    onColorEdit(paletteIndex, variantIndex, newHex);
  };

  return (
    <div style={styles.paletteCard}>
      <div style={styles.paletteCardHeader}>
        <span style={styles.paletteBaseHex}>{palette.baseColor.hex}</span>
      </div>
      <div className="palette-grid" style={styles.paletteGrid}>
        {palette.variants.map((variant, vi) => (
          <ColorBlock
            key={`${paletteIndex}-${vi}`}
            variant={variant}
            paletteIndex={paletteIndex}
            variantIndex={vi}
            isLocked={!!lockedColors.get(variant.hex)}
            animDelay={paletteIndex * 0.1 + vi * 0.06}
            onLockToggle={() => onLockToggle(variant.hex)}
            onClick={() => handleEdit(vi)}
          />
        ))}
      </div>
      {editingIndex !== null && (
        <EditPanel
          color={palette.variants[editingIndex].hex}
          onClose={() => setEditingIndex(null)}
          onApply={(newHex) => handleApplyEdit(editingIndex, newHex)}
        />
      )}
    </div>
  );
};

const PaletteDisplay: React.FC<PaletteDisplayProps> = ({
  palettes,
  lockedColors,
  onLockToggle,
  onColorEdit,
}) => {
  if (palettes.length === 0) {
    return (
      <div style={styles.emptyState}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#444"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="13.5" cy="6.5" r="2.5" />
          <circle cx="17.5" cy="10.5" r="2.5" />
          <circle cx="8.5" cy="7.5" r="2.5" />
          <circle cx="6.5" cy="12.5" r="2.5" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.65 1.5-1.5 0-.4-.15-.76-.42-1.06-.26-.3-.42-.66-.42-1.06 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.5-9.88-10-9.88z" />
        </svg>
        <p style={styles.emptyText}>上传图片以生成调色板</p>
      </div>
    );
  }

  return (
    <div style={styles.paletteList}>
      {palettes.map((palette, pi) => (
        <PaletteCard
          key={pi}
          palette={palette}
          paletteIndex={pi}
          lockedColors={lockedColors}
          onLockToggle={onLockToggle}
          onColorEdit={onColorEdit}
        />
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '60px 20px',
  },
  emptyText: {
    color: '#666',
    fontSize: '14px',
    margin: 0,
  },
  paletteList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  paletteCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: '16px',
    padding: '16px',
    position: 'relative',
  },
  paletteCardHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
  },
  paletteBaseHex: {
    color: '#888',
    fontSize: '12px',
  },
  paletteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
  },
  colorBlockWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    position: 'relative',
  },
  colorBlock: {
    width: '64px',
    height: '64px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
    position: 'relative',
  },
  colorHex: {
    color: '#888',
    fontSize: '10px',
    fontFamily: 'monospace',
  },
  lockBtn: {
    position: 'absolute',
    top: '2px',
    right: '-4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '2px',
    lineHeight: 1,
    zIndex: 2,
  },
  editOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease',
  },
  editPanel: {
    backgroundColor: '#2a2a2a',
    borderRadius: '16px 16px 0 0',
    padding: '24px',
    width: '100%',
    maxWidth: '420px',
    animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  editHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  editTitle: {
    color: '#e0e0e0',
    fontSize: '16px',
    fontWeight: 600,
  },
  editCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  editBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  editPreviewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  editPreviewBlock: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
  },
  editHexLabel: {
    color: '#e0e0e0',
    fontSize: '14px',
    fontFamily: 'monospace',
  },
  editControl: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  editLabel: {
    color: '#aaa',
    fontSize: '12px',
  },
  sliderValue: {
    color: '#667eea',
    fontFamily: 'monospace',
  },
  colorPicker: {
    width: '100%',
    height: '36px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
  },
  slider: {
    width: '100%',
    accentColor: '#667eea',
  },
  applyBtn: {
    backgroundColor: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 0',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'background-color 0.2s ease',
  },
};

export default PaletteDisplay;
