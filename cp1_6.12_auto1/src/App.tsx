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

const LS_PREFIX = 'md-editor:';
const SPLIT_KEY = LS_PREFIX + 'split-ratio';
const DEFAULT_SPLIT_RATIO = 0.5;
const MIN_WIDTH_PX = 200;

function safeReadSplitRatio(): number {
  try {
    const raw = localStorage.getItem(SPLIT_KEY);
    if (raw === null) return DEFAULT_SPLIT_RATIO;
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || !isFinite(parsed)) return DEFAULT_SPLIT_RATIO;
    if (parsed < 0.1 || parsed > 0.9) return DEFAULT_SPLIT_RATIO;
    return parsed;
  } catch {
    return DEFAULT_SPLIT_RATIO;
  }
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const { debouncedContent, isRendering } = useMarkdownRender(content);

  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [splitRatio, setSplitRatio] = useState<number>(safeReadSplitRatio);

  const containerRef = useRef<HTMLDivElement>(null);
  const editorSectionRef = useRef<HTMLDivElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(() => {
    if (!containerRef.current || !editorSectionRef.current || !previewSectionRef.current) return;
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current || !editorSectionRef.current || !previewSectionRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const totalWidth = rect.width;
    let editorWidthPx = e.clientX - rect.left;

    if (editorWidthPx < MIN_WIDTH_PX) editorWidthPx = MIN_WIDTH_PX;
    const previewWidthPx = totalWidth - editorWidthPx;
    if (previewWidthPx < MIN_WIDTH_PX) {
      editorWidthPx = totalWidth - MIN_WIDTH_PX;
    }

    editorSectionRef.current.style.width = `${editorWidthPx}px`;
    previewSectionRef.current.style.width = `${totalWidth - editorWidthPx}px`;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    if (containerRef.current && editorSectionRef.current) {
      const totalWidth = containerRef.current.getBoundingClientRect().width;
      const editorWidthPx = editorSectionRef.current.getBoundingClientRect().width;
      const newRatio = editorWidthPx / totalWidth;
      setSplitRatio(newRatio);
      try {
        localStorage.setItem(SPLIT_KEY, newRatio.toString());
      } catch {
        // 忽略 localStorage 写入错误
      }
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

  const editorWidthStyle = editorCollapsed ? '0px' : previewCollapsed ? '100%' : isDragging.current ? undefined : `${splitRatio * 100}%`;
  const previewWidthStyle = previewCollapsed ? '0px' : editorCollapsed ? '100%' : isDragging.current ? undefined : `${(1 - splitRatio) * 100}%`;

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
        <div
          className="editor-section"
          ref={editorSectionRef}
          style={{ width: editorWidthStyle, flexShrink: 0 }}
        >
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

        <div
          className="preview-section"
          ref={previewSectionRef}
          style={{ width: previewWidthStyle, flexShrink: 0 }}
        >
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
