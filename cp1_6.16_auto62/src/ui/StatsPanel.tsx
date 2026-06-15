import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import type { BattleStatistics, CharacterClass } from '../game/types';
import { CLASS_COLORS, AVAILABLE_CLASSES } from '../game/dataStore';

interface StatsPanelProps {
  statistics: BattleStatistics | null;
}

export default function StatsPanel({ statistics }: StatsPanelProps) {
  const skillUsageByClass = useMemo(() => {
    if (!statistics) return [];

    const usageByClass: Record<CharacterClass, { name: string; count: number; class: CharacterClass }[]> = {
      warrior: [], mage: [], assassin: [], priest: [], ranger: [], warlock: [],
    };

    Object.entries(statistics.skillUsageFrequency).forEach(([skillId, count]) => {
      const charClass = AVAILABLE_CLASSES.find((cls) =>
        cls.skills.some((s) => s.id === skillId)
      )?.class;
      
      if (charClass) {
        const skill = AVAILABLE_CLASSES.flatMap((cls) => cls.skills)
          .find((s) => s.id === skillId);
        
        if (skill) {
          usageByClass[charClass].push({
            name: skill.name,
            count,
            class: charClass,
          });
        }
      }
    });

    const result: { name: string; count: number; class: CharacterClass; className: string }[] = [];
    
    (Object.keys(usageByClass) as CharacterClass[]).forEach((charClass) => {
      const skills = usageByClass[charClass]
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      skills.forEach((skill) => {
        result.push({
          ...skill,
          className: AVAILABLE_CLASSES.find((c) => c.class === charClass)?.name || charClass,
        });
      });
    });

    return result.sort((a, b) => b.count - a.count);
  }, [statistics]);

  const survivalDistribution = useMemo(() => {
    if (!statistics) return [];

    const roundGroups: Record<number, { wins: number; total: number }> = {};
    
    statistics.battleResults.forEach((result) => {
      const roundBucket = Math.floor(result.rounds / 5) * 5;
      if (!roundGroups[roundBucket]) {
        roundGroups[roundBucket] = { wins: 0, total: 0 };
      }
      roundGroups[roundBucket].total++;
      if (result.victory) {
        roundGroups[roundBucket].wins++;
      }
    });

    return Object.entries(roundGroups)
      .map(([rounds, data]) => ({
        rounds: parseInt(rounds) + 2,
        winRate: Math.round((data.wins / data.total) * 100),
        count: data.total,
      }))
      .sort((a, b) => a.rounds - b.rounds);
  }, [statistics]);

  const boxPlotData = useMemo(() => {
    if (!statistics) return null;

    const rounds = [...statistics.survivalRounds].sort((a, b) => a - b);
    const min = rounds[0];
    const max = rounds[rounds.length - 1];
    const median = rounds.length % 2 === 0
      ? (rounds[rounds.length / 2 - 1] + rounds[rounds.length / 2]) / 2
      : rounds[Math.floor(rounds.length / 2)];
    const q1 = rounds[Math.floor(rounds.length * 0.25)];
    const q3 = rounds[Math.floor(rounds.length * 0.75)];

    return [
      { name: '存活回合', min, q1, median, q3, max },
    ];
  }, [statistics]);

  if (!statistics) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#555',
          fontSize: '14px',
        }}
      >
        配置队伍后点击开始模拟查看统计结果
      </div>
    );
  }

  return (
    <>
      <div className="stats-summary">
        <div className="stat-item">
          <div className="stat-value">{statistics.winRate}%</div>
          <div className="stat-label">总胜率</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{statistics.avgSurvivalRounds}</div>
          <div className="stat-label">平均存活回合</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{statistics.maxSingleDamage}</div>
          <div className="stat-label">单场最高伤害</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{statistics.wins}/{statistics.totalBattles}</div>
          <div className="stat-label">胜场/总场次</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3 className="chart-title">🥧 职业伤害占比</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statistics.classDamagePercentage}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, value }) => `${name}: ${value}%`}
                labelLine={false}
              >
                {statistics.classDamagePercentage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value}%`, name]}
                contentStyle={{
                  backgroundColor: '#16213e',
                  border: '1px solid #0f3460',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">📊 技能使用频率</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={skillUsageByClass}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4e" />
              <XAxis
                type="number"
                stroke="#aaa"
                tick={{ fill: '#aaa', fontSize: 10 }}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#aaa"
                tick={{ fill: '#aaa', fontSize: 10 }}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [
                  `${value}次`,
                  '使用次数',
                ]}
                contentStyle={{
                  backgroundColor: '#16213e',
                  border: '1px solid #0f3460',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                labelFormatter={(label) => {
                  const item = skillUsageByClass.find((s) => s.name === label);
                  return `${item?.className || ''} - ${label}`;
                }}
              />
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
              >
                {skillUsageByClass.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CLASS_COLORS[entry.class]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">📈 存活回合与胜率</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4e" />
              <XAxis
                dataKey="rounds"
                name="平均存活回合"
                stroke="#aaa"
                tick={{ fill: '#aaa', fontSize: 10 }}
                label={{
                  value: '存活回合数',
                  position: 'bottom',
                  fill: '#aaa',
                  fontSize: 10,
                }}
              />
              <YAxis
                dataKey="winRate"
                name="胜率"
                stroke="#aaa"
                tick={{ fill: '#aaa', fontSize: 10 }}
                label={{
                  value: '胜率(%)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#aaa',
                  fontSize: 10,
                }}
                domain={[0, 100]}
              />
              <ZAxis
                dataKey="count"
                range={[50, 400]}
                name="战斗次数"
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: number, name: string) => {
                  if (name === '平均存活回合') return [`${value}回合`, name];
                  if (name === '胜率') return [`${value}%`, name];
                  if (name === '战斗次数') return [`${value}场`, name];
                  return [value, name];
                }}
                contentStyle={{
                  backgroundColor: '#16213e',
                  border: '1px solid #0f3460',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Scatter
                name="配队策略"
                data={survivalDistribution}
                fill="#e94560"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">📦 存活回合分布</h3>
          <ResponsiveContainer width="100%" height={180}>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 300 180"
              style={{ overflow: 'visible' }}
            >
              {boxPlotData && boxPlotData.map((data, idx) => {
                const chartWidth = 260;
                const chartHeight = 120;
                const paddingLeft = 30;
                const paddingTop = 20;
                const maxRound = 50;
                
                const toX = (round: number) =>
                  paddingLeft + (round / maxRound) * chartWidth;
                const centerY = paddingTop + chartHeight / 2;

                return (
                  <g key={idx}>
                    <line
                      x1={toX(data.min)}
                      y1={centerY}
                      x2={toX(data.max)}
                      y2={centerY}
                      stroke="#666"
                      strokeWidth="2"
                    />
                    <rect
                      x={toX(data.q1)}
                      y={centerY - 20}
                      width={toX(data.q3) - toX(data.q1)}
                      height={40}
                      fill="#0f3460"
                      stroke="#e94560"
                      strokeWidth="2"
                      rx="4"
                    />
                    <line
                      x1={toX(data.median)}
                      y1={centerY - 20}
                      x2={toX(data.median)}
                      y2={centerY + 20}
                      stroke="#FFD700"
                      strokeWidth="3"
                    />
                    <line
                      x1={toX(data.min)}
                      y1={centerY - 10}
                      x2={toX(data.min)}
                      y2={centerY + 10}
                      stroke="#666"
                      strokeWidth="2"
                    />
                    <line
                      x1={toX(data.max)}
                      y1={centerY - 10}
                      x2={toX(data.max)}
                      y2={centerY + 10}
                      stroke="#666"
                      strokeWidth="2"
                    />
                    <text
                      x={toX(data.min)}
                      y={centerY + 45}
                      fill="#aaa"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {data.min}
                    </text>
                    <text
                      x={toX(data.q1)}
                      y={centerY - 30}
                      fill="#aaa"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      Q1:{data.q1}
                    </text>
                    <text
                      x={toX(data.median)}
                      y={centerY - 30}
                      fill="#FFD700"
                      fontSize="10"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      中:{data.median}
                    </text>
                    <text
                      x={toX(data.q3)}
                      y={centerY - 30}
                      fill="#aaa"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      Q3:{data.q3}
                    </text>
                    <text
                      x={toX(data.max)}
                      y={centerY + 45}
                      fill="#aaa"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {data.max}
                    </text>
                  </g>
                );
              })}
            </svg>
          </ResponsiveContainer>
        </div>

        <div className="chart-container" style={{ flexBasis: '100%' }}>
          <h3 className="chart-title">🏆 热门技能排名</h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {statistics.topSkills.map((skill, index) => (
              <div
                key={skill.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  backgroundColor: '#16213e',
                  borderRadius: '8px',
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: CLASS_COLORS[skill.class],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {index + 1}
                </span>
                <span style={{ flex: 1 }}>{skill.name}</span>
                <span style={{ color: CLASS_COLORS[skill.class] }}>
                  {AVAILABLE_CLASSES.find((c) => c.class === skill.class)?.name}
                </span>
                <span style={{ color: '#FFD700', fontWeight: '600' }}>
                  {skill.count}次
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
