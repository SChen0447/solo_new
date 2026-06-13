## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端 (React + Vite)"
        "ResumeForm" --> "ResumeContext"
        "SortableSection" --> "ResumeContext"
        "ResumePreview" --> "ResumeContext"
        "exportPdf" --> "后端API"
    end
    subgraph "后端 (Express)"
        "API路由 /api/generate-pdf" --> "PDF生成服务"
    end
    "前端" -->|"HTTP POST"| "后端"
    "后端" -->|"PDF Buffer"| "前端"
```

## 2. 技术说明
- 前端：React@18 + TypeScript + Vite + Tailwind CSS
- 初始化工具：vite-init (react-express-ts 模板)
- 后端：Express@4 + TypeScript (ESM格式)
- 状态管理：React Context（用户指定，非Zustand）
- 拖拽库：react-dnd + react-dnd-html5-backend
- PDF生成：后端使用puppeteer或html-pdf，前端调用后端API
- 文件保存：file-saver

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 简历编辑主页面（表单+预览+导出） |

## 4. API定义

### POST /api/generate-pdf
请求体：
```typescript
interface GeneratePdfRequest {
  resumeData: ResumeData;
  templateId: 'minimal-white' | 'modern-blue' | 'business-gray';
  sectionOrder: SectionType[];
}
```

响应：PDF文件流（application/pdf）

### 数据类型定义
```typescript
type SectionType = 'personalInfo' | 'education' | 'workExperience';

interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Education {
  id: string;
  school: string;
  major: string;
  period: string;
  description: string;
}

interface WorkExperience {
  id: string;
  company: string;
  position: string;
  period: string;
  description: string;
}

interface ResumeData {
  personalInfo: PersonalInfo;
  education: Education[];
  workExperience: WorkExperience[];
}

interface ResumeState {
  resumeData: ResumeData;
  sectionOrder: SectionType[];
  templateId: 'minimal-white' | 'modern-blue' | 'business-gray';
  isExporting: boolean;
  exportSuccess: boolean;
}
```

## 5. 服务端架构图

```mermaid
flowchart LR
    "Controller" --> "Service"
    "Service" --> "PDF Generator"
    "PDF Generator" --> "HTML Template Engine"
```

## 6. 文件结构
```
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── ResumeForm.tsx
│   │   ├── SortableSection.tsx
│   │   └── ResumePreview.tsx
│   ├── context/
│   │   └── ResumeContext.ts
│   └── utils/
│       └── exportPdf.ts
├── api/
│   └── server.ts
```
