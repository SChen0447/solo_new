import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { oneDark } from '@codemirror/theme-one-dark'
import { createPiece } from '../api'
import '../styles/CreatePage.css'

const PRESET_TAGS = ['算法', '工具', '前端', '后端', '教程']

const LANGUAGES = [
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'Python', label: 'Python' },
  { value: 'TypeScript', label: 'TypeScript' },
  { value: 'HTML/CSS', label: 'HTML/CSS' },
]

function getLanguageExtension(language: string) {
  switch (language) {
    case 'JavaScript':
    case 'TypeScript':
      return javascript({ typescript: language === 'TypeScript' })
    case 'Python':
      return python()
    case 'HTML/CSS':
      return [html(), css()]
    default:
      return javascript()
  }
}

function CreatePage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [code, setCode] = useState('// 在这里编写你的代码...\n')
  const [language, setLanguage] = useState('JavaScript')
  const [author, setAuthor] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !code.trim() || !author.trim() || selectedTags.length === 0) {
      alert('请填写完整信息并至少选择一个标签')
      return
    }

    setSubmitting(true)
    try {
      await createPiece({
        title: title.trim(),
        code: code.trim(),
        language,
        author: author.trim(),
        tags: selectedTags,
      })
      setShowSuccess(true)
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (error) {
      console.error('Failed to create piece:', error)
      alert('创建失败，请重试')
      setSubmitting(false)
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div className="create-page">
      <button className="back-button" onClick={handleBack}>
        ← 返回列表
      </button>

      <div className="create-container">
        <h1 className="create-title">创建新代码片段</h1>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label htmlFor="title">标题</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给你的代码片段起个名字"
              className="form-input"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="author">作者</label>
            <input
              type="text"
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="你的昵称"
              className="form-input"
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label htmlFor="language">编程语言</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="form-select"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>标签</label>
            <div className="tag-selector">
              {PRESET_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-capsule ${selectedTags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
            <p className="tag-hint">选择至少一个标签</p>
          </div>

          <div className="form-group">
            <label>代码</label>
            <div className="code-editor-wrapper">
              <CodeMirror
                value={code}
                height="300px"
                extensions={[getLanguageExtension(language)]}
                theme={oneDark}
                onChange={(value) => setCode(value)}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightActiveLine: true,
                  foldGutter: true,
                }}
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? '提交中...' : '发布代码片段'}
          </button>
        </form>
      </div>

      {showSuccess && (
        <div className="success-toast">
          <div className="success-content">
            <span className="success-icon">✓</span>
            <span>发布成功！即将返回首页...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreatePage
