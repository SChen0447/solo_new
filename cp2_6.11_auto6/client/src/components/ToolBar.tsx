import { Pencil, Highlighter, Minus, Square, Circle, Type, StickyNote } from 'lucide-react';
import useStore from '../store/useStore';

interface ToolBarProps {
  onAddStickyNote: () => void;
}

const tools = [
  { id: 'pencil' as const, icon: Pencil },
  { id: 'highlighter' as const, icon: Highlighter },
  { id: 'line' as const, icon: Minus },
  { id: 'rect' as const, icon: Square },
  { id: 'circle' as const, icon: Circle },
  { id: 'text' as const, icon: Type },
];

const colors = ['#FFFFFF', '#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'];

export default function ToolBar({ onAddStickyNote }: ToolBarProps) {
  const currentTool = useStore((s) => s.currentTool);
  const currentColor = useStore((s) => s.currentColor);
  const strokeWidth = useStore((s) => s.strokeWidth);
  const fontSize = useStore((s) => s.fontSize);
  const setCurrentTool = useStore((s) => s.setCurrentTool);
  const setCurrentColor = useStore((s) => s.setCurrentColor);
  const setStrokeWidth = useStore((s) => s.setStrokeWidth);
  const setFontSize = useStore((s) => s.setFontSize);

  const showStrokeSlider = currentTool === 'pencil' || currentTool === 'highlighter';
  const showFontSizeSlider = currentTool === 'text';

  return (
    <div className="glass fixed left-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl p-3 flex flex-col items-center gap-3 max-md:left-1/2 max-md:top-auto max-md:bottom-4 max-md:-translate-y-0 max-md:-translate-x-1/2 max-md:flex-row max-md:rounded-2xl max-md:p-2 max-md:gap-2">
      <div className="flex flex-col gap-1 max-md:flex-row max-md:gap-1">
        {tools.map(({ id, icon: Icon }) => (
          <button
            key={id}
            className={`tool-btn ${currentTool === id ? 'active' : ''}`}
            onClick={() => setCurrentTool(id)}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-white/20 max-md:w-px max-md:h-6 max-md:bg-white/20" />

      <div className="grid grid-cols-2 gap-1.5 max-md:flex max-md:flex-row max-md:gap-1">
        {colors.map((c) => (
          <button
            key={c}
            className={`w-6 h-6 rounded-full border border-white/20 transition-all duration-150 ${
              currentColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110' : ''
            }`}
            style={{ backgroundColor: c }}
            onClick={() => setCurrentColor(c)}
          />
        ))}
      </div>

      {showStrokeSlider && (
        <div className="flex flex-col items-center gap-1 w-full max-md:flex-row max-md:w-auto">
          <input
            type="range"
            min={1}
            max={20}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-20 max-md:w-16 accent-indigo-500"
          />
          <span className="text-xs text-white/70">{strokeWidth}</span>
        </div>
      )}

      {showFontSizeSlider && (
        <div className="flex flex-col items-center gap-1 w-full max-md:flex-row max-md:w-auto">
          <input
            type="range"
            min={12}
            max={48}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-20 max-md:w-16 accent-indigo-500"
          />
          <span className="text-xs text-white/70">{fontSize}</span>
        </div>
      )}

      <div className="w-full h-px bg-white/20 max-md:w-px max-md:h-6 max-md:bg-white/20" />

      <button className="tool-btn" onClick={onAddStickyNote} title="便利贴">
        <StickyNote size={20} />
      </button>
    </div>
  );
}
