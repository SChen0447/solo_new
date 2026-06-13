import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'
import type { Member, Story, ShareInfo } from '../App'

interface Props {
  members: Member[]
  stories: Story[]
  onCreateShare: (title: string, memberIds: string[], storyIds: string[]) => Promise<ShareInfo>
}

export default function SharePage({ members, stories, onCreateShare }: Props) {
  const { shareId } = useParams()
  const [title, setTitle] = useState('我的家族回忆录')
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set())
  const [shareResult, setShareResult] = useState<ShareInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadedShare, setLoadedShare] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (shareId) {
      axios.get(`/api/share/${shareId}`).then(res => {
        if (res.data && !res.data.error) setLoadedShare(res.data)
      })
    }
  }, [shareId])

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) =>
      (a.birth_year || '9999').localeCompare(b.birth_year || '9999')
    )
  }, [members])

  const availableStories = useMemo(() => {
    return stories.filter(s => selectedMembers.has(s.member_id))
  }, [stories, selectedMembers])

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => {
      const n = new Set(prev)
      if (n.has(id)) {
        n.delete(id)
        setSelectedStories(ps => {
          const ns = new Set(ps)
          stories.filter(s => s.member_id === id).forEach(s => ns.delete(s.id))
          return ns
        })
      } else n.add(id)
      return n
    })
  }

  const toggleStory = (id: string) => setSelectedStories(prev => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  const selectAll = () => {
    setSelectedMembers(new Set(members.map(m => m.id)))
    setSelectedStories(new Set(stories.map(s => s.id)))
  }

  const clearAll = () => {
    setSelectedMembers(new Set())
    setSelectedStories(new Set())
  }

  const generate = async () => {
    if (selectedMembers.size === 0) return
    setLoading(true)
    try {
      const res = await onCreateShare(title, Array.from(selectedMembers), Array.from(selectedStories))
      setShareResult(res)
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    if (!shareResult) return
    const url = `${window.location.origin}${window.location.pathname}#${shareResult.share_url}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loadedShare && loadedShare.html) {
    return (
      <div style={{ minHeight: 'calc(100vh - 57px)', background: 'var(--bg-primary)' }}>
        <iframe
          srcDoc={loadedShare.html}
          title={loadedShare.title || '回忆录'}
          style={{
            width: '100%', minHeight: 'calc(100vh - 57px)',
            border: 'none', background: 'white',
          }}
        />
      </div>
    )
  }

  const pageData = useMemo(() => {
    const result: { member: Member; stories: Story[] }[] = []
    sortedMembers.filter(m => selectedMembers.has(m.id)).forEach(m => {
      result.push({
        member: m,
        stories: availableStories.filter(s => s.member_id === m.id && selectedStories.has(s.id)),
      })
    })
    return result
  }, [sortedMembers, selectedMembers, availableStories, selectedStories])

  const totalPages = Math.max(1, pageData.length)

  const goPage = (idx: number) => {
    if (isFlipping || idx < 0 || idx >= totalPages) return
    setIsFlipping(true)
    setTimeout(() => {
      setCurrentPage(idx)
      setIsFlipping(false)
    }, 320)
  }

  if (shareResult) {
    return (
      <div style={{ padding: 'var(--card-padding)', maxWidth: 720, margin: '0 auto' }}>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
          padding: 'var(--card-padding)', boxShadow: 'var(--shadow-md)',
          textAlign: 'center', animation: 'fadeInScale 0.4s ease',
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 24,
            color: 'var(--text-primary)', marginBottom: 8,
          }}>
            回忆录生成成功！
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
            {shareResult.title}
          </p>
          <div style={{
            background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)',
            padding: 16, marginBottom: 20, textAlign: 'left',
            border: '1px solid var(--border-color)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>分享链接</div>
            <div style={{
              fontSize: 13, color: 'var(--accent)', wordBreak: 'break-all',
              fontFamily: 'monospace',
            }}>
              {window.location.origin}/share/{shareResult.share_id}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={copyLink} style={{
              padding: '12px 24px', borderRadius: 'var(--radius-md)',
              background: copied ? '#6A9A5C' : 'var(--accent)',
              color: '#FFF5E6', fontSize: 14, fontWeight: 600,
              transition: 'background 0.2s',
            }}>
              {copied ? '✓ 已复制链接' : '📋 复制链接'}
            </button>
            <button onClick={() => {
              setShareResult(null)
              setCurrentPage(0)
            }} style={{
              padding: '12px 24px', borderRadius: 'var(--radius-md)',
              background: 'var(--accent-light)', color: 'var(--text-secondary)',
              fontSize: 14, fontWeight: 600,
            }}>
              继续编辑
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--card-padding)', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        padding: 'var(--card-padding)', marginBottom: 20,
        boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 24,
          color: 'var(--text-primary)', marginBottom: 4,
        }}>📖 生成数字回忆录</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
          选择成员和故事，生成可分享的家族回忆录
        </p>

        <input
          placeholder="回忆录标题"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{
            width: '100%', maxWidth: 400, padding: '10px 14px',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
            fontSize: 15, fontFamily: 'var(--font-display)',
            background: 'var(--bg-primary)', marginBottom: 16,
          }}
        />

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button onClick={selectAll} style={{
            padding: '6px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-light)', color: 'var(--text-primary)',
            fontSize: 13, fontWeight: 500,
          }}>全选</button>
          <button onClick={clearAll} style={{
            padding: '6px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-primary)', color: 'var(--text-secondary)',
            fontSize: 13, border: '1px solid var(--border-color)',
          }}>清空</button>
          <span style={{
            marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)',
            alignSelf: 'center',
          }}>
            已选 {selectedMembers.size} 位成员 / {selectedStories.size} 个故事
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}>
          {sortedMembers.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1', padding: 40,
              textAlign: 'center', color: 'var(--text-secondary)',
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🌳</div>
              请先在家族树页面添加成员
            </div>
          ) : sortedMembers.map(m => {
            const selected = selectedMembers.has(m.id)
            const memberStories = stories.filter(s => s.member_id === m.id)
            const birth = m.birth_year || '?'
            const death = m.death_year
            const years = death ? `${birth}-${death}` : birth
            return (
              <div
                key={m.id}
                onClick={() => toggleMember(m.id)}
                style={{
                  background: selected ? 'var(--accent-light)' : 'var(--bg-primary)',
                  border: selected ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  animation: 'fadeIn 0.3s ease both',
                }}
              >
                {selected && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--accent)', color: '#FFF5E6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12,
                  }}>✓</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: m.avatar ? `url(${m.avatar}) center/cover` : 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#FFF5E6', fontSize: 16,
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {m.avatar ? '' : m.name?.[0] || '?'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, color: 'var(--text-primary)',
                      fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{years}</div>
                  </div>
                </div>
                {selected && memberStories.length > 0 && (
                  <div style={{
                    marginTop: 10, paddingTop: 10,
                    borderTop: '1px dashed var(--border-color)',
                  }} onClick={e => e.stopPropagation()}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      选择故事：
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
                      {memberStories.map(s => {
                        const sSel = selectedStories.has(s.id)
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggleStory(s.id)}
                            style={{
                              padding: '6px 8px', borderRadius: 6,
                              background: sSel ? 'var(--accent)' : 'var(--bg-card)',
                              color: sSel ? '#FFF5E6' : 'var(--text-primary)',
                              fontSize: 12, cursor: 'pointer',
                              display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center',
                              border: '1px solid',
                              borderColor: sSel ? 'var(--accent)' : 'var(--border-color)',
                            }}
                          >
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                              {s.title || '未命名'}
                            </span>
                            {sSel && <span>✓</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {pageData.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
          padding: 'var(--card-padding)', marginBottom: 20,
          boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 18,
            color: 'var(--text-primary)', marginBottom: 16,
          }}>📚 回忆录预览</h2>

          <div style={{ position: 'relative', perspective: 1200 }}>
            <div style={{
              minHeight: 400,
              background: 'linear-gradient(135deg, #FFFBF5 0%, #FFF5E6 100%)',
              borderRadius: 'var(--radius-md)',
              padding: 32,
              transform: isFlipping ? 'translateX(-30px) rotateY(-4deg)' : 'translateX(0) rotateY(0)',
              opacity: isFlipping ? 0 : 1,
              transition: 'all 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 8px 32px rgba(74, 59, 50, 0.08)',
              border: '1px solid var(--border-color)',
            }}>
              {pageData[currentPage] && (
                <MemoirPage data={pageData[currentPage]} />
              )}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <button
                onClick={() => goPage(currentPage - 1)}
                disabled={currentPage === 0}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                  background: currentPage === 0 ? 'var(--accent-light)' : 'var(--accent)',
                  color: currentPage === 0 ? 'var(--text-secondary)' : '#FFF5E6',
                  fontSize: 13, fontWeight: 500,
                  cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                }}
              >← 上一页</button>
              <div style={{
                fontSize: 13, color: 'var(--text-secondary)',
                fontFamily: 'var(--font-display)',
              }}>
                {currentPage + 1} / {totalPages}
              </div>
              <button
                onClick={() => goPage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                  background: currentPage >= totalPages - 1 ? 'var(--accent-light)' : 'var(--accent)',
                  color: currentPage >= totalPages - 1 ? 'var(--text-secondary)' : '#FFF5E6',
                  fontSize: 13, fontWeight: 500,
                  cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                }}
              >下一页 →</button>
            </div>
            <div style={{
              height: 4, background: 'var(--accent-light)',
              borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${((currentPage + 1) / totalPages) * 100}%`,
                background: 'var(--accent)', transition: 'width 0.3s ease',
                borderRadius: 2,
              }} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap',
            }}>
              {pageData.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goPage(i)}
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: i === currentPage ? 'var(--accent)' : 'var(--border-color)',
                    border: 'none', cursor: 'pointer', padding: 0,
                    transition: 'all 0.2s',
                    transform: i === currentPage ? 'scale(1.3)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={generate}
          disabled={selectedMembers.size === 0 || loading}
          style={{
            padding: '14px 40px', borderRadius: 'var(--radius-md)',
            background: loading ? 'var(--accent-light)' : 'var(--accent)',
            color: '#FFF5E6', fontSize: 16, fontWeight: 700,
            fontFamily: 'var(--font-display)',
            cursor: selectedMembers.size === 0 || loading ? 'not-allowed' : 'pointer',
            boxShadow: 'var(--shadow-md)',
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: selectedMembers.size === 0 ? 0.5 : 1,
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: 18, height: 18, border: '2px solid rgba(255,245,230,0.4)',
                borderTopColor: '#FFF5E6', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              生成中...
            </>
          ) : (
            <>
              <span>✨</span>
              生成数字回忆录
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function MemoirPage({ data }: { data: { member: Member; stories: Story[] } }) {
  const { member, stories } = data
  const birth = member.birth_year || '?'
  const death = member.death_year
  const years = death ? `${birth} - ${death}` : `${birth} - 至今`

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: member.avatar ? `url(${member.avatar}) center/cover` : 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FFF5E6', fontSize: 30, margin: '0 auto 12px',
          fontFamily: 'var(--font-display)', fontWeight: 700,
          boxShadow: '0 4px 16px rgba(212,165,116,0.3)',
        }}>
          {member.avatar ? '' : member.name?.[0] || '?'}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 24,
          color: 'var(--text-primary)', marginBottom: 4,
        }}>{member.name}</h1>
        <p style={{
          color: 'var(--text-secondary)', fontSize: 14,
          fontFamily: 'var(--font-display)',
        }}>{years}</p>
        <div style={{
          width: 80, height: 2, background: 'var(--accent)',
          margin: '16px auto 0', borderRadius: 1,
        }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {stories.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 32,
            color: 'var(--text-secondary)', fontSize: 14,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🌸</div>
            此成员暂无故事收录
          </div>
        ) : stories.map((s, i) => (
          <div key={s.id} style={{
            background: 'white', borderRadius: 'var(--radius-md)',
            padding: 16, boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-color)',
            animation: `fadeIn 0.5s ease ${i * 0.1}s both`,
          }}>
            {s.photo && (
              <div style={{
                width: '100%', aspectRatio: '16 / 9', borderRadius: 10,
                overflow: 'hidden', marginBottom: 12,
                border: '2px solid var(--accent)',
              }}>
                <img src={s.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 17,
              color: 'var(--accent)', marginBottom: 6,
            }}>
              {s.title || '未命名回忆'}
              {s.year && (
                <span style={{
                  fontSize: 13, color: 'var(--text-secondary)',
                  fontWeight: 400, marginLeft: 8,
                }}>
                  · {s.year}
                </span>
              )}
            </h3>
            {s.voice && (
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--accent-light)', fontSize: 13,
                color: 'var(--text-secondary)', marginBottom: 8,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                🎙️ 语音故事
              </div>
            )}
            {s.text && (
              <p style={{
                color: 'var(--text-primary)', fontSize: 14,
                lineHeight: 1.8, whiteSpace: 'pre-wrap',
              }}>
                {s.text}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
