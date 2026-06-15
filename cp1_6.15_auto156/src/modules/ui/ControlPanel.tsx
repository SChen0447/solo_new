import React, { useState } from 'react'
import { useStore, type CellType } from '@/store/Store'

const ControlPanel: React.FC = () => {
  const cellType = useStore((state) => state.cellType)
  const setCellType = useStore((state) => state.setCellType)
  const params = useStore((state) => state.params)
  const setParams = useStore((state) => state.setParams)
  const resetSimulation = useStore((state) => state.resetSimulation)
  const [isPressed, setIsPressed] = useState(false)

  const handleCellTypeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setCellType(e.target.value as CellType)
  }

  const handleLightChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setParams({ lightIntensity: Number(e.target.value) })
  }

  const handleGlucoseChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setParams({ glucoseConcentration: Number(e.target.value) })
  }

  const handleReset = (): void => {
    setIsPressed(true)
    setTimeout(() => setIsPressed(false), 100)
    resetSimulation()
  }

  const sliderStyle: React.CSSProperties = {
    WebkitAppearance: 'none',
    appearance: 'none',
    width: 200,
    height: 4,
    background: '#555',
    outline: 'none',
    borderRadius: 2,
    cursor: 'pointer',
  }

  const sliderThumbStyle: React.CSSProperties = {
    WebkitAppearance: 'none',
    appearance: 'none',
    width: 16,
    height: 16,
    background: '#00e676',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 0 0 rgba(0, 230, 118, 0)',
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 56,
        right: 20,
        background: '#1e1e1e',
        borderRadius: 12,
        boxShadow: '2px 4px 8px rgba(0, 0, 0, 0.3)',
        padding: 20,
        color: '#fff',
        fontFamily: 'sans-serif',
        zIndex: 10,
        width: 280,
      }}
    >
      <style>{`
        .slider::-webkit-slider-thumb {
          ${Object.entries(sliderThumbStyle).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`).join('')}
        }
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 0 8px rgba(0, 230, 118, 0.6);
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #00e676;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 0 8px rgba(0, 230, 118, 0.6);
        }
        .slider:focus::-webkit-slider-thumb {
          transform: scale(1.1);
          box-shadow: 0 0 12px rgba(0, 230, 118, 0.8);
        }
      `}</style>

      <h4
        style={{
          margin: '0 0 16px 0',
          fontSize: 14,
          fontWeight: 600,
          color: '#00bcd4',
          letterSpacing: 0.5,
        }}
      >
        参数控制面板
      </h4>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            color: '#888',
            marginBottom: 8,
          }}
        >
          细胞类型
        </label>
        <select
          value={cellType}
          onChange={handleCellTypeChange}
          style={{
            width: '100%',
            height: 36,
            background: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: 8,
            color: '#fff',
            fontSize: 13,
            padding: '0 12px',
            cursor: 'pointer',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#00bcd4'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#444'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#00bcd4'
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 188, 212, 0.2)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#444'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <option value="animal">动物细胞</option>
          <option value="plant">植物细胞</option>
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <label style={{ fontSize: 12, color: '#888' }}>
            光照强度
          </label>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#00e676',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {params.lightIntensity} μmol/m²/s
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1000"
          step="10"
          value={params.lightIntensity}
          onChange={handleLightChange}
          className="slider"
          style={sliderStyle}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: '#555',
            marginTop: 4,
          }}
        >
          <span>0</span>
          <span>500</span>
          <span>1000</span>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <label style={{ fontSize: 12, color: '#888' }}>
            葡萄糖浓度
          </label>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#00e676',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {params.glucoseConcentration.toFixed(1)} mM
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="20"
          step="0.5"
          value={params.glucoseConcentration}
          onChange={handleGlucoseChange}
          className="slider"
          style={sliderStyle}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: '#555',
            marginTop: 4,
          }}
        >
          <span>0</span>
          <span>10</span>
          <span>20</span>
        </div>
      </div>

      <button
        onClick={handleReset}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={(e) => {
          setIsPressed(false)
          if (!isPressed) {
            e.currentTarget.style.background = '#e53935'
          }
        }}
        style={{
          width: 80,
          height: 32,
          background: '#e53935',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.1s ease',
          transform: isPressed ? 'scale(0.95)' : 'scale(1)',
          boxShadow: isPressed
            ? 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
            : '0 2px 4px rgba(229, 57, 53, 0.3)',
        }}
        onMouseEnter={(e) => {
          if (!isPressed) {
            e.currentTarget.style.background = '#f44336'
          }
        }}
      >
        重置
      </button>
    </div>
  )
}

export default ControlPanel
