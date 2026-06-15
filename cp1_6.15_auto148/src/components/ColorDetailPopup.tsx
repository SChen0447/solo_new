import { X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function ColorDetailPopup() {
  const activePopup = useAppStore((s) => s.activePopup);
  const hidePopup = useAppStore((s) => s.hidePopup);

  if (!activePopup) return null;

  const { color } = activePopup;

  return (
    <div className="popup-backdrop" onClick={hidePopup}>
      <div className="color-popup" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={hidePopup}>
          <X size={16} />
        </button>
        <div
          className="popup-swatch"
          style={{ background: color.hex }}
        />
        <div className="popup-name-row">
          <span className="popup-color-name">{color.name}</span>
          <span className="popup-color-percent">
            {color.percentage != null ? `占比 ${color.percentage}%` : ''}
          </span>
        </div>
        <div className="popup-values">
          <div className="popup-value-row">
            <span className="popup-value-label">HEX</span>
            <code className="popup-value-code">{color.hex}</code>
          </div>
          <div className="popup-value-row">
            <span className="popup-value-label">RGB</span>
            <code className="popup-value-code">
              {color.rgb.r}, {color.rgb.g}, {color.rgb.b}
            </code>
          </div>
          <div className="popup-value-row">
            <span className="popup-value-label">HSL</span>
            <code className="popup-value-code">
              {color.hsl.h}°, {color.hsl.s}%, {color.hsl.l}%
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
