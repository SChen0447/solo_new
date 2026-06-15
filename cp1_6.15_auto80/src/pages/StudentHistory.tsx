import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function StudentHistory() {
  const navigate = useNavigate()
  const { studentId, assignments, submissions, fetchAssignments, fetchSubmissionsByStudent, loadingSubmissions } = useAppStore()

  useEffect(() => {
    fetchAssignments().then(() => {
      fetchSubmissionsByStudent(studentId)
    })
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof submissions>()
    for (const s of submissions) {
      const list = map.get(s.assignmentId) || []
      list.push(s)
      map.set(s.assignmentId, list)
    }
    return Array.from(map.entries()).map(([assignmentId, subs]) => {
      const sorted = [...subs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const latest = sorted[0]
      const assignment = assignments.find((a) => a.id === assignmentId)
      return {
        assignmentId,
        title: assignment?.title ?? '未知题目',
        passed: latest.passed,
        time: formatTime(latest.createdAt),
        submissionCount: subs.length,
      }
    })
  }, [assignments, submissions])

  return (
    <div className="min-h-screen bg-[#f5f6fa] p-6">
      <div className="max-w-[800px] mx-auto">
        <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">提交历史</h1>

        {loadingSubmissions ? (
          <div className="text-center text-gray-400 py-20">加载中...</div>
        ) : grouped.length === 0 ? (
          <div className="text-center text-gray-400 py-20">暂无提交记录</div>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map((g) => (
              <div
                key={g.assignmentId}
                onClick={() => navigate(`/student/assignment/${g.assignmentId}`)}
                className="bg-white rounded-xl shadow p-5 cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-base font-semibold text-gray-800">{g.title}</span>
                  <span className="text-sm text-gray-400">提交 {g.submissionCount} 次 · {g.time}</span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    g.passed
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {g.passed ? '通过' : '失败'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
