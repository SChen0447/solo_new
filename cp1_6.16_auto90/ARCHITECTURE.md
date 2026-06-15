# 照明模拟与设计辅助系统 - 架构说明

## 项目结构

```
auto90/
├── package.json              # 项目依赖配置
├── vite.config.js            # Vite开发服务器配置
├── tsconfig.json             # TypeScript编译配置
├── index.html                # 应用入口HTML
├── ARCHITECTURE.md           # 本文档
└── src/
    ├── main.ts               # 应用入口，模块协调器
    ├── core/                 # 核心基础模块
    │   ├── EventBus.ts       # 事件总线系统
    │   └── Types.ts          # 全局类型定义
    ├── utils/                # 工具函数
    │   ├── ColorUtils.ts     # 颜色处理工具
    │   └── MathUtils.ts      # 数学计算工具
    ├── scene/                # 场景管理模块
    │   └── SceneManager.ts   # 三维场景管理器
    ├── lighting/             # 光照引擎模块
    │   └── LightEngine.ts    # 光照计算与热力图生成
    ├── ui/                   # 用户界面模块
    │   ├── UIHandler.ts      # lil-gui控制面板
    │   └── HeatmapRenderer.ts # 热力图渲染器
    └── rendering/            # 渲染后期模块
        └── PostProcessor.ts  # 后期效果处理器
```

## 模块职责与数据流向

### 1. 事件总线 ([EventBus.ts](file:///e:/solo/VersionFastPro/tasks/auto90/src/core/EventBus.ts))
- **职责**: 模块间解耦通信的核心
- **核心方法**: `on()`, `emit()`, `off()`, `once()`
- **事件类型**: 定义于 `Events` 常量

```
UIHandler ──参数变更事件──→ EventBus ──┐
                                        ├─→ LightEngine ──热力图数据──→ EventBus ──→ HeatmapRenderer
                                        ├─→ SceneManager ──场景更新──→ EventBus ──→ main.ts
                                        └─→ PostProcessor
```

### 2. 场景管理 ([SceneManager.ts](file:///e:/solo/VersionFastPro/tasks/auto90/src/scene/SceneManager.ts))
- **职责**: 管理房间几何结构、家具、材质
- **输入事件**: 
  - `ROOM_SIZE_CHANGED`: 房间尺寸变更
  - `ROOM_MATERIAL_CHANGED`: 材质切换
- **输出事件**: 
  - `SCENE_UPDATED`: 场景更新通知
  - `FURNITURE_MOVED`: 家具移动通知
- **数据流向**: 接收参数 → 更新几何体/材质 → 渐变过渡 → 触发渲染

### 3. 光照引擎 ([LightEngine.ts](file:///e:/solo/VersionFastPro/tasks/auto90/src/lighting/LightEngine.ts))
- **职责**: 光源管理、光照计算、热力图生成
- **输入事件**:
  - `LIGHT_ADDED`: 添加光源
  - `LIGHT_REMOVED`: 删除光源
  - `LIGHT_PARAMS_CHANGED`: 单光源参数变更
  - `LIGHTS_GROUP_CHANGED`: 多光源分组参数变更
- **输出事件**:
  - `HEATMAP_DATA_UPDATED`: 热力图数据更新 (30FPS)
  - `PERFORMANCE_WARNING`: 性能警告
- **数据流向**: 接收光源参数 → 计算逐网格光照值 → 输出热力图数据

### 4. UI处理 ([UIHandler.ts](file:///e:/solo/VersionFastPro/tasks/auto90/src/ui/UIHandler.ts))
- **职责**: lil-gui控制面板、用户交互
- **输入**: 用户GUI操作
- **输出事件**: 所有参数变更事件
- **数据流向**: 监听用户交互 → 封装参数变更事件 → 触发事件总线

### 5. 后期处理 ([PostProcessor.ts](file:///e:/solo/VersionFastPro/tasks/auto90/src/rendering/PostProcessor.ts))
- **职责**: 渲染后期效果链
- **效果链**: 
  ```
  场景渲染 → LUT颜色修正 → Bloom辉光 → FXAA抗锯齿 → Vignette渐晕 → 输出
  ```
- **输入事件**: `POST_PROCESSING_CHANGED`
- **数据流向**: 接收渲染纹理 → 后期处理 → 输出至屏幕

### 6. 应用入口 ([main.ts](file:///e:/solo/VersionFastPro/tasks/auto90/src/main.ts))
- **职责**: 模块初始化、协调、渲染循环
- **协调流程**:
  ```
  1. 初始化Renderer、Camera、OrbitControls
  2. 创建各模块实例
  3. 建立事件监听
  4. 启动渲染循环:
     ├─ 更新性能统计
     ├─ 更新OrbitControls
     ├─ SceneManager.update()  # 材质过渡、光源位置平滑
     ├─ LightEngine.update()   # 热力图计算
     └─ PostProcessor.render() # 最终渲染
  ```

## 数据流向总图

```
┌─────────────┐     参数事件      ┌─────────────┐     场景更新     ┌─────────────┐
│  UIHandler  │────────────────→│  EventBus   │────────────────→│ SceneManager│
└─────────────┘                  └──────┬──────┘                  └──────┬──────┘
                                         │                               │
                                         │ 参数变更                       │ 几何体更新
                                         ▼                               ▼
                                  ┌─────────────┐                  ┌─────────────┐
                                  │ LightEngine │                  │ PostProcessor│
                                  └──────┬──────┘                  └──────┬──────┘
                                         │                               │
                                         │ 热力图数据                     │ 渲染输出
                                         ▼                               ▼
                                  ┌─────────────┐                  ┌─────────────┐
                                  │HeatmapRenderer│                 │   Screen    │
                                  └─────────────┘                  └─────────────┘
```

## 性能约束实现

| 约束 | 实现方式 |
|------|---------|
| ≥50FPS @ 6光源 | 按需渲染、PCF软阴影、合理阴影分辨率 |
| 热力图≤50ms延迟 | 20x20网格、30FPS更新频率、预计算采样点 |
| 拖拽≤30ms响应 | Raycaster相交检测、目标位置插值、阻尼平滑 |
| 光源>12个降级 | 自动降低阴影贴图至512px、用户提示 |

## 响应式断点

| 分辨率 | 布局 |
|--------|------|
| ≥1440px | 三栏: 控制面板 \| 3D场景 \| 热力图 |
| 1024-1440px | 双栏: 控制面板 \| 3D场景 + 可拖出热力图 |
| ≤768px | 全屏场景 + 底部浮动工具栏 |
