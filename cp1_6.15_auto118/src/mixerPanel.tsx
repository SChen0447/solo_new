import { useState, useCallback, useRef, useEffect } from 'react';
import { Volume2, Music, Radio, ChevronUp, ChevronDown } from 'lucide-react';
import { useAudioStore } from './store';

interface VerticalSliderProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  trackColor: string;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

function VerticalSlider({
  label,
  icon,
  value,
  min,
  max,
  step,
  unit,
  trackColor,
  onChange,
  formatValue,
}: VerticalSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const percentage = ((value - min) / (max - min)) * 100;

  const updateValueFromPosition = useCallback(
    (clientY: number) => {
      if (!sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const trackHeight = rect.height;
      const relativeY = rect.bottom - clientY;
      const clampedY = Math.max(0, Math.min(trackHeight, relativeY));
      const newValue = min + (clampedY / trackHeight) * (max - min);
      const steppedValue = Math.round(newValue / step) * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));

      onChange(clampedValue);
    },
    [min, max, step, onChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      updateValueFromPosition(e.clientY);
    },
    [updateValueFromPosition]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setIsDragging(true);
      updateValueFromPosition(e.touches[0].clientY);
    },
    [updateValueFromPosition]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateValueFromPosition(e.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        updateValueFromPosition(e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, updateValueFromPosition]);

  const displayValue = formatValue ? formatValue(value) : value.toFixed(1);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm font-medium text-gray-300 flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>

      <div
        ref={sliderRef}
        className="relative cursor-pointer select-none"
        style={{ width: '40px', height: '180px' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: '6px',
            height: '100%',
            backgroundColor: trackColor,
          }}
        />

        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: '6px',
            height: `${percentage}%`,
            bottom: 0,
            backgroundColor: '#00d4aa',
            opacity: 0.8,
          }}
        />

        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full transition-transform duration-200"
          style={{
            width: '22px',
            height: '22px',
            bottom: `calc(${percentage}% - 11px)`,
            backgroundColor: '#00d4aa',
            transform: `translateX(-50%) scale(${isHovering || isDragging ? 1.1 : 1})`,
            cursor: isDragging ? 'grabbing' : 'grab',
            boxShadow: isDragging
              ? '0 0 4px 4px rgba(0, 212, 170, 0.6)'
              : '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
        />
      </div>

      <div
        className="font-mono text-sm"
        style={{ color: '#a0a0c0' }}
      >
        {displayValue}{unit}
      </div>
    </div>
  );
}

export function MixerPanel() {
  const { volume, bassGain, trebleGain, setVolume, setBassGain, setTrebleGain, fileName, isPlaying } =
    useAudioStore();
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  return (
    <>
      <div
        className="hidden md:flex flex-col fixed right-0 top-0 h-full z-10"
        style={{
          width: '280px',
          backgroundColor: 'rgba(22, 22, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: '24px',
          borderTopLeftRadius: '12px',
          borderBottomLeftRadius: '12px',
          borderLeft: '1px solid rgba(74, 74, 122, 0.3)',
        }}
      >
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-2">混音控制台</h2>
          <p className="text-xs text-gray-400">拖动滑块调节音频效果</p>
          {fileName && (
            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(74, 74, 122, 0.2)' }}>
              <p className="text-xs text-gray-400 mb-1">当前播放</p>
              <p className="text-sm text-white truncate">{fileName}</p>
              {isPlaying && (
                <div className="flex items-center gap-1 mt-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-green-400">播放中</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-around items-start flex-1">
          <VerticalSlider
            label="音量"
            icon={<Volume2 size={16} style={{ color: '#00d4aa' }} />}
            value={volume}
            min={0}
            max={1.5}
            step={0.01}
            unit="x"
            trackColor="#3a3a5a"
            onChange={setVolume}
            formatValue={(v) => (v * 100).toFixed(0) + '%'}
          />

          <VerticalSlider
            label="低音"
            icon={<Music size={16} style={{ color: '#00d4aa' }} />}
            value={bassGain}
            min={-12}
            max={12}
            step={0.5}
            unit="dB"
            trackColor="#4a4a7a"
            onChange={setBassGain}
            formatValue={(v) => (v > 0 ? '+' : '') + v.toFixed(1)}
          />

          <VerticalSlider
            label="高频"
            icon={<Radio size={16} style={{ color: '#00d4aa' }} />}
            value={trebleGain}
            min={-12}
            max={12}
            step={0.5}
            unit="dB"
            trackColor="#6a6a9a"
            onChange={setTrebleGain}
            formatValue={(v) => (v > 0 ? '+' : '') + v.toFixed(1)}
          />
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            提示：拖拽场景暂停旋转，双击恢复
          </p>
        </div>
      </div>

      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-10 transition-transform duration-400 ease-in-out"
        style={{
          transform: isMobileExpanded ? 'translateY(0)' : 'translateY(calc(100% - 48px))',
          backgroundColor: 'rgba(22, 22, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          borderTop: '1px solid rgba(74, 74, 122, 0.3)',
        }}
      >
        <button
          className="w-full py-3 flex items-center justify-center gap-2 text-white hover:bg-white/5 transition-colors"
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
        >
          {isMobileExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          <span className="text-sm font-medium">混音控制</span>
        </button>

        <div
          className="px-4 pb-6 pt-2 overflow-x-auto"
          style={{ height: '200px' }}
        >
          <div className="flex justify-around items-start min-w-max gap-8 px-4">
            <VerticalSlider
              label="音量"
              icon={<Volume2 size={16} style={{ color: '#00d4aa' }} />}
              value={volume}
              min={0}
              max={1.5}
              step={0.01}
              unit="x"
              trackColor="#3a3a5a"
              onChange={setVolume}
              formatValue={(v) => (v * 100).toFixed(0) + '%'}
            />

            <VerticalSlider
              label="低音"
              icon={<Music size={16} style={{ color: '#00d4aa' }} />}
              value={bassGain}
              min={-12}
              max={12}
              step={0.5}
              unit="dB"
              trackColor="#4a4a7a"
              onChange={setBassGain}
              formatValue={(v) => (v > 0 ? '+' : '') + v.toFixed(1)}
            />

            <VerticalSlider
              label="高频"
              icon={<Radio size={16} style={{ color: '#00d4aa' }} />}
              value={trebleGain}
              min={-12}
              max={12}
              step={0.5}
              unit="dB"
              trackColor="#6a6a9a"
              onChange={setTrebleGain}
              formatValue={(v) => (v > 0 ? '+' : '') + v.toFixed(1)}
            />
          </div>

          {fileName && (
            <div className="mt-4 p-2 rounded-lg" style={{ backgroundColor: 'rgba(74, 74, 122, 0.2)' }}>
              <p className="text-xs text-gray-400">当前播放: {fileName}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
