import { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@/components/Editor';
import PreviewPanel from '@/components/PreviewPanel';
import Toolbar from '@/components/Toolbar';
import { useTheme } from '@/hooks/useTheme';
import { useMarkdownRender } from '@/hooks/useMarkdownRender';

const DEFAULT_CONTENT = `# Markdown 编辑器

欢迎使用在线 Markdown 编辑器！左侧编写，右侧实时预览。

## 功能特性

- **实时渲染**：输入即预览，所见即所得
- **双栏布局**：可拖拽调整比例，可折叠单侧
- **导出功能**：导出 .md 文件或复制 HTML
- **暗色主题**：一键切换明暗主题

## 代码示例

\`\`\`typescript
interface MarkdownEditor {
  content: string;
  theme: 'light' | 'dark';
  onChange: (value: string) => void;
}

function createEditor(config: MarkdownEditor) {
  console.log('Editor created!', config);
}
\`\`\`

## 表格支持

| 功能 | 状态 | 说明 |
|------|------|------|
| 标题渲染 | ✅ | 支持 H1-H6 |
| 代码高亮 | ✅ | 支持多语言 |
| 表格渲染 | ✅ | GFM 语法 |
| 图片显示 | ✅ | 懒加载 |

## 任务列表

- [x] 实时渲染
- [x] 暗色主题
- [ ] 协同编辑
- [ ] 云端同步

> 提示：拖拽中间分隔条可调整编辑区与预览区的宽度比例。
`;

const SPLIT_KEY = 'md-editor-split';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const { debouncedContent, isRendering } = useMarkdownRender(content);

  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [splitRatio, setSplitRatio] = useState(() => {
    const saved = localStorage.getItem(SPLIT_KEY);
    return saved ? parseFloat(saved) : 0.5;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const currentRatioRef = useRef(splitRatio);

  useEffect(() => {
    currentRatioRef.current = splitRatio;
  }, [splitRatio]);

  const MIN_WIDTH_PX = 200;

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const totalWidth = rect.width;
    const minRatio = MIN_WIDTH_PX / totalWidth;
    const maxRatio = 1 - minRatio;
    const ratio = (e.clientX - rect.left) / totalWidth;
    const clamped = Math.min(maxRatio, Math.max(minRatio, ratio));
    setSplitRatio(clamped);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem(SPLIT_KEY, currentRatioRef.current.toString());
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const editorWidth = editorCollapsed ? '0px' : previewCollapsed ? '100%' : `${splitRatio * 100}%`;
  const previewWidth = previewCollapsed ? '0px' : editorCollapsed ? '100%' : `${(1 - splitRatio) * 100}%`;

  return (
    <div className="app-container" data-theme={theme}>
      <div className="app-header">
        <h1 className="app-title">
          <span className="app-title-icon">M</span>
          Markdown Editor
        </h1>
        {isRendering && <span className="render-indicator">渲染中...</span>}
      </div>

      <div className="editor-layout" ref={containerRef}>
        <div className="editor-section" style={{ width: editorWidth, flexShrink: 0 }}>
          <Editor
            content={content}
            theme={theme}
            onChange={setContent}
            collapsed={editorCollapsed}
            onToggleCollapse={() => setEditorCollapsed(v => !v)}
          />
        </div>

        {!editorCollapsed && !previewCollapsed && (
          <div
            className="resize-handle"
            onMouseDown={handleMouseDown}
          >
            <div className="resize-line" />
          </div>
        )}

        <div className="preview-section" style={{ width: previewWidth, flexShrink: 0 }}>
          <PreviewPanel
            content={debouncedContent}
            theme={theme}
            collapsed={previewCollapsed}
            onToggleCollapse={() => setPreviewCollapsed(v => !v)}
          />
        </div>
      </div>

      <Toolbar content={content} theme={theme} onToggleTheme={toggleTheme} />
    </div>
  );
}
