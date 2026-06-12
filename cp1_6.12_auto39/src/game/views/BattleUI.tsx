import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameState,
  Position,
  Unit,
  DamageInfo,
  BOARD_SIZE,
  CELL_SIZE,
  CELL_SIZE_SMALL,
  MOBILE_BREAKPOINT,
  posEqual,
} from '../types';
import {
  createInitialGameState,
  selectUnit,
  deselectUnit,
  moveUnit,
  attackUnit,
  skipUnitAction,
  endTurn,
  applyAction,
  getUnitAt,
  getUnit,
  getAliveUnits,
  clearDamageAnimations,
  allUnitsActed,
} from '../logic/GameEngine';
import { computeAIActions, AIActionStep } from '../logic/AIPlayer';
import { Board } from './Board';
import { UnitCard } from './UnitCard';

const STORAGE_KEY = 'tactical_game_state';
const EASING = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.units && parsed.board) {
        return parsed as GameState;
      }
    }
  } catch {}
  return null;
}

function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function generateParticles(count: number): { id: number; angle: number; dist: number; delay: number }[] {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5,
      dist: 60 + Math.random() * 120,
      delay: Math.random() * 0.3,
    });
  }
  return particles;
}

interface AnimState {
  attackingAnim: { attackerId: string; attackerPos: Position; targetPos: Position } | null;
  flashTargetIds: string[];
  shrinkingUnit: { id: string; pos: Position } | null;
}

export const BattleUI: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    return loadGameState() || createInitialGameState();
  });

  const [cellSize, setCellSize] = useState(CELL_SIZE);
  const [showAutoSave, setShowAutoSave] = useState(false);
  const [aiMovePath, setAiMovePath] = useState<Position[]>([]);
  const [defeatedMarkers, setDefeatedMarkers] = useState<Position[]>(() => {
    const saved = loadGameState();
    if (!saved) return [];
    return saved.units
      .filter((u) => !u.isAlive)
      .map((u) => u.pos);
  });
  const [animState, setAnimState] = useState<AnimState>({
    attackingAnim: null,
    flashTargetIds: [],
    shrinkingUnit: null,
  });
  const [showHourglass, setShowHourglass] = useState(false);
  const [isAITurnRunning, setIsAITurnRunning] = useState(false);
  const [particles, setParticles] = useState(generateParticles(30));
  const [autoSaveKey, setAutoSaveKey] = useState(0);

  const aiTurnRunningRef = useRef(false);

  useEffect(() => {
    const updateSize = () => {
      setCellSize(window.innerWidth <= MOBILE_BREAKPOINT ? CELL_SIZE_SMALL : CELL_SIZE);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const triggerAutoSave = useCallback((state: GameState) => {
    saveGameState(state);
    setShowAutoSave(true);
    setAutoSaveKey((k) => k + 1);
    const t = setTimeout(() => setShowAutoSave(false), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const cleanup = triggerAutoSave(gameState);
    return cleanup;
  }, [gameState, triggerAutoSave]);

  useEffect(() => {
    if (gameState.phase !== 'ai_turn' || aiTurnRunningRef.current) return;

    aiTurnRunningRef.current = true;
    setIsAITurnRunning(true);
    setShowHourglass(true);

    const executeAITurn = async () => {
      await delay(400);

      const aiSteps = computeAIActions(gameState);
      let currentState = gameState;

      for (let i = 0; i < aiSteps.length; i++) {
        const step = aiSteps[i];

        if (step.action.type === 'move' && step.moveFrom && step.moveTo) {
          setAiMovePath([step.moveFrom, step.moveTo]);
          currentState = applyAction(currentState, step.action);
          setGameState(currentState);
          await delay(400);
          setAiMovePath([]);
        }

        if (step.action.type === 'attack') {
          const attacker = getUnit(currentState, step.action.unitId);
          const target = getUnit(currentState, step.action.targetId!);

          if (attacker && target) {
            setAnimState({
              attackingAnim: {
                attackerId: attacker.id,
                attackerPos: { ...attacker.pos },
                targetPos: { ...target.pos },
              },
              flashTargetIds: [target.id],
              shrinkingUnit: null,
            });

            await delay(300);

            const preAttackState = currentState;
            currentState = applyAction(currentState, step.action);
            setGameState(currentState);

            const killedInfos = currentState.damageAnimations.filter((d) => d.wasKilled);
            if (killedInfos.length > 0) {
              for (const ki of killedInfos) {
                setAnimState({
                  attackingAnim: null,
                  flashTargetIds: [],
                  shrinkingUnit: { id: ki.targetId, pos: ki.targetPos },
                });
                await delay(350);
                setDefeatedMarkers((prev) => [...prev, ki.targetPos]);
              }
            }

            setAnimState({
              attackingAnim: null,
              flashTargetIds: [],
              shrinkingUnit: null,
            });

            await delay(300);
          } else {
            currentState = applyAction(currentState, step.action);
            setGameState(currentState);
          }
        }

        if (step.action.type === 'skip') {
          currentState = applyAction(currentState, step.action);
          setGameState(currentState);
        }

        await delay(150);
      }

      await delay(200);
      currentState = endTurn(currentState);
      setGameState(currentState);

      getAliveUnits(currentState, 'red').forEach((u) => {
        if (!u.hasMoved || !u.hasAttacked) {
          // handled by endTurn
        }
      });

      setShowHourglass(false);
      setIsAITurnRunning(false);
      aiTurnRunningRef.current = false;
    };

    executeAITurn();
  }, [gameState.phase]);

  const handleCellClick = useCallback((pos: Position) => {
    if (isAITurnRunning || gameState.phase === 'game_over') return;

    setGameState((prev) => {
      const clickedUnit = getUnitAt(prev, pos);

      if (prev.phase === 'player_move') {
        const isMoveHighlight = prev.highlightedCells.some(
          (h) => posEqual(h.pos, pos) && h.type === 'move'
        );

        if (isMoveHighlight && prev.selectedUnitId) {
          const newState = moveUnit(prev, prev.selectedUnitId, pos);
          return newState;
        }

        if (clickedUnit && clickedUnit.side === 'blue' && clickedUnit.isAlive) {
          if (clickedUnit.id === prev.selectedUnitId) {
            return deselectUnit(prev);
          }
          if (!clickedUnit.hasMoved || !clickedUnit.hasAttacked) {
            return selectUnit(prev, clickedUnit.id);
          }
          return prev;
        }

        if (prev.selectedUnitId) {
          return deselectUnit(prev);
        }

        return prev;
      }

      if (prev.phase === 'player_attack') {
        const isAttackHighlight = prev.highlightedCells.some(
          (h) => posEqual(h.pos, pos) && h.type === 'attack'
        );

        if (isAttackHighlight && clickedUnit && prev.selectedUnitId) {
          const attackerId = prev.selectedUnitId;
          const targetId = clickedUnit.id;
          const attacker = getUnit(prev, attackerId);
          const target = getUnit(prev, targetId);

          if (attacker && target) {
            setAnimState({
              attackingAnim: {
                attackerId: attacker.id,
                attackerPos: { ...attacker.pos },
                targetPos: { ...target.pos },
              },
              flashTargetIds: [target.id],
              shrinkingUnit: null,
            });

            setTimeout(() => {
              setGameState((prevState) => {
                const newState = attackUnit(prevState, attackerId, targetId);

                const killedInfos = newState.damageAnimations.filter((d) => d.wasKilled);
                if (killedInfos.length > 0) {
                  for (const ki of killedInfos) {
                    setAnimState({
                      attackingAnim: null,
                      flashTargetIds: [],
                      shrinkingUnit: { id: ki.targetId, pos: ki.targetPos },
                    });
                    setTimeout(() => {
                      setDefeatedMarkers((prev) => [...prev, ki.targetPos]);
                      setAnimState({
                        attackingAnim: null,
                        flashTargetIds: [],
                        shrinkingUnit: null,
                      });
                    }, 350);
                  }
                } else {
                  setAnimState({
                    attackingAnim: null,
                    flashTargetIds: [],
                    shrinkingUnit: null,
                  });
                }

                setTimeout(() => {
                  setGameState((s) => clearDamageAnimations(s));
                }, 800);

                return newState;
              });
            }, 300);

            return prev;
          }
        }

        if (prev.selectedUnitId) {
          const unit = getUnit(prev, prev.selectedUnitId);
          if (unit) {
            const newState = skipUnitAction(prev, prev.selectedUnitId);
            return newState;
          }
        }

        return prev;
      }

      return prev;
    });
  }, [isAITurnRunning, gameState.phase]);

  const handleEndTurn = useCallback(() => {
    if (isAITurnRunning || gameState.phase === 'game_over') return;
    if (gameState.currentTurn !== 'blue') return;

    setGameState((prev) => {
      if (prev.selectedUnitId) {
        const unit = getUnit(prev, prev.selectedUnitId);
        if (unit && !unit.hasAttacked) {
          const skipped = skipUnitAction(prev, prev.selectedUnitId);
          return endTurn(skipped);
        }
      }
      return endTurn(prev);
    });
  }, [isAITurnRunning, gameState.phase, gameState.currentTurn]);

  const handleNewGame = useCallback(() => {
    clearSavedGame();
    const fresh = createInitialGameState();
    setGameState(fresh);
    setDefeatedMarkers([]);
    setAiMovePath([]);
    setAnimState({
      attackingAnim: null,
      flashTargetIds: [],
      shrinkingUnit: null,
    });
    setParticles(generateParticles(30));
  }, []);

  const handleUnitCardClick = useCallback((unitId: string) => {
    if (isAITurnRunning || gameState.phase === 'game_over') return;

    setGameState((prev) => {
      const unit = getUnit(prev, unitId);
      if (!unit || unit.side !== 'blue' || !unit.isAlive) return prev;

      if (prev.phase === 'player_attack' && prev.selectedUnitId) {
        return prev;
      }

      if (unit.id === prev.selectedUnitId) {
        return deselectUnit(prev);
      }
      if (!unit.hasMoved || !unit.hasAttacked) {
        return selectUnit(prev, unit.id);
      }
      return prev;
    });
  }, [isAITurnRunning, gameState.phase]);

  const blueUnits = gameState.units.filter((u) => u.side === 'blue');
  const redUnits = gameState.units.filter((u) => u.side === 'red');
  const isPlayerTurn = gameState.currentTurn === 'blue' && !isAITurnRunning;
  const isGameOver = gameState.phase === 'game_over';
  const isMobile = cellSize <= CELL_SIZE_SMALL;

  return (
    <div style={{
      fontFamily: '"Courier New", monospace',
      minHeight: '100vh',
      backgroundColor: '#1a1a2e',
      color: '#ddd',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: BOARD_SIZE * CELL_SIZE + 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div className="turn-bar" style={{ width: '100%' }}>
          <div className="turn-info">
            {showHourglass && <span className="hourglass-icon">⏳</span>}
            <span style={{
              color: gameState.currentTurn === 'blue' ? '#4488ff' : '#ff4444',
              fontWeight: 'bold',
            }}>
              {gameState.currentTurn === 'blue' ? '我方回合' : '敌方回合'}
            </span>
            <span style={{ color: '#888', fontSize: '10px' }}>
              第{gameState.turnNumber}回合
            </span>
          </div>
          <button
            className="end-turn-btn"
            onClick={handleEndTurn}
            disabled={!isPlayerTurn || isGameOver}
          >
            结束回合
          </button>
        </div>

        {gameState.phase === 'player_attack' && (
          <div style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '11px',
            color: '#ff6666',
            padding: '4px 12px',
            backgroundColor: 'rgba(255,0,0,0.1)',
            border: '1px solid rgba(255,0,0,0.3)',
            textAlign: 'center',
          }}>
            点击闪烁的敌方单位进行攻击，或点击空白处跳过
          </div>
        )}

        <div className="battle-layout">
          {!isMobile && (
            <div className="side-panel">
              <div className="panel-title blue-panel">我方单位</div>
              <div className="unit-panel">
                {blueUnits.map((u) => (
                  <UnitCard
                    key={u.id}
                    unit={u}
                    isSelected={gameState.selectedUnitId === u.id}
                    isDisabled={!isPlayerTurn || (u.hasMoved && u.hasAttacked)}
                    onClick={() => handleUnitCardClick(u.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="battle-main" style={{ position: 'relative' }}>
            <Board
              state={gameState}
              onCellClick={handleCellClick}
              cellSize={cellSize}
              aiMovePath={aiMovePath}
              defeatedMarkers={defeatedMarkers}
              attackingAnim={animState.attackingAnim}
              flashTargetIds={animState.flashTargetIds}
              shrinkingUnit={animState.shrinkingUnit}
            />
            {showAutoSave && (
              <div className="auto-save-hint" key={autoSaveKey}>
                已自动保存
              </div>
            )}
          </div>

          {!isMobile && (
            <div className="side-panel">
              <div className="panel-title red-panel">敌方单位</div>
              <div className="unit-panel">
                {redUnits.map((u) => (
                  <UnitCard
                    key={u.id}
                    unit={u}
                    isSelected={false}
                    isDisabled={true}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {isMobile && (
          <div style={{ width: '100%', maxWidth: BOARD_SIZE * CELL_SIZE_SMALL + 8 }}>
            <div className="panel-title blue-panel" style={{ marginBottom: '4px' }}>我方</div>
            <div className="unit-panel" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {blueUnits.map((u) => (
                <UnitCard
                  key={u.id}
                  unit={u}
                  isSelected={gameState.selectedUnitId === u.id}
                  isDisabled={!isPlayerTurn || (u.hasMoved && u.hasAttacked)}
                  onClick={() => handleUnitCardClick(u.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {isGameOver && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <div style={{ position: 'relative', width: '100%', height: '60px', overflow: 'hidden' }}>
              {particles.map((p) => {
                const px = Math.cos(p.angle) * p.dist;
                const py = Math.sin(p.angle) * p.dist;
                return (
                  <div
                    key={p.id}
                    className="particle"
                    style={{
                      left: '50%',
                      top: '50%',
                      '--px': `${px}px`,
                      '--py': `${py}px`,
                      animationDelay: `${p.delay}s`,
                    } as React.CSSProperties}
                  />
                );
              })}
            </div>
            <h2>
              {gameState.gameOverWinner === 'blue' ? '胜利！' : '败北...'}
            </h2>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">我方击杀</div>
                <div className="stat-value" style={{ color: '#4488ff' }}>{gameState.blueKills}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">敌方击杀</div>
                <div className="stat-value" style={{ color: '#ff4444' }}>{gameState.redKills}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">总回合数</div>
                <div className="stat-value">{gameState.turnNumber}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">胜利方</div>
                <div className="stat-value" style={{
                  color: gameState.gameOverWinner === 'blue' ? '#4488ff' : '#ff4444',
                }}>
                  {gameState.gameOverWinner === 'blue' ? '蓝方' : '红方'}
                </div>
              </div>
            </div>
            <button className="new-game-btn" onClick={handleNewGame}>
              开始新对局
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

BattleUI.displayName = 'BattleUI';
