import React, { useState } from 'react';
import type { Annotation } from '../../../shared/types';
import { LABEL_NAMES, formatTime } from '../utils/waveform';
import { isAnnotationAdded, isAnnotationRemoved } from '../utils/versionDiff';
import { useAppStore } from '../store/useStore';
import { Trash2, Edit2 } from 'lucide-react';

interface AnnotationTagProps {
  annotation: Annotation;
  totalDuration: number;
  onEdit?: (annotation: Annotation) => void;
  onDelete?: (id: string) => void;
}

const AnnotationTag: React.FC<AnnotationTagProps> = ({ annotation, totalDuration, onEdit, onDelete }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const { versionDiff, compareMode } = useAppStore();

  const left = (annotation.startTime / totalDuration) * 100;
  const width = Math.max(2, ((annotation.endTime - annotation.startTime) / totalDuration) * 100);

  const isAdded = compareMode && isAnnotationAdded(annotation.id, versionDiff);
  const isRemoved = compareMode && isAnnotationRemoved(annotation.id, annotation.id ? versionDiff : null);

  let borderStyle = '';
  if (isAdded) {
    borderStyle = '2px dashed #2ecc71';
  } else if (isRemoved) {
    borderStyle = '2px dashed #e74c3c';
  }

  const truncatedContent = annotation.content.length > 15 
    ? annotation.content.slice(0, 15) + '...' 
    : annotation.content;

  return (
    <div
      className="absolute top-0 h-6 cursor-pointer group"
      style={{
        left: `${left}%`,
        width: `${width}%`,
        minWidth: '24px',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className="w-full h-full px-2 rounded flex items-center justify-center text-xs font-medium text-white truncate transition-all duration-200 hover:h-7 hover:-translate-y-0.5"
        style={{
          backgroundColor: annotation.color,
          border: borderStyle,
        }}
      >
        <span className="truncate">{truncatedContent}</span>
      </div>

      {showTooltip && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-[#0f3460] border border-[#e94560]/30 shadow-xl animate-fade-in"
          style={{
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: annotation.color }}
            >
              {LABEL_NAMES[annotation.labelType]}
            </span>
            <span className="text-xs text-gray-400">
              {formatTime(annotation.startTime)} - {formatTime(annotation.endTime)}
            </span>
          </div>
          <p className="text-sm text-[#eeeeee] mb-2 break-words">{annotation.content}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {new Date(annotation.createdAt).toLocaleString('zh-CN')}
            </span>
            <div className="flex gap-1">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(annotation);
                  }}
                  className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-[#e94560] transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(annotation.id);
                  }}
                  className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-[#0f3460] border-r border-b border-[#e94560]/30 rotate-45"
          />
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
};

export default AnnotationTag;
