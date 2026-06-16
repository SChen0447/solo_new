import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import ArmyEditor from './ArmyEditor';
import HexMap from './HexMap';
import {
  Unit,
  HexTile,
  UnitTemplate,
  BattleState,
  BattleAction,
  MAP_WIDTH,
  MAP_HEIGHT,
  TERRAIN_COLORS
} from './BattleEngine';

type PagePhase = 'editor' | 'deploy' | 'battle';

const App: React.FC = () => {
  const [phase, setPhase] = useState<PagePhase>('editor');
  const [editTeam, setEditTeam] = useState<'red' | 'blue'>('red');
  const [redArmy, setRedArmy] = useState<UnitTemplate[]>([]);
  const [blueArmy, setBlueArmy] = useState<UnitTemplate[]>([]);

  const [battleId, setBattleId] = useState<string | null>(null);
  const [map, setMap] = useState<HexTile[][]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [turn, setTurn] = useState(0);
  const [battleStatus, setBattleStatus] = useState<'deployed' | 'fighting' | 'finished'>('deployed');
  const [winner, setWinner] = useState<'red' | 'blue' | null>(null);
  const [remainingUnits, setRemainingUnits] = useState<{ red: number; blue: number } | null>(null);
  const [currentAction, setCurrentAction] = useState<BattleAction | null>(null);
  const [deployTeam, setDeployTeam] = useState<'red' | 'blue'>('red');
  const [deployQueue, setDeployQueue] = useState<UnitTemplate[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isBattling, setIsBattling] = useState(false);
  const [showVictory, setShowVictory] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);
  const battleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollTop = logEndRef.current.scrollHeight;
    }
  }, [logs]);

  const handleRedArmyDeploy = (units: UnitTemplate[]) => {
    setRedArmy(units);
    setEditTeam('blue');
  };

  const handleBlueArmyDeploy = (units: UnitTemplate[]) => {
    setBlueArmy(units);
    setPhase('deploy');
    initBattle(units);
  };

  const initBattle = async (blueUnits: UnitTemplate[]) => {
    try {
      const response = await axios.post('http://localhost:5000/api/battle/init', {
        redArmy: redArmy.map((u, i) => ({
          ...u,
          id: `red-${i}`
        })),
        blueArmy: blueUnits.map((u, i) => ({
          ...u,
          id: `blue-${i}`
        }))
      });

      const data = response.data as BattleState;
      setBattleId(data.battleId);
      setMap(data.map);
      setUnits(data.units);
      setLogs(data.logs);
      setTurn(data.turn);
      setBattleStatus(data.status);
      setDeployTeam('red');
      setDeployQueue([]);
    } catch (error) {
      console.error('Failed to init battle:', error);
    }
  };

  const handleHexClick = (x: number, y: number) => {
    if (phase !== 'deploy') return;

    if (deployQueue.length > 0) {
      const [first, ...rest] = deployQueue;
      const newUnit: Unit = {
        id: `${deployTeam}-${Date.now()}`,
        type: first.type,
        name: first.name,
        icon: first.icon,
        team: deployTeam,
        hp: first.hp,
        maxHp: first.hp,
        attack: first.attack,
        defense: first.defense,
        speed: first.speed,
        range: first.range,
        x,
        y
      };

      setUnits(prev => [...prev, newUnit]);
      setDeployQueue(rest);

      if (rest.length === 0) {
        if (deployTeam === 'red') {
          setDeployTeam('blue');
        } else {
          setBattleStatus('fighting');
        }
      }
      return;
    }

    const clickedUnit = units.find(u => u.hp > 0 && u.x === x && u.y === y);
    if (clickedUnit) {
      setSelectedUnit(clickedUnit);
    } else {
      setSelectedUnit(null);
    }
  };

  const startDeploy = () => {
    setDeployQueue([...redArmy]);
    setDeployTeam('red');
  };

  const startBattle = async () => {
    if (!battleId || battleStatus !== 'deployed') return;
    
    setPhase('battle');
    setBattleStatus('fighting');
    setIsBattling(true);
    setLogs(prev => [...prev, '=== 战斗开始 ===']);
  };

  const stepBattle = useCallback(async () => {
    if (!battleId || battleStatus === 'finished') return;

    try {
      const response = await axios.post('http://localhost:5000/api/battle/step', {
        battleId
      });

      const data = response.data as BattleState;
      setUnits(data.units);
      setLogs(data.logs);
      setTurn(data.turn);
      setBattleStatus(data.status);
      setCurrentAction(data.action || null);

      if (data.status === 'finished') {
        setWinner(data.winner || null);
        setRemainingUnits(data.remainingUnits || null);
        setIsBattling(false);
        setShowVictory(true);
        if (battleIntervalRef.current) {
          clearInterval(battleIntervalRef.current);
          battleIntervalRef.current = null;
        }
      }

      if (data.turnEnd) {
        setLogs(prev => [...prev, `--- 第 ${data.turn} 回合 ---`]);
      }
    } catch (error) {
      console.error('Battle step error:', error);
    }
  }, [battleId, battleStatus]);

  useEffect(() => {
    if (isBattling && battleStatus === 'fighting') {
      battleIntervalRef.current = setInterval(() => {
        stepBattle();
      }, 500);
    }

    return () => {
      if (battleIntervalRef.current) {
        clearInterval(battleIntervalRef.current);
        battleIntervalRef.current = null;
      }
    };
  }, [isBattling, battleStatus, stepBattle]);

  const stopBattle = () => {
    setIsBattling(false);
    if (battleIntervalRef.current) {
      clearInterval(battleIntervalRef.current);
      battleIntervalRef.current = null;
    }
  };

  const resetGame = () => {
    setPhase('editor');
    setEditTeam('red');
    setRedArmy([]);
    setBlueArmy([]);
    setBattleId(null);
    setMap([]);
    setUnits([]);
    setLogs([]);
    setTurn(0);
    setBattleStatus('deployed');
    setWinner(null);
    setRemainingUnits(null);
    setCurrentAction(null);
    setDeployTeam('red');
    setDeployQueue([]);
    setSelectedUnit(null);
    setIsBattling(false);
    setShowVictory(false);
  };

  const handleAnimationEnd = () => {
    setCurrentAction(null);
  };

  const renderEditor = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      padding: '20px',
      gap: '16px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: '28px', margin: 0 }}>
          红蓝军对抗模拟器
        </h1>
        <p style={{ color: '#888', marginTop: '4px' }}>
          {editTeam === 'red' ? '第一步：编辑红方军队' : '第二步：编辑蓝方军队'}
        </p>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {editTeam === 'red' ? (
          <ArmyEditor team="red" onDeploy={handleRedArmyDeploy} />
        ) : (
          <ArmyEditor team="blue" onDeploy={handleBlueArmyDeploy} />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
        {editTeam === 'blue' && (
          <button
            onClick={() => setEditTeam('red')}
            style={{
              padding: '10px 24px',
              background: '#333',
              color: '#ccc',
              border: '1px solid #555',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← 返回红方编辑
          </button>
        )}
      </div>
    </div>
  );

  const renderBattle = () => (
    <div style={{
      display: 'flex',
      height: '100vh',
      padding: '16px',
      gap: '16px'
    }}>
      <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{
          background: '#16213e',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #2a2a4e'
        }}>
          <h2 style={{ color: '#fff', fontSize: '18px', margin: '0 0 12px 0' }}>战斗信息</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>回合</span>
              <span style={{ color: '#ffd700', fontWeight: 'bold' }}>第 {turn} 回合</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>红方单位</span>
              <span style={{ color: '#e53935', fontWeight: 'bold' }}>
                {units.filter(u => u.team === 'red' && u.hp > 0).length}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>蓝方单位</span>
              <span style={{ color: '#1e88e5', fontWeight: 'bold' }}>
                {units.filter(u => u.team === 'blue' && u.hp > 0).length}
              </span>
            </div>
          </div>
        </div>

        {selectedUnit && (
          <div style={{
            background: '#16213e',
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${selectedUnit.team === 'red' ? 'rgba(229, 57, 53, 0.3)' : 'rgba(30, 136, 229, 0.3)'}`
          }}>
            <h3 style={{ color: '#fff', fontSize: '14px', margin: '0 0 8px 0' }}>选中单位</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: selectedUnit.team === 'red' ? '#e53935' : '#1e88e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: 'white',
                fontSize: '18px'
              }}>
                {selectedUnit.icon}
              </div>
              <div>
                <div style={{ color: '#eee', fontWeight: 'bold' }}>{selectedUnit.name}</div>
                <div style={{ color: '#888', fontSize: '12px' }}>
                  {selectedUnit.team === 'red' ? '红方' : '蓝方'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>生命</span>
                <span style={{ color: '#4caf50' }}>{selectedUnit.hp}/{selectedUnit.maxHp}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>攻击</span>
                <span style={{ color: '#f44336' }}>{selectedUnit.attack}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>防御</span>
                <span style={{ color: '#2196f3' }}>{selectedUnit.defense}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>速度</span>
                <span style={{ color: '#ff9800' }}>{selectedUnit.speed}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>射程</span>
                <span style={{ color: '#9c27b0' }}>{selectedUnit.range}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: '#ccc', fontSize: '14px', margin: '0 0 8px 0' }}>战斗日志</h3>
          <div
            ref={logEndRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              background: '#0f0f1a',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              border: '1px solid #222'
            }}
          >
            {logs.map((log, i) => (
              <div
                key={i}
                style={{
                  color: log.includes('红方') ? '#ff8a80' : log.includes('蓝方') ? '#82b1ff' : '#aaa',
                  animation: log === logs[logs.length - 1] ? 'slideIn 0.3s ease' : 'none',
                  lineHeight: '1.5'
                }}
              >
                {log}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {phase === 'deploy' ? (
            <button
              onClick={startBattle}
              style={{
                flex: 1,
                padding: '12px',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              开始推演 ▶
            </button>
          ) : (
            <>
              {isBattling ? (
                <button
                  onClick={stopBattle}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  暂停 ⏸
                </button>
              ) : (
                <button
                  onClick={() => setIsBattling(true)}
                  disabled={battleStatus === 'finished'}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: battleStatus === 'finished' ? '#555' : '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: battleStatus === 'finished' ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  继续 ▶
                </button>
              )}
              <button
                onClick={stepBattle}
                disabled={battleStatus === 'finished'}
                style={{
                  padding: '12px 16px',
                  background: battleStatus === 'finished' ? '#555' : '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: battleStatus === 'finished' ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                单步 →
              </button>
            </>
          )}
        </div>

        <button
          onClick={resetGame}
          style={{
            padding: '10px',
            background: '#333',
            color: '#ccc',
            border: '1px solid #555',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          重新开始
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          background: '#16213e',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #2a2a4e',
          maxWidth: '100%',
          maxHeight: '100%',
          overflow: 'auto'
        }}>
          {phase === 'deploy' && deployQueue.length > 0 && (
            <div style={{
              textAlign: 'center',
              marginBottom: '12px',
              padding: '8px',
              background: deployTeam === 'red' ? 'rgba(229, 57, 53, 0.2)' : 'rgba(30, 136, 229, 0.2)',
              borderRadius: '8px',
              color: deployTeam === 'red' ? '#ff8a80' : '#82b1ff'
            }}>
              请部署{deployTeam === 'red' ? '红方' : '蓝方'}军队 (剩余 {deployQueue.length} 个单位)
            </div>
          )}
          {map.length > 0 && (
            <HexMap
              map={map}
              units={units}
              phase={phase === 'deploy' ? 'deploy' : 'battle'}
              currentTeam={deployTeam}
              selectedUnit={selectedUnit}
              deployUnit={deployQueue.length > 0 ? { ...deployQueue[0], id: 'deploy', team: deployTeam } as Unit : null}
              onHexClick={handleHexClick}
              action={currentAction}
              onAnimationEnd={handleAnimationEnd}
            />
          )}
        </div>
      </div>

      {showVictory && winner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.5s ease'
        }}>
          <div style={{
            background: '#16213e',
            borderRadius: '16px',
            padding: '40px 60px',
            border: `2px solid ${winner === 'red' ? '#e53935' : '#1e88e5'}`,
            textAlign: 'center',
            animation: 'scaleIn 0.5s ease',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{
              fontSize: '36px',
              color: winner === 'red' ? '#e53935' : '#1e88e5',
              margin: '0 0 20px 0'
            }}>
              🎉 {winner === 'red' ? '红方' : '蓝方'}胜利！
            </h2>
            <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', marginBottom: '24px' }}>
              <div>
                <div style={{ color: '#e53935', fontSize: '14px', marginBottom: '4px' }}>红方剩余</div>
                <div style={{ color: '#fff', fontSize: '32px', fontWeight: 'bold' }}>
                  {remainingUnits?.red || 0}
                </div>
              </div>
              <div>
                <div style={{ color: '#1e88e5', fontSize: '14px', marginBottom: '4px' }}>蓝方剩余</div>
                <div style={{ color: '#fff', fontSize: '32px', fontWeight: 'bold' }}>
                  {remainingUnits?.blue || 0}
                </div>
              </div>
            </div>
            <button
              onClick={resetGame}
              style={{
                padding: '12px 40px',
                background: winner === 'red' ? '#e53935' : '#1e88e5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              再来一局
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #1a1a2e;
        }
        ::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
      {phase === 'editor' ? renderEditor() : renderBattle()}
    </>
  );
};

export default App;
