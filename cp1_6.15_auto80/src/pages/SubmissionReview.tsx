import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAppStore } from '@/store'

export default function SubmissionReview() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const {
    submissions,
    loadingSubmissions,
    fetchSubmissionsByAssignment,
    annotations,
    loadingAnnotations,
    fetchAnnotations,
    addAnnotation,
    deleteAnnotation,
  } = useAppStore()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [annotatingLine, setAnnotatingLine] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    if (assignmentId) {
      fetchSubmissionsByAssignment(assignmentId)
    }
  }, [assignmentId, fetchSubmissionsByAssignment])

  useEffect(() => {
    if (submissions.length > 0 && !selectedId) {
      setSelectedId(submissions[0].id)
    }
  }, [submissions, selectedId])

  useEffect(() => {
    if (selectedId) {
      fetchAnnotations(selectedId)
      setAnnotatingLine(null)
      setInputValue('')
    }
  }, [selectedId, fetchAnnotations])

  const selected = submissions.find((s) => s.id === selectedId) || null

  const handleAnnotate = useCallback(async () => {
    if (!selectedId || annotatingLine === null || !inputValue.trim()) return
    await addAnnotation({ submissionId: selectedId, lineNumber: annotatingLine, content: inputValue.trim() })
    setAnnotatingLine(null)
    setInputValue('')
  }, [selectedId, annotatingLine, inputValue, addAnnotation])

  if (loadingSubmissions && submissions.length === 0) {
    return <div className="flex items-center justify-center h-screen text-gray-400">加载中...</div>
  }

  if (submissions.length === 0) {
    return <div className="flex items-center justify-center h-screen text-gray-400">暂无学生提交</div>
  }

  const codeLines = selected ? selected.code.split('\n') : []
  const lineAnnotations = (lineNum: number) =>
    annotations.filter((a) => a.lineNumber === lineNum)

  const passedCount = selected ? selected.results.filter((r) => r.passed).length : 0
  const totalCount = selected ? selected.results.length : 0

  return (
    <div className="flex flex-col h-screen p-6 gap-4">
      <div className="flex gap-2 flex-wrap">
        {submissions.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedId(s.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: s.id === selectedId ? 'linear-gradient(to right, #667eea, #764ba2)' : '#f0f1f5',
              color: s.id === selectedId ? '#fff' : '#333',
            }}
          >
            {s.studentName}
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex gap-6 flex-1 min-h-0">
          <div className="w-[60%] flex flex-col min-w-0">
            <div className="flex-1 rounded-lg overflow-auto relative" style={{ backgroundColor: '#1e1e2e' }}>
              <div className="flex flex-col" style={{ fontFamily: 'monospace', fontSize: '14px', lineHeight: '24px' }}>
                {codeLines.map((line, index) => {
                  const lineNum = index + 1
                  const anns = lineAnnotations(lineNum)
                  const isAnnotating = annotatingLine === lineNum
                  return (
                    <div key={index} className="flex items-start">
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-start">
                          <div
                            className="w-12 shrink-0 text-right pr-3 pt-0 select-none cursor-pointer hover:text-[#89b4fa] transition-colors"
                            style={{ color: '#6c7086' }}
                            onClick={() => {
                              setAnnotatingLine(isAnnotating ? null : lineNum)
                              setInputValue('')
                            }}
                          >
                            {lineNum}
                          </div>
                          <div className="flex-1 whitespace-pre text-white" style={{ paddingLeft: 4 }}>
                            {line || ' '}
                          </div>
                        </div>
                        {isAnnotating && (
                          <div className="flex items-center gap-2 ml-12 my-1">
                            <input
                              autoFocus
                              value={inputValue}
                              onChange={(e) => setInputValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAnnotate()
                                if (e.key === 'Escape') {
                                  setAnnotatingLine(null)
                                  setInputValue('')
                                }
                              }}
                              placeholder="输入批注，按 Enter 提交"
                              className="outline-none text-sm px-3 py-1.5"
                              style={{
                                width: 300,
                                backgroundColor: '#f5f5f5',
                                borderRadius: 8,
                                border: '1px solid #e0e0e0',
                                color: '#333',
                              }}
                            />
                          </div>
                        )}
                      </div>
                      {anns.length > 0 && (
                        <div className="flex flex-col gap-1 shrink-0 pt-0 pl-2 pr-2" style={{ maxWidth: 400 }}>
                          {anns.map((ann) => (
                            <div
                              key={ann.id}
                              className="relative px-3 py-1.5 text-sm"
                              style={{
                                backgroundColor: '#fff3e0',
                                borderRadius: 12,
                                color: '#5d4037',
                                maxWidth: 400,
                              }}
                            >
                              <div
                                className="absolute left-[-6px] top-[10px]"
                                style={{
                                  width: 0,
                                  height: 0,
                                  borderTop: '5px solid transparent',
                                  borderBottom: '5px solid transparent',
                                  borderRight: '6px solid #fff3e0',
                                }}
                              />
                              <span>{ann.content}</span>
                              <button
                                onClick={() => deleteAnnotation(ann.id)}
                                className="ml-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="w-[40%] flex flex-col gap-4 min-w-0 overflow-y-auto">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">批注列表</h2>
              {loadingAnnotations ? (
                <div className="text-gray-400 text-sm">加载中...</div>
              ) : annotations.length === 0 ? (
                <div className="text-gray-400 text-sm">暂无批注，点击行号添加</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {[...annotations]
                    .sort((a, b) => a.lineNumber - b.lineNumber)
                    .map((ann) => (
                      <div key={ann.id} className="flex items-start gap-2">
                        <span
                          className="shrink-0 inline-flex items-center justify-center text-xs font-medium text-white rounded"
                          style={{
                            width: 24,
                            height: 20,
                            background: 'linear-gradient(to right, #667eea, #764ba2)',
                          }}
                        >
                          {ann.lineNumber}
                        </span>
                        <span className="text-sm text-gray-700 flex-1">{ann.content}</span>
                        <button
                          onClick={() => deleteAnnotation(ann.id)}
                          className="shrink-0 text-gray-400 hover:text-red-500 transition-colors text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                测试结果 {totalCount > 0 && <span>通过 {passedCount}/{totalCount}</span>}
              </h2>
              {totalCount === 0 ? (
                <div className="text-gray-400 text-sm">无测试结果</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {selected.results.map((result, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: result.passed ? '#e8f5e9' : '#ffebee',
                        padding: 12,
                        borderRadius: 8,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: result.passed ? '#4caf50' : '#f44336' }}
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: result.passed ? '#2e7d32' : '#c62828' }}
                        >
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
                          <span style={{ color: result.passed ? '#2e7d32' : '#c62828' }}>
                            {result.actualOutput}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
