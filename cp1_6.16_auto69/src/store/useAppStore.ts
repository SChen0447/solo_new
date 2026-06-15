import { create } from 'zustand';
import type { AppState, CodeBlock, ApiEndpoint } from '@/types';

const initialContent = `# API 文档示例

欢迎使用技术文档管理工具！

## 功能介绍

本文档工具支持以下功能：

### 1. Markdown 编辑器

左侧为 Markdown 编辑器，支持实时预览。工具栏提供常用的格式化按钮。

### 2. 代码示例嵌入

你可以插入可运行的代码示例：

\`\`\`javascript filename:hello.js
console.log('Hello, World!');
const sum = (a, b) => a + b;
console.log('2 + 3 =', sum(2, 3));
\`\`\`

### 3. API 参考

导入 OpenAPI 规范后，右侧会显示 API 端点列表。

## 快速开始

1. 在左侧编辑文档
2. 点击工具栏按钮插入代码块
3. 导入 OpenAPI 规范以生成 API 参考
4. 导出为 PDF 或 Markdown 格式
`;

export const useAppStore = create<AppState>((set) => ({
  documentContent: initialContent,
  documentTitle: '未命名文档',
  splitRatio: 0.5,
  isFullscreen: false,
  showExportDialog: false,
  apiEndpoints: [],
  highlightedLine: null,
  codeBlocks: {},

  setDocumentContent: (content: string) =>
    set({ documentContent: content }),

  setDocumentTitle: (title: string) =>
    set({ documentTitle: title }),

  setSplitRatio: (ratio: number) =>
    set({ splitRatio: ratio }),

  setIsFullscreen: (isFullscreen: boolean) =>
    set({ isFullscreen }),

  setShowExportDialog: (show: boolean) =>
    set({ showExportDialog: show }),

  setApiEndpoints: (endpoints: ApiEndpoint[]) =>
    set({ apiEndpoints: endpoints }),

  setHighlightedLine: (line: number | null) =>
    set({ highlightedLine: line }),

  updateCodeBlock: (id: string, updates: Partial<CodeBlock>) =>
    set((state) => ({
      codeBlocks: {
        ...state.codeBlocks,
        [id]: { ...state.codeBlocks[id], ...updates },
      },
    })),

  addCodeBlock: (block: CodeBlock) =>
    set((state) => ({
      codeBlocks: {
        ...state.codeBlocks,
        [block.id]: block,
      },
    })),
}));
