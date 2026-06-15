import { useState, useRef, useCallback } from 'react'
import CodeEditor from './components/CodeEditor'
import StylePanel from './components/StylePanel'
import Preview, { PreviewRef } from './components/Preview'
import { Language, Theme, Gradient } from './types'

const DEFAULT_CODE = `function greet(name) {
  console.log('Hello, ' + name + '!');
  return {
    message: 'Welcome to CodeSnap',
    timestamp: Date.now()
  };
}

greet('World');`

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [language, setLanguage] = useState<Language>('javascript')
  const [theme, setTheme] = useState<Theme>('dracula')
  const [fontSize, setFontSize] = useState(14)
  const [borderRadius, setBorderRadius] = useState(12)
  const [gradient, setGradient] = useState<Gradient>('ocean')
  const [toast, setToast] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)

  const previewRef = useRef<PreviewRef>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    setToastVisible(true)
    setTimeout(() => {
      setToastVisible(false)
      setTimeout(() => setToast(null), 300)
    }, 2500)
  }, [])

  const handleGenerate = useCallback(() => {
    if (previewRef.current) {
      previewRef.current.generateAndDownload()
    }
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>CodeSnap - 代码快照生成器</h1>
        <span style={{ fontSize: 13, opacity: 0.9 }}>
          快速生成精美代码截图
        </span>
      </header>

      <main className="app-main">
        <section className="editor-section">
          <h2 className="section-title">代码编辑器</h2>
          <CodeEditor
            code={code}
            language={language}
            theme={theme}
            fontSize={fontSize}
            onCodeChange={setCode}
            onLanguageChange={setLanguage}
          />
          <StylePanel
            theme={theme}
            fontSize={fontSize}
            borderRadius={borderRadius}
            gradient={gradient}
            onThemeChange={setTheme}
            onFontSizeChange={setFontSize}
            onBorderRadiusChange={setBorderRadius}
            onGradientChange={setGradient}
            onGenerate={handleGenerate}
          />
        </section>

        <section className="preview-section">
          <h2 className="section-title">预览</h2>
          <Preview
            ref={previewRef}
            code={code}
            language={language}
            theme={theme}
            fontSize={fontSize}
            borderRadius={borderRadius}
            gradient={gradient}
            onToast={showToast}
          />
        </section>
      </main>

      {toast && (
        <div className={`toast ${toastVisible ? 'show' : ''}`}>
          <span>✓ {toast}</span>
          <button className="toast-close" onClick={() => setToastVisible(false)}>
            ×
          </button>
        </div>
      )}
    </div>
  )
}
