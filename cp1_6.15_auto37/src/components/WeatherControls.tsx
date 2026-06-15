import React, { useCallback, useMemo } from 'react';
import { useWeatherStore } from '../store/weatherStore';
import { WeatherMode, TimeScale, WEATHER_PRESETS } from '../types';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  gradientFrom: string;
  gradientTo: string;
  onChange: (v: number) => void;
}

const Slider: React.FC<SliderProps> = React.memo(({
  label, value, min, max, step, unit, gradientFrom, gradientTo, onChange
}) => {
  const percentage = useMemo(() => ((value - min) / (max - min)) * 100, [value, min, max]);
  const trackId = useMemo(() => `track-${label.replace(/\s/g, '')}-${Math.random().toString(36).slice(2, 7)}`, [label]);

  return (
    <div className="slider-container">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{value.toFixed(step < 1 ? 1 : 0)}{unit}</span>
      </div>
      <div className="slider-track-wrapper">
        <svg className="slider-gradient-svg" width="100%" height="6">
          <defs>
            <linearGradient id={trackId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientFrom} />
              <stop offset="100%" stopColor={gradientTo} />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100%" height="6" rx="3" fill={`url(#${trackId})`} opacity="0.4" />
          <rect x="0" y="0" width={`${percentage}%`} height="6" rx="3" fill={`url(#${trackId})`} />
        </svg>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="custom-slider"
        />
      </div>
    </div>
  );
});

Slider.displayName = 'Slider';

const modeLabels: Record<WeatherMode, { label: string; emoji: string }> = {
  sunny: { label: '晴朗', emoji: '☀️' },
  cloudy: { label: '多云', emoji: '☁️' },
  rainy: { label: '暴雨', emoji: '🌧️' },
  dusty: { label: '沙尘', emoji: '🌪️' },
};

const timeScaleOptions: TimeScale[] = [1, 2, 5, 10];

export const WeatherControls: React.FC = React.memo(() => {
  const weather = useWeatherStore((s) => s.weather);
  const weatherMode = useWeatherStore((s) => s.weatherMode);
  const timeScale = useWeatherStore((s) => s.timeScale);
  const ecoDay = useWeatherStore((s) => s.ecoDay);
  const setWeather = useWeatherStore((s) => s.setWeather);
  const setWeatherMode = useWeatherStore((s) => s.setWeatherMode);
  const setTimeScale = useWeatherStore((s) => s.setTimeScale);
  const initPlants = useWeatherStore((s) => s.initPlants);

  const handleTemp = useCallback((v: number) => setWeather({ temperature: v }), [setWeather]);
  const handleHumidity = useCallback((v: number) => setWeather({ humidity: v }), [setWeather]);
  const handleLight = useCallback((v: number) => setWeather({ light: v }), [setWeather]);
  const handleWind = useCallback((v: number) => setWeather({ windSpeed: v }), [setWeather]);
  const handleMode = useCallback((m: WeatherMode) => setWeatherMode(m), [setWeatherMode]);
  const handleScale = useCallback((s: TimeScale) => setTimeScale(s), [setTimeScale]);

  return (
    <div className="weather-controls-panel">
      <div className="panel-header">
        <h2 className="panel-title">🌿 天气控制台</h2>
        <div className="eco-day">
          <span className="eco-day-label">生态日</span>
          <span className="eco-day-value">{ecoDay.toFixed(1)}</span>
        </div>
      </div>

      <div className="sliders-section">
        <Slider
          label="温度"
          value={weather.temperature}
          min={-10}
          max={45}
          step={1}
          unit="℃"
          gradientFrom="#4a90d9"
          gradientTo="#e74c3c"
          onChange={handleTemp}
        />
        <Slider
          label="湿度"
          value={weather.humidity}
          min={0}
          max={100}
          step={1}
          unit="%"
          gradientFrom="#ffffff"
          gradientTo="#2980b9"
          onChange={handleHumidity}
        />
        <Slider
          label="光照强度"
          value={weather.light}
          min={0}
          max={2000}
          step={50}
          unit=" lux"
          gradientFrom="#333333"
          gradientTo="#ffdd44"
          onChange={handleLight}
        />
        <Slider
          label="风速"
          value={weather.windSpeed}
          min={0}
          max={20}
          step={0.5}
          unit=" m/s"
          gradientFrom="#88ccff"
          gradientTo="#cc88ff"
          onChange={handleWind}
        />
      </div>

      <div className="time-scale-section">
        <div className="section-label">时间倍速</div>
        <div className="scale-buttons">
          {timeScaleOptions.map((s) => (
            <button
              key={s}
              className={`scale-btn ${timeScale === s ? 'active' : ''}`}
              onClick={() => handleScale(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="mode-section">
        <div className="section-label">天气模式</div>
        <div className="mode-buttons">
          {(Object.keys(modeLabels) as WeatherMode[]).map((m) => (
            <button
              key={m}
              className={`mode-btn ${weatherMode === m ? 'active' : ''}`}
              onClick={() => handleMode(m)}
            >
              <span className="mode-emoji">{modeLabels[m].emoji}</span>
              <span className="mode-text">{modeLabels[m].label}</span>
            </button>
          ))}
        </div>
      </div>

      <button className="regen-btn" onClick={() => initPlants()}>
        🔄 重新生成生态
      </button>
    </div>
  );
});

WeatherControls.displayName = 'WeatherControls';
