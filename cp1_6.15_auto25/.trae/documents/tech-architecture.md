## 1. 架构设计

```mermaid
flowchart TD
    "前端展示层" --> "Zustand状态管理层"
    "Zustand状态管理层" --> "物理引擎模块"
    "Zustand状态管理层" --> "配方匹配模块"
    "物理引擎模块" --> "Canvas 2D粒子系统"
    "物理引擎模块" --> "Verlet积分器"
    "物理引擎模块" --> "密度分层算法"
    "配方匹配模块" --> "配方数据库"
    "前端展示层" --> "PotionMixer组件"
    "前端展示层" --> "IngredientPanel组件"
    "前端展示层" --> "EffectOverlay组件"
    "Zustand状态管理层" --> "localStorage持久化"
```

## 2. 技术说明
- 前端：React 18 + TypeScript + Vite + Zustand
- 初始化工具：vite-init (react-ts 模板)
- 后端：无
- 数据库：无（使用localStorage持久化配方记录）
- 物理引擎：自研Canvas 2D粒子系统（Verlet积分+邻居密度计算）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 酿造工坊主页面 |

## 4. 模块划分

### 4.1 物理引擎模块 (src/physicsEngine.ts)
- 粒子类：位置、速度、半径、颜色、密度、前帧位置
- Verlet积分器：基于位置的运动学更新
- 邻居密度计算：粒子间密度交互
- 流体扩散模拟：颜色扩散和密度分层
- 气泡系统：温度驱动的气泡生成与上升
- requestAnimationFrame独立循环：60FPS目标

### 4.2 配方匹配模块 (src/recipeMatcher.ts)
- 预设10种配方数据
- 每种配方：材料ID数组(2-4种)、药水名称、效果类型、结果颜色
- 匹配算法：输入材料ID集合，与配方数据库比对
- 返回：匹配结果（成功/失败）、效果类型、颜色变化数据

### 4.3 状态管理 (Zustand Store)
- 材料列表：当前锅炉中的材料集合
- 反应进度：搅拌累积值、温度值
- 效果模式：当前效果状态（无/成功/失败）
- 配方记录：已解锁配方列表
- 选择性订阅：组件仅订阅所需状态

### 4.4 UI组件
- PotionMixer.tsx：锅炉Canvas渲染、搅拌交互、状态面板
- IngredientPanel.tsx：6种材料卡片、拖拽交互
- EffectOverlay.tsx：脉冲光晕、烟雾、爆裂动画
- App.tsx：主组件，组合所有模块

## 5. 数据模型

### 5.1 粒子数据结构
```typescript
interface Particle {
  id: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  density: number;
  ingredientId: string;
}
```

### 5.2 材料数据结构
```typescript
interface Ingredient {
  id: string;
  name: string;
  color: string;
  density: number;
  boilingPoint: number;
  isFireProperty: boolean;
  icon: string;
  description: string;
}
```

### 5.3 配方数据结构
```typescript
interface Recipe {
  id: string;
  name: string;
  ingredientIds: string[];
  resultColor: string;
  effectType: string;
  description: string;
}
```
