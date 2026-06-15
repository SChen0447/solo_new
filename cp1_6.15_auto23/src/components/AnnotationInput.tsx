import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Palette } from 'lucide-react';
import type { LabelType } from '../../../shared/types';
import { LABEL_COLORS, LABEL_NAMES } from '../../../shared/types';
import { formatTime } from '../utils/waveform';

interface AnnotationInputProps {
  startTime: number;
  endTime: number;
  positionX: number;
  totalDuration: number;
  onSave: (data: { content: string; color: string; labelType: LabelType }) => void;
  onCancel: () => void;
  initialContent?: string;
  initialColor?: string;
  initialLabelType?: LabelType;
}

const AnnotationInput: React.FC<AnnotationInputProps> = ({
  startTime,
  endTime,
  positionX,
  totalDuration,
  onSave,
  onCancel,
  initialContent = '',
  initialColor = LABEL_COLORS.vocal,
  initialLabelType = 'vocal',
}) => {
  const [content, setContent] = useState(initialContent);
  const [color, setColor] = useState(initialColor);
  const [labelType, setLabelType] = useState<LabelType>(initialLabelType);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  const handleSave = () => {
    if (!content.trim()) return;
    onSave({ content: content.trim(), color, labelType });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const labelTypes: LabelType[] = ['vocal', 'instrument', 'rhythm', 'mix'];

  const leftPosition = Math.max(10, Math.min(positionX - 140, window.innerWidth - 300));

  return (
    <div
      ref={containerRef}
      className="absolute z-50 w-[280px] p-4 rounded-xl bg-[#0f3460] border border-[#e94560]/30 shadow-2xl"
      style={{
        left: `${leftPosition}px`,
        top: '80px',
        animation: 'slideDown 0.2s ease-out',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">
          {formatTime(startTime)} - {formatTime(endTime)}
        </span>
        <button
          onClick={onCancel}
          className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <textarea
        ref={inputRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入批注内容..."
        className="w-full h-20 p-3 rounded-lg bg-[#1a1a2e] text-[#eeeeee] placeholder-gray-500 border border-gray-700 focus:border-[#e94560] focus:outline-none resize-none text-sm"
      />

      <div className="mt-3">
        <p className="text-xs text-gray-400 mb-2">批注类型</p>
        <div className="flex gap-2">
          {labelTypes.map((type) => (
            <button
              key={type}
              onClick={() => {
                setLabelType(type);
                setColor(LABEL_COLORS[type]);
              }}
              className={`
                flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all duration-200
                ${labelType === type 
                  ? 'text-white scale-105' 
                  : 'text-gray-400 hover:text-white hover:bg-white/10'}
              `}
              style={{
                backgroundColor: labelType === type ? LABEL_COLORS[type] : 'transparent',
                boxShadow: labelType === type ? `0 0 10px ${LABEL_COLORS[type]}40` : 'none',
              }}
            >
              {LABEL_NAMES[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400">自定义颜色</p>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
        </div>
        {showColorPicker && (
          <div className="flex gap-2">
            {Object.values(LABEL_COLORS).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`
                  w-8 h-8 rounded-full transition-all duration-200 hover:scale-110
                  ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f3460] scale-110' : ''}
                `}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onCancel}
          className="flex-1 py-2 px-4 rounded-lg bg-[#1a1a2e] text-gray-400 text-sm font-medium transition-all duration-200 hover:bg-white/10 hover:text-white"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={!content.trim()}
          className="flex-1 py-2 px-4 rounded-lg text-white text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 15px ${color}40`,
          }}
        >
          <Check className="w-4 h-4" />
          保存
        </button>
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-[#0f3460] border-l border-t border-[#e94560]/30 rotate-45"
      />

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AnnotationInput;
