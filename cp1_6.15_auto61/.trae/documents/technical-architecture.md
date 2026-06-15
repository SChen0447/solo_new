## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 (React + TypeScript)"
        A["ArenaPage.tsx<br/>竞技场页面"] --> B["MatchmakingService.ts<br/>匹配服务"]
        A --> C["Monaco Editor<br/>代码编辑器"]
        A --> D["Zustand Store<br/>状态管理"]
        E["LoginPage.tsx<br/>登录注册"] --> D
        F["ProfilePage.tsx<br/>个人中心"] --> D
    end

    subgraph "后端 (Express + WebSocket)"
        G["Express Server<br/>REST API"] --> H["MatchEngine.ts<br/>匹配引擎"]
        G --> I["CodeSandbox.ts<br/>代码沙箱"]
        G --> J["AuthService<br/>认证服务"]
        H --> K["等待队列"]
        I --> L["vm2沙箱"]
    end

    subgraph "数据层"
        M["SQLite<br/>用户/对战记录"]
    end

    A -->|"WebSocket"| H
    B -->|"socket.io"| G
    A -->|"REST API"| G
    F -->|"REST API"| G
    G --> M
    I -->|"执行结果"| H
    H -->|"广播结果"| A
```

## 2. 技术说明

- **前端**: React@18 + TypeScript + Zustand + TailwindCSS + Vite
- **初始化工具**: vite-init (react-express-ts模板)
- **后端**: Express@4 + socket.io + vm2
- **数据库**: SQLite (better-sqlite3)，使用mock数据初始化题目库
- **代码编辑器**: @monaco-editor/react
- **动画**: framer-motion
- **图表**: recharts
- **图标**: lucide-react

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| /login | 登录注册页面 |
| /arena | 竞技场主页面（匹配+对战） |
| /profile | 个人中心（历史记录+回放） |

## 4. API定义

### 4.1 认证API

```typescript
interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    nickname: string;
    elo: number;
    rank: "bronze" | "silver" | "gold" | "diamond";
    wins: number;
    losses: number;
  };
}

// POST /api/auth/register
// POST /api/auth/login
```

### 4.2 用户API

```typescript
interface UserProfile {
  id: string;
  nickname: string;
  elo: number;
  rank: "bronze" | "silver" | "gold" | "diamond";
  wins: number;
  losses: number;
  createdAt: string;
}

interface BattleRecord {
  id: string;
  opponentNickname: string;
  opponentRank: string;
  problemTitle: string;
  result: "win" | "loss";
  passedCases: number;
  totalCases: number;
  totalTime: number;
  createdAt: string;
  replay: ReplayEvent[];
}

interface ReplayEvent {
  timestamp: number;
  type: "submit" | "test_result" | "code_sync";
  playerId: string;
  data: {
    passedCases?: number;
    totalTime?: number;
    editRange?: { startLine: number; endLine: number };
  };
}

// GET /api/user/profile
// GET /api/user/battles
// GET /api/user/battles/:id
```

### 4.3 题目API

```typescript
interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  template: string;
  testCases: TestCase[];
}

interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

// GET /api/problems/random
```

### 4.4 WebSocket事件

```typescript
// 客户端→服务端
interface ClientEvents {
  "match:join": {};
  "match:cancel": {};
  "code:sync": { range: { startLine: number; endLine: number } };
  "code:submit": { code: string; language: string };
}

// 服务端→客户端
interface ServerEvents {
  "match:waiting": {};
  "match:found": { opponent: UserProfile; problemId: string };
  "match:countdown": { seconds: number };
  "match:start": { problem: Problem; timeLimit: number };
  "opponent:editing": { range: { startLine: number; endLine: number } };
  "battle:result": { playerId: string; passedCases: number; totalTime: number };
  "battle:end": { winner: string; reason: string; eloChange: number };
  "battle:time": { remaining: number };
}
```

## 5. 服务端架构图

```mermaid
graph LR
    A["Express Router<br/>REST API"] --> B["AuthController"]
    A --> C["UserController"]
    A --> D["ProblemController"]
    B --> E["AuthService<br/>JWT + bcrypt"]
    C --> F["UserService<br/>ELO计算"]
    D --> G["ProblemService<br/>题目管理"]
    E --> H["SQLite Database"]
    F --> H
    G --> H

    I["Socket.IO Server"] --> J["MatchEngine<br/>匹配引擎"]
    I --> K["CodeSandbox<br/>vm2沙箱"]
    J --> L["等待队列"]
    K --> M["测试用例执行"]
    J -->|"匹配成功"| N["房间创建"]
    N --> I
    M -->|"执行结果"| I
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "users" {
        string id PK
        string email UK
        string password_hash
        string nickname
        integer elo "默认1000"
        string rank "bronze/silver/gold/diamond"
        integer wins "默认0"
        integer losses "默认0"
        datetime created_at
    }

    "battles" {
        string id PK
        string problem_id FK
        string player1_id FK
        string player2_id FK
        string winner_id
        integer player1_passed
        integer player2_passed
        integer player1_time
        integer player2_time
        string end_reason
        datetime created_at
    }

    "problems" {
        string id PK
        string title
        string description
        string difficulty
        string template
        string test_cases "JSON"
    }

    "battle_replays" {
        string id PK
        string battle_id FK
        integer timestamp
        string event_type
        string player_id FK
        string event_data "JSON"
    }

    "users" ||--o{ "battles" : "player1_id"
    "users" ||--o{ "battles" : "player2_id"
    "problems" ||--o{ "battles" : "problem_id"
    "battles" ||--o{ "battle_replays" : "battle_id"
```

### 6.2 数据定义语言

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  elo INTEGER DEFAULT 1000,
  rank TEXT DEFAULT 'bronze' CHECK(rank IN ('bronze','silver','gold','diamond')),
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE problems (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT CHECK(difficulty IN ('easy','medium','hard')),
  template TEXT NOT NULL,
  test_cases TEXT NOT NULL
);

CREATE TABLE battles (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES problems(id),
  player1_id TEXT NOT NULL REFERENCES users(id),
  player2_id TEXT NOT NULL REFERENCES users(id),
  winner_id TEXT REFERENCES users(id),
  player1_passed INTEGER DEFAULT 0,
  player2_passed INTEGER DEFAULT 0,
  player1_time INTEGER DEFAULT 0,
  player2_time INTEGER DEFAULT 0,
  end_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE battle_replays (
  id TEXT PRIMARY KEY,
  battle_id TEXT NOT NULL REFERENCES battles(id),
  timestamp INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  player_id TEXT NOT NULL REFERENCES users(id),
  event_data TEXT NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_battles_player1 ON battles(player1_id);
CREATE INDEX idx_battles_player2 ON battles(player2_id);
CREATE INDEX idx_replays_battle ON battle_replays(battle_id);
```
