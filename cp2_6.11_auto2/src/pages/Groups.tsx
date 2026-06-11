import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { useAppStore } from '@/store'
import StudyGroup from '@/components/StudyGroup'
import { cn } from '@/lib/utils'

export default function Groups() {
  const {
    groups,
    decks,
    currentUserId,
    loading,
    fetchGroups,
    fetchDecks,
    joinGroup,
    leaveGroup,
    createGroup,
  } = useAppStore()

  const [showModal, setShowModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupCreator, setNewGroupCreator] = useState('我')
  const [selectedDeckId, setSelectedDeckId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null)

  useEffect(() => {
    fetchGroups()
    fetchDecks()
  }, [fetchGroups, fetchDecks])

  const handleJoin = async (groupId: string) => {
    setJoiningGroupId(groupId)
    try {
      await joinGroup(groupId)
    } finally {
      setJoiningGroupId(null)
    }
  }

  const handleLeave = async (groupId: string) => {
    setJoiningGroupId(groupId)
    try {
      await leaveGroup(groupId)
    } finally {
      setJoiningGroupId(null)
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !selectedDeckId) return
    setIsCreating(true)
    try {
      await createGroup(newGroupName.trim(), newGroupCreator.trim() || '我', selectedDeckId)
      setShowModal(false)
      setNewGroupName('')
      setNewGroupCreator('我')
      setSelectedDeckId('')
    } finally {
      setIsCreating(false)
    }
  }

  const getDeckName = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId)
    return deck?.name
  }

  const isUserJoined = (members: string[]) => {
    return members.includes(currentUserId)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">学习小组</h1>
          <p className="text-gray-500 mt-2">加入学习小组，和小伙伴们一起进步！</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-accent text-white rounded-lg py-2 px-4 font-medium btn-press flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          创建小组
        </button>
      </div>

      {loading && groups.length === 0 ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          还没有学习小组，快来创建第一个吧！
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group, index) => (
            <div
              key={group.id}
              className="fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <StudyGroup
                group={group}
                isJoined={isUserJoined(group.members)}
                onJoin={() => handleJoin(group.id)}
                onLeave={() => handleLeave(group.id)}
                deckName={getDeckName(group.deckId)}
              />
              {joiningGroupId === group.id && (
                <div className="text-center mt-2 text-sm text-gray-500">处理中...</div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={cn(
            'bg-white rounded-xl shadow-2xl w-full max-w-md p-6 fade-in'
          )}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-primary">创建学习小组</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  小组名称
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="请输入小组名称"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  创建者
                </label>
                <input
                  type="text"
                  value={newGroupCreator}
                  onChange={(e) => setNewGroupCreator(e.target.value)}
                  placeholder="请输入创建者名称"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选择卡组
                </label>
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">请选择一个卡组</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 btn-press"
              >
                取消
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || !selectedDeckId || isCreating}
                className={cn(
                  'flex-1 py-2 px-4 rounded-lg font-medium btn-press',
                  newGroupName.trim() && selectedDeckId && !isCreating
                    ? 'bg-accent text-white hover:opacity-90'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                )}
              >
                {isCreating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
