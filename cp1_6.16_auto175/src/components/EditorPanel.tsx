import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ParticleEngine, type EmitterConfig, type MotionType, type GradientType, type ColorStop } from '../modules/particleEngine';
import { presetTemplates, applyPresetToEmitters } from '../modules/presetManager';
import '../styles/EditorPanel.css';

interface EditorPanelProps {
  onSave: (name: string, thumbnail: string) => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  emitters: EmitterConfig[];
  onEmittersChange: (emitters: EmitterConfig[]) => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  onSave,
  backgroundColor,
  onBackgroundColorChange,
  emitters,
  onEmittersChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);
  const [selectedEmitterId, setSelectedEmitterId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fps, setFps] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    basic: true,
    motion: true,
    color: true,
    presets: false
  });
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [artworkName, setArtworkName] = useState('');

  const selectedEmitter = emitters.find(e => e.id === selectedEmitterId) || null;

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      const engine = new ParticleEngine(canvasRef.current, (currentFps) => {
        setFps(currentFps);
      });
      engineRef.current = engine;
      engine.start();
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setEmitters(emitters);
    }
  }, [emitters]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setPlaying(isPlaying);
    }
  }, [isPlaying]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current && engineRef.current) {
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = width * 9 / 16;
        engineRef.current.resize(width, height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    const rotateHandleRadius = 60;
    if (selectedEmitter) {
      const dx = coords.x - selectedEmitter.x;
      const dy = coords.y - selectedEmitter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (Math.abs(dist - rotateHandleRadius) < 10) {
        setIsRotating(true);
        return;
      }

      if (Math.abs(dx) < 40 && Math.abs(dy) < 40) {
        setIsDragging(true);
        setDragOffset({
          x: coords.x - selectedEmitter.x,
          y: coords.y - selectedEmitter.y
        });
        return;
      }
    }

    const clickedEmitter = [...emitters].reverse().find(emitter => {
      const dx = coords.x - emitter.x;
      const dy = coords.y - emitter.y;
      return Math.abs(dx) < 40 && Math.abs(dy) < 40;
    });

    if (clickedEmitter) {
      setSelectedEmitterId(clickedEmitter.id);
      setIsDragging(true);
      setDragOffset({
        x: coords.x - clickedEmitter.x,
        y: coords.y - clickedEmitter.y
      });
    } else {
      setSelectedEmitterId(null);
    }
  };

  const handleCanvasMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;
    const coords = getCanvasCoords(e);

    if (isDragging && selectedEmitterId) {
      onEmittersChange(
        emitters.map(emitter =>
          emitter.id === selectedEmitterId
            ? {
                ...emitter,
                x: coords.x - dragOffset.x,
                y: coords.y - dragOffset.y
              }
            : emitter
        )
      );
    }

    if (isRotating && selectedEmitterId) {
      const emitter = emitters.find(e => e.id === selectedEmitterId);
      if (emitter) {
        const angle = Math.atan2(coords.y - emitter.y, coords.x - emitter.x) * 180 / Math.PI;
        onEmittersChange(
          emitters.map(e =>
            e.id === selectedEmitterId
              ? { ...e, rotation: (angle + 360) % 360 }
              : e
          )
        );
      }
    }
  }, [isDragging, isRotating, selectedEmitterId, emitters, dragOffset, getCanvasCoords, onEmittersChange]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsRotating(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleCanvasMouseMove);
    window.addEventListener('mouseup', handleCanvasMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleCanvasMouseMove);
      window.removeEventListener('mouseup', handleCanvasMouseUp);
    };
  }, [handleCanvasMouseMove, handleCanvasMouseUp]);

  const addEmitter = () => {
    if (emitters.length >= 5) return;
    const newEmitter: EmitterConfig = {
      id: uuidv4(),
      x: 400,
      y: 300,
      rotation: 0,
      particleCount: 100,
      particleSize: 5,
      colors: [{ color: '#00E5FF', position: 0 }],
      gradientType: 'linear',
      motionType: 'linear',
      speed: 2,
      lifetime: 5
    };
    onEmittersChange([...emitters, newEmitter]);
    setSelectedEmitterId(newEmitter.id);
  };

  const deleteEmitter = (id: string) => {
    onEmittersChange(emitters.filter(e => e.id !== id));
    if (selectedEmitterId === id) {
      setSelectedEmitterId(null);
    }
  };

  const updateEmitter = (id: string, updates: Partial<EmitterConfig>) => {
    onEmittersChange(
      emitters.map(e => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const applyPreset = (presetId: string) => {
    const preset = presetTemplates.find(p => p.id === presetId);
    if (preset && canvasRef.current) {
      const { emitters: newEmitters, backgroundColor: newBgColor } = applyPresetToEmitters(
        preset,
        canvasRef.current.width,
        canvasRef.current.height
      );
      onEmittersChange(newEmitters);
      onBackgroundColorChange(newBgColor);
      if (newEmitters.length > 0) {
        setSelectedEmitterId(newEmitters[0].id);
      }
    }
  };

  const generateThumbnail = (): string => {
    if (!canvasRef.current) return '';
    return canvasRef.current.toDataURL('image/png');
  };

  const handleSave = () => {
    if (artworkName.trim()) {
      const thumbnail = generateThumbnail();
      onSave(artworkName.trim(), thumbnail);
      setSaveModalOpen(false);
      setArtworkName('');
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const addColorStop = (emitterId: string) => {
    const emitter = emitters.find(e => e.id === emitterId);
    if (!emitter || emitter.colors.length >= 5) return;

    const newColor: ColorStop = {
      color: '#ffffff',
      position: 1
    };

    const newColors = [...emitter.colors, newColor].map((c, i, arr) => ({
      ...c,
      position: i / (arr.length - 1)
    }));

    updateEmitter(emitterId, { colors: newColors });
  };

  const updateColorStop = (emitterId: string, index: number, updates: Partial<ColorStop>) => {
    const emitter = emitters.find(e => e.id === emitterId);
    if (!emitter) return;

    const newColors = [...emitter.colors];
    newColors[index] = { ...newColors[index], ...updates };
    updateEmitter(emitterId, { colors: newColors });
  };

  const removeColorStop = (emitterId: string, index: number) => {
    const emitter = emitters.find(e => e.id === emitterId);
    if (!emitter || emitter.colors.length <= 1) return;

    const newColors = emitter.colors.filter((_, i) => i !== index);
    updateEmitter(emitterId, { colors: newColors });
  };

  return (
    <div className="editor-container">
      <div className="canvas-section">
        <div className="canvas-toolbar">
          <button
            className={`btn-play ${isPlaying ? 'playing' : ''}`}
            onClick={handlePlayPause}
          >
            {isPlaying ? '⏸ 暂停' : '▶ 播放'}
          </button>
          <div className="fps-display">FPS: {fps}</div>
          <div className="particle-count">
            粒子数: {engineRef.current?.getParticleCount() || 0}
          </div>
        </div>
        <div
          className="canvas-wrapper"
          ref={containerRef}
          style={{ backgroundColor }}
        >
          <canvas
            ref={canvasRef}
            className="particle-canvas"
            onMouseDown={handleCanvasMouseDown}
          />
          {emitters.map(emitter => (
            <div
              key={emitter.id}
              className={`emitter-control ${
                selectedEmitterId === emitter.id ? 'selected' : ''
              }`}
              style={{
                left: emitter.x,
                top: emitter.y,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {selectedEmitterId === emitter.id && (
                <>
                  <div className="emitter-box" />
                  <div
                    className="rotate-handle"
                    style={{
                      transform: `rotate(${emitter.rotation}deg) translateX(60px)`
                    }}
                  >
                    <div className="rotate-handle-dot" />
                  </div>
                </>
              )}
              <div className="emitter-dot" />
            </div>
          ))}
        </div>
      </div>

      <div className="control-panel">
        <div className="panel-header">
          <h2>粒子编辑器</h2>
        </div>

        <div className="panel-section">
          <div className="section-header" onClick={() => toggleGroup('presets')}>
            <span className="section-title">预设模板</span>
            <span className={`arrow ${expandedGroups.presets ? 'expanded' : ''}`}>▼</span>
          </div>
          <div className={`section-content ${expandedGroups.presets ? 'open' : ''}`}>
            <div className="preset-grid">
              {presetTemplates.map(preset => (
                <button
                  key={preset.id}
                  className="preset-btn"
                  onClick={() => applyPreset(preset.id)}
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel-section">
          <div className="section-header">
            <span className="section-title">发射器列表</span>
            <button className="btn-add" onClick={addEmitter} disabled={emitters.length >= 5}>
              + 添加
            </button>
          </div>
          <div className="emitter-list">
            {emitters.map((emitter, index) => (
              <div
                key={emitter.id}
                className={`emitter-item ${
                  selectedEmitterId === emitter.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedEmitterId(emitter.id)}
              >
                <span className="emitter-name">发射器 {index + 1}</span>
                <button
                  className="btn-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteEmitter(emitter.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {emitters.length === 0 && (
              <div className="empty-hint">暂无发射器，点击添加创建</div>
            )}
          </div>
        </div>

        {selectedEmitter && (
          <>
            <div className="panel-section">
              <div className="section-header" onClick={() => toggleGroup('basic')}>
                <span className="section-title">基本参数</span>
                <span className={`arrow ${expandedGroups.basic ? 'expanded' : ''}`}>▼</span>
              </div>
              <div className={`section-content ${expandedGroups.basic ? 'open' : ''}`}>
                <div className="param-group">
                  <label>粒子数量</label>
                  <div className="slider-wrapper">
                    <input
                      type="range"
                      min="50"
                      max="500"
                      value={selectedEmitter.particleCount}
                      onChange={(e) =>
                        updateEmitter(selectedEmitter.id, {
                          particleCount: parseInt(e.target.value)
                        })
                      }
                    />
                    <span className="value-label">{selectedEmitter.particleCount}</span>
                  </div>
                </div>

                <div className="param-group">
                  <label>粒子大小</label>
                  <div className="slider-wrapper">
                    <input
                      type="range"
                      min="2"
                      max="10"
                      step="0.5"
                      value={selectedEmitter.particleSize}
                      onChange={(e) =>
                        updateEmitter(selectedEmitter.id, {
                          particleSize: parseFloat(e.target.value)
                        })
                      }
                    />
                    <span className="value-label">{selectedEmitter.particleSize}px</span>
                  </div>
                </div>

                <div className="param-group">
                  <label>生命周期</label>
                  <div className="slider-wrapper">
                    <input
                      type="range"
                      min="2"
                      max="10"
                      step="0.5"
                      value={selectedEmitter.lifetime}
                      onChange={(e) =>
                        updateEmitter(selectedEmitter.id, {
                          lifetime: parseFloat(e.target.value)
                        })
                      }
                    />
                    <span className="value-label">{selectedEmitter.lifetime}s</span>
                  </div>
                </div>

                <div className="param-group">
                  <label>旋转角度</label>
                  <div className="slider-wrapper">
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={selectedEmitter.rotation}
                      onChange={(e) =>
                        updateEmitter(selectedEmitter.id, {
                          rotation: parseFloat(e.target.value)
                        })
                      }
                    />
                    <span className="value-label">{Math.round(selectedEmitter.rotation)}°</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-section">
              <div className="section-header" onClick={() => toggleGroup('motion')}>
                <span className="section-title">运动方式</span>
                <span className={`arrow ${expandedGroups.motion ? 'expanded' : ''}`}>▼</span>
              </div>
              <div className={`section-content ${expandedGroups.motion ? 'open' : ''}`}>
                <div className="param-group">
                  <label>运动模式</label>
                  <div className="mode-buttons">
                    {(['linear', 'sine', 'spiral'] as MotionType[]).map(mode => (
                      <button
                        key={mode}
                        className={`mode-btn ${
                          selectedEmitter.motionType === mode ? 'active' : ''
                        }`}
                        onClick={() =>
                          updateEmitter(selectedEmitter.id, { motionType: mode })
                        }
                      >
                        {mode === 'linear' ? '匀速直线' : mode === 'sine' ? '正弦波动' : '螺旋旋转'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="param-group">
                  <label>运动速度</label>
                  <div className="slider-wrapper">
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.1"
                      value={selectedEmitter.speed}
                      onChange={(e) =>
                        updateEmitter(selectedEmitter.id, {
                          speed: parseFloat(e.target.value)
                        })
                      }
                    />
                    <span className="value-label">{selectedEmitter.speed.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-section">
              <div className="section-header" onClick={() => toggleGroup('color')}>
                <span className="section-title">颜色设置</span>
                <span className={`arrow ${expandedGroups.color ? 'expanded' : ''}`}>▼</span>
              </div>
              <div className={`section-content ${expandedGroups.color ? 'open' : ''}`}>
                <div className="param-group">
                  <label>渐变类型</label>
                  <div className="mode-buttons">
                    {(['linear', 'radial'] as GradientType[]).map(type => (
                      <button
                        key={type}
                        className={`mode-btn ${
                          selectedEmitter.gradientType === type ? 'active' : ''
                        }`}
                        onClick={() =>
                          updateEmitter(selectedEmitter.id, { gradientType: type })
                        }
                      >
                        {type === 'linear' ? '线性' : '径向'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="param-group">
                  <div className="color-stops-header">
                    <label>色标</label>
                    <button
                      className="btn-add-small"
                      onClick={() => addColorStop(selectedEmitter.id)}
                      disabled={selectedEmitter.colors.length >= 5}
                    >
                      +
                    </button>
                  </div>
                  <div className="color-stops">
                    {selectedEmitter.colors.map((stop, index) => (
                      <div key={index} className="color-stop-row">
                        <div className="color-picker-wrapper">
                          <input
                            type="color"
                            value={stop.color}
                            onChange={(e) =>
                              updateColorStop(selectedEmitter.id, index, {
                                color: e.target.value
                              })
                            }
                          />
                          <div
                            className="color-preview"
                            style={{ backgroundColor: stop.color }}
                          />
                        </div>
                        {selectedEmitter.colors.length > 1 && (
                          <button
                            className="btn-remove-color"
                            onClick={() => removeColorStop(selectedEmitter.id, index)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="panel-section">
          <div className="param-group">
            <label>画布背景色</label>
            <div className="color-picker-wrapper">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => onBackgroundColorChange(e.target.value)}
              />
              <div
                className="color-preview"
                style={{ backgroundColor }}
              />
              <span className="color-hex">{backgroundColor}</span>
            </div>
          </div>
        </div>

        <button className="btn-save" onClick={() => setSaveModalOpen(true)}>
          💾 保存作品
        </button>
      </div>

      {saveModalOpen && (
        <div className="modal-overlay" onClick={() => setSaveModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>保存作品</h3>
            <input
              type="text"
              placeholder="请输入作品名称"
              value={artworkName}
              onChange={(e) => setArtworkName(e.target.value)}
              className="modal-input"
              autoFocus
            />
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setSaveModalOpen(false)}>
                取消
              </button>
              <button className="btn-confirm" onClick={handleSave} disabled={!artworkName.trim()}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorPanel;
