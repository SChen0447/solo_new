## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 (React + Vite)"
        A[App.tsx 路由与全局状态] --> B[Questionnaire.tsx 问卷组件]
        A --> C[PetSimulator.tsx 模拟组件]
        C --> D[simulationEngine.ts 模拟引擎]
        C --> E[TaskCard.tsx 任务卡片]
        C --> F[CalendarView.tsx 日历视图]
        C --> G[ReportExport.tsx 报告导出]
        A --> H[zustand 状态管理]
    end

    subgraph "后端 (Express)"
        I[server.ts 主服务] --> J[问卷提交API]
        I --> K[宠物数据API]
        I --> L[任务生成API]
        I --> M[WebSocket广播]
        I --> N[报告生成API]
    end

    subgraph "数据层"
        O[内存数据存储]
    end

    B -->|POST /api/questionnaire| J
    C -->|GET /api/pet/:id| K
    C -->|GET /api/tasks/:petId| L
    C -->|WebSocket /ws| M
    G -->|GET /api/report/:petId| N
    J --> O
    K --> O
    L --> O
    M -->|状态变更推送| D
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite + TailwindCSS + zustand + react-router-dom + axios + date-fns
- 初始化工具：vite-init（react-express-ts模板）
- 后端：Express@4 + cors + uuid + body-parser + ws（WebSocket）
- 数据库：内存数据存储（Map结构），无外部数据库依赖
- PDF生成：前端使用Canvas绘制图表+jsPDF生成PDF

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 问卷页面，用户选择宠物种类并填写问卷 |
| /simulate | 模拟页面，展示虚拟宠物状态、任务推送、日历视图 |

## 4. API定义

### 4.1 TypeScript类型定义

```typescript
type PetType = 'cat' | 'dog';

interface QuestionnaireData {
  petType: PetType;
  livingSpace: number;
  awayHours: number;
  hasOtherPets: boolean;
  exerciseFrequency: 'low' | 'medium' | 'high';
  dailySchedule: number;
  petExperience: 'none' | 'some' | 'experienced';
}

interface PetState {
  hunger: number;
  energy: number;
  social: number;
  hygiene: number;
}

interface Task {
  id: string;
  petId: string;
  name: string;
  icon: string;
  duration: number;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

interface Pet {
  id: string;
  type: PetType;
  name: string;
  questionnaire: QuestionnaireData;
  state: PetState;
  createdAt: string;
}
```

### 4.2 API端点

| 方法 | 路径 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| POST | /api/questionnaire | QuestionnaireData | { petId: string } | 提交问卷并生成宠物 |
| GET | /api/pet/:id | - | Pet | 获取宠物数据 |
| GET | /api/pet/:id/state | - | PetState | 获取宠物当前状态 |
| GET | /api/tasks/:petId | - | Task[] | 获取宠物任务列表 |
| PUT | /api/tasks/:taskId/complete | - | Task | 完成任务 |
| GET | /api/report/:petId | - | { pdfUrl: string } | 生成评估报告 |
| GET | /api/history/:petId/:date | - | Task[] | 获取指定日期历史任务 |

### 4.3 WebSocket消息格式

```typescript
interface WSMessage {
  type: 'state_update' | 'task_new' | 'task_complete';
  payload: PetState | Task;
}
```

## 5. 服务器架构图

```mermaid
graph LR
    A[Express Router] --> B[问卷Controller]
    A --> C[宠物Controller]
    A --> D[任务Controller]
    A --> E[报告Controller]
    B --> F[宠物Service]
    C --> F
    D --> G[任务Service]
    E --> F
    E --> G
    F --> H[内存数据Store]
    G --> H
    A --> I[WebSocket Manager]
    I -->|定时推送| J[状态模拟定时器]
    I -->|任务推送| K[任务生成定时器]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    Pet ||--o{ Task : "has"
    Pet ||--|| QuestionnaireData : "has"
    Pet ||--|| PetState : "has"

    Pet {
        string id PK
        string type
        string name
        string createdAt
    }

    QuestionnaireData {
        string petType
        number livingSpace
        number awayHours
        boolean hasOtherPets
        string exerciseFrequency
        number dailySchedule
        string petExperience
    }

    PetState {
        number hunger
        number energy
        number social
        number hygiene
    }

    Task {
        string id PK
        string petId FK
        string name
        string icon
        number duration
        boolean completed
        string completedAt
        string createdAt
    }
```

### 6.2 数据流向

1. 前端问卷提交 → POST /api/questionnaire → 后端生成Pet+初始PetState+初始Tasks → 返回petId
2. 前端进入模拟页面 → GET /api/pet/:id + GET /api/tasks/:petId → 建立WebSocket连接
3. 后端定时器每5分钟更新PetState → WebSocket广播state_update → 前端simulationEngine接收并驱动动画
4. 后端每日生成4-6个Task → WebSocket广播task_new → 前端更新任务列表
5. 用户点击完成任务 → PUT /api/tasks/:taskId/complete → 后端更新Task → WebSocket广播task_complete
6. 用户导出报告 → GET /api/report/:petId → 后端聚合数据 → 前端生成PDF下载
