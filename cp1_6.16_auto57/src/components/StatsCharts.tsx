import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
} from 'recharts';
import { useDungeonStore, selectGrowthData, selectItemsByRarity } from '../store';
import { RARITY_COLORS, ITEM_TYPE_EMOJIS } from '../dataModels';
import type { ItemRarity } from '../dataModels';
import './StatsCharts.css';

const ATTR_COLORS: Record<string, string> = {
  strength: '#E74C3C',
  agility: '#2ECC71',
  intelligence: '#3498DB',
  vitality: '#9B59B6',
};

const ATTR_NAMES: Record<string, string> = {
  strength: '力量',
  agility: '敏捷',
  intelligence: '智力',
  vitality: '体力',
};

function renderActiveShape(props: unknown) {
  const p = props as Record<string, unknown>;
  const cx = p.cx as number | undefined;
  const cy = p.cy as number | undefined;
  const midAngle = p.midAngle as number | undefined;
  const innerRadius = p.innerRadius as number | undefined;
  const outerRadius = p.outerRadius as number | undefined;
  const startAngle = p.startAngle as number | undefined;
  const endAngle = p.endAngle as number | undefined;
  const fill = p.fill as string | undefined;
  const payload = p.payload as { name: string; value: number; color: string } | undefined;
  const percent = p.percent as number | undefined;
  const value = p.value as number | undefined;

  if (
    cx === undefined ||
    cy === undefined ||
    midAngle === undefined ||
    innerRadius === undefined ||
    outerRadius === undefined ||
    startAngle === undefined ||
    endAngle === undefined ||
    fill === undefined ||
    !payload ||
    percent === undefined ||
    value === undefined
  ) {
    return <g />;
  }

  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#ECF0F1" fontSize={14} fontWeight="bold">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        textAnchor={textAnchor}
        fill="#ECF0F1"
        fontSize={12}
      >
        {value} 件 ({(percent * 100).toFixed(1)}%)
      </text>
    </g>
  );
}

export default function StatsCharts() {
  const { explorationHistory } = useDungeonStore();
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const growthData = useMemo(() => selectGrowthData(explorationHistory), [explorationHistory]);

  const rarityData = useMemo(() => {
    const counts: Record<ItemRarity, number> = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };
    explorationHistory.forEach((entry) => {
      if (entry.droppedItem) {
        counts[entry.droppedItem.rarity]++;
      }
    });
    return [
      { name: '普通', value: counts.common, color: '#BDC3C7', rarity: 'common' as ItemRarity },
      { name: '稀有', value: counts.rare, color: '#3498DB', rarity: 'rare' as ItemRarity },
      { name: '史诗', value: counts.epic, color: '#9B59B6', rarity: 'epic' as ItemRarity },
      { name: '传说', value: counts.legendary, color: '#E67E22', rarity: 'legendary' as ItemRarity },
    ];
  }, [explorationHistory]);

  const totalDrops = rarityData.reduce((sum, item) => sum + item.value, 0);

  const handlePieClick = (data: { rarity: ItemRarity }, index: number) => {
    setActivePieIndex(activePieIndex === index ? null : index);
  };

  const selectedRarityItems =
    activePieIndex !== null
      ? selectItemsByRarity(explorationHistory, rarityData[activePieIndex].rarity)
      : [];

  return (
    <div className="stats-charts">
      <div className="chart-section growth-section">
        <h3 className="chart-title">角色属性成长曲线</h3>
        <div className="chart-container">
          {growthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={growthData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0F3460" />
                <XAxis
                  dataKey="floor"
                  stroke="#7F8C8D"
                  tick={{ fill: '#BDC3C7', fontSize: 11 }}
                  label={{ value: '层数', position: 'insideBottom', offset: -5, fill: '#BDC3C7', fontSize: 11 }}
                />
                <YAxis
                  stroke="#7F8C8D"
                  tick={{ fill: '#BDC3C7', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    color: '#2C3E50',
                  }}
                  labelStyle={{ color: '#2C3E50', fontWeight: 'bold' }}
                  formatter={(value: number, name: string) => [
                    value,
                    ATTR_NAMES[name] || name,
                  ]}
                  labelFormatter={(label) => `第 ${label} 层`}
                />
                <Legend
                  wrapperStyle={{ color: '#BDC3C7', fontSize: 12 }}
                  formatter={(value) => ATTR_NAMES[value] || value}
                />
                {Object.keys(ATTR_COLORS).map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={ATTR_COLORS[key]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: ATTR_COLORS[key] }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">暂无数据，开始探索后显示成长曲线</div>
          )}
        </div>
      </div>

      <div className="chart-section rarity-section">
        <h3 className="chart-title">装备品质分布</h3>
        <div className="chart-container">
          {totalDrops > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={rarityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={500}
                    animationEasing="ease-out"
                    activeIndex={activePieIndex ?? undefined}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                    onMouseLeave={() => setActivePieIndex(null)}
                    onClick={(entry, index) => handlePieClick(entry, index)}
                    style={{ cursor: 'pointer' }}
                  >
                    {rarityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.85)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                    }}
                    formatter={(value: number) => [`${value} 件`, '数量']}
                  />
                </PieChart>
              </ResponsiveContainer>

              {activePieIndex !== null && selectedRarityItems.length > 0 && (
                <div className="rarity-items-list">
                  <h4>{rarityData[activePieIndex].name}装备详情</h4>
                  <div className="rarity-items-scroll">
                    {selectedRarityItems.map((entry, idx) => (
                      <div key={idx} className="rarity-item-row">
                        <span className="rarity-item-emoji">
                          {ITEM_TYPE_EMOJIS[entry.item.type]}
                        </span>
                        <span
                          className="rarity-item-name"
                          style={{ color: RARITY_COLORS[entry.item.rarity] }}
                        >
                          {entry.item.name}
                        </span>
                        <span className="rarity-item-floor">第 {entry.floor} 层</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="chart-empty">暂无数据，获得装备后显示品质分布</div>
          )}
        </div>
      </div>
    </div>
  );
}
