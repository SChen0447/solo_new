import React, { useState, useEffect, useRef } from 'react';
import {
  CountdownConfig,
  PRESET_COLORS,
  FONT_FAMILIES,
  TIMEZONES,
  FontFamily,
  AnimationType,
  BorderStyle,
  BackgroundType
} from '../config/ConfigDataModel';
import { eventBus, Events } from '../utils/EventBus';
import { configDataModel } from '../config/ConfigDataModel';
import './ConfigPanel.css';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>(defaultOpen ? 'auto' : 0);

  useEffect(() => {
    if (contentRef.current) {
      if (isOpen) {
        setContentHeight(contentRef.current.scrollHeight);
        const timer = setTimeout(() => setContentHeight('auto'), 300);
        return () => clearTimeout(timer);
      } else {
        setContentHeight(contentRef.current.scrollHeight);
        requestAnimationFrame(() => {
          if (contentRef.current) {
            setContentHeight(0);
          }
        });
      }
    }
  }, [isOpen]);

  return (
    <div className="config-section">
      <div className="section-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="section-title">{title}</span>
        <span className={`section-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      <div
        className="section-content"
        style={{ height: contentHeight === 'auto' ? 'auto' : `${contentHeight}px` }}
      >
        <div ref={contentRef} className="section-content-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

export const ConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<CountdownConfig>(configDataModel.getConfig());

  useEffect(() => {
    const unsubscribe = eventBus.on(Events.CONFIG_CHANGED, (newConfig: CountdownConfig) => {
      setConfig(newConfig);
    });
    return () => unsubscribe();
  }, []);

  const updateConfig = (updates: Partial<CountdownConfig>) => {
    configDataModel.updateConfig(updates);
  };

  const updateBackground = (updates: Partial<CountdownConfig['backgroundColor']>) => {
    configDataModel.updateNestedConfig('backgroundColor', updates);
  };

  const updateTimeLabels = (updates: Partial<CountdownConfig['timeLabels']>) => {
    configDataModel.updateNestedConfig('timeLabels', updates);
  };

  const handleDurationChange = (field: 'durationHours' | 'durationMinutes' | 'durationSeconds', value: number) => {
    const validValue = Math.max(0, Math.min(field === 'durationHours' ? 168 : 59, value));
    updateConfig({ [field]: validValue } as Partial<CountdownConfig>);
  };

  const handleControl = (action: 'start' | 'pause' | 'resume' | 'reset') => {
    eventBus.emit(Events.TIMER_CONTROL, action);
  };

  return (
    <div className="config-panel">
      <div className="panel-header">
        <h2>倒计时配置</h2>
      </div>
      <div className="panel-content">
        <CollapsibleSection title="活动信息">
          <div className="form-group">
            <label>活动名称</label>
            <input
              type="text"
              value={config.activityName}
              onChange={(e) => updateConfig({ activityName: e.target.value })}
              className="form-input"
              maxLength={30}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="字体样式">
          <div className="form-group">
            <label>字体</label>
            <select
              value={config.fontFamily}
              onChange={(e) => updateConfig({ fontFamily: e.target.value as FontFamily })}
              className="form-select"
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>字号: {config.fontSize}px</label>
            <input
              type="range"
              min={16}
              max={80}
              step={2}
              value={config.fontSize}
              onChange={(e) => updateConfig({ fontSize: parseInt(e.target.value) })}
              className="form-range"
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="颜色配置">
          <div className="form-group">
            <label>文字颜色</label>
            <div className="color-preset-grid">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`color-preset ${config.textColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => updateConfig({ textColor: color })}
                />
              ))}
            </div>
            <div className="custom-color">
              <label>自定义颜色</label>
              <input
                type="color"
                value={config.textColor}
                onChange={(e) => updateConfig({ textColor: e.target.value })}
                className="color-input"
              />
              <input
                type="text"
                value={config.textColor}
                onChange={(e) => updateConfig({ textColor: e.target.value })}
                className="form-input color-hex"
              />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="背景设置">
          <div className="form-group">
            <label>背景类型</label>
            <div className="button-group">
              {(['solid', 'linear-gradient', 'radial-gradient'] as BackgroundType[]).map((type) => (
                <button
                  key={type}
                  className={`btn-small ${config.backgroundColor.type === type ? 'active' : ''}`}
                  onClick={() => updateBackground({ type })}
                >
                  {type === 'solid' ? '纯色' : type === 'linear-gradient' ? '线性渐变' : '径向渐变'}
                </button>
              ))}
            </div>
          </div>
          {config.backgroundColor.type !== 'solid' && (
            <div className="form-group">
              <label>渐变角度: {config.backgroundColor.angle}°</label>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={config.backgroundColor.angle}
                onChange={(e) => updateBackground({ angle: parseInt(e.target.value) })}
                className="form-range"
              />
            </div>
          )}
          <div className="form-group">
            <label>{config.backgroundColor.type === 'solid' ? '背景颜色' : '起始颜色'}</label>
            <input
              type="color"
              value={config.backgroundColor.color1}
              onChange={(e) => updateBackground({ color1: e.target.value })}
              className="color-input"
            />
          </div>
          {config.backgroundColor.type !== 'solid' && (
            <div className="form-group">
              <label>结束颜色</label>
              <input
                type="color"
                value={config.backgroundColor.color2}
                onChange={(e) => updateBackground({ color2: e.target.value })}
                className="color-input"
              />
            </div>
          )}
          <div className="form-group">
            <label>背景透明度: {config.backgroundOpacity}%</label>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={config.backgroundOpacity}
              onChange={(e) => updateConfig({ backgroundOpacity: parseInt(e.target.value) })}
              className="form-range"
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="边框样式">
          <div className="form-group">
            <label>边框类型</label>
            <div className="button-group">
              {(['none', 'solid', 'dashed', 'rounded'] as BorderStyle[]).map((style) => (
                <button
                  key={style}
                  className={`btn-small ${config.borderStyle === style ? 'active' : ''}`}
                  onClick={() => updateConfig({ borderStyle: style })}
                >
                  {style === 'none' ? '无' : style === 'solid' ? '实线' : style === 'dashed' ? '虚线' : '圆角'}
                </button>
              ))}
            </div>
          </div>
          {config.borderStyle !== 'none' && (
            <>
              <div className="form-group">
                <label>边框颜色</label>
                <input
                  type="color"
                  value={config.borderColor}
                  onChange={(e) => updateConfig({ borderColor: e.target.value })}
                  className="color-input"
                />
              </div>
              <div className="form-group">
                <label>边框宽度: {config.borderWidth}px</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={config.borderWidth}
                  onChange={(e) => updateConfig({ borderWidth: parseInt(e.target.value) })}
                  className="form-range"
                />
              </div>
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="动画效果">
          <div className="form-group">
            <label>翻转动画</label>
            <div className="button-group">
              {(['none', 'flip', 'scale-fade', 'rotate-in'] as AnimationType[]).map((anim) => (
                <button
                  key={anim}
                  className={`btn-small ${config.animation === anim ? 'active' : ''}`}
                  onClick={() => updateConfig({ animation: anim })}
                >
                  {anim === 'none' ? '无动画' : anim === 'flip' ? '翻页' : anim === 'scale-fade' ? '缩放渐变' : '旋转入'}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="时间标签">
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.timeLabels.showHours}
                onChange={(e) => updateTimeLabels({ showHours: e.target.checked })}
              />
              <span>显示小时</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.timeLabels.showMinutes}
                onChange={(e) => updateTimeLabels({ showMinutes: e.target.checked })}
              />
              <span>显示分钟</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.timeLabels.showSeconds}
                onChange={(e) => updateTimeLabels({ showSeconds: e.target.checked })}
              />
              <span>显示秒钟</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.timeLabels.showMilliseconds}
                onChange={(e) => updateTimeLabels({ showMilliseconds: e.target.checked })}
              />
              <span>显示毫秒</span>
            </label>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="时间设置">
          <div className="form-group">
            <label>计时模式</label>
            <div className="button-group">
              <button
                className={`btn-small ${!config.useTargetTime ? 'active' : ''}`}
                onClick={() => updateConfig({ useTargetTime: false })}
              >
                时长模式
              </button>
              <button
                className={`btn-small ${config.useTargetTime ? 'active' : ''}`}
                onClick={() => updateConfig({ useTargetTime: true })}
              >
                目标时间
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>时区</label>
            <select
              value={config.timezone}
              onChange={(e) => updateConfig({ timezone: e.target.value as any })}
              className="form-select"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {!config.useTargetTime ? (
            <div className="duration-inputs">
              <div className="form-group">
                <label>小时</label>
                <input
                  type="number"
                  min={0}
                  max={168}
                  value={config.durationHours}
                  onChange={(e) => handleDurationChange('durationHours', parseInt(e.target.value) || 0)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>分钟</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={config.durationMinutes}
                  onChange={(e) => handleDurationChange('durationMinutes', parseInt(e.target.value) || 0)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>秒</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={config.durationSeconds}
                  onChange={(e) => handleDurationChange('durationSeconds', parseInt(e.target.value) || 0)}
                  className="form-input"
                />
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label>目标时间</label>
              <input
                type="datetime-local"
                value={config.targetTime}
                onChange={(e) => updateConfig({ targetTime: e.target.value })}
                className="form-input"
              />
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="控制">
          <div className="button-group control-buttons">
            <button className="btn-primary" onClick={() => handleControl('start')}>
              开始
            </button>
            <button className="btn-secondary" onClick={() => handleControl('pause')}>
              暂停
            </button>
            <button className="btn-secondary" onClick={() => handleControl('resume')}>
              恢复
            </button>
            <button className="btn-secondary" onClick={() => handleControl('reset')}>
              重置
            </button>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};
