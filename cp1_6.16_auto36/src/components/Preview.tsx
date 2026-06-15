import { useRef, useMemo, forwardRef, useImperativeHandle } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import { Language, Theme, Gradient, THEMES, GRADIENTS, LANGUAGE_LABELS, LANGUAGE_COLORS } from '../types'
import { generateSnapshot, downloadImage, copyImageToClipboard } from '../utils/exportImage'

interface PreviewProps {
  code: string
  language: Language
  theme: Theme
  fontSize: number
  borderRadius: number
  gradient: Gradient
  onToast: (message: string) => void
}

export interface PreviewRef {
  generateAndDownload: () => Promise<void>
  generateAndCopy: () => Promise<void>
}

const Preview = forwardRef<PreviewRef, PreviewProps>(function Preview(
  { code, language, theme, fontSize, borderRadius, gradient, onToast },
  ref
) {
  const snapshotRef = useRef<HTMLDivElement>(null)
  const themeConfig = THEMES[theme]

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
    if (!grammar) return code || '\n'
    return Prism.highlight(code || '\n', grammar, prismLanguage)
  }, [code, prismLanguage])

  const lineNumbers = useMemo(() => {
    const lines = (code || '\n').split('\n').length
    return Array.from({ length: lines }, (_, i) => i + 1)
  }, [code])

  const handleDownload = async () => {
    if (!snapshotRef.current) return
    try {
      const dataUrl = await generateSnapshot(snapshotRef.current)
      downloadImage(dataUrl, 'codesnap.png')
      onToast('快照已生成')
    } catch (err) {
      console.error(err)
      onToast('生成失败，请重试')
    }
  }

  const handleCopy = async () => {
    if (!snapshotRef.current) return
    try {
      const dataUrl = await generateSnapshot(snapshotRef.current)
      const success = await copyImageToClipboard(dataUrl)
      if (success) {
        onToast('图片已复制到剪贴板')
      } else {
        onToast('复制失败，请使用下载功能')
      }
    } catch (err) {
      console.error(err)
      onToast('复制失败，请重试')
    }
  }

  useImperativeHandle(ref, () => ({
    generateAndDownload: handleDownload,
    generateAndCopy: handleCopy,
  }))

  return (
    <div className="preview-container" style={{ background: GRADIENTS[gradient], transition: 'background 0.3s ease' }}>
      <div className="snapshot-wrapper" key={`${theme}-${fontSize}-${borderRadius}-${gradient}-${language}`}>
        <div
          ref={snapshotRef}
          className="snapshot-card"
          style={{
            borderRadius: `${borderRadius}px`,
            transition: 'all 0.3s ease',
          }}
        >
          <div
            className="snapshot-header"
            style={{
              backgroundColor: themeConfig.headerBg,
              borderBottom: `1px solid ${themeConfig.borderColor}`,
              transition: 'all 0.3s ease',
            }}
          >
            <div className="window-controls">
              <span className="window-dot red" />
              <span className="window-dot yellow" />
              <span className="window-dot green" />
            </div>
            <span
              className="snapshot-language"
              style={{
                color: themeConfig.text,
                opacity: 0.7,
                transition: 'color 0.3s ease',
              }}
            >
              {LANGUAGE_LABELS[language]}
            </span>
            <div style={{ width: 52 }} />
          </div>

          <div
            style={{
              display: 'flex',
              backgroundColor: themeConfig.bg,
              transition: 'background-color 0.3s ease',
            }}
          >
            <div
              style={{
                padding: '24px 16px',
                backgroundColor: themeConfig.lineNumbersBg,
                color: themeConfig.lineNumbersColor,
                fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
                fontSize: `${fontSize}px`,
                lineHeight: 1.7,
                textAlign: 'right',
                userSelect: 'none',
                minWidth: 50,
                transition: 'all 0.3s ease',
              }}
            >
              {lineNumbers.map((num) => (
                <div key={num}>{num}</div>
              ))}
            </div>
            <div
              className={`snapshot-code theme-${theme}`}
              style={{
                flex: 1,
                fontSize: `${fontSize}px`,
                color: themeConfig.text,
                transition: 'all 0.3s ease',
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
                }}
              >
                <code
                  className={`language-${prismLanguage}`}
                  dangerouslySetInnerHTML={{ __html: highlightedCode }}
                />
              </pre>
            </div>
          </div>

          <div
            className="snapshot-watermark"
            style={{
              backgroundColor: themeConfig.headerBg,
              color: themeConfig.watermarkColor,
              borderTop: `1px solid ${themeConfig.borderColor}`,
              transition: 'all 0.3s ease',
            }}
          >
            Generated by CodeSnap
          </div>
        </div>
      </div>

      <div className="preview-actions">
        <button className="action-btn" onClick={handleDownload}>
          下载图片
        </button>
        <button className="action-btn" onClick={handleCopy}>
          复制到剪贴板
        </button>
      </div>
    </div>
  )
})

export default Preview
