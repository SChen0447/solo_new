import React, { useState, useCallback } from 'react';
import { useAnimationStore, EasingFunction, AnimationDirection, FillMode } from '../store/animationStore';

const EASING_OPTIONS: { value: EasingFunction; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In Out' },
  { value: 'cubic-bezier(0.68,-0.55,0.27,1.55)', label: 'Back' },
  { value: 'cubic-bezier(0.25,0.46,0.45,0.94)', label: 'Smooth' },
  { value: 'cubic-bezier(0.175,0.885,0.32,1.275)', label: 'Back Out' },
  { value: 'steps(4,end)', label: 'Steps' },
];

const DIRECTION_OPTIONS: { value: AnimationDirection; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'reverse', label: 'Reverse' },
  { value: 'alternate', label: 'Alternate' },
  { value: 'alternate-reverse', label: 'Alt Reverse' },
];

const FILL_MODE_OPTIONS: { value: FillMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'forwards', label: 'Forwards' },
  { value: 'backwards', label: 'Backwards' },
  { value: 'both', label: 'Both' },
];

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

const ParamSlider: React.FC<SliderProps> = ({ label, value, min, max, step, unit = '', onChange }) => {
  const [dragging, setDragging] = useState(false);
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div style={sliderStyles.container}>
      <div style={sliderStyles.header}>
        <span style={sliderStyles.label}>{label}</span>
        <span style={sliderStyles.value}>{value}{unit}</span>
      </div>
      <div style={sliderStyles.trackWrapper}>
        <div style={sliderStyles.track}>
          <div style={{ ...sliderStyles.filled, width: `${percent}%` }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseDown={() => setDragging(true)}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
          onTouchStart={() => setDragging(true)}
          onTouchEnd={() => setDragging(false)}
          style={sliderStyles.input}
        />
        {dragging && (
          <div
            style={{
              ...sliderStyles.tooltip,
              left: `calc(${percent}% - 20px)`,
            }}
          >
            {value}{unit}
          </div>
        )}
      </div>
    </div>
  );
};

interface SelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}

const ParamSelect: React.FC<SelectProps> = ({ label, value, options, onChange }) => {
  return (
    <div style={selectStyles.container}>
      <span style={selectStyles.label}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyles.select}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const ParamsPanel: React.FC = () => {
  const { currentParams, updateParams, selectedPresetId } = useAnimationStore();

  const handleUpdate = useCallback(
    (key: string, value: number | string) => {
      updateParams({ [key]: value });
    },
    [updateParams]
  );

  if (!selectedPresetId) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>参数调节</div>
        <div style={styles.empty}>请先选择一个动画预设</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>参数调节</div>

      <ParamSlider
        label="持续时长"
        value={currentParams.duration}
        min={0.1}
        max={5}
        step={0.1}
        unit="s"
        onChange={(v) => handleUpdate('duration', v)}
      />

      <ParamSlider
        label="延迟"
        value={currentParams.delay}
        min={0}
        max={3}
        step={0.1}
        unit="s"
        onChange={(v) => handleUpdate('delay', v)}
      />

      <ParamSlider
        label="循环次数"
        value={currentParams.iterationCount}
        min={0}
        max={10}
        step={1}
        onChange={(v) => handleUpdate('iterationCount', v)}
      />

      <ParamSelect
        label="缓动函数"
        value={currentParams.easing}
        options={EASING_OPTIONS}
        onChange={(v) => handleUpdate('easing', v)}
      />

      <ParamSelect
        label="方向"
        value={currentParams.direction}
        options={DIRECTION_OPTIONS}
        onChange={(v) => handleUpdate('direction', v)}
      />

      <ParamSelect
        label="填充模式"
        value={currentParams.fillMode}
        options={FILL_MODE_OPTIONS}
        onChange={(v) => handleUpdate('fillMode', v)}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    padding: '12px',
    overflowY: 'auto',
    background: '#1a1a2e',
  },
  title: {
    color: '#e0e0e0',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '16px',
  },
  empty: {
    color: '#555',
    fontSize: '13px',
    textAlign: 'center',
    marginTop: '40px',
  },
};

const sliderStyles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  label: {
    color: '#aaa',
    fontSize: '12px',
  },
  value: {
    color: '#e0e0e0',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  trackWrapper: {
    position: 'relative',
    height: '20px',
  },
  track: {
    position: 'absolute',
    top: '8px',
    left: 0,
    right: 0,
    height: '4px',
    background: '#2a2a4a',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  filled: {
    height: '100%',
    background: '#667eea',
    borderRadius: '2px',
    transition: 'width 0.05s',
  },
  input: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '20px',
    opacity: 0,
    cursor: 'pointer',
    margin: 0,
  },
  tooltip: {
    position: 'absolute',
    top: '-28px',
    width: '40px',
    textAlign: 'center',
    background: '#333',
    color: '#fff',
    fontSize: '10px',
    padding: '2px 4px',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: 10,
  },
};

const selectStyles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '14px',
  },
  label: {
    display: 'block',
    color: '#aaa',
    fontSize: '12px',
    marginBottom: '4px',
  },
  select: {
    width: '100%',
    padding: '6px 8px',
    background: '#2a2a4a',
    color: '#e0e0e0',
    border: '1px solid #3a3a5a',
    borderRadius: '4px',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
};

export default ParamsPanel;
