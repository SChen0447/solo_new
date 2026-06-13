# 数字电路模拟沙盒 - 技术架构文档

## 1. 技术选型

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 语言 | TypeScript | 5.x | 类型安全，更好的开发体验 |
| 构建工具 | Vite | 5.x | 极速开发服务器，原生 ESM |
| 渲染 | HTML5 Canvas API | - | 高性能 2D 渲染，原生 API |
| 样式 | CSS3 | - | 自定义属性，动画效果 |
| 浏览器支持 | 现代浏览器 | - | Chrome 90+, Firefox 88+, Safari 14+ |

---

## 2. 项目结构

```
auto8/
├── package.json          # 项目依赖和脚本
├── vite.config.js        # Vite 配置
├── tsconfig.json         # TypeScript 配置
├── index.html            # 入口 HTML
└── src/
    ├── main.ts           # 应用入口
    ├── core/
    │   ├── logicGate.ts  # 逻辑门核心逻辑
    │   └── canvasRenderer.ts  # 画布渲染器
    └── ui/
        └── dragDrop.ts   # 交互控制
```

---

## 3. 核心模块设计

### 3.1 核心逻辑模块 (src/core/logicGate.ts)

#### 3.1.1 数据类型定义

```typescript
// 逻辑门类型
type GateType = 'AND' | 'OR' | 'NOT' | 'XOR' | 'INPUT' | 'OUTPUT';

// 引脚类型
interface Pin {
  id: string;
  type: 'input' | 'output';
  position: { x: number; y: number }; // 相对于元件
  value: boolean;
  connected: boolean;
}

// 逻辑门元件
interface LogicGate {
  id: string;
  type: GateType;
  x: number;
  y: number;
  width: number;
  height: number;
  inputs: Pin[];
  outputs: Pin[];
  selected: boolean;
  dragging: boolean;
  animation: {
    scale: number;
    floatOffset: number;
  };
}

// 连线
interface Wire {
  id: string;
  fromGateId: string;
  fromPinId: string;
  toGateId: string;
  toPinId: string;
  value: boolean;
  pulseProgress: number; // 0-1 用于脉冲动画
}

// 电路状态
interface CircuitState {
  gates: Map<string, LogicGate>;
  wires: Map<string, Wire>;
  selectedGateIds: Set<string>;
}
```

#### 3.1.2 核心函数

| 函数 | 签名 | 说明 |
|------|------|------|
| `createGate` | `(type: GateType, x: number, y: number) => LogicGate` | 创建新的逻辑门元件 |
| `createWire` | `(from: GatePin, to: GatePin) => Wire` | 创建连线 |
| `computeGateOutput` | `(gate: LogicGate) => void` | 根据输入计算逻辑门输出 |
| `propagateSignals` | `(state: CircuitState) => void` | 拓扑排序后传播信号 |
| `deleteGate` | `(id: string, state: CircuitState) => void` | 删除元件及相关连线 |
| `deleteWire` | `(id: string, state: CircuitState) => void` | 删除连线 |

### 3.2 画布渲染模块 (src/core/canvasRenderer.ts)

#### 3.2.1 渲染器类

```typescript
class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: CircuitState;
  
  // 动画参数
  private animationTime: number;
  private gridSize: number = 20;
  
  constructor(canvas: HTMLCanvasElement, state: CircuitState);
  
  // 主渲染入口
  render(deltaTime: number): void;
  
  // 绘制方法
  private drawGrid(): void;
  private drawGate(gate: LogicGate): void;
  private drawWire(wire: Wire): void;
  private drawPin(pin: Pin, gate: LogicGate): void;
  private drawSelection(rect: SelectionRect): void;
  private drawDraggingWire(from: Point, to: Point): void;
  
  // 工具方法
  worldToScreen(x: number, y: number): Point;
  screenToWorld(x: number, y: number): Point;
}
```

#### 3.2.2 视觉参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 背景色 | `#1a1a2e` | 深色主题背景 |
| 网格颜色 | `rgba(255,255,255,0.05)` | 虚线网格 |
| 元件背景 | `rgba(255,255,255,0.08)` | 磨砂玻璃效果 |
| 元件边框 | `rgba(255,255,255,0.2)` | 半透明边框 |
| 选中边框 | `#4da6ff` | 蓝色选中状态 |
| 高电平 | `#ff4757` | 红色高亮 |
| 低电平 | `#57606f` | 灰色 |
| 连线颜色 | `#70a1ff` | 蓝色连线 |
| 连线发光 | `rgba(112,161,255,0.5)` | 发光效果 |

### 3.3 交互控制模块 (src/ui/dragDrop.ts)

#### 3.3.1 交互状态机

```typescript
type InteractionState = 
  | 'idle'
  | 'dragging_gate_from_sidebar'
  | 'dragging_gate_on_canvas'
  | 'drawing_wire'
  | 'drawing_selection'
  | 'moving_selection';

interface DragDropController {
  private state: InteractionState;
  private circuitState: CircuitState;
  private renderer: CanvasRenderer;
  
  // 事件处理
  handleMouseDown(e: MouseEvent): void;
  handleMouseMove(e: MouseEvent): void;
  handleMouseUp(e: MouseEvent): void;
  handleKeyDown(e: KeyboardEvent): void;
  
  // 侧边栏拖拽
  handleSidebarDragStart(type: GateType): void;
  handleSidebarDragEnd(e: MouseEvent): void;
}
```

#### 3.3.2 交互流程

1. **元件拖拽流程**
   ```
   侧边栏 mousedown → 设置拖拽状态 → 创建幽灵元件 →
   鼠标移动 → 更新幽灵位置 → 画布 mouseup →
   弹性吸附动画 → 创建正式元件
   ```

2. **连线流程**
   ```
   输出引脚 mousedown → 开始绘制连线 → 鼠标移动 →
   实时更新贝塞尔曲线 → 输入引脚 mouseup →
   验证连接有效性 → 创建连线 → 触发信号传播
   ```

3. **框选流程**
   ```
   空白区域 mousedown → 开始框选 → 鼠标移动 →
   更新蓝色选区矩形 → mouseup → 计算选中元件 →
   更新选中状态
   ```

---

## 4. 性能优化策略

### 4.1 渲染优化
- **离屏 Canvas**：静态背景（网格）预渲染到离屏 Canvas
- **脏区域重绘**：只重绘变化的区域（如果需要）
- **requestAnimationFrame**：统一动画帧调度
- **对象池**：复用临时对象，减少 GC

### 4.2 逻辑优化
- **拓扑排序**：信号传播使用拓扑排序，避免重复计算
- **增量更新**：只有输入变化的元件才重新计算
- **事件节流**：高频事件（mousemove）使用 rAF 节流

### 4.3 内存优化
- **Map/Set 代替数组**：O(1) 查找
- **ID 引用**：避免循环引用
- **及时清理**：删除元件时清理所有相关引用

---

## 5. 动画系统

### 5.1 弹性吸附动画
```typescript
// 使用弹簧阻尼模型
function elasticEase(t: number): number {
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}
```

### 5.2 脉冲动画
- 沿连线方向移动的高亮段
- 使用 `pulseProgress` 字段跟踪位置
- 每帧更新：`pulseProgress = (pulseProgress + deltaTime * 0.5) % 1`

### 5.3 过渡动画
- 所有状态变化使用 300ms ease-out
- 元件缩放、位置、选中状态都有过渡
- 使用 CSS 变量和 Canvas 绘制参数插值

---

## 6. 构建配置

### 6.1 package.json
```json
{
  "name": "circuit-sandbox",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

### 6.2 vite.config.js
```javascript
export default {
  root: '.',
  base: './',
  server: {
    port: 5173,
    open: true
  }
};
```

### 6.3 tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "strict": true,
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```
