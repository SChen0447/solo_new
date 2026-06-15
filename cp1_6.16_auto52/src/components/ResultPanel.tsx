import React, { useMemo } from 'react';
import {
  BattleResult,
  Unit,
  Side,
  HeroClass,
  EnemyTemplate
} from '../engine';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ResultPanelProps {
  visible: boolean;
  result: BattleResult | null;
  multiResults: BattleResult[];
  onClose: () => void;
  onExportCSV: () => void;
}

const HERO_CLASS_LABELS: Record<HeroClass, string> = {
  warrior: '战士',
  mage: '法师',
  assassin: '刺客',
  priest: '牧师'
};

const ENEMY_TEMPLATE_LABELS: Record<EnemyTemplate, string> = {
  goblin: '哥布林',
  skeleton: '骷髅',
  dark_elf: '暗精灵',
  golem: '石头人',
  dragon: 'Boss龙'
};

const StatsRow: React.FC<{
  label: string;
  value: string | number;
  color?: string;
}> = ({ label, value, color = '#E0E0E0' }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '5px 0',
      fontSize: 12
    }}
  >
    <span style={{ color: '#A0A0B8' }}>{label}</span>
    <span style={{ color, fontWeight: 600 }}>{value}</span>
  </div>
);

const HeroStatsCard: React.FC<{ hero: Unit }> = ({ hero }) => {
  const winRate = hero.alive ? '存活' : '阵亡';
  return (
    <div
      style={{
        background: '#1E1E2E',
        border: '1px solid #3A3A4C',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
          paddingBottom: 8,
          borderBottom: '1px solid #3A3A4C'
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6C63FF, #A29BFE)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 700,
            color: '#FFF',
            flexShrink: 0
          }}
        >
          {hero.name.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E0E0E0' }}>
            {hero.name}
          </div>
          <div style={{ fontSize: 10, color: '#8A8AAA' }}>
            {hero.class ? HERO_CLASS_LABELS[hero.class] : ''} ·{' '}
            <span style={{ color: hero.alive ? '#44CC66' : '#FF6666', fontWeight: 600 }}>
              {winRate}
            </span>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <StatsRow label="伤害输出" value={hero.stats.damageDealt} color="#FF8888" />
        <StatsRow label="治疗量" value={hero.stats.healingDone} color="#66DD88" />
        <StatsRow label="承受伤害" value={hero.stats.damageTaken} color="#FFB870" />
        <StatsRow label="击杀数" value={hero.stats.kills} color="#C080FF" />
      </div>
    </div>
  );
};

const EnemyStatsCard: React.FC<{ enemy: Unit; index: number }> = ({ enemy, index }) => (
  <div
    style={{
      background: '#1E1E2E',
      border: '1px solid #3A3A4C',
      borderRadius: 10,
      padding: 10,
      marginBottom: 6,
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }}
  >
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 700,
        color: '#FFF',
        flexShrink: 0
      }}
    >
      {enemy.name.charAt(0)}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#E0E0E0' }}>
        #{index + 1} {enemy.name}
      </div>
      <div style={{ fontSize: 10, color: '#8A8AAA' }}>
        {enemy.template ? ENEMY_TEMPLATE_LABELS[enemy.template] : ''}
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 9, color: '#6A6A8A' }}>存活回合</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#FFB844' }}>
        {enemy.stats.survivedTurns}
      </div>
    </div>
  </div>
);

const TrophyDisplay: React.FC<{ winner: Side | 'draw' }> = ({ winner }) => {
  const isWin = winner === 'hero';
  const isDraw = winner === 'draw';
  return (
    <div
      className="trophy-display"
      style={{
        textAlign: 'center',
        padding: '30px 20px',
        background: isDraw
          ? 'linear-gradient(180deg, rgba(160,160,180,0.1), transparent)'
          : isWin
          ? 'linear-gradient(180deg, rgba(255,215,0,0.15), transparent)'
          : 'linear-gradient(180deg, rgba(255,100,100,0.1), transparent)',
        borderRadius: 16,
        marginBottom: 20
      }}
    >
      <div
        style={{
          fontSize: 60,
          marginBottom: 12,
          filter: isWin ? 'drop-shadow(0 0 20px rgba(255,215,0,0.6))' : 'none'
        }}
      >
        {isDraw ? '⚖' : isWin ? '🏆' : '💀'}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 2,
          color: isDraw ? '#A0A0C0' : isWin ? '#FFD700' : '#FF6666',
          textShadow: isWin
            ? '0 0 20px rgba(255,215,0,0.4)'
            : isDraw
            ? 'none'
            : '0 0 20px rgba(255,100,100,0.4)'
        }}
      >
        {isDraw ? '战斗平局…' : isWin ? '胜利！' : '失败…'}
      </div>
      <div style={{ fontSize: 12, color: '#8A8AAA', marginTop: 6 }}>
        {isDraw ? '双方同归于尽或达成最大回合' : isWin ? '英雄阵容击败了所有敌人！' : '英雄阵容被敌人击败…'}
      </div>
    </div>
  );
};

const ResultPanel: React.FC<ResultPanelProps> = ({
  visible,
  result,
  multiResults,
  onClose,
  onExportCSV
}) => {
  const chartData = useMemo(() => {
    if (multiResults.length < 2) return [];
    const heroMap = new Map<string, { name: string; damage: number; heal: number; count: number }>();
    for (const r of multiResults) {
      for (const h of r.heroes) {
        const key = h.id;
        const cur = heroMap.get(key) || { name: h.name, damage: 0, heal: 0, count: 0 };
        cur.damage += h.stats.damageDealt;
        cur.heal += h.stats.healingDone;
        cur.count += 1;
        heroMap.set(key, cur);
      }
    }
    return Array.from(heroMap.values()).map((v) => ({
      name: v.name,
      平均伤害: Math.round(v.damage / v.count),
      平均治疗: Math.round(v.heal / v.count)
    }));
  }, [multiResults]);

  const winStats = useMemo(() => {
    if (multiResults.length < 2) return null;
    let heroWins = 0;
    let enemyWins = 0;
    let draws = 0;
    let totalTurns = 0;
    for (const r of multiResults) {
      totalTurns += r.totalTurns;
      if (r.winner === 'hero') heroWins++;
      else if (r.winner === 'enemy') enemyWins++;
      else draws++;
    }
    return {
      heroWins,
      enemyWins,
      draws,
      heroRate: Math.round((heroWins / multiResults.length) * 100),
      enemyRate: Math.round((enemyWins / multiResults.length) * 100),
      drawRate: Math.round((draws / multiResults.length) * 100),
      avgTurns: Math.round(totalTurns / multiResults.length)
    };
  }, [multiResults]);

  if (!visible || !result) return null;

  return (
    <div
      className="result-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,10,20,0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        className="result-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 820,
          maxHeight: '90vh',
          background: '#2B2B3D',
          border: '1px solid #3A3A4C',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 80px rgba(0,0,0,0.6)'
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #3A3A4C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 20 }}>📊</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#E0E0E0' }}>
                战斗结果统计
              </div>
              <div style={{ fontSize: 11, color: '#8A8AAA' }}>
                总回合数：{result.totalTurns}
                {multiResults.length > 1 && ` · 共模拟 ${multiResults.length} 次`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onExportCSV}
              style={{
                background: 'rgba(108,99,255,0.15)',
                border: '1px solid rgba(108,99,255,0.4)',
                color: '#A29BFE',
                fontSize: 12,
                padding: '7px 14px',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              📥 导出 CSV
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid #3A3A4C',
                color: '#C0C0D0',
                fontSize: 12,
                padding: '7px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              关闭
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 20
          }}
        >
          <TrophyDisplay winner={result.winner} />

          {winStats && (
            <div
              style={{
                background: '#1E1E2E',
                border: '1px solid #3A3A4C',
                borderRadius: 10,
                padding: 16,
                marginBottom: 20
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#A0A0B8', marginBottom: 12 }}>
                多次模拟汇总 · {multiResults.length} 次
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#8A8AAA', marginBottom: 4 }}>胜率</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#FFD700' }}>
                    {winStats.heroRate}%
                  </div>
                  <div style={{ fontSize: 9, color: '#44CC66' }}>{winStats.heroWins}胜</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#8A8AAA', marginBottom: 4 }}>败率</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#FF6666' }}>
                    {winStats.enemyRate}%
                  </div>
                  <div style={{ fontSize: 9, color: '#FF6666' }}>{winStats.enemyWins}负</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#8A8AAA', marginBottom: 4 }}>平局</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#A0A0C0' }}>
                    {winStats.drawRate}%
                  </div>
                  <div style={{ fontSize: 9, color: '#8A8AAA' }}>{winStats.draws}平</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#8A8AAA', marginBottom: 4 }}>平均回合</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#6BB5FF' }}>
                    {winStats.avgTurns}
                  </div>
                  <div style={{ fontSize: 9, color: '#6A8ACC' }}>回合</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#8A8AAA', marginBottom: 4 }}>平衡度</div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color:
                        winStats.heroRate >= 45 && winStats.heroRate <= 55
                          ? '#44CC66'
                          : winStats.heroRate >= 30 && winStats.heroRate <= 70
                          ? '#FFB844'
                          : '#FF6666'
                    }}
                  >
                    {winStats.heroRate >= 45 && winStats.heroRate <= 55
                      ? '优秀'
                      : winStats.heroRate >= 30 && winStats.heroRate <= 70
                      ? '良好'
                      : '失衡'}
                  </div>
                  <div style={{ fontSize: 9, color: '#8A8AAA' }}>评估</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#A29BFE',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>🛡</span> 英雄数据统计
              </div>
              {result.heroes.map((h) => (
                <HeroStatsCard key={h.id} hero={h} />
              ))}
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#FF8E53',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>👹</span> 敌方数据统计
              </div>
              {result.enemies.map((e, i) => (
                <EnemyStatsCard key={e.id} enemy={e} index={i} />
              ))}

              {chartData.length > 0 && (
                <div
                  style={{
                    marginTop: 16,
                    background: '#1E1E2E',
                    border: '1px solid #3A3A4C',
                    borderRadius: 10,
                    padding: 14
                  }}
                >
                  <div style={{ fontSize: 11, color: '#8A8AAA', marginBottom: 10, fontWeight: 600 }}>
                    📊 多次模拟 · 英雄平均伤害/治疗
                  </div>
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3A3A4C" />
                        <XAxis dataKey="name" tick={{ fill: '#8A8AAA', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#8A8AAA', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            background: '#2B2B3D',
                            border: '1px solid #3A3A4C',
                            borderRadius: 6,
                            color: '#E0E0E0',
                            fontSize: 12
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#8A8AAA' }} />
                        <Bar dataKey="平均伤害" fill="#FF6B6B" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="平均治疗" fill="#44CC88" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultPanel;
