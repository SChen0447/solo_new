import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import {
  BRICK_SHAPES,
  BRICK_MATERIALS,
  BRICK_NAMES,
  MATERIAL_NAMES,
  BrickShape,
  BrickMaterial,
  MATERIAL_COLORS,
} from '../types';
import { recalculateAllBricksStability } from '../modules/brickManager';
import type { DragState } from './Scene';

interface UIOverlayProps {
  dragState: DragState;
  setDragState: (state: DragState) => void;
}

export default function UIOverlay({ dragState, setDragState }: UIOverlayProps) {
  const bricks = useGameStore((state) => state.bricks);
  const stability = useGameStore((state) => state.stability);
  const gameMode = useGameStore((state) => state.gameMode);
  const maxBricks = useGameStore((state) => state.maxBricks);
  const toggleDayNight = useGameStore((state) => state.toggleDayNight);
  const clearAllBricks = useGameStore((state) => state.clearAllBricks);
  const contextMenu = useGameStore((state) => state.contextMenu);
  const hideContextMenu = useGameStore((state) => state.hideContextMenu);
  const removeBrick = useGameStore((state) => state.removeBrick);

  const [selectedShape, setSelectedShape] = useState<BrickShape>('box');
  const [selectedMaterial, setSelectedMaterial] = useState<BrickMaterial>('stone');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [fps, setFps] = useState(60);
  const [frameTimes, setFrameTimes] = useState<number[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const measureFPS = () => {
      const currentTime = performance.now();
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      setFrameTimes((prev) => {
        const newTimes = [...prev, delta].slice(-30);
        const averageDelta = newTimes.reduce((a, b) => a + b, 0) / newTimes.length;
        setFps(Math.round(1000 / averageDelta));
        return newTimes;
      });

      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    if (stability < 60 && bricks.length > 0) {
      const shakeInterval = setInterval(() => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 100);
      }, 500);
      return () => clearInterval(shakeInterval);
    }
  }, [stability, bricks.length]);

  const handleBrickDragStart = useCallback(
    (shape: BrickShape, material: BrickMaterial) => {
      setDragState({
        isDragging: true,
        shape,
        material,
        position: { x: 0, y: 0, z: 0 },
        isValid: true,
      });
    },
    [setDragState]
  );

  const handleDeleteBrick = useCallback(
    (brickId: string) => {
      removeBrick(brickId);
      recalculateAllBricksStability();
      hideContextMenu();
    },
    [removeBrick, hideContextMenu]
  );

  const handleClearAll = useCallback(() => {
    clearAllBricks();
    setShowClearConfirm(false);
  }, [clearAllBricks]);

  const handleDayNightToggle = useCallback(() => {
    setIsTransitioning(true);
    toggleDayNight();
    setTimeout(() => setIsTransitioning(false), 2000);
  }, [toggleDayNight]);

  const handleMinimapClick = useCallback((angle: number) => {
    const camera = (document.querySelector('canvas') as any)?.['__r3f']?.root?.camera;
    if (camera) {
      const radius = 12;
      const height = 10;
      const targetX = Math.cos(angle) * radius;
      const targetZ = Math.sin(angle) * radius;
      
      const startPos = camera.position.clone();
      const endPos = { x: targetX, y: height, z: targetZ };
      const startTime = Date.now();
      const duration = 500;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const easeT = 1 - Math.pow(1 - t, 3);

        camera.position.set(
          startPos.x + (endPos.x - startPos.x) * easeT,
          startPos.y + (endPos.y - startPos.y) * easeT,
          startPos.z + (endPos.z - startPos.z) * easeT
        );
        camera.lookAt(0, 0, 0);

        if (t < 1) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    }
  }, []);

  const getStabilityColor = () => {
    if (stability >= 80) return '#4caf50';
    if (stability >= 60) return '#ff9800';
    return '#f44336';
  };

  const getStabilityDashOffset = () => {
    const circumference = 2 * Math.PI * 35;
    return circumference - (stability / 100) * circumference;
  };

  const isNight = gameMode === 'night';

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        transition: 'filter 2s ease',
        filter: isTransitioning ? 'brightness(1.1)' : 'brightness(1)',
        transform: isShaking ? 'translate(2px, 2px)' : 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          pointerEvents: 'auto',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#e0e0e0', marginBottom: '8px' }}>
          古塔积木搭建
        </h1>
        <div style={{ fontSize: '14px', color: '#a0a0a0' }}>
          积木数量: {bricks.length} / {maxBricks}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            background: 'rgba(26, 26, 46, 0.9)',
            borderRadius: '12px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: `2px solid ${stability < 60 ? '#f44336' : 'transparent'}`,
            boxShadow: stability < 60 ? '0 0 20px rgba(244, 67, 54, 0.3)' : 'none',
          }}
        >
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              stroke="#333355"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              stroke={getStabilityColor()}
              strokeWidth="6"
              strokeDasharray={2 * Math.PI * 35}
              strokeDashoffset={getStabilityDashOffset()}
              strokeLinecap="round"
              transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
            />
            <text
              x="40"
              y="45"
              textAnchor="middle"
              fill={getStabilityColor()}
              fontSize="18"
              fontWeight="bold"
            >
              {stability}%
            </text>
          </svg>
          <div>
            <div style={{ fontSize: '12px', color: '#8888aa', marginBottom: '4px' }}>
              结构稳定性
            </div>
            <div style={{ fontSize: '14px', color: getStabilityColor(), fontWeight: 'bold' }}>
              {stability >= 80 ? '稳定' : stability >= 60 ? '警告' : '危险'}
            </div>
          </div>
        </div>
      </div>

      {fps < 20 && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 193, 7, 0.9)',
            color: '#1a1a2e',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            pointerEvents: 'auto',
          }}
        >
          ⚠️ 帧率过低 ({fps}FPS)，请减少积木数量
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: fps < 20 ? '180px' : '20px',
          background: 'rgba(26, 26, 46, 0.7)',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          color: fps >= 30 ? '#4caf50' : fps >= 24 ? '#ff9800' : '#f44336',
          pointerEvents: 'auto',
        }}
      >
        {fps} FPS
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          width: '150px',
          height: '150px',
          background: 'rgba(26, 26, 46, 0.8)',
          border: '1px solid #444466',
          borderRadius: '8px',
          padding: '8px',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ fontSize: '11px', color: '#8888aa', marginBottom: '4px', textAlign: 'center' }}>
          小地图
        </div>
        <svg width="134" height="134" viewBox="0 0 134 134">
          <circle cx="67" cy="67" r="60" fill="#1a1a3a" stroke="#444466" strokeWidth="1" />
          
          {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((angle, i) => (
            <g key={i} onClick={() => handleMinimapClick(angle)} style={{ cursor: 'pointer' }}>
              <circle
                cx={67 + Math.cos(angle) * 45}
                cy={67 + Math.sin(angle) * 45}
                r="12"
                fill="transparent"
              />
              <text
                x={67 + Math.cos(angle) * 45}
                y={70 + Math.sin(angle) * 45}
                textAnchor="middle"
                fill="#8888aa"
                fontSize="10"
                style={{ pointerEvents: 'none' }}
              >
                {['前', '右', '后', '左'][i]}
              </text>
            </g>
          ))}
          
          {bricks.map((brick) => (
            <circle
              key={brick.id}
              cx={67 + brick.position.x * 4}
              cy={67 + brick.position.z * 4}
              r="3"
              fill={MATERIAL_COLORS[brick.material]}
            />
          ))}
          
          <circle cx="67" cy="67" r="8" fill="#4fc3f7" opacity="0.5" />
        </svg>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '300px',
          pointerEvents: 'auto',
        }}
      >
        <button
          onClick={handleDayNightToggle}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: 'none',
            background: isNight
              ? 'linear-gradient(135deg, #1a237e, #3949ab)'
              : 'linear-gradient(135deg, #ff8f00, #ffb300)',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: isNight
              ? '0 0 20px rgba(57, 73, 171, 0.5)'
              : '0 0 20px rgba(255, 179, 0, 0.5)',
            transition: 'all 0.5s ease',
          }}
          title={isNight ? '切换到白天' : '切换到夜晚'}
        >
          {isNight ? '🌙' : '☀️'}
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: fps < 20 ? '180px' : '20px',
          marginTop: '50px',
          width: '260px',
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          pointerEvents: 'auto',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
        }}
      >
        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#e0e0e0' }}>
          积木面板
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#8888aa', marginBottom: '8px' }}>
            选择材质
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {BRICK_MATERIALS.map((material) => (
              <button
                key={material}
                onClick={() => setSelectedMaterial(material)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: '6px',
                  border: selectedMaterial === material ? '2px solid #ffd700' : '1px solid #444466',
                  background: selectedMaterial === material ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                  color: '#e0e0e0',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    background: MATERIAL_COLORS[material],
                    margin: '0 auto 4px',
                  }}
                />
                {MATERIAL_NAMES[material]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#8888aa', marginBottom: '8px' }}>
          拖拽积木到场景
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {BRICK_SHAPES.map((shape) => (
            <div
              key={shape}
              draggable
              onDragStart={(e) => {
                e.preventDefault();
                handleBrickDragStart(shape, selectedMaterial);
              }}
              onMouseDown={() => handleBrickDragStart(shape, selectedMaterial)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: selectedShape === shape ? '2px solid #ffd700' : '1px solid #444466',
                background: 'rgba(30, 30, 50, 0.8)',
                cursor: 'grab',
                transition: 'all 0.2s ease',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.borderColor = '#6666aa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor =
                  selectedShape === shape ? '#ffd700' : '#444466';
              }}
            >
              <svg width="48" height="36" viewBox="0 0 48 36" style={{ marginBottom: '4px' }}>
                {shape === 'box' && (
                  <rect
                    x="8"
                    y="8"
                    width="32"
                    height="20"
                    fill={MATERIAL_COLORS[selectedMaterial]}
                    stroke="#333"
                    strokeWidth="1"
                  />
                )}
                {shape === 'prism' && (
                  <polygon
                    points="24,4 44,32 4,32"
                    fill={MATERIAL_COLORS[selectedMaterial]}
                    stroke="#333"
                    strokeWidth="1"
                  />
                )}
                {shape === 'cylinder' && (
                  <ellipse
                    cx="24"
                    cy="18"
                    rx="16"
                    ry="14"
                    fill={MATERIAL_COLORS[selectedMaterial]}
                    stroke="#333"
                    strokeWidth="1"
                  />
                )}
                {shape === 'arch' && (
                  <path
                    d="M 6 32 L 6 16 Q 24 4 42 16 L 42 32 L 34 32 L 34 18 Q 24 10 14 18 L 14 32 Z"
                    fill={MATERIAL_COLORS[selectedMaterial]}
                    stroke="#333"
                    strokeWidth="1"
                  />
                )}
              </svg>
              <div style={{ fontSize: '12px', color: '#e0e0e0' }}>
                {BRICK_NAMES[shape]}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowClearConfirm(true)}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '10px',
            borderRadius: '6px',
            border: 'none',
            background: '#d32f2f',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#b71c1c';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#d32f2f';
          }}
        >
          清空所有积木
        </button>

        <div style={{ marginTop: '12px', fontSize: '11px', color: '#666688', lineHeight: '1.5' }}>
          <div>💡 提示:</div>
          <div>• 拖拽积木卡片放置</div>
          <div>• 左键选中积木可拖动</div>
          <div>• 右键删除积木</div>
          <div>• 空格键重置视角</div>
          <div>• Delete键删除选中</div>
        </div>
      </div>

      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'rgba(30, 30, 50, 0.95)',
            border: '1px solid #444466',
            borderRadius: '4px',
            padding: '8px 0',
            zIndex: 1000,
            minWidth: '120px',
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              color: '#ff6666',
              fontSize: '14px',
            }}
            onClick={() => handleDeleteBrick(contextMenu.brickId)}
          >
            删除积木
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            pointerEvents: 'auto',
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            style={{
              background: '#1e1e32',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #444466',
              minWidth: '300px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#e0e0e0' }}>
              确认清空
            </h3>
            <p style={{ fontSize: '14px', color: '#a0a0a0', marginBottom: '20px' }}>
              确定要清空所有积木吗？此操作无法撤销。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid #444466',
                  background: 'transparent',
                  color: '#a0a0a0',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleClearAll}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  background: '#d32f2f',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
