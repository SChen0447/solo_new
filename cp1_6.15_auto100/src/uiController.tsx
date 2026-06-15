import React, { useCallback } from 'react';
import { useAppStore, ViewMode, LightMode } from './store';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, unit = '', onChange }) => (
  <div className="slider-group">
    <div className="slider-label">
      <span>{label}</span>
      <span className="slider-value">{value.toFixed(step < 1 ? 2 : 0)}{unit}</span>
    </div>
    <input
      type="range"
      className="slider-input"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  </div>
);

interface BtnProps {
  label: string;
  active?: boolean;
  onClick: () => void;
}

const Btn: React.FC<BtnProps> = ({ label, active, onClick }) => (
  <button
    className={`btn ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    {label}
  </button>
);

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'top', label: '俯视' },
  { key: 'front', label: '前视' },
  { key: 'side', label: '侧视' },
  { key: 'free', label: '自由' }
];

const LIGHT_MODES: { key: LightMode; label: string }[] = [
  { key: 'ambient', label: '环境光' },
  { key: 'points', label: '点光源' },
  { key: 'hemisphere', label: '半球光' }
];

export const UIController: React.FC = () => {
  const points = useAppStore(s => s.points);
  const heightScale = useAppStore(s => s.heightScale);
  const smoothIterations = useAppStore(s => s.smoothIterations);
  const cutHeight = useAppStore(s => s.cutHeight);
  const viewMode = useAppStore(s => s.viewMode);
  const lightMode = useAppStore(s => s.lightMode);
  const sectionResult = useAppStore(s => s.sectionResult);

  const setHeightScale = useAppStore(s => s.setHeightScale);
  const setSmoothIterations = useAppStore(s => s.setSmoothIterations);
  const setCutHeight = useAppStore(s => s.setCutHeight);
  const setViewMode = useAppStore(s => s.setViewMode);
  const setLightMode = useAppStore(s => s.setLightMode);

  const handleLoadPreset = useCallback(() => {
    (window as any).__buildingActions?.loadPreset?.();
  }, []);

  const handleLoadRandom = useCallback(() => {
    (window as any).__buildingActions?.loadRandom?.();
  }, []);

  return (
    <>
      <div className="section-title">点云数据</div>
      <div className="button-group">
        <Btn label="加载预设" onClick={handleLoadPreset} />
        <Btn label="随机生成" onClick={handleLoadRandom} />
      </div>
      <div className="hint-text">
        已加载 {points.length} 个点 | 坐标范围 -10 ~ 10
      </div>

      <div className="section-title">体块参数</div>
      <Slider
        label="高度缩放"
        value={heightScale}
        min={0.5}
        max={2.0}
        step={0.1}
        unit="x"
        onChange={setHeightScale}
      />
      <Slider
        label="平滑迭代"
        value={smoothIterations}
        min={1}
        max={5}
        step={1}
        unit="次"
        onChange={(v) => setSmoothIterations(Math.round(v))}
      />

      <div className="section-title">视角切换</div>
      <div className="button-group">
        {VIEW_MODES.map(m => (
          <Btn
            key={m.key}
            label={m.label}
            active={viewMode === m.key}
            onClick={() => setViewMode(m.key)}
          />
        ))}
      </div>

      <div className="section-title">光照模式</div>
      <div className="button-group">
        {LIGHT_MODES.map(m => (
          <Btn
            key={m.key}
            label={m.label}
            active={lightMode === m.key}
            onClick={() => setLightMode(m.key)}
          />
        ))}
      </div>

      <div className="section-title">截面分析</div>
      <Slider
        label="切割高度"
        value={cutHeight}
        min={0}
        max={1}
        step={0.01}
        onChange={setCutHeight}
      />

      {sectionResult ? (
        <div className="section-info">
          <div className="info-row">
            <span className="info-label">截面面积</span>
            <span className="info-value">{sectionResult.area.toFixed(1)} 平方单位</span>
          </div>
          <div className="info-row">
            <span className="info-label">截面周长</span>
            <span className="info-value">{sectionResult.perimeter.toFixed(1)} 单位</span>
          </div>
          <div className="info-row">
            <span className="info-label">顶点数</span>
            <span className="info-value">{sectionResult.polygon.length}</span>
          </div>
        </div>
      ) : (
        <div className="hint-text">
          拖动滑块查看截面信息（当前高度超出建筑范围）
        </div>
      )}

      <div className="section-title">操作提示</div>
      <div className="hint-text" style={{ marginTop: 0 }}>
        • 鼠标左键拖拽：旋转视角<br />
        • 鼠标滚轮：缩放<br />
        • 鼠标右键拖拽：平移<br />
        • 点击金色控制点并拖动：变形建筑<br />
        • 悬停建筑：线框高亮
      </div>
    </>
  );
};
