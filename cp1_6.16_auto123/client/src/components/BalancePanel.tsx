import { useMemo, useState, useEffect } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SkillNode, EffectType, EFFECT_LABELS, EFFECT_COLORS } from '../types';

interface BalancePanelProps {
  nodes: SkillNode[];
  totalPoints: number;
  usedPoints: number;
}

interface ReferenceBuild {
  name: string;
  damage: number;
  defense: number;
  heal: number;
  buff: number;
}

const REFERENCE_BUILDS: ReferenceBuild[] = [
  { name: '战士流派', damage: 80, defense: 60, heal: 20, buff: 40 },
  { name: '法师流派', damage: 90, defense: 30, heal: 40, buff: 60 },
  { name: '治疗流派', damage: 20, defense: 50, heal: 90, buff: 70 },
];

function BalancePanel({ nodes, totalPoints, usedPoints }: BalancePanelProps) {
  const [animatePoints, setAnimatePoints] = useState<boolean[]>([]);

  useEffect(() => {
    // 触发逐点弹入动画
    const effectTypes = Object.keys(EFFECT_LABELS) as EffectType[];
    effectTypes.forEach((_, index) => {
      setTimeout(() => {
        setAnimatePoints(prev => {
          const next = [...prev];
          next[index] = true;
          return next;
        });
      }, index * 300);
    });
    return () => setAnimatePoints([]);
  }, []);

  const stats = useMemo(() => {
    const effectTotals: Record<EffectType, number> = {
      damage: 0,
      defense: 0,
      heal: 0,
      buff: 0,
    };

    let maxChainDepth = 0;
    let minPreNodes = Infinity;

    const getDepth = (nodeId: string, visited: Set<string>): number => {
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (!node || node.parentId === null) return 1;
      return 1 + getDepth(node.parentId, visited);
    };

    const getPreNodeCount = (nodeId: string, visited: Set<string>): number => {
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (!node || node.parentId === null) return 0;
      return 1 + getPreNodeCount(node.parentId, visited);
    };

    nodes.forEach(node => {
      if (node.currentLevel > 0) {
        const effect = node.baseEffect + node.growthPerLevel * node.currentLevel;
        effectTotals[node.effectType] += effect;

        const depth = getDepth(node.id, new Set());
        if (depth > maxChainDepth) {
          maxChainDepth = depth;
        }

        if (node.type === 'ultimate') {
          const preCount = getPreNodeCount(node.id, new Set());
          if (preCount < minPreNodes) {
            minPreNodes = preCount;
          }
        }
      }
    });

    const activeUltimates = nodes.filter(n => n.type === 'ultimate' && n.currentLevel > 0);
    let efficiency = 0;
    if (activeUltimates.length > 0 && minPreNodes !== Infinity) {
      efficiency = usedPoints > 0 ? (usedPoints / minPreNodes) : 0;
    }

    // 归一化效果值到 0-100 范围用于雷达图
    const maxEffect = Math.max(...Object.values(effectTotals), 1);
    const normalizedEffects: Record<EffectType, number> = {
      damage: (effectTotals.damage / maxEffect) * 100,
      defense: (effectTotals.defense / maxEffect) * 100,
      heal: (effectTotals.heal / maxEffect) * 100,
      buff: (effectTotals.buff / maxEffect) * 100,
    };

    return {
      effectTotals,
      normalizedEffects,
      maxChainDepth,
      efficiency: efficiency.toFixed(2),
      totalPointsUsed: usedPoints,
      totalPointsAvailable: totalPoints,
    };
  }, [nodes, totalPoints, usedPoints]);

  const radarData = useMemo(() => {
    const effectTypes = Object.keys(EFFECT_LABELS) as EffectType[];
    return effectTypes.map(type => ({
      subject: EFFECT_LABELS[type],
      当前: Math.round(stats.normalizedEffects[type]),
      参照: 70,
      fullMark: 100,
    }));
  }, [stats.normalizedEffects]);

  const barData = useMemo(() => {
    const effectTypes = Object.keys(EFFECT_LABELS) as EffectType[];
    return effectTypes.map(type => ({
      name: EFFECT_LABELS[type],
      当前: Math.round(stats.effectTotals[type]),
      战士: REFERENCE_BUILDS[0][type],
      法师: REFERENCE_BUILDS[1][type],
      治疗: REFERENCE_BUILDS[2][type],
    }));
  }, [stats.effectTotals]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="balance-stats">
        <div className="stat-card">
          <div className="stat-label">总消耗点数</div>
          <div className="stat-value">{stats.totalPointsUsed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">技能链深度</div>
          <div className="stat-value">{stats.maxChainDepth}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">最短路径效率</div>
          <div className="stat-value" style={{ fontSize: 16 }}>{stats.efficiency}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">可用点数</div>
          <div className="stat-value" style={{ color: stats.totalPointsAvailable - stats.totalPointsUsed < 10 ? '#EF5350' : '#66BB6A' }}>
            {stats.totalPointsAvailable - stats.totalPointsUsed}
          </div>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-title">效果分布雷达图</div>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#3A3A50" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#9E9E9E', fontSize: 11 }}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={{ fill: '#666', fontSize: 10 }}
              axisLine={false}
            />
            <Radar
              name="参照"
              dataKey="参照"
              stroke="#78909C"
              fill="#78909C"
              fillOpacity={0.1}
              strokeWidth={2}
            />
            <Radar
              name="当前"
              dataKey="当前"
              stroke="#42A5F5"
              fill="#42A5F5"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <div className="chart-title">流派对比柱状图</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3A3A50" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#9E9E9E', fontSize: 11 }}
              axisLine={{ stroke: '#3A3A50' }}
            />
            <YAxis 
              tick={{ fill: '#9E9E9E', fontSize: 10 }}
              axisLine={{ stroke: '#3A3A50' }}
            />
            <Tooltip
              contentStyle={{
                background: '#2A2A3C',
                border: '1px solid #3A3A50',
                borderRadius: 4,
                fontSize: 12,
              }}
              labelStyle={{ color: '#E0E0E0' }}
            />
            <Bar dataKey="当前" fill="#42A5F5" radius={[4, 4, 0, 0]} />
            <Bar dataKey="战士" fill="#EF5350" radius={[4, 4, 0, 0]} />
            <Bar dataKey="法师" fill="#AB47BC" radius={[4, 4, 0, 0]} />
            <Bar dataKey="治疗" fill="#66BB6A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <div className="chart-title">各类型效果累计值</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(Object.keys(EFFECT_LABELS) as EffectType[]).map(type => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, fontSize: 11, color: '#9E9E9E' }}>
                {EFFECT_LABELS[type]}
              </div>
              <div style={{ flex: 1, height: 20, background: '#1E1E2E', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, (stats.effectTotals[type] / 200) * 100)}%`,
                    background: EFFECT_COLORS[type],
                    transition: 'width 0.5s ease',
                    borderRadius: 3,
                  }}
                />
              </div>
              <div style={{ width: 50, textAlign: 'right', fontSize: 12, color: '#E0E0E0' }}>
                {Math.round(stats.effectTotals[type])}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ 
        background: '#252538', 
        border: '1px solid #3A3A50', 
        borderRadius: 6, 
        padding: 12,
        fontSize: 11,
        color: '#666',
        lineHeight: 1.6,
      }}>
        <div style={{ color: '#9E9E9E', marginBottom: 6, fontWeight: 'bold' }}>分析说明</div>
        <div>• 效果分布雷达图显示当前加点的四维平衡情况</div>
        <div>• 流派对比可参考战士/法师/治疗三种预设流派</div>
        <div>• 技能链深度表示最长的技能升级路径层级</div>
        <div>• 最短路径效率 = 总消耗点数 / 终极天赋前置数</div>
      </div>
    </div>
  );
}

export default BalancePanel;
