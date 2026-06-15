import { useState } from 'react';
import type { ColorData } from '../../types';

interface PaletteRendererProps {
  colors: ColorData[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onCopy?: (hex: string, key: string) => void;
  copiedKey?: string | null;
  section?: string;
}

export default function PaletteRenderer({
  colors,
  selectedIndex,
  onSelect,
  onCopy,
  copiedKey,
  section = 'palette',
}: PaletteRendererProps) {
  const [localCopied, setLocalCopied] = useState<string | null>(null);

  const handleCopy = async (color: ColorData, index: number) => {
    const key = `${section}-${index}`;
    try {
      await navigator.clipboard.writeText(color.hex);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = color.hex;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (onCopy) {
      onCopy(color.hex, key);
    } else {
      setLocalCopied(key);
      setTimeout(() => setLocalCopied(null), 1400);
    }
  };

  const isCopied = (index: number) => {
    const key = `${section}-${index}`;
    return copiedKey === key || localCopied === key;
  };

  if (colors.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-text">上传图片后，这里将呈现水彩风格色卡…</p>
      </div>
    );
  }

  return (
    <div className="palette-grid">
      {colors.map((color, index) => (
        <div
          key={`${color.hex}-${index}`}
          className={`watercolor-card ${selectedIndex === index ? 'selected' : ''}`}
          onClick={() => {
            onSelect(index);
            handleCopy(color, index);
          }}
        >
          <div className="wc-color-wrapper">
            <div
              className="wc-color-blur"
              style={{ background: color.hex }}
            />
            <div
              className="wc-color-core"
              style={{ background: color.hex }}
            />
            <svg className="wc-color-texture" viewBox="0 0 100 80" preserveAspectRatio="none">
              <defs>
                <filter id={`turb-${section}-${index}`} x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.015 0.025" numOctaves="2" seed={index * 7 + 3} result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" />
                </filter>
              </defs>
              <rect width="100" height="80" fill={color.hex} opacity="0.5" filter={`url(#turb-${section}-${index})`} />
            </svg>
          </div>
          <div className="wc-info">
            <div className="wc-name">{color.name || '—'}</div>
            <div className="wc-hex">{color.hex}</div>
          </div>
          <div
            className={`copy-toast ${isCopied(index) ? 'show' : ''}`}
          >
            已复制
          </div>
        </div>
      ))}
    </div>
  );
}
