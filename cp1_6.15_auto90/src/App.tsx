import React, { useState, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import TreeScene from './components/TreeScene';
import InfoPanel from './components/InfoPanel';
import LogPanel from './components/LogPanel';
import { useGrowthStore } from './store';
import { GrowthParams } from './types';

interface SliderConfig {
  key: keyof GrowthParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const mobileSliders: SliderConfig[] = [
  { key: 'light', label: '光照', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'water', label: '水分', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'co2', label: 'CO2', min: 0.5, max: 2.0, step: 0.1, unit: 'ppm' },
];

const stageNames: Record<string, string> = {
  seed: '种子阶段',
  seedling: '幼苗阶段',
  young_tree: '幼树阶段',
  mature_tree: '成树阶段',
};

const StageIndicator: React.FC = () => {
  const currentStage = useGrowthStore((s) => s.currentStage);

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(26, 26, 46, 0.9)',
        padding: '10px 24px',
        borderRadius: 6,
        zIndex: 100,
        border: '1px solid rgba(0, 212, 170, 0.3)',
      }}
    >
      <span style={{ color: '#a0a0b0', fontSize: 12 }}>当前阶段：</span>
      <span style={{ color: '#00d4aa', fontSize: 14, fontWeight: 600, marginLeft: 4 }}>
        {stageNames[currentStage] || currentStage}
      </span>
    </div>
  );
};

const MobileSliders: React.FC = () => {
  const params = useGrowthStore((s) => s.params);
  const updateParam = useGrowthStore((s) => s.updateParam);

  return (
    <>
      {mobileSliders.map((slider) => {
        const value = params[slider.key];
        const percent = ((value - slider.min) / (slider.max - slider.min)) * 100;
        return (
          <div key={slider.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#a0a0b0', whiteSpace: 'nowrap' }}>
              {slider.label}
            </span>
            <div style={{ position: 'relative', width: 100, height: 14 }}>
              <div
                style={{
                  position: 'absolute',
                  width: 100,
                  height: 4,
                  backgroundColor: '#3a3a4a',
                  borderRadius: 2,
                  top: 5,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${percent}%`,
                    backgroundColor: '#00d4aa',
                    borderRadius: 2,
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
                style={{
                  position: 'absolute',
                  width: 100,
                  height: 14,
                  opacity: 0,
                  margin: 0,
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: '#00d4aa', minWidth: 36 }}>
              {value.toFixed(slider.step < 1 ? 1 : 0)}
              {slider.unit}
            </span>
          </div>
        );
      })}
    </>
  );
};

const mobileTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#e0e0e0',
  whiteSpace: 'nowrap',
};

const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        backgroundColor: '#0d0d1a',
      }}
    >
      {!isMobile && <ControlPanel />}
      {isMobile && (
        <div
          style={{
            height: 60,
            backgroundColor: '#1e1e2e',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            overflowX: 'auto',
            flexShrink: 0,
          }}
        >
          <div style={mobileTitleStyle}>环境参数</div>
          <MobileSliders />
        </div>
      )}
      <div
        style={{
          flex: 1,
          position: 'relative',
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <TreeScene />
        <InfoPanel />
        <LogPanel />
        <StageIndicator />
      </div>
    </div>
  );
};

export default App;
