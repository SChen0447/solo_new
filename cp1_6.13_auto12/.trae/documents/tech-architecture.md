## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端层 (Phaser 3 + TypeScript)"
        "index.html" --> "main.ts"
        "main.ts" --> "BootScene.ts"
        "main.ts" --> "GameScene.ts"
        "GameScene.ts" --> "ParticleManager.ts"
        "GameScene.ts" --> "ScoreManager.ts"
    end
    subgraph "构建层 (Vite)"
        "vite.config.js" --> "TypeScript编译"
        "TypeScript编译" --> "HMR热更新"
    end
    subgraph "数据层 (内置)"
        "节奏数据" --> "GameScene.ts"
        "分数数据" --> "ScoreManager.ts"
    end
```

## 2. 技术说明
- 前端引擎：Phaser@3.80.0 + TypeScript
- 构建工具：Vite
- 初始化工具：npm init + vite
- 后端：无
- 数据库：无（所有数据内置在客户端）

## 3. 文件结构

```
project/
├── package.json              # 依赖与脚本配置
├── vite.config.js            # Vite构建配置
├── tsconfig.json             # TypeScript严格模式配置
├── index.html                # 全屏入口HTML
└── src/
    ├── main.ts               # 游戏主入口，初始化Phaser.Game
    ├── scenes/
    │   ├── BootScene.ts      # 资源预加载场景
    │   └── GameScene.ts      # 核心游戏逻辑场景
    └── utils/
        ├── ParticleManager.ts # 粒子特效管理器
        └── ScoreManager.ts   # 分数与连击管理器
```

## 4. 模块调用关系与数据流

| 调用方 | 被调用方 | 数据流向 |
|--------|----------|----------|
| main.ts | Phaser.Game | 配置对象（场景列表、缩放模式、物理引擎） |
| BootScene.ts | GameScene.ts | 预加载完成信号，自动场景切换 |
| GameScene.ts | ParticleManager.ts | 特效请求（位置、类型）→ 返回特效实例ID |
| GameScene.ts | ScoreManager.ts | 命中事件（精度类型）→ 返回当前分数/连击数据 |
| GameScene.ts | 玩家输入 | 点击事件 → 判定计算 → 状态更新 |
| ScoreManager.ts | GameScene.ts | 分数/连击/生命值变化回调 |

## 5. 核心数据结构

### 5.1 音符数据
```typescript
interface NoteData {
  time: number;      // 音符触发时间（ms）
  lane: number;      // 轨道索引（0-3）
  hit: boolean;      // 是否已被命中
}
```

### 5.2 判定结果
```typescript
type HitAccuracy = 'perfect' | 'good' | 'miss';

interface HitResult {
  accuracy: HitAccuracy;
  scoreDelta: number;   // 分数变化
  comboDelta: number;   // 连击变化
  hpDelta: number;      // 生命值变化
}
```

### 5.3 游戏状态
```typescript
interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  hp: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  isPlaying: boolean;
}
```

### 5.4 粒子配置
```typescript
interface ParticleConfig {
  type: 'perfect' | 'good' | 'miss';
  x: number;
  y: number;
  color: number;
  count: number;
  lifespan: number;
  speed: number;
}
```

## 6. 关键算法

### 6.1 判定算法
```
时间差 = |点击时刻 - 音符到达判定线时刻|
Perfect: 时间差 ≤ 50ms → +3分 × 连击倍率
Good:    时间差 ≤ 100ms → +1分 × 连击倍率
Miss:    时间差 > 100ms → 扣1生命值，连击归零
```

### 6.2 连击倍率
```
倍率 = 1 + floor(combo / 10) × 0.1
最大倍率 = 3.0
```

### 6.3 下落速度
```
基础速度 = 300px/s
随游戏进度分3阶段增加：
阶段1（0-30s）：300px/s
阶段2（30-60s）：400px/s
阶段3（60s+）：500px/s
```
