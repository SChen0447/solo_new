import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useStageStore, CAMERA_PRESETS } from './store/store';
import { StageScene } from './stage/StageScene';

function App() {
  const {
    scenes,
    activeSceneId,
    selectedRoleId,
    isPlaying,
    lightColor,
    switchScene,
    addScene,
    removeScene,
    updateScene,
    addRole,
    removeRole,
    updateRole,
    selectRole,
    setLightColor,
    setLightIntensity,
    setPlaying,
    setCameraPreset,
    getActiveScene
  } = useStageStore();

  const activeScene = getActiveScene();
  const selectedRole = activeScene?.roles.find(r => r.id === selectedRoleId);
  
  const [hue, setHue] = useState(40);
  const [saturation, setSaturation] = useState(80);
  const [value, setValue] = useState(95);
  const [showAnnotation, setShowAnnotation] = useState(true);
  const [annotationAnimating, setAnnotationAnimating] = useState(false);
  const [isHSVPickerOpen, setIsHSVPickerOpen] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hsvPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const color = hsvToHex(hue, saturation, value);
    setLightColor(color);
    if (activeSceneId && selectedRoleId) {
      updateRole(activeSceneId, selectedRoleId, { spotlightColor: color });
    } else if (activeSceneId) {
      activeScene?.roles.forEach(role => {
        updateRole(activeSceneId, role.id, { spotlightColor: color });
      });
    }
  }, [hue, saturation, value, activeSceneId, selectedRoleId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (hsvPickerRef.current && !hsvPickerRef.current.contains(e.target as Node)) {
        setIsHSVPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hsvToHex = (h: number, s: number, v: number): string => {
    s /= 100;
    v /= 100;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = 0, g = 0, b = 0;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  useEffect(() => {
    if (isPlaying) {
      const currentIndex = scenes.findIndex(s => s.id === activeSceneId);
      let idx = currentIndex;
      
      playIntervalRef.current = setInterval(() => {
        idx = (idx + 1) % scenes.length;
        switchScene(scenes[idx].id);
      }, 4000);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, scenes, activeSceneId, switchScene]);

  const toggleAnnotation = () => {
    setAnnotationAnimating(true);
    setTimeout(() => {
      setShowAnnotation(!showAnnotation);
      setAnnotationAnimating(false);
    }, showAnnotation ? 300 : 0);
  };

  const handleSceneThumbnailClick = (sceneId: string) => {
    switchScene(sceneId);
    setAnnotationAnimating(true);
    setTimeout(() => setAnnotationAnimating(false), 500);
  };

  const renderThumbnailGradient = (scene: typeof scenes[0]) => {
    return `linear-gradient(135deg, ${scene.backgroundColor} 0%, ${scene.curtainColor} 100%)`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={styles.sidebarTitle}>🎬 场景与角色</span>
        </div>

        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>场景列表</span>
          <button style={styles.iconButton} onClick={() => addScene()}>
            ➕
          </button>
        </div>

        <div style={styles.sceneList}>
          {scenes.map((scene) => (
            <div
              key={scene.id}
              style={{
                ...styles.sceneItem,
                ...(scene.id === activeSceneId ? styles.sceneItemActive : {})
              }}
              onClick={() => switchScene(scene.id)}
            >
              <div style={styles.sceneItemContent}>
                <span style={styles.sceneItemName}>{scene.name}</span>
                <span style={styles.sceneItemMeta}>
                  {scene.roles.length} 角色
                </span>
              </div>
              {scenes.length > 1 && (
                <button
                  style={styles.deleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeScene(scene.id);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={styles.divider} />

        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>角色列表</span>
          {activeScene && (
            <button
              style={styles.iconButton}
              onClick={() => addRole(activeScene.id)}
            >
              ➕
            </button>
          )}
        </div>

        <div style={styles.roleList}>
          {activeScene?.roles.map((role) => (
            <div
              key={role.id}
              style={{
                ...styles.roleItem,
                ...(role.id === selectedRoleId ? styles.roleItemActive : {})
              }}
              onClick={() => selectRole(role.id)}
            >
              <div
                style={{
                  ...styles.roleColorDot,
                  backgroundColor: role.color
                }}
              />
              <div style={styles.roleItemContent}>
                <span style={styles.roleName}>{role.name}</span>
                <span style={styles.roleMeta}>
                  X:{role.position.x.toFixed(1)} Z:{role.position.z.toFixed(1)}
                </span>
              </div>
              {activeScene.roles.length > 1 && (
                <button
                  style={styles.deleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRole(activeScene.id, role.id);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {selectedRole && activeScene && (
          <>
            <div style={styles.divider} />
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>角色属性</span>
            </div>
            <div style={styles.propertiesPanel}>
              <div style={styles.propertyRow}>
                <label style={styles.propertyLabel}>角色名称</label>
                <input
                  style={styles.propertyInput}
                  value={selectedRole.name}
                  onChange={(e) =>
                    updateRole(activeScene.id, selectedRole.id, { name: e.target.value })
                  }
                />
              </div>
              <div style={styles.propertyRow}>
                <label style={styles.propertyLabel}>角色颜色</label>
                <input
                  type="color"
                  style={styles.colorInput}
                  value={selectedRole.color.startsWith('hsl') ? '#6b9bd1' : selectedRole.color}
                  onChange={(e) =>
                    updateRole(activeScene.id, selectedRole.id, { color: e.target.value })
                  }
                />
              </div>
              <div style={styles.propertyRow}>
                <label style={styles.propertyLabel}>聚光亮度</label>
                <input
                  type="range"
                  style={styles.slider}
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={selectedRole.spotlightIntensity}
                  onChange={(e) =>
                    updateRole(activeScene.id, selectedRole.id, {
                      spotlightIntensity: parseFloat(e.target.value)
                    })
                  }
                />
                <span style={styles.sliderValue}>
                  {selectedRole.spotlightIntensity.toFixed(1)}
                </span>
              </div>
              <div style={styles.propertyRow}>
                <label style={styles.propertyLabel}>聚光角度</label>
                <input
                  type="range"
                  style={styles.slider}
                  min="0.2"
                  max="1"
                  step="0.05"
                  value={selectedRole.spotlightAngle}
                  onChange={(e) =>
                    updateRole(activeScene.id, selectedRole.id, {
                      spotlightAngle: parseFloat(e.target.value)
                    })
                  }
                />
                <span style={styles.sliderValue}>
                  {selectedRole.spotlightAngle.toFixed(2)}
                </span>
              </div>
              <div style={styles.propertyRow}>
                <label style={styles.propertyLabel}>朝向Y°</label>
                <input
                  type="range"
                  style={styles.slider}
                  min="-180"
                  max="180"
                  step="5"
                  value={Math.round(selectedRole.rotation.y * 180 / Math.PI)}
                  onChange={(e) =>
                    updateRole(activeScene.id, selectedRole.id, {
                      rotation: {
                        ...selectedRole.rotation,
                        y: parseFloat(e.target.value) * Math.PI / 180
                      }
                    })
                  }
                />
                <span style={styles.sliderValue}>
                  {Math.round(selectedRole.rotation.y * 180 / Math.PI)}°
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={styles.mainArea}>
        <div style={styles.toolbar}>
          <div style={styles.toolbarGroup}>
            <span style={styles.toolbarLabel}>灯光颜色</span>
            <div style={styles.hsvPickerWrapper} ref={hsvPickerRef}>
              <div
                style={{
                  ...styles.colorPreview,
                  backgroundColor: hsvToHex(hue, saturation, value)
                }}
                onClick={() => setIsHSVPickerOpen(!isHSVPickerOpen)}
              />
              {isHSVPickerOpen && (
                <div style={styles.hsvPickerPanel}>
                  <div style={styles.hsvSaturationValue}>
                    <div
                      style={{
                        ...styles.svGradient,
                        background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))`
                      }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width;
                        const y = (e.clientY - rect.top) / rect.height;
                        setSaturation(Math.round(x * 100));
                        setValue(Math.round((1 - y) * 100));
                      }}
                    >
                      <div
                        style={{
                          ...styles.svSelector,
                          left: `${saturation}%`,
                          top: `${100 - value}%`
                        }}
                      />
                    </div>
                  </div>
                  <div style={styles.hueSlider}>
                    <div
                      style={styles.hueGradient}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width;
                        setHue(Math.round(x * 360));
                      }}
                    >
                      <div
                        style={{
                          ...styles.hueSelector,
                          left: `${(hue / 360) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                  <div style={styles.hsvValues}>
                    <span style={styles.hsvValueText}>H:{hue} S:{saturation}% V:{value}%</span>
                    <span style={styles.hsvHex}>{hsvToHex(hue, saturation, value)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={styles.toolbarSpacer} />

          <div style={styles.toolbarGroup}>
            <span style={styles.toolbarLabel}>场景</span>
            <button style={styles.toolButton} onClick={() => {
              const idx = scenes.findIndex(s => s.id === activeSceneId);
              if (idx > 0) switchScene(scenes[idx - 1].id);
            }}>
              ◀ 上一幕
            </button>
            <button style={styles.toolButton} onClick={() => {
              const idx = scenes.findIndex(s => s.id === activeSceneId);
              if (idx < scenes.length - 1) switchScene(scenes[idx + 1].id);
            }}>
              下一幕 ▶
            </button>
          </div>

          <div style={styles.toolbarSpacer} />

          <button
            style={{
              ...styles.playButton,
              ...(isPlaying ? styles.playButtonActive : {})
            }}
            onClick={() => setPlaying(!isPlaying)}
          >
            {isPlaying ? '⏸ 暂停播放' : '▶ 播放预览'}
          </button>

          <div style={styles.toolbarSpacer} />

          <button style={styles.toolButton} onClick={toggleAnnotation}>
            📝 {showAnnotation ? '隐藏' : '显示'}标注
          </button>
        </div>

        <div style={styles.stageContainer}>
          <Canvas
            shadows
            camera={{ position: [10, 8, 12], fov: 50 }}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            dpr={[1, 2]}
          >
            <StageScene />
          </Canvas>

          <div style={styles.cameraPresetContainer}>
            {Object.entries(CAMERA_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                style={styles.cameraPresetButton}
                onClick={() => setCameraPreset(key)}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {showAnnotation && activeScene && (
            <div
              style={{
                ...styles.annotationFloat,
                transform: annotationAnimating ? 'translateY(-20px)' : 'translateY(0)',
                opacity: annotationAnimating ? 0 : 1
              }}
            >
              <div style={styles.annotationHeader}>
                <span style={styles.annotationTitle}>📜 {activeScene.name}</span>
                <button
                  style={styles.annotationClose}
                  onClick={toggleAnnotation}
                >
                  ✕
                </button>
              </div>
              <div style={styles.annotationContent}>
                {activeScene.scriptAnnotation.split('\n').map((line, i) => (
                  <div key={i} style={styles.annotationLine}>{line}</div>
                ))}
              </div>
              {activeSceneId && (
                <textarea
                  style={styles.annotationTextarea}
                  value={activeScene.scriptAnnotation}
                  onChange={(e) =>
                    updateScene(activeSceneId, { scriptAnnotation: e.target.value })
                  }
                  placeholder="在此输入剧本对话或导演备注..."
                />
              )}
            </div>
          )}

          <div style={styles.brandWatermark}>
            ✦ Sagecraft 舞台灯光预览系统 ✦
          </div>
        </div>

        <div style={styles.timeline}>
          <div style={styles.timelineHeader}>
            <span style={styles.timelineTitle}>🎞 时间轴</span>
            <span style={styles.timelineHint}>点击缩略图切换场景</span>
          </div>
          <div style={styles.timelineTrack}>
            {scenes.map((scene, index) => {
              const isActive = scene.id === activeSceneId;
              return (
                <div
                  key={scene.id}
                  style={{
                    ...styles.thumbnailWrapper,
                    ...(isActive ? styles.thumbnailWrapperActive : {})
                  }}
                  onClick={() => handleSceneThumbnailClick(scene.id)}
                >
                  <div style={styles.thumbnailIndex}>{index + 1}</div>
                  <div
                    style={{
                      ...styles.thumbnail,
                      background: renderThumbnailGradient(scene)
                    }}
                  >
                    <div style={styles.thumbnailStage}>
                      {scene.roles.slice(0, 4).map((role, i) => (
                        <div
                          key={role.id}
                          style={{
                            ...styles.thumbnailRole,
                            backgroundColor: role.color.startsWith('hsl')
                              ? `hsl(${(i * 60) % 360}, 70%, 60%)`
                              : role.color,
                            left: `${15 + i * 20}%`
                          }}
                        />
                      ))}
                    </div>
                    <div style={styles.thumbnailLightOverlay} />
                  </div>
                  <div style={styles.thumbnailLabel}>{scene.name}</div>
                  {isActive && <div style={styles.thumbnailActiveDot} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundColor: '#121212',
    color: '#e0e0e0'
  },

  sidebar: {
    width: 260,
    minWidth: 260,
    backgroundColor: '#2a2a2a',
    borderRight: '1px solid #3a3a3a',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '2px 0 8px rgba(0,0,0,0.3)'
  },

  sidebarHeader: {
    padding: '18px 16px',
    borderBottom: '1px solid #3a3a3a',
    background: 'linear-gradient(180deg, #333 0%, #2a2a2a 100%)'
  },

  sidebarTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#c9a84c',
    letterSpacing: 0.5
  },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px 8px'
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#9a9a9a',
    textTransform: 'uppercase',
    letterSpacing: 1
  },

  iconButton: {
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: 6,
    color: '#c9a84c',
    cursor: 'pointer',
    padding: '4px 8px',
    fontSize: 12,
    transition: 'all 0.2s ease'
  },

  sceneList: {
    padding: '0 8px',
    overflowY: 'auto',
    maxHeight: 180
  },

  sceneItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    margin: '4px 0',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent'
  },

  sceneItemActive: {
    background: 'rgba(201, 168, 76, 0.2)',
    borderColor: '#c9a84c',
    boxShadow: 'inset 0 2px 6px rgba(201, 168, 76, 0.15)'
  },

  sceneItemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },

  sceneItemName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e0e0e0'
  },

  sceneItemMeta: {
    fontSize: 11,
    color: '#888'
  },

  deleteButton: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 4,
    fontSize: 11,
    transition: 'all 0.15s'
  },

  divider: {
    height: 1,
    backgroundColor: '#3a3a3a',
    margin: '12px 16px'
  },

  roleList: {
    padding: '0 8px',
    overflowY: 'auto',
    flex: 1,
    maxHeight: 200
  },

  roleItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    margin: '4px 0',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
    gap: 10
  },

  roleItemActive: {
    background: 'rgba(201, 168, 76, 0.2)',
    borderColor: '#c9a84c',
    boxShadow: 'inset 0 2px 6px rgba(201, 168, 76, 0.15)'
  },

  roleColorDot: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.2)',
    flexShrink: 0
  },

  roleItemContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },

  roleName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#e0e0e0'
  },

  roleMeta: {
    fontSize: 10,
    color: '#777',
    fontFamily: 'monospace'
  },

  propertiesPanel: {
    padding: '4px 16px 16px',
    overflowY: 'auto'
  },

  propertyRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '10px 0',
    flexWrap: 'wrap',
    gap: 6
  },

  propertyLabel: {
    fontSize: 12,
    color: '#aaa',
    width: '100%',
    marginBottom: 4
  },

  propertyInput: {
    flex: 1,
    background: '#1e1e1e',
    border: '1px solid #444',
    borderRadius: 6,
    padding: '7px 10px',
    color: '#e0e0e0',
    fontSize: 12,
    outline: 'none',
    width: '100%'
  },

  colorInput: {
    width: '100%',
    height: 36,
    border: '1px solid #444',
    borderRadius: 6,
    cursor: 'pointer',
    background: 'transparent'
  },

  slider: {
    flex: 1,
    height: 4,
    cursor: 'pointer',
    accentColor: '#c9a84c'
  },

  sliderValue: {
    fontSize: 11,
    color: '#c9a84c',
    minWidth: 36,
    textAlign: 'right',
    fontFamily: 'monospace'
  },

  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    width: 'calc(100% - 260px)'
  },

  toolbar: {
    height: 60,
    minHeight: 60,
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    backgroundColor: 'rgba(42, 42, 42, 0.85)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #3a3a3a',
    gap: 8
  },

  toolbarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },

  toolbarLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: 500
  },

  toolbarSpacer: {
    width: 1,
    height: 32,
    backgroundColor: '#3a3a3a',
    margin: '0 8px'
  },

  hsvPickerWrapper: {
    position: 'relative'
  },

  colorPreview: {
    width: 38,
    height: 38,
    borderRadius: 6,
    border: '2px solid rgba(255,255,255,0.2)',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },

  hsvPickerPanel: {
    position: 'absolute',
    top: 48,
    left: 0,
    zIndex: 100,
    backgroundColor: 'rgba(38, 38, 38, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid #c9a84c',
    borderRadius: 8,
    padding: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    width: 220
  },

  hsvSaturationValue: {
    width: '100%',
    height: 150,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10
  },

  svGradient: {
    width: '100%',
    height: '100%',
    position: 'relative',
    cursor: 'crosshair'
  },

  svSelector: {
    position: 'absolute',
    width: 12,
    height: 12,
    border: '2px solid #fff',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.5)'
  },

  hueSlider: {
    width: '100%',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10
  },

  hueGradient: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
    position: 'relative',
    cursor: 'pointer'
  },

  hueSelector: {
    position: 'absolute',
    width: 4,
    height: '100%',
    backgroundColor: '#fff',
    transform: 'translateX(-50%)',
    boxShadow: '0 0 4px rgba(0,0,0,0.5)'
  },

  hsvValues: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 2px'
  },

  hsvValueText: {
    fontSize: 11,
    color: '#aaa',
    fontFamily: 'monospace'
  },

  hsvHex: {
    fontSize: 12,
    color: '#c9a84c',
    fontWeight: 600,
    fontFamily: 'monospace'
  },

  toolButton: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    padding: '8px 14px',
    color: '#e0e0e0',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(8px)'
  },

  playButton: {
    background: 'linear-gradient(135deg, #c9a84c 0%, #a88832 100%)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6,
    padding: '10px 20px',
    color: '#1a1a1a',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 12px rgba(201, 168, 76, 0.3)',
    marginLeft: 'auto'
  },

  playButtonActive: {
    background: 'linear-gradient(135deg, #5a88c9 0%, #3a68a8 100%)',
    boxShadow: '0 2px 12px rgba(90, 136, 201, 0.4)',
    color: '#fff'
  },

  stageContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0a0a0a'
  },

  cameraPresetContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 10
  },

  cameraPresetButton: {
    background: 'rgba(42, 42, 42, 0.75)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(201, 168, 76, 0.3)',
    borderRadius: 6,
    padding: '8px 14px',
    color: '#e0e0e0',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  annotationFloat: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(440px, 80%)',
    background: 'rgba(255, 250, 240, 0.82)',
    backdropFilter: 'blur(16px)',
    border: '2px solid #c9a84c',
    borderRadius: 12,
    padding: 0,
    zIndex: 20,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
  },

  annotationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid rgba(201, 168, 76, 0.4)'
  },

  annotationTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#3a2f1a'
  },

  annotationClose: {
    background: 'transparent',
    border: 'none',
    color: '#3a2f1a',
    cursor: 'pointer',
    fontSize: 14,
    padding: '2px 6px',
    borderRadius: 4
  },

  annotationContent: {
    padding: '12px 16px 8px'
  },

  annotationLine: {
    fontSize: 12.5,
    color: '#2a2a2a',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap'
  },

  annotationTextarea: {
    width: '100%',
    minHeight: 60,
    padding: '8px 16px 16px',
    border: 'none',
    outline: 'none',
    resize: 'vertical',
    background: 'transparent',
    color: '#3a2f1a',
    fontSize: 12.5,
    lineHeight: 1.6,
    fontFamily: 'inherit'
  },

  brandWatermark: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 11,
    color: 'rgba(201, 168, 76, 0.3)',
    letterSpacing: 2,
    fontWeight: 300,
    pointerEvents: 'none'
  },

  timeline: {
    height: 150,
    minHeight: 150,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    backdropFilter: 'blur(8px)',
    borderTop: '1px solid #3a3a3a',
    display: 'flex',
    flexDirection: 'column'
  },

  timelineHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    borderBottom: '1px solid #333'
  },

  timelineTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#c9a84c'
  },

  timelineHint: {
    fontSize: 11,
    color: '#666'
  },

  timelineTrack: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 24px',
    overflowX: 'auto'
  },

  thumbnailWrapper: {
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
    flexShrink: 0,
    transformOrigin: 'center center'
  },

  thumbnailWrapperActive: {
    transform: 'scale(1.1)',
    zIndex: 5
  },

  thumbnailIndex: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #c9a84c, #a88832)',
    color: '#1a1a1a',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2
  },

  thumbnail: {
    width: 100,
    height: 70,
    borderRadius: 8,
    border: '2px solid #444',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  },

  thumbnailWrapperActive: {
    transform: 'scale(1.1)',
    zIndex: 5
  },

  thumbnailStage: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    height: 30,
    display: 'flex',
    justifyContent: 'center'
  },

  thumbnailRole: {
    position: 'absolute',
    bottom: 0,
    width: 10,
    height: 24,
    borderRadius: '50% 50% 2px 2px',
    border: '1px solid rgba(255,255,255,0.3)'
  },

  thumbnailLightOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 50% 30%, rgba(255,245,230,0.3) 0%, transparent 60%)'
  },

  thumbnailLabel: {
    textAlign: 'center',
    marginTop: 6,
    fontSize: 11,
    color: '#aaa',
    fontWeight: 500
  },

  thumbnailActiveDot: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#c9a84c',
    boxShadow: '0 0 8px rgba(201, 168, 76, 0.6)'
  }
};

export default App;
