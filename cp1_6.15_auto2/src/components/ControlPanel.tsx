import React from 'react'
import { Sun, Droplets, Waves, ChevronDown, ChevronUp } from 'lucide-react'
import { useEnvironmentStore } from '@/store/useEnvironmentStore'
import { Gauge } from './Gauge'

export const ControlPanel: React.FC = () => {
  const {
    lightIntensity,
    waterTurbidity,
    currentSpeed,
    targetLightIntensity,
    targetWaterTurbidity,
    targetCurrentSpeed,
    isPanelExpanded,
    setLightIntensity,
    setWaterTurbidity,
    setCurrentSpeed,
    togglePanel
  } = useEnvironmentStore()

  return (
    <div
      className={`fixed right-4 bottom-4 z-50 transition-all duration-500 ease-out ${
        isPanelExpanded ? 'translate-y-0 opacity-100' : 'translate-y-[calc(100%-60px)] opacity-90'
      }`}
      style={{
        background: 'rgba(10, 30, 50, 0.6)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}
    >
      <button
        onClick={togglePanel}
        className="w-full py-3 px-4 flex items-center justify-between text-white hover:bg-white/5 transition-all duration-300 rounded-t-2xl"
      >
        <span className="font-semibold text-sm" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          环境控制面板
        </span>
        {isPanelExpanded ? (
          <ChevronDown className="w-5 h-5 text-cyan-400" />
        ) : (
          <ChevronUp className="w-5 h-5 text-cyan-400" />
        )}
      </button>

      {isPanelExpanded && (
        <div className="p-4 pt-2">
          <div className="flex gap-3 justify-center mb-6">
            <Gauge
              value={lightIntensity}
              maxValue={100}
              label="光照"
              unit="%"
              gradientStart="#ffd700"
              gradientEnd="#ff8c00"
            />
            <Gauge
              value={waterTurbidity}
              maxValue={100}
              label="浑浊度"
              unit="%"
              gradientStart="#4fc3f7"
              gradientEnd="#0288d1"
            />
            <Gauge
              value={currentSpeed}
              maxValue={5}
              label="洋流"
              unit="m/s"
              gradientStart="#00e676"
              gradientEnd="#00c853"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white text-sm">
                  <Sun className="w-4 h-4 text-yellow-400" />
                  <span>光照强度</span>
                </div>
                <span className="text-cyan-400 text-sm font-mono">{targetLightIntensity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={targetLightIntensity}
                onChange={(e) => setLightIntensity(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #ffd700 0%, #ffd700 ${targetLightIntensity}%, rgba(255,255,255,0.2) ${targetLightIntensity}%, rgba(255,255,255,0.2) 100%)`,
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white text-sm">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <span>水体浑浊度</span>
                </div>
                <span className="text-cyan-400 text-sm font-mono">{targetWaterTurbidity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={targetWaterTurbidity}
                onChange={(e) => setWaterTurbidity(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #4fc3f7 0%, #4fc3f7 ${targetWaterTurbidity}%, rgba(255,255,255,0.2) ${targetWaterTurbidity}%, rgba(255,255,255,0.2) 100%)`,
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white text-sm">
                  <Waves className="w-4 h-4 text-green-400" />
                  <span>洋流速度</span>
                </div>
                <span className="text-cyan-400 text-sm font-mono">{targetCurrentSpeed.toFixed(1)} m/s</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={targetCurrentSpeed}
                onChange={(e) => setCurrentSpeed(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #00e676 0%, #00e676 ${(targetCurrentSpeed / 5) * 100}%, rgba(255,255,255,0.2) ${(targetCurrentSpeed / 5) * 100}%, rgba(255,255,255,0.2) 100%)`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00d4ff;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0, 212, 255, 0.5);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(0, 212, 255, 0.8);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00d4ff;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0, 212, 255, 0.5);
        }
      `}</style>
    </div>
  )
}
