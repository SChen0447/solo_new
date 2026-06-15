## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "App.tsx[布局组件]" --> "LeftPanel[左侧面板]"
        "App.tsx" --> "RightCanvas[右侧画布]"
        "LeftPanel" --> "UploadArea[数据上传区]"
        "LeftPanel" --> "FieldList[字段拖拽列表]"
        "LeftPanel" --> "AxisSlots[轴槽区域]"
        "RightCanvas" --> "ChartContainer[SVG渲染容器]"
        "RightCanvas" --> "TypeSwitch[图表类型切换]"
        "RightCanvas" --> "DetailCard[详情卡片]"
    end
    subgraph "状态管理层"
        "Store[Zustand Store]" --> "字段列表+数据行"
        "Store" --> "图表配置(chartType)"
        "Store" --> "轴映射关系(axisMapping)"
    end
    subgraph "数据处理层"
        "DataParser[dataParser.ts]" --> "CSV/TSV解析"
        "ChartRenderer[chartRenderer.ts]" --> "D3比例尺计算"
        "ChartRenderer" --> "SVG元素生成"
        "ChartRenderer" --> "交互事件管理"
    end
    "UploadArea" -->|"原始文本"| "DataParser"
    "DataParser" -->|"字段名+行数据"| "Store"
    "FieldList" -->|"拖拽事件"| "Store"
    "AxisSlots" -->|"轴映射更新"| "Store"
    "Store" -->|"配置+数据"| "ChartRenderer"
    "ChartRenderer" -->|"SVG DOM"| "ChartContainer"
    "ChartContainer" -->|"点击事件"| "DetailCard"
```

**数据流向**：用户上传数据 → dataParser.ts解析 → 存入store.ts → 用户拖拽字段更新轴映射 → store通知chartRenderer.ts → D3渲染SVG → 用户交互触发详情卡片

**文件调用关系**：
- `App.tsx` 导入并使用 `store.ts`（读取状态、调用方法）
- `App.tsx` 导入 `dataParser.ts`（解析数据后写入store）
- `App.tsx` 导入 `chartRenderer.ts`（传入store状态渲染图表）
- `store.ts` 无外部依赖（纯状态管理）
- `dataParser.ts` 依赖 `papaparse`（CSV解析库）
- `chartRenderer.ts` 依赖 `d3`（比例尺、SVG操作）

## 2. 技术说明

- 前端框架：React 18 + TypeScript
- 构建工具：Vite
- 状态管理：Zustand
- 数据解析：PapaParse
- 图表渲染：D3.js
- 样式方案：CSS Modules + CSS变量（不使用Tailwind，避免与D3 SVG操作冲突）
- 路由：react-router-dom（预留，单页应用暂不使用路由切换）
- 初始化工具：vite-init (react-ts模板)

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主应用页面（数据上传+图表生成） |

## 4. API定义

无后端API，纯前端应用。所有数据处理和图表渲染均在浏览器端完成。

## 5. 数据模型

### 5.1 核心数据结构定义

```typescript
interface ParsedData {
  fields: string[];
  rows: Record<string, string | number>[];
}

type ChartType = 'scatter' | 'line' | 'bar';

interface AxisMapping {
  x: string | null;
  y: string | null;
  color: string | null;
  size: string | null;
}

interface ChartConfig {
  chartType: ChartType;
  axisMapping: AxisMapping;
}

interface DataStore {
  fields: string[];
  rows: Record<string, string | number>[];
  chartType: ChartType;
  axisMapping: AxisMapping;
  setParsedData: (data: ParsedData) => void;
  setChartType: (type: ChartType) => void;
  updateAxisMapping: (axis: keyof AxisMapping, field: string | null) => void;
  clearAxisMapping: (axis: keyof AxisMapping) => void;
}
```

### 5.2 D3比例尺映射

```typescript
interface ScaleConfig {
  xScale: d3.ScaleLinear | d3.ScalePoint;
  yScale: d3.ScaleLinear;
  colorScale: d3.ScaleOrdinal;
  sizeScale: d3.ScaleLinear;
}
```

## 6. 性能约束

- 数据上传到首屏渲染 ≤ 500ms（100行5列数据）
- 轴映射更新重绘 ≤ 100ms
- 动画帧率 ≥ 55fps
- 内存占用 ≤ 80MB
- 数据量上限：1000行 × 20列
