import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import type { TestResult } from '@/types'

export default function StudentSubmission() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentAssignment, fetchAssignment, submitCode, submitting } = useAppStore()

  const [code, setCode] = useState('')
  const [language, setLanguage] = useState<'javascript' | 'python'>('javascript')
  const [results, setResults] = useState<TestResult[]>([])

  useEffect(() => {
    if (id) {
      fetchAssignment(id)
    }
  }, [id, fetchAssignment])

  useEffect(() => {
    if (currentAssignment) {
      setCode(language === 'javascript' ? '// 请在此编写代码\n' : '# 请在此编写代码\n')
    }
  }, [currentAssignment])

  const handleSubmit = useCallback(async () => {
    if (!id) return
    try {
      const submission = await submitCode({ assignmentId: id, code, language })
      setResults(submission.results)
    } catch {}
  }, [id, code, language, submitCode])

  const lineCount = code.split('\n').length

  const passedCount = results.filter((r) => r.passed).length

  if (!currentAssignment) {
    return <div className="flex items-center justify-center h-screen text-gray-400">加载中...</div>
  }

  return (
    <div className="flex gap-6 h-screen p-6">
      <div className="w-[60%] flex flex-col gap-4 min-w-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{currentAssignment.title}</h1>
          <p className="mt-2 text-gray-500">{currentAssignment.description}</p>
        </div>

        <div className="flex gap-2">
          <button
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              language === 'javascript'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => {
              setLanguage('javascript')
              setCode('// 请在此编写代码\n')
            }}
          >
            JavaScript
          </button>
          <button
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              language === 'python'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => {
              setLanguage('python')
              setCode('# 请在此编写代码\n')
            }}
          >
            Python
          </button>
        </div>

        <div className="relative flex-1 rounded-lg overflow-hidden" style={{ backgroundColor: '#1e1e2e' }}>
          <div
            className="absolute left-0 top-0 bottom-0 w-12 flex flex-col items-end pr-3 pt-4 select-none overflow-hidden"
            style={{ color: '#6c7086', fontSize: '14px', lineHeight: '24px', fontFamily: 'monospace' }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-full resize-none outline-none border-none"
            style={{
              backgroundColor: 'transparent',
              color: '#cdd6f4',
              fontSize: '14px',
              lineHeight: '24px',
              fontFamily: 'monospace',
              padding: '16px 16px 16px 52px',
            }}
            spellCheck={false}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-[120px] py-2 rounded-lg text-white font-medium transition-all duration-300 hover:shadow-[0_4px_12px_rgba(102,126,234,0.4)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(to right, #667eea, #764ba2)' }}
        >
          {submitting ? '提交中...' : '提交'}
        </button>
      </div>

      <div className="w-[40%] flex flex-col gap-4 min-w-0">
        <h2 className="text-lg font-semibold text-gray-800">
          测试结果 {results.length > 0 ? `${passedCount}/${results.length}` : ''}
        </h2>

        {results.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            提交代码后将显示测试结果
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {results.map((result, index) => (
              <div
                key={index}
                className="p-3 rounded-lg"
                style={{ backgroundColor: result.passed ? '#e8f5e9' : '#ffebee' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: result.passed ? '#4caf50' : '#f44336' }}
                  />
                  <span className="text-sm font-medium" style={{ color: result.passed ? '#2e7d32' : '#c62828' }}>
                    {result.passed ? '通过' : '未通过'}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-gray-500">输入：</span>
                    <span className="text-gray-800">{result.input}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">期望输出：</span>
                    <span className="text-gray-800">{result.expectedOutput}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">实际输出：</span>
                    <span style={{ color: result.passed ? '#2e7d32' : '#c62828' }}>{result.actualOutput}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
