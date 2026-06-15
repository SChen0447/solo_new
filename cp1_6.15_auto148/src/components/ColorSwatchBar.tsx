import { useAppStore } from '../store/useAppStore';
import type { ColorData } from '../types';

export default function ColorSwatchBar() {
  const extractedColors = useAppStore((s) => s.extractedColors);
  const selectedColorIndex = useAppStore((s) => s.selectedColorIndex);
  const setSelectedColorIndex = useAppStore((s) => s.setSelectedColorIndex);
  const showPopup = useAppStore((s) => s.showPopup);

  if (extractedColors.length === 0) return null;

  const handleClick = (color: ColorData, index: number) => {
    showPopup(color, index);
    setSelectedColorIndex(index);
  };

  return (
    <div className="swatch-bar">
      <p className="swatch-bar-label">提取主色调</p>
      <div className="swatch-list">
        {extractedColors.map((color, i) => (
          <button
            key={`${color.hex}-${i}`}
            className={`swatch-item ${selectedColorIndex === i ? 'active' : ''}`}
            style={{ background: color.hex }}
            onClick={() => handleClick(color, i)}
            title={`${color.name} ${color.hex}`}
          >
            <span className="swatch-index">{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
