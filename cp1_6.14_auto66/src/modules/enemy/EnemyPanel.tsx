import { useState, useEffect } from 'react';
import { useEnemyState } from './useEnemyState';
import { useEditorState } from '../editor/useEditorState';
import styles from './EnemyPanel.module.css';
import type { MonsterType } from '../../types';
import { MONSTER_STATS } from '../../types';

const MONSTER_TYPES: { type: MonsterType; name: string; iconClass: string; icon: string }[] = [
  { type: 'slime', name: '史莱姆', iconClass: styles.slimeIcon, icon: '●' },
  { type: 'skeleton', name: '骷髅', iconClass: styles.skeletonIcon, icon: '✚' },
  { type: 'bat', name: '蝙蝠', iconClass: styles.batIcon, icon: '▲' },
];

const WAVE_COLORS = [styles.wave1, styles.wave2, styles.wave3];

export function EnemyPanel() {
  const {
    waves,
    currentWaveIndex,
    placingMonsterType,
    addWave,
    removeWave,
    setCurrentWave,
    addMonster,
    removeMonster,
    setPlacingMonsterType,
    getWaveStats,
    clearAllMonsters,
  } = useEnemyState();

  const { cols, rows, getEntrance } = useEditorState();
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const animationRef = useState<number>(0);
  const [isPlacing, setIsPlacing] = useState(false);

  const currentWave = currentWaveIndex !== null ? waves[currentWaveIndex] : null;
  const currentStats = currentWaveIndex !== null ? getWaveStats(currentWaveIndex) : null;

  const calculateCellSize = (canvas: HTMLCanvasElement) => {
    const padding = 20;
    const cellWidth = (canvas.width - padding * 2) / cols;
    const cellHeight = (canvas.height - padding * 2) / rows;
    return Math.min(cellWidth, cellHeight);
  };

  const getGridOffset = (canvas: HTMLCanvasElement) => {
    const cellSize = calculateCellSize(canvas);
    const gridWidth = cellSize * cols;
    const gridHeight = cellSize * rows;
    return {
      offsetX: (canvas.width - gridWidth) / 2,
      offsetY: (canvas.height - gridHeight) / 2,
      cellSize,
    };
  };

  const screenToGrid = (canvas: HTMLCanvasElement, screenX: number, screenY: number) => {
    const rect = canvas.getBoundingClientRect();
    const { offsetX, offsetY, cellSize } = getGridOffset(canvas);
    const x = Math.floor((screenX - rect.left - offsetX) / cellSize);
    const y = Math.floor((screenY - rect.top - offsetY) / cellSize);
    return { x, y };
  };

  useEffect(() => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    let animFrame: number;

    const render = () => {
      ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

      const { offsetX, offsetY, cellSize } = getGridOffset(canvasRef);
      const gridWidth = cellSize * cols;
      const gridHeight = cellSize * rows;

      ctx.fillStyle = '#16213e';
      ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;

      for (let x = 0; x <= cols; x++) {
        ctx.beginPath();
        ctx.moveTo(offsetX + x * cellSize, offsetY);
        ctx.lineTo(offsetX + x * cellSize, offsetY + gridHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + y * cellSize);
        ctx.lineTo(offsetX + gridWidth, offsetY + y * cellSize);
        ctx.stroke();
      }

      const entrance = getEntrance();
      if (entrance) {
        const ex = offsetX + entrance.x * cellSize + cellSize / 2;
        const ey = offsetY + entrance.y * cellSize + cellSize / 2;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.beginPath();
        ctx.arc(ex, ey, cellSize * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3b82f6';
        ctx.font = `${cellSize * 0.4}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('入口', ex, ey);
      }

      if (currentWave) {
        currentWave.monsters.forEach((monster) => {
          const mx = offsetX + monster.x * cellSize + cellSize / 2;
          const my = offsetY + monster.y * cellSize + cellSize / 2;
          const size = cellSize * 0.3;

          ctx.fillStyle = MONSTER_STATS[monster.type].color;

          if (monster.type === 'slime') {
            ctx.beginPath();
            ctx.arc(mx, my, size, 0, Math.PI * 2);
            ctx.fill();
          } else if (monster.type === 'skeleton') {
            ctx.fillRect(mx - size, my - size, size * 2, size * 2);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(mx - size * 0.3, my - size * 0.5, size * 0.2, size * 0.2);
            ctx.fillRect(mx + size * 0.1, my - size * 0.5, size * 0.2, size * 0.2);
          } else if (monster.type === 'bat') {
            ctx.beginPath();
            ctx.moveTo(mx, my - size);
            ctx.lineTo(mx + size, my + size * 0.7);
            ctx.lineTo(mx - size, my + size * 0.7);
            ctx.closePath();
            ctx.fill();
          }
        });
      }

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [canvasRef, cols, rows, currentWave, getEntrance]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef || !placingMonsterType || !currentWave) return;

    const { x, y } = screenToGrid(canvasRef, e.clientX, e.clientY);

    if (x >= 0 && x < cols && y >= 0 && y < rows) {
      addMonster(currentWave.id, placingMonsterType, x, y);
    }
  };

  const handleMonsterTypeClick = (type: MonsterType) => {
    if (!currentWave) {
      alert('请先选择一个波次');
      return;
    }
    if (placingMonsterType === type) {
      setPlacingMonsterType(null);
      setIsPlacing(false);
    } else {
      setPlacingMonsterType(type);
      setIsPlacing(true);
    }
  };

  const handleWaveClick = (index: number) => {
    setPlacingMonsterType(null);
    setIsPlacing(false);
    setCurrentWave(currentWaveIndex === index ? null : index);
  };

  const handleAddWave = () => {
    if (waves.length < 3) {
      addWave();
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>敌人波次配置</h2>
        <div className={styles.waveTabs}>
          {waves.map((wave, index) => (
            <button
              key={wave.id}
              className={`${styles.waveTab} ${WAVE_COLORS[index]} ${
                currentWaveIndex === index ? styles.active : ''
              }`}
              onClick={() => handleWaveClick(index)}
            >
              第 {index + 1} 波
              {waves.length > 1 && (
                <span
                  className={styles.removeWaveBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWave(wave.id);
                  }}
                >
                  ×
                </span>
              )}
            </button>
          ))}
          {waves.length < 3 && (
            <button
              className={`${styles.waveTab} ${styles.addWave}`}
              onClick={handleAddWave}
            >
              + 添加
            </button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {currentWave ? (
          <>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>预览</h3>
              <canvas
                ref={(el) => setCanvasRef(el)}
                width={280}
                height={180}
                onClick={handleCanvasClick}
                style={{
                  borderRadius: '8px',
                  cursor: isPlacing ? 'crosshair' : 'default',
                  width: '100%',
                }}
              />
              {isPlacing && placingMonsterType && (
                <div className={styles.placeHint}>
                  点击格子放置 {MONSTER_STATS[placingMonsterType].name}
                </div>
              )}
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>怪物类型</h3>
              <div className={styles.monsterTypes}>
                {MONSTER_TYPES.map((mt) => (
                  <button
                    key={mt.type}
                    className={`${styles.monsterTypeBtn} ${
                      placingMonsterType === mt.type ? styles.active : ''
                    }`}
                    onClick={() => handleMonsterTypeClick(mt.type)}
                  >
                    <div className={`${styles.monsterIcon} ${mt.iconClass}`}>
                      {mt.icon}
                    </div>
                    <div className={styles.monsterInfo}>
                      <div className={styles.monsterName}>{mt.name}</div>
                      <div className={styles.monsterStats}>
                        生命 {MONSTER_STATS[mt.type].hp} / 攻击{' '}
                        {MONSTER_STATS[mt.type].attack}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>本波属性</h3>
              {currentStats && (
                <div className={styles.statsBox}>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>怪物总数</span>
                    <span className={styles.statValue}>
                      {currentStats.monsterCount}
                    </span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>总生命值</span>
                    <span className={styles.statValue}>
                      {currentStats.totalHp}
                    </span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>总攻击力</span>
                    <span className={styles.statValue}>
                      {currentStats.totalAttack}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>怪物列表</h3>
              {currentWave.monsters.length > 0 ? (
                <div className={styles.monsterList}>
                  {currentWave.monsters.map((monster, idx) => (
                    <div key={monster.id} className={styles.monsterItem}>
                      <div
                        className={styles.monsterItemIcon}
                        style={{
                          backgroundColor:
                            MONSTER_STATS[monster.type].color,
                        }}
                      />
                      <span>
                        {MONSTER_STATS[monster.type].name} #{idx + 1} (
                        {monster.x}, {monster.y})
                      </span>
                      <button
                        className={styles.deleteMonsterBtn}
                        onClick={() =>
                          removeMonster(currentWave.id, monster.id)
                        }
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  还没有怪物，选择类型后点击画布放置
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            请选择或添加一个波次开始配置
          </div>
        )}
      </div>

      {currentWave && (
        <div className={styles.bottomActions}>
          <button
            className={styles.clearBtn}
            onClick={() => clearAllMonsters(currentWave.id)}
          >
            清空本波怪物
          </button>
        </div>
      )}
    </div>
  );
}
