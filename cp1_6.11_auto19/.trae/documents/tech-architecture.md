## 1. 架构设计

```mermaid
flowchart TB
    subgraph 前端["前端 (React + TypeScript + Vite)"]
        A["App.tsx - Socket连接与状态管理"]
        B["QuestionWall.tsx - 问题墙组件"]
        C["CSS样式与动画"]
    end

    subgraph 后端["后端 (Node.js + Express + Socket.IO)"]
        D["server/index.ts - 服务器入口"]
        E["Socket.IO事件处理"]
        F["问题列表内存管理"]
    end

    A -->|"socket.io-client连接"| D
    B -->|"用户操作事件"| A
    A -->|"渲染问题列表"| B
    E -->|"增量广播变更"| A
    F -->|"读写问题数据"| E
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite + Socket.IO Client
- 初始化工具：vite-init (react-express-ts模板)
- 后端：Express@4 + Socket.IO
- 数据库：无（内存数据存储）
- 状态管理：React useState + Socket.IO实时同步
- 样式：CSS Modules / 内联样式

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 问答墙主页面 |

## 4. API定义（Socket.IO事件）

### 4.1 客户端 → 服务器事件

```typescript
interface QuestionSubmitPayload {
  content: string;
}

interface QuestionAnswerPayload {
  questionId: string;
}

interface QuestionLikePayload {
  questionId: string;
  studentId: string;
}
```

### 4.2 服务器 → 客户端事件

```typescript
interface Question {
  id: string;
  content: string;
  timestamp: number;
  avatarSeed: string;
  answered: boolean;
  likes: number;
  likedBy: string[];
}

interface QuestionsInitPayload {
  questions: Question[];
}

interface QuestionNewPayload {
  question: Question;
}

interface QuestionAnsweredPayload {
  questionId: string;
}

interface QuestionLikedPayload {
  questionId: string;
  likes: number;
  likedBy: string[];
}
```

### 4.3 事件列表

| 事件名 | 方向 | 载荷 | 说明 |
|--------|------|------|------|
| questions:init | 服务器→客户端 | QuestionsInitPayload | 新连接时发送完整问题列表 |
| question:submit | 客户端→服务器 | QuestionSubmitPayload | 学生提交问题 |
| question:new | 服务器→客户端 | QuestionNewPayload | 广播新问题（增量） |
| question:answer | 客户端→服务器 | QuestionAnswerPayload | 教师标注已回答 |
| question:answered | 服务器→客户端 | QuestionAnsweredPayload | 广播已回答状态变更（增量） |
| question:like | 客户端→服务器 | QuestionLikePayload | 学生点赞 |
| question:liked | 服务器→客户端 | QuestionLikedPayload | 广播点赞变更（增量） |

## 5. 服务器架构

```mermaid
flowchart LR
    A["Socket.IO事件监听"] --> B["问题数据管理"]
    B --> C["内存问题列表"]
    A -->|"connection"| D["发送初始问题列表"]
    A -->|"question:submit"| E["创建问题并广播"]
    A -->|"question:answer"| F["更新状态并广播"]
    A -->|"question:like"| G["校验并更新点赞"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    Question {
        string id PK
        string content
        number timestamp
        string avatarSeed
        boolean answered
        number likes
    }
    Question ||--o{ LikeRecord : "likedBy"
    LikeRecord {
        string studentId
    }
```

### 6.2 数据流向

1. **问题提交**：客户端 → `question:submit` → 服务器生成Question对象 → 广播 `question:new`（单条数据，<2KB）
2. **已回答标注**：客户端 → `question:answer` → 服务器更新answered字段 → 广播 `question:answered`（仅ID，<100B）
3. **点赞**：客户端 → `question:like` → 服务器校验+更新likes/likedBy → 广播 `question:liked`（ID+计数，<500B）
4. **初始同步**：客户端连接 → 服务器发送 `questions:init`（全量列表）
