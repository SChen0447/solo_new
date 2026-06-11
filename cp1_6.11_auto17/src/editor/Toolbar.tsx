import { useState } from 'react'

interface Document {
  id: string
  title: string
  content: string
  creator: string
  createdAt: number
  updatedAt: number
  version: number
}

interface User {
  id: string
  name: string
  color: string
  documentId: string
  cursorPosition?: number
}

interface ToolbarProps {
  document: Document | null
  onlineUsers: User[]
  onBack: () => void
  onSave: () => void
  onUndo: () => void
  onRedo: () => void
  onShowVersions: () => void
  canUndo: boolean
  canRedo: boolean
  showMobileMenu: boolean
  onToggleMobileMenu: () => void
  execCommand: (command: string, value?: string) => void
}

function Toolbar({
  document,
  onlineUsers,
  onBack,
  onSave,
  onUndo,
  onRedo,
  onShowVersions,
  canUndo,
  canRedo,
  showMobileMenu,
  onToggleMobileMenu,
  execCommand,
}: ToolbarProps) {
  const [showFormatMenu, setShowFormatMenu] = useState(false)

  const handleFormat = (command: string, value?: string) => {
    execCommand(command, value)
    setShowFormatMenu(false)
  }

  return (
    <header className="editor-toolbar">
      <div className="toolbar-left">
        <button className="toolbar-btn back-btn" onClick={onBack}>
          <span className="btn-icon">←</span>
          <span className="btn-text">返回</span>
        </button>
        <h1 className="doc-title-header">{document?.title || '加载中...'}</h1>
      </div>

      <div className="toolbar-right">
        <div className={`format-buttons ${showMobileMenu ? 'show' : ''}`}>
          <div className="format-group">
            <button
              className="format-btn"
              onClick={() => handleFormat('bold')}
              title="加粗 (Ctrl+B)"
            >
              <strong>B</strong>
            </button>
            <button
              className="format-btn"
              onClick={() => handleFormat('italic')}
              title="斜体 (Ctrl+I)"
            >
              <em>I</em>
            </button>
            <button
              className="format-btn"
              onClick={() => handleFormat('underline')}
              title="下划线 (Ctrl+U)"
            >
              <u>U</u>
            </button>
          </div>

          <div className="format-group">
            <div className="format-dropdown">
              <button
                className="format-btn"
                onClick={() => setShowFormatMenu(!showFormatMenu)}
                title="标题层级"
              >
                <span>H</span>
                <span className="dropdown-arrow">▾</span>
              </button>
              {showFormatMenu && (
                <div className="dropdown-menu">
                  <button onClick={() => handleFormat('formatBlock', 'h1')}>
                    <h1>标题 1</h1>
                  </button>
                  <button onClick={() => handleFormat('formatBlock', 'h2')}>
                    <h2>标题 2</h2>
                  </button>
                  <button onClick={() => handleFormat('formatBlock', 'h3')}>
                    <h3>标题 3</h3>
                  </button>
                  <button onClick={() => handleFormat('formatBlock', 'p')}>
                    正文
                  </button>
                </div>
              )}
            </div>

            <button
              className="format-btn"
              onClick={() => handleFormat('insertUnorderedList')}
              title="无序列表"
            >
              •≡
            </button>
            <button
              className="format-btn"
              onClick={() => handleFormat('insertOrderedList')}
              title="有序列表"
            >
              1.≡
            </button>
          </div>
        </div>

        <div className="toolbar-divider" />

        <button
          className={`toolbar-btn ${!canUndo ? 'disabled' : ''}`}
          onClick={onUndo}
          disabled={!canUndo}
          title="撤销"
        >
          <span className="btn-icon">↶</span>
          <span className="btn-text">撤销</span>
        </button>
        <button
          className={`toolbar-btn ${!canRedo ? 'disabled' : ''}`}
          onClick={onRedo}
          disabled={!canRedo}
          title="重做"
        >
          <span className="btn-icon">↷</span>
          <span className="btn-text">重做</span>
        </button>

        <button className="toolbar-btn" onClick={onShowVersions} title="版本历史">
          <span className="btn-icon">📚</span>
          <span className="btn-text">版本</span>
        </button>

        <button className="toolbar-btn save-btn" onClick={onSave} title="保存版本">
          <span className="btn-icon">💾</span>
          <span className="btn-text">保存</span>
        </button>

        <div className="online-users">
          <div className="user-avatars">
            {onlineUsers.slice(0, 4).map((user) => (
              <div
                key={user.id}
                className="user-avatar"
                style={{ backgroundColor: user.color }}
                title={user.name}
              >
                {user.name.charAt(0)}
              </div>
            ))}
            {onlineUsers.length > 4 && (
              <div className="user-avatar more-avatars">
                +{onlineUsers.length - 4}
              </div>
            )}
          </div>
          <span className="online-count">{onlineUsers.length} 人在线</span>
        </div>

        <button
          className="toolbar-btn mobile-menu-btn"
          onClick={onToggleMobileMenu}
        >
          <span className="btn-icon">☰</span>
        </button>
      </div>
    </header>
  )
}

export default Toolbar
