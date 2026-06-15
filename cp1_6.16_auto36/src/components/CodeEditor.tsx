import { useMemo, useRef, useEffect } from 'react'
import { Language, LANGUAGE_LABELS, LANGUAGE_COLORS, THEMES, Theme } from '../types'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'

interface CodeEditorProps {
  code: string
  language: Language
  theme: Theme
  fontSize: number
  onCodeChange: (code: string) => void
  onLanguageChange: (language: Language) => void
}

function detectLanguage(code: string): Language {
  const trimmed = code.trim()
  if (!trimmed) return 'javascript'

  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<div') || /<[a-z][\s\S]*>/i.test(trimmed.slice(0, 200))) {
    if (trimmed.includes('{') && !trimmed.includes('<')) {
      return 'css'
    }
    return 'html'
  }

  const tsIndicators = ['interface ', 'type ', ': string', ': number', ': boolean', 'public ', 'private ', 'protected ']
  const hasTs = tsIndicators.some(ind => trimmed.includes(ind))
  if (hasTs) return 'typescript'

  if (trimmed.includes('function') || trimmed.includes('const ') || trimmed.includes('let ') || trimmed.includes('var ')) {
    return 'javascript'
  }

  if (trimmed.includes('{') && trimmed.includes(':')) {
    const firstBrace = trimmed.indexOf('{')
    const beforeBrace = trimmed.slice(0, firstBrace).trim()
    if (beforeBrace.length > 0 && beforeBrace.length < 50 && !beforeBrace.includes('function')) {
      return 'css'
    }
  }

  return 'javascript'
}

export default function CodeEditor({
  code,
  language,
  theme,
  fontSize,
  onCodeChange,
  onLanguageChange,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const highlightedRef = useRef<HTMLElement>(null)

  const themeConfig = THEMES[theme]

  const lines = useMemo(() => {
    return code.split('\n').length
  }, [code])

  const lineNumbers = useMemo(() => {
    return Array.from({ length: lines }, (_, i) => i + 1)
  }, [lines])

  const prismLanguage = useMemo(() => {
    switch (language) {
      case 'typescript': return 'typescript'
      case 'html': return 'markup'
      case 'css': return 'css'
      default: return 'javascript'
    }
  }, [language])

  const highlightedCode = useMemo(() => {
    const grammar = Prism.languages[prismLanguage]
    if (!grammar) return code
    return Prism.highlight(code, grammar, prismLanguage)
  }, [code, prismLanguage])

  useEffect(() => {
    const detected = detectLanguage(code)
    if (detected !== language && code.length > 10) {
      onLanguageChange(detected)
    }
  }, [code, language, onLanguageChange])

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current && highlightedRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current
      lineNumbersRef.current.scrollTop = scrollTop
      highlightedRef.current.scrollTop = scrollTop
      highlightedRef.current.scrollLeft = scrollLeft
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.currentTarget.selectionStart
      const end = e.currentTarget.selectionEnd
      const newCode = code.substring(0, start) + '  ' + code.substring(end)
      onCodeChange(newCode)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2
        }
      }, 0)
    }
  }

  return (
    <div className="code-editor-container" style={{ transition: 'all 0.3s ease' }}>
      <div
        className="editor-header"
        style={{
          backgroundColor: themeConfig.headerBg,
          borderBottomColor: themeConfig.borderColor,
          transition: 'all 0.3s ease',
        }}
      >
        <span
          className={`language-tag ${language}`}
          style={{
            backgroundColor: LANGUAGE_COLORS[language],
            color: language === 'javascript' ? '#000' : '#fff',
          }}
        >
          {LANGUAGE_LABELS[language]}
        </span>
        <select
          className="language-select"
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as Language)}
          style={{
            backgroundColor: themeConfig.bg,
            borderColor: themeConfig.borderColor,
            color: themeConfig.text,
          }}
        >
          {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="editor-wrapper" style={{ minHeight: '400px' }}>
        <div
          ref={lineNumbersRef}
          className="line-numbers"
          style={{
            backgroundColor: themeConfig.lineNumbersBg,
            color: themeConfig.lineNumbersColor,
            fontSize: `${fontSize}px`,
            transition: 'all 0.3s ease',
          }}
        >
          {lineNumbers.map((num) => (
            <div key={num}>{num}</div>
          ))}
        </div>
        <div
          style={{
            position: 'relative',
            flex: 1,
            overflow: 'hidden',
            backgroundColor: themeConfig.bg,
            transition: 'background-color 0.3s ease',
          }}
        >
          <pre
            ref={highlightedRef as React.RefObject<HTMLPreElement>}
            className={`snippet-preview theme-${theme}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: 0,
              padding: '16px',
              fontSize: `${fontSize}px`,
              lineHeight: 1.6,
              backgroundColor: 'transparent',
              pointerEvents: 'none',
              overflow: 'auto',
              whiteSpace: 'pre',
              fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
            }}
            aria-hidden="true"
          >
            <code className={`language-${prismLanguage}`} dangerouslySetInnerHTML={{ __html: highlightedCode || '\n' }} />
          </pre>
          <textarea
            ref={textareaRef}
            className="code-textarea"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            placeholder="在此粘贴或输入代码..."
            style={{
              position: 'relative',
              zIndex: 1,
              fontSize: `${fontSize}px`,
              color: 'transparent',
              caretColor: themeConfig.text,
              backgroundColor: 'transparent',
            }}
          />
        </div>
      </div>
    </div>
  )
}
