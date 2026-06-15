## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "UI[HTML/CSS 界面]"
        "IC[interactionController<br/>交互控制模块]"
        "SR[sceneRenderer<br/>场景渲染模块]"
    end
    subgraph "数据层"
        "DP[dataParser<br/>数据解析模块]"
        "WW[Web Worker<br/>SDF解析]"
    end
    subgraph "通信层"
        "EB[eventBus<br/>事件总线]"
    end
    "UI" --> "IC"
    "UI" --> "DP"
    "DP" --> "WW"
    "WW" --> "DP"
    "DP" --> "EB"
    "EB" --> "SR"
    "IC" --> "EB"
    "SR" --> "UI"
```

## 2. 技术说明

- 前端：TypeScript + Three.js + Vite（纯前端，无React/Vue框架）
- 初始化工具：Vite
- 后端：无
- 数据库：无（本地文件解析）

### 模块职责

| 模块 | 文件 | 职责 |
|------|------|------|
| 事件总线 | src/eventBus.ts | 提供emit/on方法，模块间解耦通信 |
| 数据解析 | src/dataParser.ts | 解析SDF格式分子数据，Web Worker执行，输出原子/键数组，通过事件总线发送 |
| 场景渲染 | src/sceneRenderer.ts | 接收数据构建3D模型，InstancedMesh批量渲染，球棍/线框模式切换 |
| 交互控制 | src/interactionController.ts | OrbitControls，模式切换，UI事件响应，原子点击检测 |
| 应用入口 | src/main.ts | 初始化场景/相机/渲染器，协调各模块启动 |

### 事件总线事件定义

| 事件名 | 数据 | 发送方 | 接收方 |
|--------|------|--------|--------|
| molecule-parsed | {atoms, bonds, name} | dataParser | sceneRenderer |
| mode-changed | 'ballStick' \| 'wireframe' | interactionController | sceneRenderer |
| atom-selected | {element, index, position, connections} | interactionController | UI |
| parse-error | {message} | dataParser | UI |
| parse-progress | {percent} | dataParser | UI |

## 3. 路由定义

单页应用，无路由。

## 4. 数据模型

### 4.1 Atom数据结构

```typescript
interface Atom {
  index: number;
  element: string;
  x: number;
  y: number;
  z: number;
}
```

### 4.2 Bond数据结构

```typescript
interface Bond {
  atom1Index: number;
  atom2Index: number;
  order: number;
}
```

### 4.3 分子数据结构

```typescript
interface MoleculeData {
  name: string;
  atoms: Atom[];
  bonds: Bond[];
}
```

## 5. 性能优化策略

- Web Worker执行SDF解析，避免阻塞主线程
- InstancedMesh按元素类型批量渲染同类原子，减少draw call
- 原子>200时确保≥30fps
- 解析时间<500ms（200原子以内）
- 首次渲染<2秒
