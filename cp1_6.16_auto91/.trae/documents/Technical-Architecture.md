## 1. 架构设计

```mermaid
flowchart TB
    subgraph "Frontend (React + TypeScript)"
        A["App.tsx<br/>主入口/布局"] --> B["Zustand Store<br/>状态管理"]
        A --> C["组件层"]
        C --> C1["DebatePanel.tsx<br/>辩论面板"]
        C --> C2["VoteChart.tsx<br/>投票柱状图"]
        C --> C3["Sidebar.tsx<br/>历史侧边栏"]
        C --> C4["CopyCard.tsx<br/>文案卡片"]
        C --> C5["CommentBubble.tsx<br/>评论气泡"]
        D["framer-motion<br/>动画编排"]
    end

    subgraph "Backend (Node.js + Express)"
        E["server/index.ts<br/>Express入口"] --> F["server/routes.ts<br/>路由层"]
        F --> G["业务逻辑"]
        G --> G1["文案生成器<br/>(10种模板)"]
        G --> G2["投票统计"]
        G --> G3["历史记录管理"]
        H["data/data.json<br/>JSON文件存储"]
    end

    B <-->|HTTP API| F
    G <-->|读写| H
```

## 2. 技术描述

- **前端**：React@18 + TypeScript + Vite@5 + Zustand@4 + framer-motion@11
- **构建工具**：Vite@5，配置代理转发/api请求到后端3001端口
- **后端**：Express@4 + TypeScript + ts-node
- **数据存储**：本地JSON文件（server/data/data.json）
- **状态管理**：Zustand，集中管理文案、评论、投票、历史记录等状态
- **动画方案**：framer-motion，实现所有交互动效和入场动画
- **代码规范**：TypeScript严格模式，target ES2020

## 3. 目录结构

```
project-root/
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── store/
│   │   └── useStore.ts
│   ├── types/
│   │   └── index.ts
│   ├── components/
│   │   ├── DebatePanel.tsx
│   │   ├── VoteChart.tsx
│   │   ├── Sidebar.tsx
│   │   ├── CopyCard.tsx
│   │   ├── CommentBubble.tsx
│   │   ├── VoteButton.tsx
│   │   └── CountdownTimer.tsx
│   └── api/
│       └── fetchAPI.ts
└── server/
    ├── index.ts
    ├── routes.ts
    ├── copyTemplates.ts
    └── data/
        └── data.json
```

## 4. API 定义

### 类型定义
```typescript
interface CopyItem {
  id: string;
  content: string;
  style: string;
  styleLabel: string;
  comments: Comment[];
  votes: number;
}

interface Comment {
  id: string;
  content: string;
  timestamp: number;
  authorColor: string;
  animalIcon?: string;
  likes: number;
}

interface DebateSession {
  id: string;
  productName: string;
  targetAudience: string;
  keySellingPoints: string;
  copies: CopyItem[];
  round: number; // 0: 生成, 1: 第一轮辩论, 2: 第二轮辩论, 3: 投票, 4: 完成
  topCopiesForRound2: string[]; // 第二轮的文案ID
  votes: Record<string, number>;
  createdAt: number;
  completedAt?: number;
  finalRankings: RankingItem[];
}

interface RankingItem {
  copyId: string;
  content: string;
  votes: number;
  percentage: number;
}
```

### API 接口

| 方法 | 路径 | 请求参数 | 响应 | 说明 |
|------|------|----------|------|------|
| POST | `/api/generate` | `{ productName, targetAudience, keySellingPoints }` | `{ sessionId, copies: CopyItem[] }` | 生成4条备选文案 |
| POST | `/api/comment` | `{ sessionId, copyId, content }` | `{ comment: Comment }` | 提交第一轮评论 |
| POST | `/api/like` | `{ sessionId, copyId, commentId }` | `{ likes: number }` | 第二轮评论点赞 |
| POST | `/api/vote` | `{ sessionId, copyId }` | `{ success: boolean }` | 提交投票 |
| GET | `/api/round2/:sessionId` | - | `{ topCopies: CopyItem[] }` | 获取第二轮待辩论文案 |
| POST | `/api/finish/:sessionId` | - | `{ rankings: RankingItem[] }` | 结束投票，计算排名 |
| GET | `/api/history` | - | `{ sessions: DebateSession[] }` | 获取历史记录列表 |
| GET | `/api/history/:id` | - | `{ session: DebateSession }` | 获取单条历史详情 |

## 5. 服务器架构

```mermaid
flowchart LR
    A["Express App<br/>(server/index.ts)"] --> B["CORS 中间件"]
    B --> C["JSON 解析中间件"]
    C --> D["路由层<br/>(server/routes.ts)"]
    
    D --> E["POST /api/generate"]
    D --> F["POST /api/comment"]
    D --> G["POST /api/like"]
    D --> H["POST /api/vote"]
    D --> I["GET /api/history"]
    D --> J["GET /api/history/:id"]
    
    E --> K["文案生成器<br/>(copyTemplates.ts)"]
    F --> L["评论管理"]
    G --> M["点赞统计"]
    H --> N["投票管理"]
    I --> O["历史查询"]
    J --> O
    
    K --> P["JSON文件存储<br/>(data/data.json)"]
    L --> P
    M --> P
    N --> P
    O --> P
```

## 6. 数据模型

### 6.1 数据结构定义

```mermaid
erDiagram
    DEBATE_SESSION ||--o{ COPY_ITEM : contains
    COPY_ITEM ||--o{ COMMENT : has
    DEBATE_SESSION ||--o{ RANKING_ITEM : produces

    DEBATE_SESSION {
        string id PK
        string productName
        string targetAudience
        string keySellingPoints
        number round
        string[] topCopiesForRound2
        string createdAt
        string completedAt
    }

    COPY_ITEM {
        string id PK
        string sessionId FK
        string content
        string style
        string styleLabel
        number votes
    }

    COMMENT {
        string id PK
        string copyId FK
        string content
        number timestamp
        string authorColor
        string animalIcon
        number likes
    }

    RANKING_ITEM {
        string id PK
        string sessionId FK
        string copyId FK
        string content
        number votes
        number percentage
    }
```

### 6.2 data.json 初始结构
```json
{
  "sessions": []
}
```

## 7. 前端状态管理（Zustand Store）

```typescript
interface AppState {
  // 当前辩论会话
  currentSession: DebateSession | null;
  // 历史记录
  history: DebateSession[];
  // UI状态
  sidebarOpen: boolean;
  currentRound: number;
  votingTimeLeft: number;
  hasVoted: boolean;
  isReplaying: boolean;
  replaySpeed: number;
  
  // Actions
  generateCopy: (params: GenerateParams) => Promise<void>;
  submitComment: (copyId: string, content: string) => Promise<void>;
  submitLike: (copyId: string, commentId: string) => Promise<void>;
  submitVote: (copyId: string) => Promise<void>;
  proceedToRound2: () => void;
  startVoting: () => void;
  finishVoting: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  loadHistory: (id: string) => Promise<void>;
  toggleSidebar: () => void;
  startReplay: (session: DebateSession) => void;
  stopReplay: () => void;
}
```

## 8. 性能要求

- **文案生成响应**：≤500ms（模拟数据延迟控制）
- **柱状图动画帧率**：≥30fps（使用CSS transform和opacity实现）
- **动画性能**：优先使用transform和opacity属性，避免布局抖动
- **内存管理**：历史记录加载时按需渲染，避免一次性渲染大量DOM
