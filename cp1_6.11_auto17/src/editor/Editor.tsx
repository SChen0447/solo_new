import { useRef, useEffect, useState, useCallback } from 'react'

interface User {
  id: string
  name: string
  color: string
  documentId: string
  cursorPosition?: number
}

interface Highlight {
  id: string
  userId: string
  timestamp: number
}

interface EditorProps {
  content: string
  onChange: (content: string) => void
  onlineUsers: User[]
  currentUserId: string
  highlights: Highlight[]
  execCommand: (command: string, value?: string) => void
}

function Editor({ content, onChange, onlineUsers, currentUserId, highlights, execCommand }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isComposing, setIsComposing] = useState(false)
  const lastContentRef = useRef(content)

  useEffect(() => {
    if (editorRef.current && lastContentRef.current !== content) {
      const selection = window.getSelection()
      let range: Range | null = null
      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0).cloneRange()
      }

      lastContentRef.current = content
      editorRef.current.innerHTML = content

      if (range && selection && editorRef.current.contains(range.startContainer)) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }, [content])

  const debounce = (fn: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn(...args), delay)
    }
  }

  const debouncedChange = useCallback(
    debounce((newContent: string) => {
      if (newContent !== lastContentRef.current) {
        lastContentRef.current = newContent
        onChange(newContent)
      }
    }, 150),
    [onChange]
  )

  const handleInput = useCallback(() => {
    if (!editorRef.current || isComposing) return
    const newContent = editorRef.current.innerHTML
    debouncedChange(newContent)
  }, [debouncedChange, isComposing])

  const handleCompositionStart = () => setIsComposing(true)
  const handleCompositionEnd = () => {
    setIsComposing(false)
    handleInput()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault()
          execCommand('bold')
          handleInput()
          break
        case 'i':
          e.preventDefault()
          execCommand('italic')
          handleInput()
          break
        case 'u':
          e.preventDefault()
          execCommand('underline')
          handleInput()
          break
      }
    }
  }

  const remoteUsers = onlineUsers.filter((u) => u.id !== currentUserId)

  return (
    <div className="editor-wrapper">
      <div className="remote-cursors">
        {remoteUsers.map((user, index) => (
          <div
            key={user.id}
            className="remote-cursor"
            style={{
              left: `${20 + index * 60}px`,
              top: '60px',
              borderColor: user.color,
              animation: 'cursorBlink 1s infinite',
            }}
          >
            <div
              className="cursor-label"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
            <div
              className="cursor-bar"
              style={{ backgroundColor: user.color }}
            />
          </div>
        ))}
      </div>

      <div
        ref={editorRef}
        className={`editor-content ${highlights.length > 0 ? 'has-highlight' : ''}`}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {highlights.length > 0 && (
        <div className="highlight-indicator">
          {remoteUsers.map((u) => (
            highlights.some((h) => h.userId === u.id) && (
              <span
                key={u.id}
                className="highlight-badge"
                style={{ backgroundColor: u.color }}
              >
                {u.name} 正在编辑
              </span>
            )
          ))}
        </div>
      )}
    </div>
  )
}

export default Editor
