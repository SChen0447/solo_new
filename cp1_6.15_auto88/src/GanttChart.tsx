import { useRef, useMemo, useCallback, useState, useEffect } from 'react'
import { useStore, type Task, type Priority } from './store'

const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#e74c3c',
  medium: '#f39c12',
  low: '#2ecc71',
}

const DAY_WIDTH = 36
const ROW_HEIGHT = 40
const HEADER_HEIGHT = 52
const WEEK_WIDTH = DAY_WIDTH * 7

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
}

function getWeekStart(dateStr: string): Date {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

interface TaskBarProps {
  task: Task
  timelineStart: string
  onDragStart: (taskId: string, type: 'move' | 'left' | 'right', e: React.MouseEvent) => void
  onDoubleClick: (taskId: string) => void
}

function TaskBar({ task, timelineStart, onDragStart, onDoubleClick }: TaskBarProps) {
  const startOffset = daysBetween(timelineStart, task.startDate)
  const duration = Math.max(1, daysBetween(task.startDate, task.endDate))
  const left = startOffset * DAY_WIDTH
  const width = duration * DAY_WIDTH

  const bgColor = PRIORITY_COLORS[task.priority]
  const progressWidth = (task.progress / 100) * width

  return (
    <div
      className="absolute group"
      style={{
        left: `${left}px`,
        width: `${width}px`,
        top: '2px',
        height: `${ROW_HEIGHT - 4}px`,
        opacity: 0.9,
        transition: 'opacity 0.25s ease-out, transform 0.25s ease-out',
        cursor: 'grab',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = '1'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = '0.9'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
      }}
      onDoubleClick={() => onDoubleClick(task.id)}
    >
      <div
        className="absolute inset-0 rounded-md overflow-hidden"
        style={{ backgroundColor: bgColor, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
      >
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: `${progressWidth}px`,
            background: `linear-gradient(to right, #e74c3c, #f39c12 ${Math.min(50, task.progress)}%, #2ecc71)`,
            opacity: 0.35,
          }}
        />
        <span className="absolute inset-0 flex items-center px-2 text-white text-xs font-body truncate pointer-events-none select-none">
          {task.name}
        </span>
        <span className="absolute right-1 top-0.5 text-white/60 text-[10px] pointer-events-none select-none">
          {task.progress}%
        </span>
      </div>

      <div
        className="absolute left-0 top-0 w-2 h-full cursor-ew-resize z-10"
        onMouseDown={(e) => {
          e.stopPropagation()
          onDragStart(task.id, 'left', e)
        }}
      />
      <div
        className="absolute right-0 top-0 w-2 h-full cursor-ew-resize z-10"
        onMouseDown={(e) => {
          e.stopPropagation()
          onDragStart(task.id, 'right', e)
        }}
      />
    </div>
  )
}

interface EditModalProps {
  task: Task
  onClose: () => void
  onSave: (updates: Partial<Task>) => void
}

function EditModal({ task, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState({
    name: task.name,
    startDate: task.startDate,
    endDate: task.endDate,
    progress: task.progress,
    priority: task.priority,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-lg p-5 w-80 font-body"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-ink font-journal text-lg mb-4">编辑任务</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-ink/60 block mb-1">任务名称</label>
            <input
              className="w-full border border-splitter rounded-md px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-wood"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-ink/60 block mb-1">开始日期</label>
              <input
                type="date"
                className="w-full border border-splitter rounded-md px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-wood"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-ink/60 block mb-1">截止日期</label>
              <input
                type="date"
                className="w-full border border-splitter rounded-md px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-wood"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-ink/60 block mb-1">进度 (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full border border-splitter rounded-md px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-wood"
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-ink/60 block mb-1">优先级</label>
              <select
                className="w-full border border-splitter rounded-md px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-wood"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-md text-ink/60 hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs rounded-md bg-wood text-white hover:bg-wood-dark transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function GanttChart() {
  const tasks = useStore((s) => s.tasks)
  const groups = useStore((s) => s.groups)
  const searchQuery = useStore((s) => s.searchQuery)
  const progressFilter = useStore((s) => s.progressFilter)
  const updateTask = useStore((s) => s.updateTask)
  const editingTaskId = useStore((s) => s.editingTaskId)
  const setEditingTaskId = useStore((s) => s.setEditingTaskId)
  const toggleGroup = useStore((s) => s.toggleGroup)

  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    taskId: string
    type: 'move' | 'left' | 'right'
    startX: number
    origStart: string
    origEnd: string
  } | null>(null)

  const [editTask, setEditTask] = useState<Task | null>(null)

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (t.progress < progressFilter[0] || t.progress > progressFilter[1]) return false
      return true
    })
  }, [tasks, searchQuery, progressFilter])

  const { timelineStart, timelineEnd, totalWeeks } = useMemo(() => {
    if (filteredTasks.length === 0) {
      const now = new Date()
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      const end = new Date(now)
      end.setDate(end.getDate() + 28)
      return {
        timelineStart: start.toISOString().split('T')[0],
        timelineEnd: end.toISOString().split('T')[0],
        totalWeeks: 5,
      }
    }

    let minDate = filteredTasks[0].startDate
    let maxDate = filteredTasks[0].endDate
    for (const t of filteredTasks) {
      if (t.startDate < minDate) minDate = t.startDate
      if (t.endDate > maxDate) maxDate = t.endDate
    }

    const weekStart = getWeekStart(minDate)
    const startStr = weekStart.toISOString().split('T')[0]

    const maxD = new Date(maxDate)
    maxD.setDate(maxD.getDate() + 7)
    const endWeekStart = getWeekStart(maxD.toISOString().split('T')[0])
    const endStr = addDays(endWeekStart.toISOString().split('T')[0], 7)

    const weeks = Math.ceil(daysBetween(startStr, endStr) / 7)

    return {
      timelineStart: startStr,
      timelineEnd: endStr,
      totalWeeks: Math.max(weeks, 4),
    }
  }, [filteredTasks])

  const timelineWidth = totalWeeks * WEEK_WIDTH

  const weekHeaders = useMemo(() => {
    const headers: { label: string; start: string; end: string }[] = []
    for (let i = 0; i < totalWeeks; i++) {
      const weekStart = addDays(timelineStart, i * 7)
      const weekEnd = addDays(weekStart, 6)
      headers.push({
        label: `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`,
        start: weekStart,
        end: weekEnd,
      })
    }
    return headers
  }, [timelineStart, totalWeeks])

  const groupedTasks = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const g of groups) {
      map.set(g.id, [])
    }
    for (const t of filteredTasks) {
      if (!map.has(t.groupId)) {
        map.set(t.groupId, [])
      }
      map.get(t.groupId)!.push(t)
    }
    return map
  }, [filteredTasks, groups])

  const rows: { type: 'group' | 'task'; group?: typeof groups[0]; task?: Task }[] = useMemo(() => {
    const result: { type: 'group' | 'task'; group?: typeof groups[0]; task?: Task }[] = []
    for (const g of groups) {
      const gTasks = groupedTasks.get(g.id) || []
      result.push({ type: 'group', group: g })
      if (!g.collapsed) {
        for (const t of gTasks) {
          result.push({ type: 'task', task: t })
        }
      }
    }
    return result
  }, [groups, groupedTasks])

  const totalHeight = rows.length * ROW_HEIGHT + HEADER_HEIGHT

  const handleDragStart = useCallback(
    (taskId: string, type: 'move' | 'left' | 'right', e: React.MouseEvent) => {
      e.preventDefault()
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return
      dragRef.current = {
        taskId,
        type,
        startX: e.clientX,
        origStart: task.startDate,
        origEnd: task.endDate,
      }

      const handleMove = (me: MouseEvent) => {
        if (!dragRef.current) return
        const dx = me.clientX - dragRef.current.startX
        const dayDelta = Math.round(dx / DAY_WIDTH)
        if (dayDelta === 0) return

        const { taskId: tid, type: ttype, origStart, origEnd } = dragRef.current

        if (ttype === 'move') {
          updateTask(tid, {
            startDate: addDays(origStart, dayDelta),
            endDate: addDays(origEnd, dayDelta),
          })
        } else if (ttype === 'left') {
          const newStart = addDays(origStart, dayDelta)
          if (newStart < origEnd) {
            updateTask(tid, { startDate: newStart })
          }
        } else if (ttype === 'right') {
          const newEnd = addDays(origEnd, dayDelta)
          if (newEnd > origStart) {
            updateTask(tid, { endDate: newEnd })
          }
        }
      }

      const handleUp = () => {
        dragRef.current = null
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [tasks, updateTask]
  )

  const handleDoubleClick = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        setEditTask(task)
        setEditingTaskId(taskId)
      }
    },
    [tasks, setEditingTaskId]
  )

  const handleEditSave = useCallback(
    (updates: Partial<Task>) => {
      if (editTask) {
        updateTask(editTask.id, updates)
      }
    },
    [editTask, updateTask]
  )

  const todayOffset = daysBetween(timelineStart, new Date().toISOString().split('T')[0])

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="px-4 pt-3 pb-2 flex items-center">
        <span className="text-ink font-journal text-lg tracking-wide">📊 甘特图</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto px-4 pb-4">
        <div
          className="relative"
          style={{ width: Math.max(timelineWidth + 200, 600), minHeight: totalHeight }}
        >
          <div
            className="sticky top-0 z-20 flex bg-white border-b border-splitter"
            style={{ height: HEADER_HEIGHT }}
          >
            <div className="w-[200px] shrink-0 flex items-center px-3 text-xs font-body text-ink/60 border-r border-splitter">
              任务名称
            </div>
            <div className="flex">
              {weekHeaders.map((w, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center border-r border-splitter/50"
                  style={{ width: WEEK_WIDTH }}
                >
                  <span className="text-[10px] text-ink/40">W{i + 1}</span>
                  <span className="text-[11px] text-ink/70">{w.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {todayOffset >= 0 && todayOffset < totalWeeks * 7 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-400/40 z-10"
                style={{ left: `${200 + todayOffset * DAY_WIDTH}px` }}
              >
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 text-[9px] text-blue-400 bg-blue-50 px-1 rounded">
                  今日
                </div>
              </div>
            )}

            {rows.map((row, idx) => {
              if (row.type === 'group' && row.group) {
                const g = row.group
                const gTasks = groupedTasks.get(g.id) || []
                return (
                  <div
                    key={`group-${g.id}`}
                    className="flex items-center border-b border-splitter/30 bg-warm/20 cursor-pointer hover:bg-warm/40 transition-colors"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => toggleGroup(g.id)}
                  >
                    <div className="w-[200px] shrink-0 flex items-center px-3 gap-2">
                      <svg
                        className="w-3 h-3 text-wood-dark transition-transform duration-200"
                        style={{ transform: g.collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
                        viewBox="0 0 10 10"
                        fill="currentColor"
                      >
                        <polygon points="0,0 10,5 0,10" />
                      </svg>
                      <span className="text-xs font-body font-semibold text-ink/80 truncate">
                        {g.name}
                      </span>
                      <span className="text-[10px] text-ink/40">({gTasks.length})</span>
                    </div>
                    <div className="flex-1" />
                  </div>
                )
              }

              if (row.type === 'task' && row.task) {
                const t = row.task
                return (
                  <div
                    key={`task-${t.id}`}
                    className="flex items-center border-b border-splitter/20 hover:bg-warm/10 transition-colors"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <div className="w-[200px] shrink-0 flex items-center px-3">
                      <div
                        className="w-2 h-2 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: PRIORITY_COLORS[t.priority] }}
                      />
                      <span className="text-xs font-body text-ink truncate">{t.name}</span>
                    </div>
                    <div className="relative" style={{ width: timelineWidth, height: ROW_HEIGHT }}>
                      {weekHeaders.map((_, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 border-r border-splitter/20"
                          style={{ left: `${i * WEEK_WIDTH}px`, width: WEEK_WIDTH }}
                        />
                      ))}
                      <TaskBar
                        task={t}
                        timelineStart={timelineStart}
                        onDragStart={handleDragStart}
                        onDoubleClick={handleDoubleClick}
                      />
                    </div>
                  </div>
                )
              }

              return null
            })}

            {filteredTasks.length === 0 && (
              <div className="flex items-center justify-center py-16 text-ink/30 text-sm font-body">
                暂无任务，请在白板上书写待办事项
              </div>
            )}
          </div>
        </div>
      </div>

      {editTask && (
        <EditModal
          task={editTask}
          onClose={() => {
            setEditTask(null)
            setEditingTaskId(null)
          }}
          onSave={handleEditSave}
        />
      )}
    </div>
  )
}
