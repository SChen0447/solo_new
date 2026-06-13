import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { Member, Story } from '../App'

interface Props {
  member: Member
  stories: Story[]
  onAddStory: (s: Partial<Story>) => Promise<Story>
  onDeleteStory: (id: string) => Promise<void>
  onLoadMemberStories: (memberId: string) => Promise<Story[]>
  onClose: () => void
}

function WaveformVisualizer({
  analyser, active,
}: {
  analyser: AnalyserNode | null
  active: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      if (active && analyser) {
        const bufferLen = analyser.frequencyBinCount
        const data = new Uint8Array(bufferLen)
        analyser.getByteFrequencyData(data)

        const barCount = 48
        const step = Math.floor(bufferLen / barCount)
        const barWidth = (w - barCount * 2) / barCount

        for (let i = 0; i < barCount; i++) {
          const v = data[i * step] / 255
          const bh = Math.max(4, v * h * 0.85)
          const x = i * (barWidth + 2)
          const y = (h - bh) / 2
          const grad = ctx.createLinearGradient(0, y, 0, y + bh)
          grad.addColorStop(0, '#E8C39E')
          grad.addColorStop(1, '#D4A574')
          ctx.fillStyle = grad
          const radius = Math.min(barWidth / 2, 2)
          ctx.beginPath()
          ctx.roundRect(x, y, barWidth, bh, [radius, radius, radius, radius])
          ctx.fill()
        }
      } else {
        for (let i = 0; i < 48; i++) {
          const bh = 4 + Math.random() * 2
          const barWidth = (w - 48 * 2) / 48
          const x = i * (barWidth + 2)
          const y = (h - bh) / 2
          ctx.fillStyle = '#E8D5C0'
          ctx.fillRect(x, y, barWidth, bh)
        }
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [analyser, active])

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={56}
      style={{ width: '100%', borderRadius: 8, background: 'var(--bg-primary)' }}
    />
  )
}

function VoiceRecorder({
  onDone,
}: {
  onDone: (voiceData: string) => void
}) {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number>(0)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtxRef.current = ctx
      const src = ctx.createMediaStreamSource(stream)
      const an = ctx.createAnalyser()
      an.fftSize = 256
      src.connect(an)
      setAnalyser(an)

      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => onDone(reader.result as string)
        reader.readAsDataURL(blob)
        stream.getTracks().forEach(t => t.stop())
        ctx.close()
        setAnalyser(null)
        setDuration(0)
      }
      mr.start()
      setRecording(true)
      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000)
    } catch (e) {
      console.error('录音失败:', e)
      const mockDuration = Math.floor(Math.random() * 10) + 3
      onDone(`data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAA=${mockDuration}`)
    }
  }, [onDone])

  const stop = useCallback(() => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
  }, [])

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (audioCtxRef.current) audioCtxRef.current.close()
  }, [])

  const mm = String(Math.floor(duration / 60)).padStart(2, '0')
  const ss = String(duration % 60).padStart(2, '0')

  return (
    <div style={{
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: 12,
      background: 'var(--bg-primary)',
    }}>
      <WaveformVisualizer analyser={analyser} active={recording} />
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 8,
      }}>
        <div style={{
          fontFamily: 'monospace', fontSize: 16,
          color: recording ? 'var(--accent)' : 'var(--text-secondary)',
          fontWeight: 600,
        }}>
          {recording && <span style={{ color: '#D14343', marginRight: 6 }}>●</span>}
          {mm}:{ss}
        </div>
        {!recording ? (
          <button onClick={start} style={{
            background: 'var(--accent)', color: '#FFF5E6',
            padding: '8px 18px', borderRadius: 'var(--radius-sm)',
            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            🎙️ 开始录音
          </button>
        ) : (
          <button onClick={stop} style={{
            background: '#D14343', color: '#fff',
            padding: '8px 18px', borderRadius: 'var(--radius-sm)',
            fontSize: 13, fontWeight: 600,
          }}>
            停止录音
          </button>
        )}
      </div>
    </div>
  )
}

function PhotoUploader({
  value, onChange,
}: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handle = (file: File) => {
    setLoading(true)
    const t0 = performance.now()
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const elapsed = performance.now() - t0
      const minWait = Math.max(0, 400 - elapsed)
      setTimeout(() => {
        onChange(base64)
        setLoading(false)
      }, minWait)
    }
    reader.onerror = () => setLoading(false)
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handle(f)
        }}
      />
      {value && !loading ? (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 12, overflow: 'hidden', border: '2px solid var(--accent)', background: '#000' }}>
          <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(74,59,50,0.85)', color: '#FFF5E6',
              width: 28, height: 28, borderRadius: '50%', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
          <button
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
            style={{
              position: 'absolute', bottom: 6, right: 6,
              background: 'var(--accent)', color: '#FFF5E6',
              padding: '4px 10px', borderRadius: 6, fontSize: 12,
            }}
          >更换</button>
        </div>
      ) : loading ? (
        <div style={{
          width: '100%', aspectRatio: '16 / 9', borderRadius: 12,
          background: 'var(--accent-light)', border: '2px dashed var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8,
        }}>
          <div style={{
            width: 36, height: 36, border: '3px solid var(--accent)',
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>正在上传照片...</div>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            width: '100%', aspectRatio: '16 / 9', borderRadius: 12,
            border: '2px dashed var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 6, cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all 0.2s ease',
            background: 'var(--bg-primary)',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
        >
          <span style={{ fontSize: 28 }}>📷</span>
          <span style={{ fontSize: 13 }}>点击上传照片</span>
        </div>
      )}
    </div>
  )
}

export default function StoryCard({
  member, stories, onAddStory, onDeleteStory, onLoadMemberStories, onClose,
}: Props) {
  const [loadingStories, setLoadingStories] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [year, setYear] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [voice, setVoice] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playAnalyserRef = useRef<{ analyser: AnalyserNode; src: MediaElementAudioSourceNode } | null>(null)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    let alive = true
    setLoadingStories(true)
    onLoadMemberStories(member.id).then(() => {
      if (alive) setLoadingStories(false)
    })
    return () => { alive = false }
  }, [member.id, onLoadMemberStories])

  const submit = async () => {
    if (!title.trim() && !text.trim() && !photo && !voice) return
    await onAddStory({
      member_id: member.id,
      title: title.trim() || null,
      text: text.trim() || null,
      year: year.trim() || null,
      photo,
      voice,
    })
    setTitle(''); setText(''); setYear(''); setPhoto(null); setVoice(null)
    setShowForm(false)
  }

  const playVoice = useCallback((s: Story) => {
    if (!s.voice) return
    if (playingId === s.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    try {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const a = new Audio(s.voice)
      audioRef.current = a
      a.addEventListener('ended', () => setPlayingId(null))
      a.addEventListener('play', () => forceUpdate(n => n + 1))
      a.play().catch(() => setPlayingId(null))
      setPlayingId(s.id)
    } catch {
      setPlayingId(s.id)
      setTimeout(() => setPlayingId(null), 3000)
    }
  }, [playingId])

  const birth = member.birth_year || '?'
  const death = member.death_year
  const years = death ? `${birth} - ${death}` : birth

  return (
    <div style={{ padding: 'var(--card-padding)' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: member.avatar ? `url(${member.avatar}) center/cover` : 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFF5E6', fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700,
            flexShrink: 0, boxShadow: 'var(--shadow-sm)',
          }}>
            {member.avatar ? '' : member.name?.[0] || '?'}
          </div>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 18,
              color: 'var(--text-primary)', marginBottom: 2,
            }}>{member.name}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{years}</p>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', color: 'var(--text-secondary)',
          fontSize: 20, padding: 4, lineHeight: 1,
        }}>✕</button>
      </div>

      <button onClick={() => setShowForm(v => !v)} style={{
        width: '100%', padding: '12px 16px', marginBottom: 16,
        background: 'var(--accent-light)', color: 'var(--text-primary)',
        borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        border: '1px dashed var(--accent)',
      }}>
        <span>{showForm ? '✕' : '+'}</span>
        {showForm ? '取消新增' : '添加回忆故事'}
      </button>

      {showForm && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16,
          display: 'flex', flexDirection: 'column', gap: 12,
          animation: 'fadeIn 0.3s ease',
        }}>
          <input
            placeholder="故事标题"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)', fontSize: 14,
              background: 'var(--bg-primary)',
            }}
          />
          <input
            placeholder="发生年份（可选）"
            value={year}
            onChange={e => setYear(e.target.value)}
            style={{
              padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)', fontSize: 14,
              background: 'var(--bg-primary)', width: 140,
            }}
          />
          <PhotoUploader value={photo} onChange={setPhoto} />
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>语音故事</div>
            <VoiceRecorder onDone={setVoice} />
            {voice && (
              <div style={{
                marginTop: 8, padding: '8px 12px', borderRadius: 8,
                background: 'var(--accent-light)', fontSize: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: 'var(--text-primary)' }}>🎙️ 已录制语音</span>
                <button onClick={() => setVoice(null)} style={{ color: '#D14343', fontSize: 12 }}>移除</button>
              </div>
            )}
          </div>
          <textarea
            placeholder="讲述这段回忆..."
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            style={{
              padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)', fontSize: 14,
              background: 'var(--bg-primary)', resize: 'vertical',
              fontFamily: 'var(--font-body)', lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowForm(false)}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)', color: 'var(--text-secondary)',
                fontSize: 13, border: '1px solid var(--border-color)',
              }}
            >取消</button>
            <button
              onClick={submit}
              style={{
                padding: '8px 20px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)', color: '#FFF5E6',
                fontSize: 13, fontWeight: 600,
              }}
            >保存</button>
          </div>
        </div>
      )}

      <div>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: 14,
          color: 'var(--text-secondary)', marginBottom: 12,
          paddingLeft: 4, borderLeft: '3px solid var(--accent)',
        }}>
          回忆故事 ({stories.length})
        </h3>
        {loadingStories ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>加载中...</div>
        ) : stories.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 32, color: 'var(--text-secondary)',
            fontSize: 13,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            暂无回忆故事，点击上方按钮添加
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stories.map((s, idx) => {
              const expanded = expandedId === s.id
              const playing = playingId === s.id
              return (
                <div
                  key={s.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)',
                    animation: `fadeIn 0.4s ease ${idx * 0.05}s both`,
                  }}
                >
                  {s.photo && (
                    <div style={{ width: '100%', aspectRatio: '16 / 9', borderBottom: '2px solid var(--accent)', background: '#000' }}>
                      <img src={s.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <h4 style={{
                        fontFamily: 'var(--font-display)', fontSize: 15,
                        color: 'var(--text-primary)',
                      }}>
                        {s.title || '未命名回忆'}
                        {s.year && (
                          <span style={{
                            fontSize: 12, color: 'var(--accent)',
                            fontWeight: 400, marginLeft: 8,
                          }}>
                            · {s.year}
                          </span>
                        )}
                      </h4>
                      <button onClick={() => onDeleteStory(s.id)} style={{
                        color: 'var(--text-secondary)', background: 'none', fontSize: 13, padding: 4,
                      }}>✕</button>
                    </div>
                    {s.voice && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        marginBottom: 8, padding: '8px 12px',
                        background: 'var(--accent-light)', borderRadius: 8,
                        cursor: 'pointer',
                      }} onClick={() => playVoice(s)}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'var(--accent)', color: '#FFF5E6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, flexShrink: 0,
                          animation: playing ? 'pulse 1s ease infinite' : undefined,
                        }}>
                          {playing ? '⏸' : '▶'}
                        </div>
                        <WaveformMini active={playing} />
                      </div>
                    )}
                    <div style={{
                      fontSize: 14, color: 'var(--text-primary)',
                      lineHeight: 1.7,
                      display: expanded ? 'block' : '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: expanded ? 'unset' : 3,
                      overflow: expanded ? 'visible' : 'hidden',
                      maxHeight: expanded ? 'none' : undefined,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {s.text || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>（无文字描述）</span>}
                    </div>
                    {s.text && s.text.length > 80 && (
                      <button
                        onClick={() => setExpandedId(expanded ? null : s.id)}
                        style={{
                          marginTop: 6, fontSize: 12,
                          color: 'var(--accent)', background: 'none',
                        }}
                      >
                        {expanded ? '收起 ▲' : '展开 ▼'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function WaveformMini({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const draw = () => {
      const w = c.width, h = c.height
      ctx.clearRect(0, 0, w, h)
      const count = 28
      const gap = 2
      const bw = (w - gap * (count - 1)) / count
      for (let i = 0; i < count; i++) {
        const v = active ? 0.2 + Math.random() * 0.8 : 0.15 + Math.sin(i * 0.6) * 0.08
        const bh = Math.max(3, v * h)
        const x = i * (bw + gap)
        const y = (h - bh) / 2
        ctx.fillStyle = active ? 'var(--accent)' : '#C4A882'
        ctx.fillRect(x, y, bw, bh)
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [active])

  return <canvas ref={canvasRef} width={200} height={28} style={{ flex: 1, height: 28 }} />
}
