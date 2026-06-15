import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import type { AssignmentStats } from '@/types'

const difficultyConfig: Record<string, { label: string; bg: string; text: string }> = {
  beginner: { label: '入门', bg: '#e8f5e9', text: '#2e7d32' },
  intermediate: { label: '进阶', bg: '#fff3e0', text: '#ef6c00' },
  advanced: { label: '高手', bg: '#fce4ec', text: '#c62828' },
}

export default function TeacherDashboard() {
  const navigate = useNavigate()
  const {
    assignments,
    loadingAssignments,
    fetchAssignments,
    fetchSubmissionsByAssignment,
    deleteAssignment,
    getAssignmentStats,
  } = useAppStore()

  useEffect(() => {
    fetchAssignments().then(() => {
      const currentAssignments = useAppStore.getState().assignments
      currentAssignments.forEach((a) => {
        fetchSubmissionsByAssignment(a.id)
      })
    })
  }, [])

  const stats: AssignmentStats[] = getAssignmentStats()

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteAssignment(id)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', marginBottom: 32 }}>
          教师控制台
        </h1>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a2e', marginBottom: 20 }}>
            题目列表
          </h2>

          {loadingAssignments ? (
            <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>加载中...</div>
          ) : assignments.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>暂无题目</div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 16,
                maxWidth: 1200,
                margin: '0 auto',
              }}
            >
              {assignments.map((a) => {
                const diff = difficultyConfig[a.difficulty] || difficultyConfig.beginner
                return (
                  <div
                    key={a.id}
                    onClick={() => navigate(`/assignment/${a.id}/edit`)}
                    style={{
                      width: 320,
                      background: 'white',
                      borderRadius: 12,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      padding: 20,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ color: '#1a1a2e', fontWeight: 600, fontSize: 16, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.title}
                      </span>
                      <span
                        style={{
                          borderRadius: 16,
                          padding: '4px 12px',
                          fontSize: 12,
                          background: diff.bg,
                          color: diff.text,
                          flexShrink: 0,
                          marginLeft: 8,
                        }}
                      >
                        {diff.label}
                      </span>
                    </div>
                    <p
                      style={{
                        color: '#666',
                        fontSize: 14,
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.5,
                      }}
                    >
                      {a.description}
                    </p>
                    <button
                      onClick={(e) => handleDelete(e, a.id)}
                      style={{
                        position: 'absolute',
                        bottom: 12,
                        right: 12,
                        background: 'none',
                        border: 'none',
                        color: '#e53935',
                        fontSize: 12,
                        cursor: 'pointer',
                        padding: '4px 8px',
                      }}
                    >
                      删除
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a2e', marginBottom: 20 }}>
            提交统计
          </h2>

          {stats.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>暂无数据</div>
          ) : (
            <table
              style={{
                width: '100%',
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderCollapse: 'separate',
                borderSpacing: 0,
                overflow: 'hidden',
              }}
            >
              <thead>
                <tr style={{ background: '#f0f1f5' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>题目</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>总提交</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>通过数</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>通过率</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr
                    key={s.assignmentId}
                    style={{ borderBottom: '1px solid #f0f1f5' }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#333' }}>{s.title}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 14, color: '#333' }}>{s.totalSubmissions}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 14, color: '#333' }}>{s.passedSubmissions}</td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        fontSize: 14,
                        background: s.passRate < 50 ? '#fff3e0' : 'transparent',
                        color: s.passRate < 50 ? '#ef6c00' : '#333',
                        fontWeight: s.passRate < 50 ? 600 : 400,
                      }}
                    >
                      {s.passRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
