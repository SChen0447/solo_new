import { useState } from 'react';
import {
  Pencil,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Save,
  Download,
  Minus,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { PRESET_COLORS, STROKE_WIDTHS, ERASER_SIZES } from '@/types';

interface ToolbarProps {
  onSave: () => void;
  onExport: () => void;
  getCanvas: () => HTMLCanvasElement | null;
}

export default function Toolbar({ onSave, onExport, getCanvas }: ToolbarProps) {
  const [expandedPanel, setExpandedPanel] = useState<'none' | 'color' | 'width' | 'eraser'>('none');

  const currentColor = useAppStore((s) => s.currentColor);
  const currentWidth = useAppStore((s) => s.currentWidth);
  const isEraser = useAppStore((s) => s.isEraser);
  const eraserSize = useAppStore((s) => s.eraserSize);
  const undoStack = useAppStore((s) => s.undoStack);
  const redoStack = useAppStore((s) => s.redoStack);

  const setColor = useAppStore((s) => s.setColor);
  const setWidth = useAppStore((s) => s.setWidth);
  const setEraser = useAppStore((s) => s.setEraser);
  const setEraserSize = useAppStore((s) => s.setEraserSize);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const clearCanvas = useAppStore((s) => s.clearCanvas);
  const saveNote = useAppStore((s) => s.saveNote);

  const generateThumbnail = (canvas: HTMLCanvasElement): string => {
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 200;
    thumbCanvas.height = 150;
    const tctx = thumbCanvas.getContext('2d');
    if (!tctx) return '';
    tctx.fillStyle = '#FDF5E6';
    tctx.fillRect(0, 0, 200, 150);
    const scaleX = 200 / canvas.width;
    const scaleY = 150 / canvas.height;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (200 - canvas.width * scale) / 2;
    const offsetY = (150 - canvas.height * scale) / 2;
    tctx.translate(offsetX, offsetY);
    tctx.scale(scale, scale);
    tctx.drawImage(canvas, 0, 0);
    return thumbCanvas.toDataURL('image/png');
  };

  const handleSaveClick = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const thumbnail = generateThumbnail(canvas);

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const defaultName = `笔记-${y}${m}${d}-${h}${min}${s}`;

    const name = window.prompt('请输入笔记名称：', defaultName);
    if (name === null || name.trim() === '') return;
    saveNote(name.trim(), thumbnail);
    onSave();
  };

  const handleExportClick = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const strokes = useAppStore.getState().strokes;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ectx = exportCanvas.getContext('2d');
    if (!ectx) return;

    ectx.lineCap = 'round';
    ectx.lineJoin = 'round';
    for (const stroke of strokes) {
      if (stroke.isEraser) continue;
      ectx.globalCompositeOperation = 'source-over';
      ectx.lineWidth = stroke.width;
      ectx.strokeStyle = stroke.color;
      const pts = stroke.points;
      if (pts.length === 0) continue;
      ectx.beginPath();
      ectx.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 1) {
        ectx.lineTo(pts[0].x + 0.01, pts[0].y + 0.01);
      } else if (pts.length === 2) {
        ectx.lineTo(pts[1].x, pts[1].y);
      } else {
        for (let i = 1; i < pts.length - 1; i++) {
          const midX = (pts[i].x + pts[i + 1].x) / 2;
          const midY = (pts[i].y + pts[i + 1].y) / 2;
          ectx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        const last = pts[pts.length - 1];
        ectx.lineTo(last.x, last.y);
      }
      ectx.stroke();
    }

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `智慧笔迹-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    onExport();
  };

  const togglePanel = (panel: 'color' | 'width' | 'eraser') => {
    setExpandedPanel((prev) => (prev === panel ? 'none' : panel));
  };

  return (
    <div
      className="absolute z-20 toolbar-container"
      style={{
        top: '20px',
        right: '20px',
      }}
    >
      <div
        className="flex items-center gap-1 px-3 py-2 rounded-2xl glass-card"
      >
        <ToolbarButton
          icon={<Pencil size={18} />}
          label="画笔"
          active={!isEraser}
          onClick={() => setEraser(false)}
        />
        <ToolbarButton
          icon={<Eraser size={18} />}
          label="橡皮"
          active={isEraser}
          onClick={() => setEraser(true)}
        />

        <Divider />

        <ToolbarButton
          icon={
            <div className="flex flex-col items-center gap-0.5">
              <div
                style={{ width: '20px', height: '14px', borderRadius: '2px', background: currentColor }}
              />
            </div>
          }
          label="颜色"
          active={expandedPanel === 'color'}
          onClick={() => togglePanel('color')}
        />
        <ToolbarButton
          icon={
            <div className="flex flex-col items-center justify-center gap-0.5">
              {STROKE_WIDTHS.includes(currentWidth as any) && (
                <div
                  style={{
                    width: '18px',
                    height: `${currentWidth}px`,
                    background: '#333',
                    borderRadius: `${currentWidth / 2}px`,
                    minHeight: '2px',
                  }}
                />
              )}
            </div>
          }
          label="粗细"
          active={expandedPanel === 'width'}
          onClick={() => togglePanel('width')}
        />
        {isEraser && (
          <ToolbarButton
            icon={<Minus size={16} />}
            label={`${eraserSize}px`}
            active={expandedPanel === 'eraser'}
            onClick={() => togglePanel('eraser')}
          />
        )}

        <Divider />

        <ToolbarButton
          icon={<Undo2 size={18} />}
          label="撤销"
          disabled={undoStack.length === 0}
          onClick={undo}
        />
        <ToolbarButton
          icon={<Redo2 size={18} />}
          label="重做"
          disabled={redoStack.length === 0}
          onClick={redo}
        />
        <ToolbarButton
          icon={<Trash2 size={18} />}
          label="清空"
          onClick={clearCanvas}
        />

        <Divider />

        <button
          onClick={handleSaveClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-xl transition-all duration-200 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 hover:scale-105 shadow-sm"
        >
          <Save size={16} />
          <span>保存</span>
        </button>
        <button
          onClick={handleExportClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-xl transition-all duration-200 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 hover:scale-105 shadow-sm"
        >
          <Download size={16} />
          <span>导出</span>
        </button>
      </div>

      {expandedPanel === 'color' && (
        <div className="absolute top-full right-0 mt-2 p-3 rounded-2xl glass-card animate-fadeInOrigin">
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  setColor(color);
                  setExpandedPanel('none');
                }}
                className={`w-7 h-7 rounded-full transition-all duration-200 border-2 ${
                  currentColor === color && !isEraser
                    ? 'border-blue-500 scale-110 shadow-md'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ background: color }}
              />
            ))}
          </div>
        </div>
      )}

      {expandedPanel === 'width' && (
        <div className="absolute top-full right-0 mt-2 p-3 rounded-2xl glass-card animate-fadeInOrigin">
          <div className="flex flex-col gap-2">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => {
                  setWidth(w);
                  setExpandedPanel('none');
                }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  currentWidth === w
                    ? 'bg-blue-50 border-b-2 border-blue-400'
                    : 'hover:bg-gray-100 border-b-2 border-transparent'
                }`}
              >
                <div
                  style={{
                    width: '28px',
                    height: `${w}px`,
                    background: '#333',
                    borderRadius: `${w / 2}px`,
                    minHeight: '2px',
                  }}
                />
                <span className="text-xs text-gray-700 font-medium">{w}px</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {expandedPanel === 'eraser' && isEraser && (
        <div className="absolute top-full right-0 mt-2 p-3 rounded-2xl glass-card animate-fadeInOrigin">
          <div className="flex flex-col gap-2">
            {ERASER_SIZES.map((es) => (
              <button
                key={es.value}
                onClick={() => {
                  setEraserSize(es.value);
                  setExpandedPanel('none');
                }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  eraserSize === es.value
                    ? 'bg-blue-50 border-b-2 border-blue-400'
                    : 'hover:bg-gray-100 border-b-2 border-transparent'
                }`}
              >
                <div
                  className="rounded-full border-2 border-gray-400 bg-gray-200"
                  style={{ width: `${Math.min(es.value, 28)}px`, height: `${Math.min(es.value, 28)}px` }}
                />
                <span className="text-xs text-gray-700 font-medium">{es.label} ({es.value}px)</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolbarButton({ icon, label, active, disabled, onClick }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100/80'
      }`}
    >
      <div className={`${active ? 'text-blue-600' : 'text-gray-700'} transition-colors duration-200`}>
        {icon}
      </div>
      <span className={`text-[10px] ${active ? 'text-blue-600' : 'text-gray-600'} transition-colors duration-200`}>
        {label}
      </span>
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-blue-500 animate-borderGrow" />
      )}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-7 bg-gray-200 mx-1" />;
}
