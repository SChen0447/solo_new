## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 React"
        A["AuctionList 拍卖列表"] --> B["Zustand 状态管理"]
        C["AuctionDetail 拍卖详情"] --> B
        D["Auth 认证页面"] --> B
        E["Profile 个人中心"] --> B
        B --> F["Axios HTTP客户端"]
        B --> G["Socket.IO Client"]
    end

    subgraph "后端 Express"
        H["Express REST API"] --> I["拍卖引擎 AuctionEngine"]
        H --> J["用户管理"]
        I --> K["内存数据存储"]
        H --> K
        L["WebSocket Server"] --> I
        L --> M["广播出价更新"]
    end

    F -->|"HTTP REST"| H
    G -->|"WebSocket"| L
```

## 2. 技术说明
- **前端**：React@18 + TypeScript + TailwindCSS@3 + Vite
- **初始化工具**：vite-init (react-express-ts 模板)
- **状态管理**：Zustand
- **HTTP客户端**：Axios
- **后端**：Express@4 + TypeScript
- **实时通信**：ws (WebSocket) + socket.io-client
- **唯一ID生成**：uuid
- **数据库**：内存数据存储（Map结构），模拟数据库

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 拍卖列表首页 |
| /auction/:id | 拍卖详情页 |
| /login | 用户登录 |
| /register | 用户注册 |
| /profile | 个人中心（历史记录+兑换券） |

## 4. API定义

### 4.1 用户相关
```typescript
POST /api/auth/register
Request: { email: string; username: string; password: string }
Response: { user: User; token: string }

POST /api/auth/login
Request: { email: string; password: string }
Response: { user: User; token: string }

GET /api/users/me
Headers: { Authorization: string }
Response: User

GET /api/users/me/bids
Headers: { Authorization: string }
Response: Bid[]

GET /api/users/me/vouchers
Headers: { Authorization: string }
Response: Voucher[]
```

### 4.2 拍卖相关
```typescript
GET /api/auctions
Response: Auction[]

GET /api/auctions/:id
Response: AuctionDetail

POST /api/auctions/:id/bids
Headers: { Authorization: string }
Request: { amount: number }
Response: Bid
```

### 4.3 数据类型定义
```typescript
interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

interface Coffee {
  id: string;
  name: string;
  roastLevel: "light" | "medium" | "dark";
  description: string;
  imageUrl?: string;
}

interface Auction {
  id: string;
  coffee: Coffee;
  startingPrice: number;
  currentPrice: number;
  currentBidder?: string;
  startTime: string;
  endTime: string;
  status: "upcoming" | "active" | "ended";
  bidCount: number;
}

interface AuctionDetail extends Auction {
  bids: Bid[];
}

interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  username: string;
  amount: number;
  createdAt: string;
}

interface Voucher {
  id: string;
  code: string;
  auctionId: string;
  coffeeName: string;
  userId: string;
  createdAt: string;
}
```

## 5. 服务端架构图

```mermaid
graph LR
    A["Express Router"] --> B["Auth Controller"]
    A --> C["Auction Controller"]
    B --> D["User Service"]
    C --> E["Auction Service"]
    E --> F["AuctionEngine"]
    F --> G["Timer / 出价验证"]
    D --> H["内存数据存储"]
    E --> H
    E --> I["WebSocket Broadcast"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    User ||--o{ Bid : "places"
    User ||--o{ Voucher : "receives"
    Auction ||--o{ Bid : "has"
    Auction }o--|| Coffee : "features"
    Auction ||--o| Voucher : "generates"

    User {
        string id PK
        string email
        string username
        string password
        string createdAt
    }

    Coffee {
        string id PK
        string name
        string roastLevel
        string description
    }

    Auction {
        string id PK
        string coffeeId FK
        number startingPrice
        number currentPrice
        string currentBidderId FK
        string startTime
        string endTime
        string status
    }

    Bid {
        string id PK
        string auctionId FK
        string userId FK
        number amount
        string createdAt
    }

    Voucher {
        string id PK
        string code
        string auctionId FK
        string userId FK
        string createdAt
    }
```

### 6.2 WebSocket消息协议

```typescript
// 客户端发送
interface ClientMessage {
  type: "place_bid";
  payload: { auctionId: string; amount: number; userId: string };
}

// 服务端广播
interface ServerMessage {
  type: "bid_update" | "auction_ended" | "auction_started";
  payload: {
    auctionId: string;
    currentPrice?: number;
    currentBidder?: string;
    bid?: Bid;
    winner?: string;
    voucherCode?: string;
  };
}
```
