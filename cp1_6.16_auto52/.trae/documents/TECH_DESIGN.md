# 回合制RPG战斗系统设计工具 - 技术架构文档

## 1. 技术选型与架构总览

### 1.1 技术栈选择

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| React | 18.x | UI框架 | 组件化开发，生态成熟，Hooks支持状态管理 |
| TypeScript | 5.x | 类型系统 | 严格类型检查，减少运行时错误，提升代码可维护性 |
| Vite | 5.x | 构建工具 | 极快的冷启动和HMR，开发体验优秀 |
| Recharts | 2.x | 图表库 | React生态图表库，支持柱状图，API简洁 |
| uuid | 9.x | 唯一ID生成 | 为角色、技能、日志条目生成唯一标识符 |

### 1.2 模块分层架构

```
┌─────────────────────────────────────────────────────┐
│                    App.tsx (全局状态)                │
│  - 面板折叠/响应式布局管理                            │
│  - 跨组件状态协调                                     │
├──────────┬──────────────────┬────────────────────────┤
│ EditorPanel │   BattleField    │     LogPanel          │
│ (配置输入)  │  (战斗可视化)    │    (日志展示)         │
│            │                  │                       │
│            ├──────────────────┤                       │
│            │  ResultPanel     │                       │
│            │  (结果统计)      │                       │
└────────────┴──────────────────┴───────────────────────┘
                        │
                        ▼
              ┌───────────────────┐
              │    engine.ts      │
              │  (战斗核心引擎)   │
              │  - 纯函数，无UI   │
              │  - 回合推进逻辑   │
              │  - 伤害计算       │
              │  - AI决策系统     │
              └───────────────────┘
```

### 1.3 数据流方向

```
EditorPanel (输入配置)
      │
      ▼
   App.tsx (持有 heroes / enemies 状态)
      │
      ├──→ BattleField (触发战斗)
      │         │
      │         ▼
      │     engine.simulateBattle()
      │         │
      │         ├──→ 返回 logs[] + result
      │         │
      │         ├──→ BattleField (渲染动画+血条)
      │         ├──→ LogPanel (渲染日志)
      │         └──→ ResultPanel (渲染统计)
      │
      └──→ (多次模拟) engine.simulateBattle() × N
                        │
                        ▼
                   ResultPanel (柱状图+CSV导出)
```

---

## 2. 核心数据结构定义

### 2.1 类型定义文件 (engine.ts)

```typescript
// ============ 基础枚举 ============
type HeroClass = 'warrior' | 'mage' | 'assassin' | 'priest';
type SkillType = 'physical' | 'magic' | 'heal' | 'buff' | 'debuff';
type LogType = 'attack' | 'heal' | 'buff' | 'debuff' | 'system';
type EnemyTemplate = 'goblin' | 'skeleton' | 'dark_elf' | 'golem' | 'dragon';
type Side = 'hero' | 'enemy';

// ============ 技能接口 ============
interface Skill {
  id: string;
  name: string;
  type: SkillType;
  mpCost: number;          // 0-30
  cooldown: number;        // 0-3
  value: number;           // 效果数值: 伤害/治疗/护盾/增益%
}

// ============ 角色/单位接口 ============
interface Unit {
  id: string;
  name: string;
  side: Side;
  class?: HeroClass;       // 英雄专有
  template?: EnemyTemplate; // 敌人专有
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
  skills: Skill[];
  // 运行时状态
  buffs: Buff[];
  debuffs: Debuff[];
  cooldowns: Record<string, number>; // skillId -> 剩余冷却
  alive: boolean;
  // 统计数据
  stats: UnitStats;
}

interface Buff {
  type: 'atk' | 'def' | 'spd';
  value: number; // 百分比
  turns: number;
}

interface Debuff {
  type: 'atk' | 'def' | 'spd';
  value: number;
  turns: number;
}

interface UnitStats {
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  kills: number;
  survivedTurns: number;
}

// ============ 日志接口 ============
interface BattleLog {
  id: string;
  turn: number;
  timestamp: number;
  type: LogType;
  actorId: string;
  actorName: string;
  targetId?: string;
  targetName?: string;
  skillName?: string;
  value?: number;
  message: string;
}

// ============ 战斗结果接口 ============
interface BattleResult {
  winner: Side | 'draw';
  totalTurns: number;
  heroes: Unit[];       // 带最终统计
  enemies: Unit[];      // 带最终统计
  logs: BattleLog[];
}
```

### 2.2 敌人模板默认属性

| 模板 | 名称 | HP | ATK | DEF | SPD | 说明 |
|------|------|----|-----|-----|-----|------|
| goblin | 哥布林 | 80 | 15 | 5 | 7 | 快速低血 |
| skeleton | 骷髅 | 120 | 18 | 8 | 5 | 均衡型 |
| dark_elf | 暗精灵 | 100 | 25 | 6 | 9 | 高攻高速 |
| golem | 石头人 | 250 | 20 | 20 | 2 | 高血高防低速 |
| dragon | Boss龙 | 500 | 40 | 25 | 6 | Boss级单位 |

---

## 3. engine.ts 核心模块设计

### 3.1 对外API

```typescript
// 创建英雄单位
export function createHero(config: Partial<Unit> & { name: string; class: HeroClass }): Unit;

// 创建敌人单位
export function createEnemy(template: EnemyTemplate, overrides?: Partial<Unit>): Unit;

// 单次战斗模拟 (同步执行，性能关键)
export function simulateBattle(
  heroes: Unit[],
  enemies: Unit[],
  options?: { maxTurns?: number; seed?: number }
): BattleResult;

// 深拷贝单位数组 (用于多次模拟互不干扰)
export function cloneUnits(units: Unit[]): Unit[];
```

### 3.2 战斗主循环流程

```
simulateBattle(heroes, enemies):
  1. 初始化运行时状态 (buffs/debuffs/cooldowns = 空)
  2. FOR turn = 1 TO maxTurns:
     a. 检查胜负 → 若结束则 break
     b. 收集所有存活单位，按 spd 降序排序
     c. FOR EACH unit IN sorted_units:
        i. 跳过已死亡单位
        ii. 处理buff/debuff持续时间
        iii. 冷却缩减 (-1)
        iv. AI决策 (敌人) / 自动策略 (英雄)
        v. 执行行动 (攻击/技能)
        vi. 生成BattleLog
     d. 更新存活回合数统计
  3. 返回 BattleResult
```

### 3.3 伤害计算公式

```
物理伤害 = max(1, (ATK × 技能倍率 - DEF × 0.5) × 随机(0.9, 1.1))
魔法伤害 = max(1, (ATK × 技能倍率 - DEF × 0.3) × 随机(0.85, 1.15))
治疗量   = value × 随机(0.95, 1.05)
护盾值   = value
增益/减益: 对应属性 × (1 ± value/100)
```

### 3.4 敌方AI决策逻辑

```
enemyAI(unit, allies, enemies):
  1. 筛选可用技能 (冷却完成 且 MP足够): available_skills
  2. 使用技能概率: 30% (有可用技能时)
  3. 若使用技能:
     - 治疗/增益: 选择HP最低友军
     - 减益: 选择随机敌方
     - 伤害技能: 选择HP最低敌方
  4. 若普通攻击:
     - 优先攻击被治疗过的目标 (嘲讽机制)
     - 否则选择HP最低的敌方
```

### 3.5 英雄自动策略

```
heroAutoStrategy(unit, allies, enemies):
  - 牧师: 友军HP<60%时优先治疗最低HP者，否则攻击
  - 法师: 优先用高伤魔法技能，选HP最低敌人
  - 战士: 优先用物理技能，选最高威胁敌人
  - 刺客: 优先攻击HP最低敌人，追求击杀
```

---

## 4. React 组件详细设计

### 4.1 EditorPanel.tsx - 编辑面板

**Props:**
```typescript
interface EditorPanelProps {
  heroes: Unit[];
  enemies: Unit[];
  simulationCount: number;
  onHeroesChange: (heroes: Unit[]) => void;
  onEnemiesChange: (enemies: Unit[]) => void;
  onSimulationCountChange: (n: number) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}
```

**内部子组件划分:**
- `HeroEditorCard` - 单个英雄编辑卡片
- `SkillEditor` - 技能编辑表单
- `EnemyEditorSection` - 敌方编队区域
- `EnemyCard` - 单个敌人编辑卡片

### 4.2 BattleField.tsx - 战斗场地

**Props:**
```typescript
interface BattleFieldProps {
  heroes: Unit[];
  enemies: Unit[];
  simulating: boolean;
  currentTurn: number;
  currentActionUnitId: string | null;
  actionSkillId: string | null;
  onStart: () => void;
  onReset: () => void;
  simulationCount: number;
}
```

**关键动画实现:**
- 技能闪光: CSS keyframes `flashSkill` (scale 1→1.1→1, 0.15s)
- 血条过渡: transition width 0.3s ease
- 低血量闪烁: animation `pulse-danger` infinite 0.5s

### 4.3 LogPanel.tsx - 日志面板

**Props:**
```typescript
interface LogPanelProps {
  logs: BattleLog[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}
```

**性能优化:**
- 使用 `useRef` 操作DOM自动滚动
- React.memo 包装 LogItem 组件
- 虚拟滚动考虑(若日志极大时)，但50回合×~9行动=450条，直接渲染即可

### 4.4 ResultPanel.tsx - 结果面板

**Props:**
```typescript
interface ResultPanelProps {
  visible: boolean;
  result: BattleResult | null;
  multiResults: BattleResult[]; // 多次模拟结果
  onClose: () => void;
  onExportCSV: () => void;
}
```

**子组件:**
- `TrophyDisplay` - 奖杯+胜负文字 (淡入动画)
- `StatsTable` - 英雄/敌人详细统计表
- `AverageCharts` - Recharts柱状图 (多次模拟时显示)

---

## 5. App.tsx 全局状态设计

### 5.1 核心状态

```typescript
const [heroes, setHeroes] = useState<Unit[]>(defaultHeroes);
const [enemies, setEnemies] = useState<Unit[]>(defaultEnemies);
const [simulationCount, setSimulationCount] = useState(1);

const [simulating, setSimulating] = useState(false);
const [logs, setLogs] = useState<BattleLog[]>([]);
const [liveHeroes, setLiveHeroes] = useState<Unit[]>([]);
const [liveEnemies, setLiveEnemies] = useState<Unit[]>([]);
const [currentTurn, setCurrentTurn] = useState(0);
const [currentAction, setCurrentAction] = useState<{unitId: string; skillId: string | null} | null>(null);

const [result, setResult] = useState<BattleResult | null>(null);
const [multiResults, setMultiResults] = useState<BattleResult[]>([]);
const [showResult, setShowResult] = useState(false);

// UI状态
const [editorCollapsed, setEditorCollapsed] = useState(false);
const [logCollapsed, setLogCollapsed] = useState(false);
const [isMobile, setIsMobile] = useState(false);
```

### 5.2 战斗动画播放控制

```
startSimulation():
  1. 全部战斗预先计算 (不阻塞，setTimeout包裹)
     - results = []
     - FOR i=1 TO simulationCount:
         results.push(simulateBattle(clone(heroes), clone(enemies), {seed: random}))
  2. 若单场模拟: 逐回合播放动画 (每回合0.3s)
     - 使用 setInterval / requestAnimationFrame 推进
  3. 若多场模拟: 后台静默计算，进度条提示
  4. 播放完成: setShowResult(true)
```

---

## 6. 性能优化策略

### 6.1 战斗引擎性能

- **无DOM依赖**: engine.ts 纯数据操作，不触及 React 渲染
- **避免频繁对象分配**: 循环内使用局部变量，减少GC压力
- **排序优化**: 使用 `sort()` + 原生快排，每回合最多9个单位可忽略
- **随机数生成**: 使用可预测的 mulberry32 伪随机，支持seed

### 6.2 UI渲染性能

- **战斗动画播放**: 预计算所有logs，通过 setState 分批注入而不是每帧计算
- **血条更新**: 合并同一回合多个状态更新为一次 setState
- **日志渲染**: React.memo 包装日志项，避免整条列表重渲染
- **100次模拟**: 首次模拟播放动画，其余99次后台使用 `setTimeout(cb, 0)` 分片计算，不阻塞UI

### 6.3 mulberry32 伪随机实现

```typescript
function mulberry32(seed: number) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
```

---

## 7. CSV导出格式

```csv
模拟编号,回合数,时间戳,日志类型,行动者,目标,技能名称,数值,消息
1,1,1000,attack,哥布林,战士,普通攻击,12,哥布林对战士造成12点伤害
1,1,2000,heal,牧师,牧师,治愈术,30,牧师恢复了30点生命值
...
```

---

## 8. 响应式布局断点

```css
/* 默认桌面端: ≥768px */
.app-layout { display: flex; }
.editor-panel { width: 320px; }
.log-panel { width: 300px; }

/* 移动端: <768px */
@media (max-width: 767px) {
  .editor-panel, .log-panel {
    position: fixed; z-index: 50;
    height: 100vh; top: 0;
    transform: translateX(-100%); /* 或100% */
    transition: transform 0.2s ease;
  }
  .editor-panel.open { transform: translateX(0); left: 0; }
  .log-panel.open { transform: translateX(0); right: 0; }
}
```
