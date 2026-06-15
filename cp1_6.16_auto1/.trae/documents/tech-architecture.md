## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "App.tsx 主组件"
        "ColorExtractor 模块"
        "ColorAlgorithm 模块"
        "ColorPalette 组件"
        "ThemePreview 组件"
        "Toast 组件"
    end
    subgraph "状态层"
        "Zustand Store"
    end
    "App.tsx 主组件" --> "ColorExtractor 模块"
    "App.tsx 主组件" --> "ColorPalette 组件"
    "App.tsx 主组件" --> "ThemePreview 组件"
    "ColorExtractor 模块" --> "Zustand Store"
    "ColorAlgorithm 模块" --> "Zustand Store"
    "Zustand Store" --> "ColorPalette 组件"
    "Zustand Store" --> "ThemePreview 组件"
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite + Tailwind CSS
- 初始化工具：vite-init（react-ts模板）
- 状态管理：Zustand
- 颜色提取：ColorThief
- 颜色选择器：react-colorful
- 后端：无
- 数据库：无

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面，包含所有功能模块 |

## 4. 数据流设计

### 4.1 文件结构与调用关系

```
src/
├── App.tsx              # 主组件：布局组装和模块调度
├── colorExtractor.ts    # 图片解析与颜色提取模块
├── colorAlgorithm.ts    # 配色算法计算模块
├── store.ts             # Zustand状态管理
├── ColorPalette.tsx     # 颜色面板展示组件
├── ThemePreview.tsx     # UI主题预览组件
├── Toast.tsx            # Toast通知组件
└── index.tsx            # 入口文件
```

### 4.2 数据流向

1. **图片上传流**：用户上传图片 → App.tsx接收 → 传递给colorExtractor.ts → 提取8个颜色 → 写入Zustand Store
2. **主题计算流**：Zustand Store颜色变化 → colorAlgorithm.ts计算 → 生成Theme对象 → 写入Zustand Store
3. **UI渲染流**：Zustand Store Theme变化 → ColorPalette读取并渲染色块 → ThemePreview读取并渲染预览
4. **交互流**：用户点击色块 → navigator.clipboard复制 → Toast组件显示通知
5. **调整流**：用户通过react-colorful调整色值 → 重新触发colorAlgorithm计算 → Store更新 → UI实时刷新

### 4.3 Zustand Store数据结构

```typescript
interface ColorStore {
  extractedColors: string[];     // 8个提取的Hex颜色
  theme: ThemeObject;            // 计算出的主题对象
  isExtracting: boolean;         // 是否正在提取
  progress: number;              // 进度0-100
  mode: 'light' | 'dark';       // 当前模式
  thumbnailUrl: string | null;   // 缩略图URL
  setExtractedColors: (colors: string[]) => void;
  setTheme: (theme: ThemeObject) => void;
  setIsExtracting: (val: boolean) => void;
  setProgress: (val: number) => void;
  setMode: (mode: 'light' | 'dark') => void;
  setThumbnailUrl: (url: string | null) => void;
  updateThemeColor: (key: string, color: string) => void;
}

interface ThemeObject {
  light: string;      // 浅色（背景色）
  dark: string;       // 深色（文字色）
  accent1: string;    // 强调色1（按钮色）
  accent2: string;    // 强调色2（边框色）
  accent3: string;    // 强调色3（高亮色）
}
```
