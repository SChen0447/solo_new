import { useState, useRef } from 'react'
import { Plus, Copy, X, Clock, Calendar, FileText, Tag } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { TASK_TYPES, TYPE_COLORS, type TaskType } from '../types'

interface Props {
  entries: { id: string; date: string; taskName: string; hours: number; taskType: TaskType; description: string }[]
}

export default function TimeEntryForm({ entries }: Props) {
  const addEntry = useAppStore((s) => s.addEntry)
  const deleteEntry = useAppStore((s) => s.deleteEntry)

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [taskName, setTaskName] = useState('')
  const [hours, setHours] = useState(1)
  const [taskType, setTaskType] = useState<TaskType>('开发')
  const [description, setDescription] = useState('')
  const [showForm, setShowForm] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const handleQuickCopy = () => {
    if (entries.length > 0) {
      const last = entries[entries.length - 1]
      setTaskName(last.taskName)
      setTaskType(last.taskType)
      setShowForm(true)
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskName.trim() || hours <= 0) return
    const newEntry = {
      date,
      taskName: taskName.trim(),
      hours: Math.round(hours * 2) / 2,
      taskType,
      description: description.trim(),
    }
    const result = await addEntry(newEntry)
    if (result) {
      setTaskName('')
      setHours(1)
      setDescription('')
      setShowForm(false)
    }
  }

  const handleHoursStep = (delta: number) => {
    setHours((h) => Math.max(0.5, Math.min(24, Math.round((h + delta) * 2) / 2)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">工时记录</h2>
        <div className="flex gap-2">
          <button
            onClick={handleQuickCopy}
            disabled={entries.length === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy size={16} />
            复制上一条
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-[#4A6FA5] text-white hover:bg-[#3a5887] transition-colors shadow-md"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? '取消' : '添加工时'}
          </button>
        </div>
      </div>

      {showForm && (
        <div
          ref={formRef}
          className="glass-card p-5 rounded-xl border border-white/20 shadow-lg animate-slideDown"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar size={14} className="inline mr-1" />
                  日期
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#4A6FA5] focus:border-transparent bg-white/80 backdrop-blur"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Tag size={14} className="inline mr-1" />
                  任务类型
                </label>
                <div className="flex gap-2">
                  {TASK_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTaskType(t)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        taskType === t
                          ? 'text-white shadow-md scale-[1.02]'
                          : 'bg-white/60 text-slate-600 hover:bg-white/80 border border-slate-200'
                      }`}
                      style={taskType === t ? { backgroundColor: TYPE_COLORS[t] } : {}}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <FileText size={14} className="inline mr-1" />
                任务名称
              </label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="例如：用户登录模块开发"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#4A6FA5] focus:border-transparent bg-white/80 backdrop-blur"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <Clock size={14} className="inline mr-1" />
                工时（小时）
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleHoursStep(-0.5)}
                  className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                  className="w-24 px-3 py-2 text-center rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#4A6FA5] bg-white/80 backdrop-blur"
                />
                <button
                  type="button"
                  onClick={() => handleHoursStep(0.5)}
                  className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors"
                >
                  +
                </button>
                <div className="flex gap-1 ml-2">
                  {[1, 2, 4, 8].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHours(h)}
                      className="px-3 py-1 text-xs rounded-md bg-white/60 hover:bg-[#4A6FA5] hover:text-white text-slate-600 border border-slate-200 transition-colors"
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">描述（可选）</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简要描述工作内容..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#4A6FA5] focus:border-transparent bg-white/80 backdrop-blur resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#4A6FA5] text-white hover:bg-[#3a5887] transition-colors shadow-md"
              >
                保存
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
        {entries.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Clock size={48} className="mx-auto mb-3 opacity-40" />
            <p>暂无工时记录，点击"添加工时"开始录入</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.slice().reverse().map((entry) => (
              <div
                key={entry.id}
                className="glass-card p-4 rounded-xl border border-white/20 shadow-md hover:shadow-lg transition-all animate-fadeIn"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: TYPE_COLORS[entry.taskType] }}
                      />
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/60 text-slate-600">
                        {entry.taskType}
                      </span>
                      <span className="text-xs text-slate-500">{entry.date}</span>
                    </div>
                    <h3 className="font-semibold text-slate-800 truncate">{entry.taskName}</h3>
                    {entry.description && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{entry.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{ color: TYPE_COLORS[entry.taskType] }}>
                        {entry.hours}
                      </div>
                      <div className="text-xs text-slate-500">小时</div>
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X size={18} />
                    </button>
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
