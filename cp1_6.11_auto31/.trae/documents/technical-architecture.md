## 1. 架构设计

```mermaid
flowchart TD
    "前端 React 应用" --> "App.tsx (状态管理)"
    "App.tsx" --> "Toolbar.tsx (工具栏)"
    "App.tsx" --> "EditorPanel.tsx (代码编辑)"
    "App.tsx" --> "PreviewFrame.tsx (实时预览)"
    "EditorPanel.tsx" --> "CodeMirror 编辑器"
    "PreviewFrame.tsx" --> "iframe 沙箱"
    "App.tsx" --> "localStorage (历史记录)"
    "iframe 沙箱" --> "postMessage (错误捕获)"
```

## 2. 技术选型
- 前端：React 18 + TypeScript + Vite
- 初始化工具：vite-init（react-ts 模板）
- 代码编辑器：CodeMirror 6（@codemirror/view, @codemirror/state, @codemirror/lang-html, @codemirror/lang-css, @codemirror/lang-javascript, @codemirror/theme-one-dark, react-codemirror）
- 状态管理：React useState + useRef（无需全局状态库）
- 数据持久化：localStorage
- 样式方案：CSS Modules / 内联样式
- 后端：无
- 数据库：无

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 编辑器主页面（单页应用，无路由切换） |

## 4. 文件组织

```
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
├── src/
│   ├── main.tsx          # React 入口
│   ├── App.tsx           # 顶层组件，状态管理
│   ├── App.css           # 全局样式
│   ├── PreviewFrame.tsx  # iframe 预览组件
│   ├── EditorPanel.tsx   # 代码编辑器组件
│   └── Toolbar.tsx       # 工具栏组件
```

## 5. 核心数据结构

### 5.1 编辑器状态
```typescript
interface EditorState {
  html: string;
  css: string;
  javascript: string;
  activeTab: 'html' | 'css' | 'javascript';
  error: ErrorInfo | null;
  isFullscreen: boolean;
}

interface ErrorInfo {
  message: string;
  line: number;
  column?: number;
}

interface HistoryEntry {
  id: string;
  html: string;
  css: string;
  javascript: string;
  timestamp: number;
}
```

### 5.2 localStorage 存储
- 键名：`codesandbox-mini-history`
- 最多保存 5 条记录
- 每次代码变更防抖后保存
- 读取延迟 < 50ms

## 6. 性能要求
- 代码变更到预览刷新总延迟 ≤ 500ms（含 300ms 防抖 + 渲染时间）
- 历史记录读取 < 50ms
- iframe 内容拼接使用 Blob URL 或 srcdoc
- CodeMirror 实例按需创建，标签切换时不销毁

## 7. 关键实现细节

### 7.1 防抖预览刷新
- 使用 setTimeout 实现 300ms 防抖
- 每次代码变更重置计时器
- 手动点击运行时立即刷新（跳过防抖）

### 7.2 iframe 错误捕获
- 在 iframe 内注入 try-catch 包装
- 使用 window.onerror + postMessage 传递错误
- 父组件监听 message 事件解析错误信息

### 7.3 全屏预览
- 使用 CSS 全屏覆盖编辑区
- 监听 Escape 键退出全屏
- 过渡动画平滑切换

### 7.4 导出功能
- 将 HTML + CSS + JS 合并为完整 HTML 文件
- 使用 Blob + URL.createObjectURL + <a> 下载

### 7.5 可拖拽分隔条
- 监听 mousedown/mousemove/mouseup 事件
- 设置最小宽度限制（编辑区 ≥ 300px，预览区 ≥ 300px）
- 拖拽时 0.1s 弹性缓动过渡
