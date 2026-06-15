import { useCallback, useState } from 'react';
import { EditorProvider } from './context/EditorContext';
import Toolbar from './components/Toolbar';
import EditorArea from './components/EditorArea';
import PreviewPanel from './components/PreviewPanel';
import StatusBar from './components/StatusBar';
import ConfirmModal from './components/ConfirmModal';
import SaveToast from './components/SaveToast';

function AppInner() {
  const [editorScroll, setEditorScroll] = useState<number | null>(null);
  const [previewScroll, setPreviewScroll] = useState<number | null>(null);

  const handleEditorScroll = useCallback((ratio: number) => {
    setPreviewScroll(ratio);
  }, []);

  const handlePreviewScroll = useCallback((ratio: number) => {
    setEditorScroll(ratio);
  }, []);

  return (
    <div className="app-container">
      <Toolbar />
      <SaveToast />

      <div className="main-layout">
        <aside className="sidebar-left">
          <div className="sidebar-menu">
            <div className="menu-header">快捷操作</div>
            <ul className="menu-list">
              <li className="menu-item active">
                <span className="menu-icon">📝</span> 编辑文档
              </li>
              <li className="menu-item">
                <span className="menu-icon">📁</span> 最近文件
              </li>
              <li className="menu-item">
                <span className="menu-icon">📤</span> 导出
              </li>
              <li className="menu-item">
                <span className="menu-icon">⚙️</span> 设置
              </li>
            </ul>
            <div className="menu-tip">
              💡 提示：使用工具栏按钮快速格式化文本，内容每 5 秒自动保存。
            </div>
          </div>
        </aside>

        <section className="content-split">
          <div className="editor-column">
            <EditorArea onScroll={handleEditorScroll} scrollTarget={editorScroll} />
          </div>
          <div className="preview-column">
            <PreviewPanel onScroll={handlePreviewScroll} scrollTarget={previewScroll} />
          </div>
        </section>
      </div>

      <StatusBar />
      <ConfirmModal />
    </div>
  );
}

function App() {
  return (
    <EditorProvider>
      <AppInner />
    </EditorProvider>
  );
}

export default App;
