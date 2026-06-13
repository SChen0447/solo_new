import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import axios from 'axios'
import FamilyTree from './components/FamilyTree'
import StoryCard from './components/StoryCard'
import SharePage from './components/SharePage'

export interface Member {
  id: string
  name: string
  birth_year: string | null
  death_year: string | null
  avatar: string | null
  parent_id: string | null
  x: number
  y: number
}

export interface Story {
  id: string
  member_id: string
  title: string | null
  text: string | null
  photo: string | null
  voice: string | null
  year: string | null
}

export interface ShareInfo {
  share_id: string
  share_url: string
  title: string
}

function App() {
  const [members, setMembers] = useState<Member[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMembers = useCallback(async () => {
    try {
      const res = await axios.get('/api/tree')
      setMembers(res.data.members || [])
    } catch (e) {
      console.error('Failed to load members:', e)
    }
  }, [])

  const loadAllStories = useCallback(async () => {
    try {
      const res = await axios.get('/api/stories')
      setStories(res.data.stories || [])
    } catch (e) {
      console.error('Failed to load stories:', e)
    }
  }, [])

  const loadMemberStories = useCallback(async (memberId: string) => {
    try {
      const res = await axios.get('/api/stories', { params: { member_id: memberId } })
      return res.data.stories || []
    } catch (e) {
      console.error('Failed to load member stories:', e)
      return []
    }
  }, [])

  useEffect(() => {
    Promise.all([loadMembers(), loadAllStories()]).finally(() => setLoading(false))
  }, [loadMembers, loadAllStories])

  const addMember = async (member: Partial<Member>) => {
    const res = await axios.post('/api/tree', member)
    setMembers(prev => [...prev, res.data])
    return res.data
  }

  const updateMember = async (id: string, data: Partial<Member>) => {
    const res = await axios.put(`/api/tree/${id}`, data)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...res.data } : m))
    return res.data
  }

  const deleteMember = async (id: string) => {
    await axios.delete(`/api/tree/${id}`)
    setMembers(prev => prev.filter(m => m.id !== id))
    setStories(prev => prev.filter(s => s.member_id !== id))
    if (selectedMember?.id === id) setSelectedMember(null)
  }

  const addStory = async (story: Partial<Story>) => {
    const res = await axios.post('/api/stories', story)
    setStories(prev => [...prev, res.data])
    return res.data
  }

  const deleteStory = async (id: string) => {
    await axios.delete(`/api/stories/${id}`)
    setStories(prev => prev.filter(s => s.id !== id))
  }

  const createShare = async (title: string, memberIds: string[], storyIds: string[]): Promise<ShareInfo> => {
    const res = await axios.post('/api/share', { title, member_ids: memberIds, story_ids: storyIds })
    return res.data
  }

  const memberStories = selectedMember
    ? stories.filter(s => s.member_id === selectedMember.id)
    : []

  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', background: 'var(--bg-primary)',
        fontFamily: 'var(--font-display)'
      }}>
        <div style={{ textAlign: 'center', animation: 'fadeInScale 0.6s ease' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h2 style={{ color: 'var(--text-primary)', fontWeight: 400 }}>时光胶囊加载中...</h2>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px var(--card-padding)',
        background: 'rgba(255,245,230,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <NavLink to="/" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          textDecoration: 'none',
        }}>
          <span style={{ fontSize: 28 }}>🏺</span>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 22,
            fontWeight: 700, color: 'var(--text-primary)',
          }}>时光胶囊</span>
        </NavLink>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { to: '/', label: '家族树', icon: '🌳' },
            { to: '/share', label: '回忆录', icon: '📖' },
          ].map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                fontSize: 14, fontWeight: 500,
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? '#FFF5E6' : 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'all 0.25s ease',
              })}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={
          <div style={{
            display: 'flex', gap: 0, minHeight: 'calc(100vh - 57px)',
          }}>
            <div style={{
              flex: selectedMember ? '1 1 60%' : '1 1 100%',
              transition: 'flex 0.3s ease',
              overflow: 'auto',
            }}>
              <FamilyTree
                members={members}
                onAddMember={addMember}
                onUpdateMember={updateMember}
                onDeleteMember={deleteMember}
                onSelectMember={setSelectedMember}
                selectedMember={selectedMember}
              />
            </div>
            {selectedMember && (
              <div style={{
                flex: '0 0 380px', borderLeft: '1px solid var(--border-color)',
                background: 'var(--bg-card)', overflow: 'auto',
                animation: 'slideInLeft 0.35s ease',
              }}>
                <StoryCard
                  member={selectedMember}
                  stories={memberStories}
                  onAddStory={addStory}
                  onDeleteStory={deleteStory}
                  onLoadMemberStories={loadMemberStories}
                  onClose={() => setSelectedMember(null)}
                />
              </div>
            )}
          </div>
        } />
        <Route path="/share" element={
          <SharePage
            members={members}
            stories={stories}
            onCreateShare={createShare}
          />
        } />
        <Route path="/share/:shareId" element={
          <SharePage
            members={members}
            stories={stories}
            onCreateShare={createShare}
          />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
