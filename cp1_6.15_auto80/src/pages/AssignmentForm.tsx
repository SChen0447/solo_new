import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import type { TestCase } from '@/types'

const difficultyOptions: { value: 'beginner' | 'intermediate' | 'advanced'; label: string }[] = [
  { value: 'beginner', label: '入门' },
  { value: 'intermediate', label: '进阶' },
  { value: 'advanced', label: '高手' },
]

export default function AssignmentForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentAssignment, fetchAssignment, createAssignment, updateAssignment } = useAppStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: '', expectedOutput: '' }])

  const isEditing = Boolean(id)

  useEffect(() => {
    if (id) {
      fetchAssignment(id)
    }
  }, [id, fetchAssignment])

  useEffect(() => {
    if (isEditing && currentAssignment) {
      setTitle(currentAssignment.title)
      setDescription(currentAssignment.description)
      setDifficulty(currentAssignment.difficulty)
      setTestCases(
        currentAssignment.testCases.length > 0
          ? currentAssignment.testCases
          : [{ input: '', expectedOutput: '' }]
      )
    }
  }, [isEditing, currentAssignment])

  const handleAddTestCase = () => {
    if (testCases.length >= 3) return
    setTestCases([...testCases, { input: '', expectedOutput: '' }])
  }

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index))
  }

  const handleTestCaseChange = (index: number, field: keyof TestCase, value: string) => {
    const updated = [...testCases]
    updated[index] = { ...updated[index], [field]: value }
    setTestCases(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditing && id) {
      await updateAssignment(id, { title, description, difficulty, testCases })
    } else {
      await createAssignment({ title, description, difficulty, testCases })
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa] p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1a1a2e] mb-8">
          {isEditing ? '编辑题目' : '创建题目'}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              标题 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 40))}
                maxLength={40}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea] focus:border-transparent text-sm"
                placeholder="请输入题目标题"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {title.length}/40
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea] focus:border-transparent text-sm resize-none"
              placeholder="请输入题目描述（支持 Markdown 语法）"
            />
            <span className="text-xs text-gray-400">支持 Markdown 语法</span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">难度</label>
            <div className="flex gap-3">
              {difficultyOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDifficulty(opt.value)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    difficulty === opt.value
                      ? 'text-white shadow-md'
                      : 'bg-white border border-gray-300 text-gray-600 hover:border-[#667eea]'
                  }`}
                  style={
                    difficulty === opt.value
                      ? { background: 'linear-gradient(135deg, #667eea, #764ba2)' }
                      : undefined
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">测试用例</label>
            <div className="flex flex-col gap-4">
              {testCases.map((tc, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">用例 {index + 1}</span>
                    {testCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTestCase(index)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        删除
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={tc.input}
                    onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#667eea] focus:border-transparent text-sm"
                    placeholder="输入"
                  />
                  <input
                    type="text"
                    value={tc.expectedOutput}
                    onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#667eea] focus:border-transparent text-sm"
                    placeholder="期望输出"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddTestCase}
              disabled={testCases.length >= 3}
              className="mt-2 px-4 py-2 rounded-lg text-sm font-medium border border-dashed border-gray-300 text-gray-500 hover:border-[#667eea] hover:text-[#667eea] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-500"
            >
              添加用例
            </button>
          </div>

          <div className="flex gap-4 mt-4">
            <button
              type="submit"
              className="w-[120px] h-10 rounded-[8px] text-white text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
            >
              {isEditing ? '保存' : '创建'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-[120px] h-10 rounded-[8px] text-sm font-medium border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
