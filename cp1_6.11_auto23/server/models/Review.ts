import { v4 as uuidv4 } from 'uuid'

export interface RatingDimensions {
  knowledgeDepth: number
  interactivity: number
  practicality: number
}

export interface Review {
  id: string
  courseName: string
  ratings: RatingDimensions
  tags: string[]
  content: string
  nickname: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: number
  approvedAt?: number
}

let reviews: Review[] = []

function validateRatings(ratings: RatingDimensions): boolean {
  const dims: (keyof RatingDimensions)[] = ['knowledgeDepth', 'interactivity', 'practicality']
  return dims.every(dim => {
    const val = ratings[dim]
    return typeof val === 'number' && val >= 0 && val <= 5
  })
}

function validateReviewData(data: any): { valid: boolean; error?: string } {
  if (!data.courseName || typeof data.courseName !== 'string' || data.courseName.trim().length === 0) {
    return { valid: false, error: '课程名称不能为空' }
  }
  if (data.courseName.length > 100) {
    return { valid: false, error: '课程名称不能超过100个字符' }
  }
  if (!data.ratings || typeof data.ratings !== 'object') {
    return { valid: false, error: '评分数据无效' }
  }
  if (!validateRatings(data.ratings)) {
    return { valid: false, error: '评分数值必须在0-5之间' }
  }
  if (!Array.isArray(data.tags)) {
    return { valid: false, error: '标签数据无效' }
  }
  if (data.tags.length < 1 || data.tags.length > 3) {
    return { valid: false, error: '标签数量必须在1-3个之间' }
  }
  if (!data.content || typeof data.content !== 'string') {
    return { valid: false, error: '评价内容不能为空' }
  }
  if (data.content.length > 500) {
    return { valid: false, error: '评价内容不能超过500字' }
  }
  if (!data.nickname || typeof data.nickname !== 'string' || data.nickname.trim().length === 0) {
    return { valid: false, error: '昵称不能为空' }
  }
  return { valid: true }
}

export function addReview(data: any): { success: boolean; review?: Review; error?: string } {
  const validation = validateReviewData(data)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const review: Review = {
    id: uuidv4(),
    courseName: data.courseName.trim(),
    ratings: {
      knowledgeDepth: data.ratings.knowledgeDepth,
      interactivity: data.ratings.interactivity,
      practicality: data.ratings.practicality,
    },
    tags: data.tags,
    content: data.content,
    nickname: data.nickname.trim(),
    status: 'pending',
    createdAt: Date.now(),
  }

  reviews.push(review)
  return { success: true, review }
}

export function getAllReviews(status?: Review['status']): Review[] {
  let result = [...reviews]
  if (status) {
    result = result.filter(r => r.status === status)
  }
  return result.sort((a, b) => b.createdAt - a.createdAt)
}

export function getApprovedReviews(): Review[] {
  return getAllReviews('approved')
}

export function approveReview(id: string): { success: boolean; review?: Review; error?: string } {
  const review = reviews.find(r => r.id === id)
  if (!review) {
    return { success: false, error: '评价不存在' }
  }
  review.status = 'approved'
  review.approvedAt = Date.now()
  return { success: true, review }
}

export function rejectReview(id: string): { success: boolean; review?: Review; error?: string } {
  const review = reviews.find(r => r.id === id)
  if (!review) {
    return { success: false, error: '评价不存在' }
  }
  review.status = 'rejected'
  return { success: true, review }
}

export function getReviewById(id: string): Review | undefined {
  return reviews.find(r => r.id === id)
}

function seedMockData() {
  const mockReviews = [
    {
      courseName: 'React 高级实战课程',
      ratings: { knowledgeDepth: 5, interactivity: 4, practicality: 5 },
      tags: ['知识深度', '实用性'],
      content: '课程内容非常深入，讲解了很多React底层原理，Hooks的高级用法让我受益匪浅。实战项目也很有挑战性。',
      nickname: '学习者小明',
      status: 'approved' as const,
    },
    {
      courseName: 'TypeScript 从入门到精通',
      ratings: { knowledgeDepth: 4, interactivity: 5, practicality: 4 },
      tags: ['互动性', '知识深度'],
      content: '老师讲解很细致，互动性很强，有问必答。类型系统讲得很透彻，适合有JS基础的同学进阶学习。',
      nickname: '前端工程师小红',
      status: 'approved' as const,
    },
    {
      courseName: 'Node.js 后端开发实战',
      ratings: { knowledgeDepth: 4, interactivity: 3, practicality: 5 },
      tags: ['实用性', '知识深度'],
      content: '实用性很强，学完就能上手做项目。Express和数据库操作讲得很详细，推荐想做全栈的同学学习。',
      nickname: '代码爱好者',
      status: 'approved' as const,
    },
    {
      courseName: 'CSS 动画与交互设计',
      ratings: { knowledgeDepth: 3, interactivity: 5, practicality: 4 },
      tags: ['互动性', '实用性'],
      content: '动画效果讲得很生动，课程互动性很好。学到了很多实用的动画技巧，可以直接用到项目中。',
      nickname: 'UI设计师阿杰',
      status: 'approved' as const,
    },
    {
      courseName: 'Vue 3 组合式API详解',
      ratings: { knowledgeDepth: 5, interactivity: 4, practicality: 4 },
      tags: ['知识深度', '互动性'],
      content: 'Vue3的响应式原理讲得非常深入，组合式API的设计理念分析得很透彻。是我看过最好的Vue3课程之一。',
      nickname: 'Vue爱好者',
      status: 'approved' as const,
    },
    {
      courseName: '算法与数据结构精讲',
      ratings: { knowledgeDepth: 5, interactivity: 3, practicality: 4 },
      tags: ['知识深度', '实用性'],
      content: '算法讲得很系统，从基础到进阶都有覆盖。老师思路清晰，例题选得也很经典。',
      nickname: '校招准备中',
      status: 'approved' as const,
    },
    {
      courseName: 'Webpack 构建原理与优化',
      ratings: { knowledgeDepth: 4, interactivity: 4, practicality: 5 },
      tags: ['实用性', '知识深度', '互动性'],
      content: '讲得太实用了！项目构建速度优化了50%。原理部分也讲得很清楚，知其然更知其所以然。',
      nickname: '性能优化控',
      status: 'approved' as const,
    },
    {
      courseName: 'JavaScript 设计模式',
      ratings: { knowledgeDepth: 4, interactivity: 3, practicality: 3 },
      tags: ['知识深度'],
      content: '设计模式讲得比较全面，每种模式都有示例。如果能有更多实战场景就更好了。',
      nickname: '架构师之路',
      status: 'approved' as const,
    },
    {
      courseName: 'React Native 跨端开发',
      ratings: { knowledgeDepth: 3, interactivity: 4, practicality: 4 },
      tags: ['互动性', '实用性'],
      content: '跨端开发入门不错，老师答疑很及时。环境配置部分讲得略快，新手可能需要多花点时间。',
      nickname: '移动开发新手',
      status: 'approved' as const,
    },
    {
      courseName: 'GraphQL 入门到实战',
      ratings: { knowledgeDepth: 4, interactivity: 5, practicality: 4 },
      tags: ['知识深度', '互动性', '实用性'],
      content: 'GraphQL讲得很清晰，从Schema设计到Resolver实现都有覆盖。实战项目很有意思，推荐学习！',
      nickname: 'API设计达人',
      status: 'approved' as const,
    },
    {
      courseName: 'Docker 容器化部署',
      ratings: { knowledgeDepth: 3, interactivity: 4, practicality: 5 },
      tags: ['实用性', '互动性'],
      content: '实战性很强，从Dockerfile编写到K8s部署都有涉及。学完就能在项目中用起来。',
      nickname: 'DevOps小白',
      status: 'approved' as const,
    },
    {
      courseName: '微前端架构实战',
      ratings: { knowledgeDepth: 5, interactivity: 4, practicality: 3 },
      tags: ['知识深度', '互动性'],
      content: '微前端的理念和实现方案讲得很深入，qiankun和single-spa都有涉及。理论偏多，实战可以再丰富一些。',
      nickname: '架构探索者',
      status: 'approved' as const,
    },
    {
      courseName: 'Git 高级操作技巧',
      ratings: { knowledgeDepth: 3, interactivity: 5, practicality: 5 },
      tags: ['实用性', '互动性', '知识深度'],
      content: 'Git技巧太实用了！rebase、cherry-pick、bisect这些高级操作讲得很清楚。工作效率提升明显。',
      nickname: '版本控',
      status: 'approved' as const,
    },
    {
      courseName: 'Next.js 全栈开发',
      ratings: { knowledgeDepth: 4, interactivity: 4, practicality: 5 },
      tags: ['实用性', '知识深度'],
      content: 'Next.js最新特性讲得很全面，App Router和Server Components都有深入讲解。项目实战很丰富。',
      nickname: 'SSR爱好者',
      status: 'approved' as const,
    },
    {
      courseName: 'MongoDB 数据库实战',
      ratings: { knowledgeDepth: 4, interactivity: 3, practicality: 4 },
      tags: ['知识深度', '实用性'],
      content: 'MongoDB的索引优化和聚合管道讲得不错。如果能有更多性能调优的内容会更好。',
      nickname: 'NoSQL探索者',
      status: 'pending' as const,
    },
    {
      courseName: 'WebSocket 实时通信',
      ratings: { knowledgeDepth: 3, interactivity: 4, practicality: 4 },
      tags: ['互动性', '实用性'],
      content: '实时通信的实现方式讲得很清楚，聊天室实战项目很有参考价值。',
      nickname: '实时应用控',
      status: 'pending' as const,
    },
    {
      courseName: 'Redux Toolkit 状态管理',
      ratings: { knowledgeDepth: 4, interactivity: 5, practicality: 5 },
      tags: ['知识深度', '互动性', '实用性'],
      content: 'Redux Toolkit太香了！比传统Redux简洁太多。老师讲得很细致，RTK Query也有覆盖。强烈推荐！',
      nickname: '状态管理达人',
      status: 'approved' as const,
    },
    {
      courseName: '前端安全攻防实战',
      ratings: { knowledgeDepth: 5, interactivity: 4, practicality: 4 },
      tags: ['知识深度', '实用性'],
      content: 'XSS、CSRF、点击劫持这些常见攻击讲得很透彻，防御方案也很实用。安全意识提升很多。',
      nickname: '安全研究员',
      status: 'approved' as const,
    },
    {
      courseName: '单元测试与TDD实践',
      ratings: { knowledgeDepth: 3, interactivity: 4, practicality: 4 },
      tags: ['互动性', '实用性'],
      content: 'Jest和React Testing Library讲得不错，TDD的理念也有涉及。如果测试案例能更复杂些就更好了。',
      nickname: '测试驱动开发',
      status: 'approved' as const,
    },
    {
      courseName: 'Three.js 3D可视化',
      ratings: { knowledgeDepth: 4, interactivity: 3, practicality: 3 },
      tags: ['知识深度'],
      content: 'Three.js基础讲得比较系统，几何体、材质、光照都有涉及。进阶内容偏少，适合入门。',
      nickname: '3D可视化爱好者',
      status: 'approved' as const,
    },
  ]

  mockReviews.forEach((mock, index) => {
    const review: Review = {
      id: uuidv4(),
      ...mock,
      createdAt: Date.now() - (index + 1) * 86400000,
      approvedAt: mock.status === 'approved' ? Date.now() - index * 86400000 : undefined,
    }
    reviews.push(review)
  })
}

seedMockData()
