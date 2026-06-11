import { ref, computed, watch, onMounted } from 'vue'

export type VoteType = 'up' | 'neutral' | 'down' | null

export interface Comment {
  id: string
  content: string
  authorName: string
  authorAvatar: string
  createdAt: number
}

export interface Idea {
  id: string
  title: string
  description: string
  authorName: string
  authorAvatar: string
  createdAt: number
  votes: {
    up: number
    neutral: number
    down: number
  }
  userVotes: Record<string, VoteType>
  comments: Comment[]
}

export type SortType = 'hot' | 'latest' | 'mostUp' | 'controversial'

const STORAGE_KEY = 'idea_voting_wall'
const USER_ID_KEY = 'idea_voting_user_id'

const avatarColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe', '#6c5ce7', '#00b894']
const avatarEmojis = ['🎨', '🚀', '💡', '🔥', '⭐', '🎯', '🌈', '⚡', '🎪', '🔮', '🎭', '🦄', '🐉', '🌟', '💫']

function generateUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY)
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem(USER_ID_KEY, userId)
  }
  return userId
}

function generateAvatar(): string {
  const color = avatarColors[Math.floor(Math.random() * avatarColors.length)]
  const emoji = avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)]
  return `${color}|${emoji}`
}

function generateAuthorName(): string {
  const adjectives = ['创意', '聪明', '勇敢', '快乐', '神秘', '优雅', '活力', '智慧', '阳光', '酷炫']
  const nouns = ['小达人', '发明家', '梦想家', '探索者', '创造者', '思想家', '艺术家', '工程师', '设计师', '先锋']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 1000)
  return `${adj}${noun}${num}`
}

function generateId(): string {
  return 'idea_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

function parseAvatar(avatar: string): { color: string; emoji: string } {
  const [color, emoji] = avatar.split('|')
  return { color, emoji }
}

export function useIdeas() {
  const ideas = ref<Idea[]>([])
  const sortType = ref<SortType>('hot')
  const userId = ref(generateUserId())
  const currentUserName = ref(generateAuthorName())
  const currentUserAvatar = ref(generateAvatar())

  function loadIdeas() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        ideas.value = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load ideas from localStorage:', e)
    }
  }

  function saveIdeas() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas.value))
    } catch (e) {
      console.error('Failed to save ideas to localStorage:', e)
    }
  }

  watch(ideas, saveIdeas, { deep: true })

  onMounted(() => {
    loadIdeas()
    if (ideas.value.length === 0) {
      seedSampleData()
    }
  })

  function seedSampleData() {
    const sampleIdeas: Idea[] = [
      {
        id: generateId(),
        title: '建立团队共享知识库',
        description: '创建一个集中的知识库平台，让团队成员可以分享和查找项目经验、技术文档和最佳实践，减少重复劳动，提高工作效率。',
        authorName: '智慧探索者42',
        authorAvatar: '#4ecdc4|💡',
        createdAt: Date.now() - 86400000 * 2,
        votes: { up: 15, neutral: 3, down: 2 },
        userVotes: {},
        comments: [
          {
            id: generateId(),
            content: '这个想法很棒，我们团队现在确实有知识断层的问题。',
            authorName: '创意小达人123',
            authorAvatar: '#ff6b6b|🚀',
            createdAt: Date.now() - 86400000
          }
        ]
      },
      {
        id: generateId(),
        title: '每周五下午技术分享会',
        description: '固定每周五下午安排一小时技术分享，每位成员轮流分享自己擅长的技术或近期学习的内容，促进团队技术交流和成长。',
        authorName: '活力创造者88',
        authorAvatar: '#ffd43b|⭐',
        createdAt: Date.now() - 86400000,
        votes: { up: 12, neutral: 5, down: 1 },
        userVotes: {},
        comments: []
      },
      {
        id: generateId(),
        title: '引入代码审查自动化工具',
        description: '集成SonarQube等代码质量检测工具到CI/CD流程中，自动检测代码异味、漏洞和重复代码，提升代码质量。',
        authorName: '严谨工程师567',
        authorAvatar: '#a29bfe|🎯',
        createdAt: Date.now() - 3600000 * 12,
        votes: { up: 8, neutral: 8, down: 4 },
        userVotes: {},
        comments: []
      },
      {
        id: generateId(),
        title: '远程办公弹性工作制',
        description: '允许员工每周选择1-2天远程办公，灵活安排工作时间，提高工作生活平衡，同时减少通勤时间和压力。',
        authorName: '快乐思想家99',
        authorAvatar: '#fd79a8|🌈',
        createdAt: Date.now() - 3600000 * 6,
        votes: { up: 20, neutral: 2, down: 8 },
        userVotes: {},
        comments: [
          {
            id: generateId(),
            content: '远程办公确实能提高效率，但需要更好的沟通机制配合。',
            authorName: '务实设计师234',
            authorAvatar: '#00b894|⚡',
            createdAt: Date.now() - 3600000 * 3
          },
          {
            id: generateId(),
            content: '担心团队协作会受到影响，需要仔细评估。',
            authorName: '谨慎先锋789',
            authorAvatar: '#6c5ce7|🔮',
            createdAt: Date.now() - 3600000 * 2
          }
        ]
      }
    ]
    ideas.value = sampleIdeas
  }

  const sortedIdeas = computed(() => {
    const ideasCopy = [...ideas.value]
    switch (sortType.value) {
      case 'hot':
        return ideasCopy.sort((a, b) => {
          const scoreA = a.votes.up - a.votes.down
          const scoreB = b.votes.up - b.votes.down
          return scoreB - scoreA
        })
      case 'latest':
        return ideasCopy.sort((a, b) => b.createdAt - a.createdAt)
      case 'mostUp':
        return ideasCopy.sort((a, b) => b.votes.up - a.votes.up)
      case 'controversial':
        return ideasCopy.sort((a, b) => {
          const diffA = Math.abs(a.votes.up - a.votes.down)
          const diffB = Math.abs(b.votes.up - b.votes.down)
          const totalA = a.votes.up + a.votes.down
          const totalB = b.votes.up + b.votes.down
          if (totalA === 0 && totalB === 0) return 0
          if (totalA === 0) return 1
          if (totalB === 0) return -1
          const ratioA = diffA / totalA
          const ratioB = diffB / totalB
          return ratioA - ratioB
        })
      default:
        return ideasCopy
    }
  })

  function addIdea(title: string, description: string) {
    const newIdea: Idea = {
      id: generateId(),
      title: title.trim(),
      description: description.trim(),
      authorName: currentUserName.value,
      authorAvatar: currentUserAvatar.value,
      createdAt: Date.now(),
      votes: { up: 0, neutral: 0, down: 0 },
      userVotes: {},
      comments: []
    }
    ideas.value.unshift(newIdea)
    return newIdea
  }

  function vote(ideaId: string, voteType: VoteType) {
    const idea = ideas.value.find(i => i.id === ideaId)
    if (!idea) return

    const previousVote = idea.userVotes[userId.value] || null

    if (previousVote === voteType) {
      if (previousVote) {
        idea.votes[previousVote]--
      }
      delete idea.userVotes[userId.value]
      return
    }

    if (previousVote) {
      idea.votes[previousVote]--
    }

    if (voteType) {
      idea.votes[voteType]++
      idea.userVotes[userId.value] = voteType
    }
  }

  function getUserVote(ideaId: string): VoteType {
    const idea = ideas.value.find(i => i.id === ideaId)
    if (!idea) return null
    return idea.userVotes[userId.value] || null
  }

  function addComment(ideaId: string, content: string) {
    const idea = ideas.value.find(i => i.id === ideaId)
    if (!idea) return

    const comment: Comment = {
      id: generateId(),
      content: content.trim(),
      authorName: currentUserName.value,
      authorAvatar: currentUserAvatar.value,
      createdAt: Date.now()
    }
    idea.comments.push(comment)
    return comment
  }

  function setSortType(type: SortType) {
    sortType.value = type
  }

  function getIdeaById(id: string): Idea | undefined {
    return ideas.value.find(i => i.id === id)
  }

  function formatTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 30) return `${days}天前`
    
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  return {
    ideas,
    sortedIdeas,
    sortType,
    userId,
    currentUserName,
    currentUserAvatar,
    addIdea,
    vote,
    getUserVote,
    addComment,
    setSortType,
    getIdeaById,
    formatTime,
    parseAvatar
  }
}
