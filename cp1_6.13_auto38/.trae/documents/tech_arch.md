# 赛博朋克黑客攻防战 - 技术架构文档

## 1. 技术选型

| 技术 | 版本 | 用途 |
|-----|------|------|
| TypeScript | 5.x | 类型安全的开发语言 |
| Three.js | 0.160.0 | 3D节点和连线渲染 |
| Phaser | 3.80.0 | 游戏状态管理、回合逻辑、事件系统 |
| Vite | 5.x | 构建工具，开发服务器 |
| @types/three | 0.160.0 | Three.js类型定义 |

---

## 2. 系统架构

### 2.1 模块划分

```
┌──────────────────────────────────────────────────────────┐
│                     浏览器运行时                          │
│                                                          │
│  ┌──────────────┐      ┌──────────────────┐              │
│  │              │      │                  │              │
│  │  UIManager   │      │   Renderer3D     │              │
│  │  (HTML/CSS)  │      │   (Three.js)     │              │
│  │              │      │                  │              │
│  └──────┬───────┘      └────────┬─────────┘              │
│         │ 事件/状态更新          │ 渲染数据                │
│         ▼                       ▼                         │
│  ┌──────────────┐      ┌──────────────────┐              │
│  │PlayerController│    │   GraphManager   │              │
│  │  (输入处理)   │◄────►│  (图数据结构)    │              │
│  └──────────────┘      └────────┬─────────┘              │
│                                 │                        │
│  ┌──────────────┐               │                        │
│  │AIController  │               ▼                        │
│  │  (AI逻辑)    │◄─────────► GameState                   │
│  └──────────────┘          (Phaser StateManager)         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2.2 数据流

1. **玩家输入** → `PlayerController` → 事件总线 → `GameState` 更新状态
2. **AI逻辑** → `AIController` → 决策指令 → `GameState` 更新状态
3. **状态变更** → `GameState` 发布事件 → `GraphManager` 更新图数据
4. **图数据更新** → `Renderer3D` 渲染3D场景
5. **状态变更** → `UIManager` 更新HTML界面

---

## 3. 模块详细设计

### 3.1 GraphManager (network/GraphManager.ts)

**职责**: 生成和维护图结构

**核心接口**:
```typescript
interface GraphNode {
  id: string;
  position: Vector3;
  owner: 'player' | 'ai' | 'neutral';
  isCore: boolean;
  isStart: boolean;
  captureProgress: number;
  firewall: number;
  connections: string[];
}

interface GraphEdge {
  from: string;
  to: string;
}

class GraphManager {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  generateGraph(nodeCount: number, edgeCount: number): void;
  getAdjacentNodes(nodeId: string): GraphNode[];
  findPath(fromId: string, toId: string): string[];
  captureNode(nodeId: string, attacker: 'player' | 'ai'): boolean;
  getCoreNode(): GraphNode | undefined;
  getPlayerStartNode(): GraphNode | undefined;
}
```

**节点布局算法**: 力导向布局 + 中心节点强制定位

### 3.2 Renderer3D (network/Renderer3D.ts)

**职责**: Three.js 3D场景构建和渲染

**核心接口**:
```typescript
class Renderer3D {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  nodeMeshes: Map<string, THREE.Mesh>;
  edgeMeshes: Map<string, THREE.Line>;

  init(container: HTMLElement): void;
  setGraphData(graph: GraphManager): void;
  updateNodeColor(nodeId: string, color: number): void;
  playPulseAnimation(nodeId: string): void;
  playRippleAnimation(nodeId: string): void;
  playPathHighlight(path: string[]): void;
  playEdgeFlash(edgeKey: string): void;
  showTrackPath(path: string[]): void;
  hideTrackPath(): void;
  setDragIndicator(active: boolean, position: Vector3): void;
  render(): void;
  enableControls(): void;
}
```

**性能优化**:
- 节点使用 InstancedMesh 批量渲染
- 连线使用 BufferGeometry
- 动画使用 requestAnimationFrame，单帧控制在30ms内

### 3.3 GameState (game/GameState.ts)

**职责**: 核心状态机，使用 Phaser StateManager

**核心状态**:
```typescript
interface GameStateData {
  turn: number;
  phase: 'player' | 'ai' | 'final' | 'victory' | 'defeat';
  playerEnergy: number;
  maxEnergy: number;
  playerScripts: { crack: number; firewall: number; stealth: number };
  scriptCooldowns: Record<string, number>;
  aiActionLog: AIActionEntry[];
  isStealthActive: boolean;
  finalCountdown: number;
  isDraggingCore: boolean;
}

type GameEvent =
  | 'node:captured'
  | 'node:attacked'
  | 'script:used'
  | 'energy:changed'
  | 'turn:changed'
  | 'ai:action'
  | 'game:victory'
  | 'game:defeat'
  | 'final:start'
  | 'core:dragging';
```

### 3.4 PlayerController (game/PlayerController.ts)

**职责**: 处理玩家输入

- 监听鼠标点击节点事件
- 监听脚本选择事件
- 监听拖拽事件
- 通过 Phaser EventBus 发布动作事件

### 3.5 AIController (game/AIController.ts)

**职责**: 简单AI决策逻辑

**策略**:
1. 优先占领靠近玩家的节点
2. 追踪玩家路径
3. 核心节点被夺取时，集合所有节点追踪
4. 根据能量情况使用破译/防火墙脚本

### 3.6 UIManager (game/UIManager.ts)

**职责**: HTML/CSS构建UI，不依赖Three.js

**组件**:
- 左侧状态面板
  - 能量条（CSS渐变+发光效果）
  - 三个脚本槽位（按钮+冷却遮罩）
  - AI行动日志（滚动列表）
- 终端弹窗（右下角，半透明黑色背景+绿色等宽字体+扫描线动画）
- 胜利/失败遮罩层

---

## 4. 事件通信

使用 Phaser 的 EventEmitter 作为全局事件总线:

| 事件名 | 载荷 | 触发方 | 监听方 |
|-------|------|-------|-------|
| `node:click` | {nodeId} | PlayerController | GameState |
| `script:use` | {scriptType} | PlayerController | GameState |
| `turn:end` | - | GameState | AIController |
| `state:update` | {state} | GameState | UIManager, Renderer3D |
| `ai:action` | {action, timestamp} | AIController | UIManager |
| `final:start` | - | GameState | UIManager, Renderer3D |
| `core:drag` | {position} | PlayerController | Renderer3D |
| `core:drop` | {nodeId} | PlayerController | GameState |

---

## 5. 构建配置

### Vite
- 入口: index.html
- 开发服务器端口: 5173
- HMR支持

### TypeScript
- strict: true
- module: ESNext
- target: ES2020
- lib: ["DOM", "ESNext"]
