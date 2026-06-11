## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "App.tsx 主布局"
        subgraph "仪表盘模块"
            "DashboardPanel.tsx"
            "SensorSimulator.ts"
        end
        subgraph "控制模块"
            "DeviceControl.tsx"
        end
        subgraph "日志模块"
            "EventLog.tsx"
        end
    end
    subgraph "通信层"
        "EventBus 事件总线"
    end
    "SensorSimulator.ts" --> "DashboardPanel.tsx"
    "DeviceControl.tsx" --> "EventBus 事件总线"
    "EventBus 事件总线" --> "EventLog.tsx"
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite
- 样式：CSS Modules + CSS Variables（深色主题）
- 动画：CSS transitions + keyframes + Web Animations API
- 状态管理：React useState + useEffect（无需全局状态库）
- 通信：自定义EventBus发布/订阅模式
- 初始化工具：Vite
- 测试：Mocha + Chai

## 3. 路由定义

单页应用，无路由切换，所有模块在同一页面展示。

## 4. 数据模型

### 4.1 类型定义

```typescript
interface SensorData {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: number;
}

interface DeviceState {
  id: string;
  name: string;
  status: boolean;
}

interface LogEntry {
  time: string;
  deviceName: string;
  action: '开启' | '关闭';
}
```

### 4.2 传感器配置

| 传感器类型 | 数量 | 数值范围 | 单位 | 最大波动/秒 |
|-----------|------|---------|------|------------|
| 温度 | 2 | 20-35 | °C | 1.5°C |
| 湿度 | 2 | 40-80 | % | 4% |
| 光照 | 2 | 100-1000 | lux | 90lux |
| 振动 | 2 | 0-5 | mm | 0.5mm |

### 4.3 设备配置

| 设备 | 初始状态 |
|------|---------|
| 风扇 | 关闭 |
| 水泵 | 关闭 |
| 灯光 | 关闭 |
| 阀门 | 关闭 |

## 5. 文件结构

```
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── types.ts
    ├── utils/
    │   └── EventBus.ts
    └── modules/
        ├── dashboard/
        │   ├── index.ts
        │   ├── DashboardPanel.tsx
        │   └── SensorSimulator.ts
        ├── control/
        │   ├── index.ts
        │   └── DeviceControl.tsx
        └── log/
            ├── index.ts
            └── EventLog.tsx
```

## 6. EventBus 事件协议

| 事件名 | 数据格式 | 发布者 | 订阅者 |
|--------|---------|--------|--------|
| `device:toggle` | `{ deviceId: string, deviceName: string, action: '开启' \| '关闭' }` | DeviceControl | EventLog |
