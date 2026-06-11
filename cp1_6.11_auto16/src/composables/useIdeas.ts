import { ref, computed, watch, onMounted } from 'vue'

export type VoteType = 'up' | 'neutral' | 'down' | null

export interface Comment {
  id: string
  userId: string
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

const avatarColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fd79a8', '#a29bfe', '#6c5ce7', '#00b894', '#ff922b', '#20c997', '#339af0', '#f06595', '#845ef7', '#5c7cfa']

function generateUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY)
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem(USER_ID_KEY, userId)
  }
  return userId
}

function generateAuthorName(): string {
  const adjectives = ['创意', '聪明', '勇敢', '快乐', '神秘', '优雅', '活力', '智慧', '阳光', '酷炫', '文艺', '极客', '浪漫', '潇洒', '呆萌']
  const nouns = ['小达人', '发明家', '梦想家', '探索者', '创造者', '思想家', '艺术家', '工程师', '设计师', '先锋', '观察家', '行动派', '梦想家', '实干家', '战略家']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 1000)
  return `${adj}${noun}${num}`
}

function getAvatarInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

function generateAvatar(name?: string): string {
  const color = avatarColors[Math.floor(Math.random() * avatarColors.length)]
  const initial = name ? getAvatarInitial(name) : '?'
  return `${color}|${initial}`
}

function generateId(): string {
  return 'idea_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

function parseAvatar(avatar: string): { color: string; initial: string } {
  const [color, initial] = avatar.split('|')
  return { color, initial }
}

export function useIdeas() {
  const ideas = ref<Idea[]>([])
  const sortType = ref<SortType>('hot')
  const userId = ref(generateUserId())
  const currentUserName = ref(generateAuthorName())
  const currentUserAvatar = ref(generateAvatar(currentUserName.value))

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

  function generateRandomIdea(index: number): Idea {
    const titles = [
      '建立团队共享知识库',
      '每周五下午技术分享会',
      '引入代码审查自动化工具',
      '远程办公弹性工作制',
      '开发内部创新孵化器',
      '实施敏捷开发流程',
      '建立导师制度',
      '优化项目管理工具',
      '举办季度团建活动',
      '引入OKR目标管理',
      '建立代码规范体系',
      '自动化测试覆盖',
      '微服务架构改造',
      '数据可视化大屏',
      'AI辅助编程工具',
      '跨部门交流机制',
      '员工技能培训计划',
      '开源社区贡献计划',
      '产品用户反馈系统',
      '持续集成持续部署'
    ]
    const descriptions = [
      '创建一个集中的知识库平台，让团队成员可以分享和查找项目经验、技术文档和最佳实践，减少重复劳动，提高工作效率。',
      '固定每周五下午安排一小时技术分享，每位成员轮流分享自己擅长的技术或近期学习的内容，促进团队技术交流和成长。',
      '集成代码质量检测工具到CI/CD流程中，自动检测代码异味、漏洞和重复代码，提升整体代码质量和可维护性。',
      '允许员工每周选择1-2天远程办公，灵活安排工作时间，提高工作生活平衡，同时减少通勤时间和压力。',
      '设立内部创新基金，鼓励员工提出创新想法并获得资源支持，孵化有潜力的内部项目和产品。',
      '采用Scrum或Kanban等敏捷方法论，缩短迭代周期，提高团队响应速度和交付质量。',
      '为新员工配备资深导师，帮助快速融入团队和提升技能，同时促进知识传承和团队凝聚力。',
      '评估并引入更高效的项目管理工具，统一任务跟踪、文档协作和进度可视化，提升团队协作效率。',
      '每季度组织一次团建活动，增强团队凝聚力和归属感，营造积极向上的团队文化氛围。',
      '引入OKR目标管理体系，对齐团队目标，激发员工主动性和创造力，推动业务持续增长。'
    ]
    
    const authorName = generateAuthorName()
    const upVotes = Math.floor(Math.random() * 50)
    const neutralVotes = Math.floor(Math.random() * 20)
    const downVotes = Math.floor(Math.random() * 15)
    const commentCount = Math.floor(Math.random() * 5)
    
    const comments: Comment[] = []
    for (let i = 0; i < commentCount; i++) {
      const commentAuthor = generateAuthorName()
      const commentUserId = 'user_' + Math.random().toString(36).substr(2, 9)
      comments.push({
        id: generateId(),
        userId: commentUserId,
        content: ['这个想法很棒！', '我觉得还需要再考虑一下。', '支持，很有价值的提议。', '可以再详细说说具体方案吗？', '期待这个想法能够实现。'][i % 5],
        authorName: commentAuthor,
        authorAvatar: generateAvatar(commentAuthor),
        createdAt: Date.now() - Math.random() * 86400000 * 3
      })
    }

    return {
      id: generateId(),
      title: titles[index % titles.length] + (index >= titles.length ? ` (方案${Math.floor(index / titles.length) + 1})` : ''),
      description: descriptions[index % descriptions.length],
      authorName,
      authorAvatar: generateAvatar(authorName),
      createdAt: Date.now() - Math.random() * 86400000 * 30,
      votes: { up: upVotes, neutral: neutralVotes, down: downVotes },
      userVotes: {},
      comments
    }
  }

  function seedSampleData() {
    const sampleIdeas: Idea[] = []
    for (let i = 0; i < 4; i++) {
      sampleIdeas.push(generateRandomIdea(i))
    }
    ideas.value = sampleIdeas
  }

  function generateBulkIdeas(count: number) {
    const newIdeas: Idea[] = []
    for (let i = 0; i < count; i++) {
      newIdeas.push(generateRandomIdea(ideas.value.length + i))
    }
    ideas.value = [...ideas.value, ...newIdeas]
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
      userId: userId.value,
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
    parseAvatar,
    generateBulkIdeas
  }
}
