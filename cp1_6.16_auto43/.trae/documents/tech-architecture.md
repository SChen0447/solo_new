## 1. 架构设计

```mermaid
flowchart TB
    subgraph Frontend["前端 (React + TypeScript + Vite)"]
        A["App.tsx 路由层"] --> B["ExamPage.tsx 答题页"]
        A --> C["ReportPage.tsx 报告页"]
    end

    subgraph Backend["后端 (Node.js + Express)"]
        D["server.js 入口"] --> E["examModule.js 组卷模块"]
        D --> F["reportModule.js 报告模块"]
        G["题库数据 (内存)"]
    end

    B -- "POST /api/generate-paper" --> D
    B -- "POST /api/submit-answers" --> D
    C -- "GET /api/report/:examId" --> D
    E --> G
    F --> G
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite + Recharts + react-hot-toast + axios + react-router-dom
- 初始化工具：vite-init（react-express-ts 模板）
- 后端：Express@4 + cors + uuid
- 数据库：无数据库，使用内存数据结构 + 题库JSON，模拟班级数据

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 组卷页面，管理员选择参数并生成试卷 |
| /exam/:paperId | 答题页面，考生逐题作答并提交 |
| /report/:examId | 成绩报告页面，展示可视化分析 |

## 4. API定义

### 4.1 POST /api/generate-paper

请求：
```typescript
interface GeneratePaperRequest {
  difficulty: "easy" | "medium" | "hard";
  questionCount: number; // 10-20
}
```

响应：
```typescript
interface Question {
  id: string;
  type: "choice" | "judge";
  difficulty: "easy" | "medium" | "hard";
  knowledgePoint: string;
  content: string;
  options?: string[]; // 选择题选项
  answer: string | boolean; // 选择题为选项字母，判断题为true/false
}

interface GeneratePaperResponse {
  paperId: string;
  questions: Question[];
}
```

### 4.2 POST /api/submit-answers

请求：
```typescript
interface SubmitAnswersRequest {
  paperId: string;
  answers: Record<string, string | boolean>; // questionId -> answer
  timeUsed: number; // 秒
}
```

响应：
```typescript
interface SubmitAnswersResponse {
  examId: string;
  score: number;
  totalQuestions: number;
  results: Array<{
    questionId: string;
    correct: boolean;
    userAnswer: string | boolean;
    correctAnswer: string | boolean;
  }>;
}
```

### 4.3 GET /api/report/:examId

响应：
```typescript
interface ReportResponse {
  examId: string;
  score: number;
  totalQuestions: number;
  timeUsed: number;
  classAverage: number;
  scoreDistribution: {
    range: string; // "90-100", "80-89", "70-79", "60-69", "0-59"
    count: number;
  }[];
  knowledgeMastery: {
    knowledgePoint: string;
    mastery: number; // 百分比 0-100
  }[];
}
```

## 5. 服务端架构图

```mermaid
flowchart LR
    A["server.js 路由层"] --> B["examModule.js"]
    A --> C["reportModule.js"]
    B --> D["题库数据"]
    C --> D
    B --> E["随机抽取算法"]
    C --> F["批改与统计算法"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    Question {
        string id PK
        string type
        string difficulty
        string knowledgePoint
        string content
        array options
        string answer
    }
    Paper {
        string paperId PK
        string difficulty
        number questionCount
        array questionIds
    }
    ExamResult {
        string examId PK
        string paperId FK
        number score
        number timeUsed
        object answers
        object results
    }
    Paper ||--o{ Question : contains
    ExamResult ||--|| Paper : references
```

### 6.2 数据定义

使用内存数据结构存储：
- `questionBank`：30+道题目数组，包含选择题和判断题，每题标记难度和知识点
- `papers`：生成的试卷Map，paperId -> Paper
- `examResults`：考试结果Map，examId -> ExamResult
- 班级模拟数据：20名同学的随机成绩，用于统计平均分和分数段分布
