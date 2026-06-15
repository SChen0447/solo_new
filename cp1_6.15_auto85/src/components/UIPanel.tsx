import React, { useState } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import type { HeterogeneityMode, WellPlacementMode } from '@/store/simulationStore';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Download, Plus, Trash2, Droplets, Flame } from 'lucide-react';

const UIPanel: React.FC = () => {
  const {
    rockParams,
    setRockParams,
    confirmRockModel,
    rockGenerated,
    wells,
    selectedWellId,
    selectWell,
    updateWellRate,
    removeWell,
    isRunning,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    panelCollapsed,
    togglePanel,
    wellPlacementMode,
    setWellPlacementMode,
    exportCSV,
  } = useSimulationStore();

  const [buttonScale, setButtonScale] = useState<string | null>(null);

  const handleButtonClick = (buttonId: string, action: () => void) => {
    setButtonScale(buttonId);
    action();
    setTimeout(() => setButtonScale(null), 100);
  };

  const logValue = (value: number): number => {
    return Math.log10(value);
  };

  const powValue = (value: number): number => {
    return Math.pow(10, value);
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    left: panelCollapsed ? -300 : 0,
    top: 0,
    width: 300,
    height: '100vh',
    backgroundColor: '#21262d',
    borderRadius: '0 12px 12px 0',
    padding: '16px',
    color: '#c9d1d9',
    overflowY: 'auto',
    transition: 'left 0.3s ease',
    zIndex: 100,
    boxShadow: '2px 0 10px rgba(0,0,0,0.3)',
  };

  const toggleButtonStyle: React.CSSProperties = {
    position: 'absolute',
    right: -32,
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: '#21262d',
    border: 'none',
    borderRadius: '0 8px 8px 0',
    padding: '8px 4px',
    color: '#c9d1d9',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '20px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    color: '#8b949e',
  };

  const sliderContainerStyle: React.CSSProperties = {
    marginBottom: '12px',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '6px',
    backgroundColor: '#30363d',
    borderRadius: '3px',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer',
  };

  const sliderThumbStyle = `
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #58a6ff;
      cursor: pointer;
      transition: transform 0.1s;
    }
    input[type="range"]::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }
    input[type="range"]::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #58a6ff;
      cursor: pointer;
      border: none;
    }
  `;

  const buttonStyle = (id: string, disabled = false, active = false): React.CSSProperties => ({
    backgroundColor: active ? '#2ea043' : '#238636',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: '100%',
    marginBottom: '8px',
    opacity: disabled ? 0.5 : 1,
    transform: buttonScale === id ? 'scale(0.95)' : 'scale(1)',
    transition: 'all 0.1s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  });

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#30363d',
    color: '#c9d1d9',
    border: '1px solid #30363d',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  };

  const wellItemStyle = (selected: boolean): React.CSSProperties => ({
    backgroundColor: selected ? '#388bfd26' : '#161b22',
    border: selected ? '1px solid #58a6ff' : '1px solid #30363d',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  const wellHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  };

  const wellTypeStyle = (type: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: type === 'injector' ? '#00bfff' : '#ff6347',
  });

  const valueDisplayStyle: React.CSSProperties = {
    float: 'right',
    color: '#58a6ff',
    fontWeight: 500,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#f0f6fc',
    borderBottom: '1px solid #30363d',
    paddingBottom: '10px',
  };

  const subTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '12px',
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  return (
    <>
      <style>{sliderThumbStyle}</style>
      <div style={panelStyle}>
        <button style={toggleButtonStyle} onClick={togglePanel}>
          {panelCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        <h2 style={titleStyle}>地下岩层渗流模拟</h2>

        <div style={sectionStyle}>
          <h3 style={subTitleStyle}>岩层参数</h3>

          <div style={sliderContainerStyle}>
            <label style={labelStyle}>
              X方向尺寸
              <span style={valueDisplayStyle}>{rockParams.sizeX.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={rockParams.sizeX}
              onChange={(e) => setRockParams({ sizeX: parseFloat(e.target.value) })}
              style={sliderStyle}
              disabled={rockGenerated}
            />
          </div>

          <div style={sliderContainerStyle}>
            <label style={labelStyle}>
              Y方向尺寸
              <span style={valueDisplayStyle}>{rockParams.sizeY.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="1"
              max="8"
              step="0.5"
              value={rockParams.sizeY}
              onChange={(e) => setRockParams({ sizeY: parseFloat(e.target.value) })}
              style={sliderStyle}
              disabled={rockGenerated}
            />
          </div>

          <div style={sliderContainerStyle}>
            <label style={labelStyle}>
              Z方向尺寸
              <span style={valueDisplayStyle}>{rockParams.sizeZ.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={rockParams.sizeZ}
              onChange={(e) => setRockParams({ sizeZ: parseFloat(e.target.value) })}
              style={sliderStyle}
              disabled={rockGenerated}
            />
          </div>

          <div style={sliderContainerStyle}>
            <label style={labelStyle}>
              孔隙度
              <span style={valueDisplayStyle}>{rockParams.porosity.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="0.4"
              step="0.05"
              value={rockParams.porosity}
              onChange={(e) => setRockParams({ porosity: parseFloat(e.target.value) })}
              style={sliderStyle}
              disabled={rockGenerated}
            />
          </div>

          <div style={sliderContainerStyle}>
            <label style={labelStyle}>
              渗透率
              <span style={valueDisplayStyle}>{rockParams.permeability.toExponential(2)}</span>
            </label>
            <input
              type="range"
              min={logValue(1e-12)}
              max={logValue(1e-9)}
              step="0.1"
              value={logValue(rockParams.permeability)}
              onChange={(e) => setRockParams({ permeability: powValue(parseFloat(e.target.value)) })}
              style={sliderStyle}
              disabled={rockGenerated}
            />
          </div>

          <div style={sliderContainerStyle}>
            <label style={labelStyle}>非均质分布模式</label>
            <select
              value={rockParams.heterogeneity}
              onChange={(e) => setRockParams({ heterogeneity: e.target.value as HeterogeneityMode })}
              style={selectStyle}
              disabled={rockGenerated}
            >
              <option value="uniform">均匀分布</option>
              <option value="layered">层状分布</option>
              <option value="random">随机斑块</option>
            </select>
          </div>

          <button
            style={buttonStyle('confirm', rockGenerated, rockGenerated)}
            onClick={() => handleButtonClick('confirm', confirmRockModel)}
          >
            <Plus size={16} />
            {rockGenerated ? '重新生成岩层' : '确认生成岩层'}
          </button>
        </div>

        <div style={sectionStyle}>
          <h3 style={subTitleStyle}>井设置</h3>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              style={{
                ...buttonStyle('addInjector', false, wellPlacementMode === 'injector'),
                flex: 1,
                backgroundColor: wellPlacementMode === 'injector' ? '#00bfff' : '#1f6feb',
              }}
              onClick={() => handleButtonClick('addInjector', () => setWellPlacementMode(wellPlacementMode === 'injector' ? 'none' : 'injector'))}
              disabled={!rockGenerated}
            >
              <Droplets size={16} />
              添加注入井
            </button>
            <button
              style={{
                ...buttonStyle('addProducer', false, wellPlacementMode === 'producer'),
                flex: 1,
                backgroundColor: wellPlacementMode === 'producer' ? '#ff6347' : '#cf222e',
              }}
              onClick={() => handleButtonClick('addProducer', () => setWellPlacementMode(wellPlacementMode === 'producer' ? 'none' : 'producer'))}
              disabled={!rockGenerated}
            >
              <Flame size={16} />
              添加生产井
            </button>
          </div>

          {wellPlacementMode !== 'none' && (
            <div style={{
              backgroundColor: '#388bfd26',
              border: '1px solid #58a6ff',
              borderRadius: '6px',
              padding: '10px',
              marginBottom: '12px',
              fontSize: '12px',
              textAlign: 'center',
            }}>
              点击岩层表面放置{wellPlacementMode === 'injector' ? '注入井' : '生产井'}
            </div>
          )}

          {wells.length > 0 && (
            <div>
              {wells.map((well) => (
                <div
                  key={well.id}
                  style={wellItemStyle(selectedWellId === well.id)}
                  onClick={() => selectWell(well.id)}
                >
                  <div style={wellHeaderStyle}>
                    <span style={wellTypeStyle(well.type)}>
                      {well.type === 'injector' ? <Droplets size={14} /> : <Flame size={14} />}
                      {well.type === 'injector' ? '注入井' : '生产井'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleButtonClick('delete', () => removeWell(well.id));
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f85149',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>
                    位置: ({well.position.x.toFixed(1)}, {well.position.y.toFixed(1)}, {well.position.z.toFixed(1)})
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#8b949e', flexShrink: 0 }}>速率:</span>
                    <input
                      type="range"
                      min="0.1"
                      max="5.0"
                      step="0.1"
                      value={well.rate}
                      onChange={(e) => updateWellRate(well.id, parseFloat(e.target.value))}
                      style={{ ...sliderStyle, flex: 1, height: '4px', margin: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ fontSize: '12px', color: '#58a6ff', minWidth: '30px', textAlign: 'right' }}>
                      {well.rate.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={sectionStyle}>
          <h3 style={subTitleStyle}>模拟控制</h3>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {!isRunning ? (
              <button
                style={{
                  ...buttonStyle('play'),
                  flex: 1,
                }}
                onClick={() => handleButtonClick('play', startSimulation)}
                disabled={!rockGenerated || wells.length === 0}
              >
                <Play size={16} />
                开始
              </button>
            ) : (
              <button
                style={{
                  ...buttonStyle('pause'),
                  flex: 1,
                  backgroundColor: '#9e6a03',
                }}
                onClick={() => handleButtonClick('pause', pauseSimulation)}
              >
                <Pause size={16} />
                暂停
              </button>
            )}
            <button
              style={{
                ...buttonStyle('reset'),
                flex: 1,
                backgroundColor: '#cf222e',
              }}
              onClick={() => handleButtonClick('reset', resetSimulation)}
            >
              <RotateCcw size={16} />
              重置
            </button>
          </div>

          <button
            style={buttonStyle('export')}
            onClick={() => handleButtonClick('export', exportCSV)}
            disabled={!rockGenerated}
          >
            <Download size={16} />
            导出CSV数据
          </button>
        </div>
      </div>
    </>
  );
};

export default UIPanel;
