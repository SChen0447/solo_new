import { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useColorStore } from './store';
import type { ThemeObject } from './types';

interface ColorBlockProps {
  color: string;
  label: string;
  index: number;
  visible: boolean;
  editable?: boolean;
  themeKey?: keyof ThemeObject;
}

function ColorBlock({ color, label, index, visible, editable, themeKey }: ColorBlockProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [animating, setAnimating] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const { showToast, updateThemeColor } = useColorStore();

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setAnimating(true), index * 80);
      return () => clearTimeout(timer);
    } else {
      setAnimating(false);
    }
  }, [visible, index]);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(color);
      showToast(color);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = color;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast(color);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editable) {
      setShowPicker(!showPicker);
    } else {
      handleCopy();
    }
  };

  const handleColorChange = (newColor: string) => {
    if (themeKey) {
      updateThemeColor(themeKey, newColor.toUpperCase());
    }
  };

  return (
    <div
      className="flex flex-col items-center gap-1"
      style={{
        opacity: animating ? 1 : 0,
        transform: animating ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      <div className="relative">
        <div
          className="w-[60px] h-[60px] rounded-lg cursor-pointer hover:scale-110 transition-transform duration-200 relative group"
          style={{ backgroundColor: color }}
          onClick={handleEditClick}
          title={editable ? `${label} - 点击编辑` : `${label} - 点击复制`}
        >
          {editable && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 rounded-lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
          )}
        </div>

        {showPicker && editable && (
          <div
            ref={pickerRef}
            className="absolute z-50 top-[70px] left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <HexColorPicker color={color} onChange={handleColorChange} />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500 font-mono">{color}</span>
              <button
                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                onClick={handleCopy}
              >
                复制
              </button>
            </div>
          </div>
        )}
      </div>
      <span className="text-[12px] text-gray-400 font-mono">{color}</span>
      {editable && (
        <span className="text-[10px] text-gray-300">{label}</span>
      )}
    </div>
  );
}

export default function ColorPalette() {
  const { extractedColors, theme, isExtracting, progress } = useColorStore();
  const hasColors = extractedColors.length > 0;

  const mainColors = extractedColors.slice(0, 5);
  const auxColors = extractedColors.slice(5, 8);

  const themeEntries: { key: keyof ThemeObject; label: string; color: string }[] = [
    { key: 'light', label: '浅色', color: theme.light },
    { key: 'dark', label: '深色', color: theme.dark },
    { key: 'accent1', label: '强调1', color: theme.accent1 },
    { key: 'accent2', label: '强调2', color: theme.accent2 },
    { key: 'accent3', label: '强调3', color: theme.accent3 },
  ];

  return (
    <div className="space-y-4">
      {isExtracting && (
        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>正在提取颜色...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {hasColors && !isExtracting && (
        <>
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-2">主色</h3>
            <div className="grid grid-cols-4 gap-3">
              {mainColors.map((color, i) => (
                <ColorBlock key={`main-${i}`} color={color} label={`主色${i + 1}`} index={i} visible={hasColors} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-2">辅色</h3>
            <div className="grid grid-cols-4 gap-3">
              {auxColors.map((color, i) => (
                <ColorBlock key={`aux-${i}`} color={color} label={`辅色${i + 1}`} index={i + 5} visible={hasColors} />
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <h3 className="text-xs font-medium text-gray-500 mb-2">配色主题</h3>
            <div className="grid grid-cols-4 gap-3">
              {themeEntries.map((entry, i) => (
                <ColorBlock
                  key={`theme-${entry.key}`}
                  color={entry.color}
                  label={entry.label}
                  index={i}
                  visible={hasColors}
                  editable
                  themeKey={entry.key}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {!hasColors && !isExtracting && (
        <div className="text-center text-gray-300 text-xs py-4">
          上传图片后自动提取颜色
        </div>
      )}
    </div>
  );
}
