import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { BattleSimulator } from '../modules/battle/BattleSimulator';
import { PetCard } from './PetCard';
import type { Pet, BattleResult } from '../modules/battle/PokemonData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function BattleArena() {
  const { pets, selectedForBattle, toggleBattleSelection, battleResult, setBattleResult, isBattling, setIsBattling } = useGameStore();
  const [enemyTeam, setEnemyTeam] = useState<Pet[]>([]);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [displayedLogs, setDisplayedLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startBattle = () => {
    if (selectedForBattle.length !== 3) return;

    const playerPets = selectedForBattle
      .map((id) => pets.find((p) => p.id === id))
      .filter((p): p is Pet => p !== undefined);

    const enemies = BattleSimulator.generateRandomEnemy(3);
    setEnemyTeam(enemies);

    setIsBattling(true);
    setCurrentLogIndex(0);
    setDisplayedLogs([]);

    setTimeout(() => {
      const simulator = new BattleSimulator(playerPets, enemies);
      const result = simulator.simulate();
      setBattleResult(result);
      animateLogs(result);
    }, 500);
  };

  const animateLogs = (result: BattleResult) => {
    let index = 0;
    const logs = result.logs;

    if (typingRef.current) {
      clearInterval(typingRef.current);
    }

    typingRef.current = setInterval(() => {
      if (index < logs.length) {
        setDisplayedLogs((prev) => [...prev, logs[index].message]);
        index++;
        setCurrentLogIndex(index);
      } else {
        if (typingRef.current) {
          clearInterval(typingRef.current);
          typingRef.current = null;
        }
        setIsBattling(false);
      }
    }, 400);
  };

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [displayedLogs]);

  useEffect(() => {
    return () => {
      if (typingRef.current) {
        clearInterval(typingRef.current);
      }
    };
  }, []);

  const resetBattle = () => {
    setBattleResult(null);
    setEnemyTeam([]);
    setCurrentLogIndex(0);
    setDisplayedLogs([]);
  };

  const chartData = battleResult
    ? battleResult.playerStats.map((stat) => ({
        name: stat.petName,
        伤害输出: stat.damageDealt,
        承受伤害: stat.damageTaken,
      }))
    : [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2 className="page-title">⚔️ 战斗竞技场</h2>

      {!battleResult && !isBattling && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12 }}>选择出战宠物 (已选 {selectedForBattle.length}/3)</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
              点击下方宠物卡片来选择或取消选择
            </p>

            <div className="pet-grid">
              {pets.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  isSelected={selectedForBattle.includes(pet.id)}
                  forBattle={true}
                  onClick={() => toggleBattleSelection(pet.id)}
                />
              ))}
            </div>

            {pets.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                <p style={{ fontSize: 48, marginBottom: 12 }}>🐣</p>
                <p>你还没有宠物，快去地图上探索吧！</p>
              </div>
            )}
          </div>

          <button
            className="btn"
            onClick={startBattle}
            disabled={selectedForBattle.length !== 3}
            style={{
              width: '100%',
              padding: 16,
              fontSize: 18,
              opacity: selectedForBattle.length !== 3 ? 0.5 : 1,
              cursor: selectedForBattle.length !== 3 ? 'not-allowed' : 'pointer',
            }}
          >
            {selectedForBattle.length === 3 ? '开始战斗！' : `还需选择 ${3 - selectedForBattle.length} 只宠物`}
          </button>
        </>
      )}

      {(isBattling || battleResult) && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ color: '#4ECDC4' }}>🔵 我方队伍</h3>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>VS</div>
              <div>
                <h3 style={{ color: '#FF6B6B' }}>🔴 敌方队伍</h3>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedForBattle
                  .map((id) => pets.find((p) => p.id === id))
                  .filter((p): p is Pet => p !== undefined)
                  .map((pet) => (
                    <div
                      key={pet.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: 8,
                        background: 'var(--bg-primary)',
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{pet.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{pet.name}</div>
                        <div className="hp-bar" style={{ margin: '4px 0 0 0', height: 6 }}>
                          <div
                            className={`hp-fill ${
                              battleResult && !isBattling
                                ? battleResult.playerStats.find((s) => s.petId === pet.id)
                                  ? 'low'
                                  : ''
                                : ''
                            }`}
                            style={{
                              width: battleResult && !isBattling
                                ? `${Math.max(0, 100 - (battleResult.playerStats.find((s) => s.petId === pet.id)?.damageTaken || 0) / pet.stats.hp * 100)}%`
                                : '100%',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {enemyTeam.map((pet) => (
                  <div
                    key={pet.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 8,
                      background: 'var(--bg-primary)',
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{pet.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{pet.name}</div>
                      <div className="hp-bar" style={{ margin: '4px 0 0 0', height: 6 }}>
                        <div
                          className="hp-fill"
                          style={{
                            width: battleResult && !isBattling
                              ? `${Math.max(0, 100 - (battleResult.enemyStats.find((s) => s.petId === pet.id)?.damageTaken || 0) / pet.stats.hp * 100)}%`
                              : '100%',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h4 style={{ marginBottom: 8 }}>📜 战斗日志</h4>
            <div ref={logRef} className="battle-log">
              {displayedLogs.map((log, i) => (
                <div key={i} style={{ marginBottom: 4, color: log.includes('暴击') ? '#FFE66D' : undefined }}>
                  {log}
                </div>
              ))}
              {isBattling && (
                <span style={{ color: 'var(--accent)' }}>▊</span>
              )}
            </div>
          </div>

          {battleResult && !isBattling && (
            <>
              <div
                className="card"
                style={{
                  marginBottom: 16,
                  textAlign: 'center',
                  borderColor: battleResult.winner === 'player' ? '#4ade80' : battleResult.winner === 'enemy' ? '#f87171' : undefined,
                }}
              >
                <h2 style={{ marginBottom: 8 }}>
                  {battleResult.winner === 'player' ? '🎉 胜利！' : battleResult.winner === 'enemy' ? '💀 失败...' : '⚖️ 平局'}
                </h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  总共进行了 {battleResult.totalTurns} 回合
                </p>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 12 }}>📊 战斗统计</h4>
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#B0B0B0" fontSize={12} />
                      <YAxis stroke="#B0B0B0" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: '#1E1E1E',
                          border: '1px solid #333',
                          borderRadius: 8,
                          color: 'white',
                        }}
                      />
                      <Legend wrapperStyle={{ color: 'white' }} />
                      <Bar dataKey="伤害输出" fill="#FF6B35" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="承受伤害" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 12 }}>⚔️ 技能使用次数</h4>
                {battleResult.playerStats.map((stat) => (
                  <div key={stat.petId} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{stat.petName}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {Object.entries(stat.skillsUsed).map(([skill, count]) => (
                        <span
                          key={skill}
                          style={{
                            padding: '4px 10px',
                            background: 'var(--bg-primary)',
                            borderRadius: 16,
                            fontSize: 12,
                          }}
                        >
                          {skill}: {count}次
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn" onClick={resetBattle} style={{ width: '100%', padding: 14 }}>
                再来一局
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
