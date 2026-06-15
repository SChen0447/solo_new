import React from 'react';
import { useAppContext } from './App';

const ControlPanel: React.FC = () => {
  const { environment, setEnvironment } = useAppContext();

  return (
    <div className="glass-panel control-panel">
      <div className="panel-title">
        <span className="title-icon">🌤️</span>
        <h3>环境控制</h3>
      </div>

      <div className="slider-group">
        <div className="slider-label">
          <span className="slider-icon">☀️</span>
          <span>光照强度</span>
          <span className="slider-value">{environment.light.toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={environment.light}
          onChange={(e) => setEnvironment({ light: Number(e.target.value) })}
          className="custom-slider slider-light"
          style={{
            ['--slider-progress' as any]: `${environment.light}%`,
            ['--slider-color' as any]: '#ffd54f'
          }}
        />
      </div>

      <div className="slider-group">
        <div className="slider-label">
          <span className="slider-icon">💧</span>
          <span>水分</span>
          <span className="slider-value">{environment.water.toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={environment.water}
          onChange={(e) => setEnvironment({ water: Number(e.target.value) })}
          className="custom-slider slider-water"
          style={{
            ['--slider-progress' as any]: `${environment.water}%`,
            ['--slider-color' as any]: '#4fc3f7'
          }}
        />
      </div>

      <div className="slider-group">
        <div className="slider-label">
          <span className="slider-icon">🌡️</span>
          <span>温度</span>
          <span className="slider-value">{environment.temperature.toFixed(0)}°C</span>
        </div>
        <input
          type="range"
          min="10"
          max="40"
          step="0.5"
          value={environment.temperature}
          onChange={(e) => setEnvironment({ temperature: Number(e.target.value) })}
          className="custom-slider slider-temperature"
          style={{
            ['--slider-progress' as any]: `${((environment.temperature - 10) / 30) * 100}%`,
            ['--slider-color' as any]: '#ff7043'
          }}
        />
      </div>
    </div>
  );
};

export default ControlPanel;
