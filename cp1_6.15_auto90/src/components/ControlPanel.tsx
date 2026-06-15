import React from 'react';
import { useGrowthStore } from '../store';
import { GrowthParams } from '../types';

interface SliderConfig {
  key: keyof GrowthParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const sliders: SliderConfig[] = [
  { key: 'light', label: '光照强度', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'water', label: '水分', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'co2', label: '二氧化碳浓度', min: 0.5, max: 2.0, step: 0.1, unit: 'ppm' },
];

const ControlPanel: React.FC = () => {
  const params = useGrowthStore((s) => s.params);
  const updateParam = useGrowthStore((s) => s.updateParam);

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>环境参数</h2>
      {sliders.map((slider) => {
        const value = params[slider.key];
        const percent = ((value - slider.min) / (slider.max - slider.min)) * 100;
        return (
          <div key={slider.key} style={styles.sliderContainer}>
            <div style={styles.labelRow}>
              <span style={styles.label}>{slider.label}</span>
              <span style={styles.value}>
                {value.toFixed(slider.step < 1 ? 1 : 0)}
                {slider.unit}
              </span>
            </div>
            <div style={styles.sliderWrapper}>
              <div style={{ ...styles.sliderTrack }}>
                <div
                  style={{
                    ...styles.sliderFill,
                    width: `${percent}%`,
                  }}
                />
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={value}
                onChange={(e) => updateParam(slider.key, parseFloat(e.target.value))}
                style={styles.sliderInput}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 260,
    backgroundColor: '#1e1e2e',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    flexShrink: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: 8,
    letterSpacing: 1,
  },
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: '#a0a0b0',
  },
  value: {
    fontSize: 13,
    color: '#00d4aa',
    fontWeight: 500,
  },
  sliderWrapper: {
    position: 'relative',
    width: 180,
    height: 16,
    display: 'flex',
    alignItems: 'center',
  },
  sliderTrack: {
    position: 'absolute',
    width: 180,
    height: 6,
    backgroundColor: '#3a3a4a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#00d4aa',
    borderRadius: 3,
    transition: 'width 0.2s ease-out',
  },
  sliderInput: {
    position: 'absolute',
    width: 180,
    height: 16,
    opacity: 0,
    cursor: 'pointer',
    margin: 0,
    padding: 0,
  },
};

export default ControlPanel;
