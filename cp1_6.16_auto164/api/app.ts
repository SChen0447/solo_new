import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

interface Trainer {
  id: string
  name: string
  avatar: string
  specialties: string[]
  rating: number
  bio: string
}

interface Member {
  id: string
  name: string
  avatar: string
}

interface Booking {
  id: string
  memberId: string
  trainerId: string
  date: string
  time: number
  duration: 30 | 45 | 60
  status: 'booked' | 'attended' | 'cancelled'
  createdAt: string
}

interface Session {
  id: string
  bookingId: string
  memberId: string
  trainerId: string
  date: string
  time: number
  duration: number
  attended: boolean
  feedback?: string
  memberStatus?: 'progress' | 'maintain' | 'decline'
}

const trainers: Trainer[] = [
  { id: 't1', name: '李明', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20male%20fitness%20trainer%20portrait%20headshot%20clean%20background&image_size=square', specialties: ['力量训练', 'HIIT'], rating: 4.8, bio: '10年力量训练经验，专注增肌减脂' },
  { id: 't2', name: '王芳', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20female%20yoga%20instructor%20portrait%20headshot%20clean%20background&image_size=square', specialties: ['瑜伽', '冥想'], rating: 4.9, bio: '国际瑜伽联盟认证导师，擅长流瑜伽' },
  { id: 't3', name: '张伟', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20male%20pilates%20instructor%20portrait%20headshot%20clean%20background&image_size=square', specialties: ['普拉提', '康复训练'], rating: 4.7, bio: '普拉提认证教练，专注体态矫正' },
  { id: 't4', name: '刘洋', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20female%20aerobics%20instructor%20portrait%20headshot%20clean%20background&image_size=square', specialties: ['有氧操', '舞蹈'], rating: 4.6, bio: '激情有氧操教练，让运动充满乐趣' },
  { id: 't5', name: '陈刚', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20male%20boxing%20trainer%20portrait%20headshot%20clean%20background&image_size=square', specialties: ['拳击', '格斗'], rating: 4.8, bio: '前职业拳击手，教授实战拳击技巧' },
  { id: 't6', name: '赵雪', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20female%20stretching%20coach%20portrait%20headshot%20clean%20background&image_size=square', specialties: ['拉伸', '瑜伽'], rating: 4.5, bio: '运动康复硕士，专注柔韧性训练' },
]

const members: Member[] = [
  { id: 'm1', name: '周小明', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20young%20man%20portrait%20avatar%20clean%20background&image_size=square' },
  { id: 'm2', name: '吴美丽', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20young%20woman%20portrait%20avatar%20clean%20background&image_size=square' },
  { id: 'm3', name: '郑强', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20middle%20age%20man%20portrait%20avatar%20clean%20background&image_size=square' },
  { id: 'm4', name: '孙丽丽', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20young%20woman%20sports%20portrait%20avatar%20clean%20background&image_size=square' },
  { id: 'm5', name: '黄健', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20man%20gym%20portrait%20avatar%20clean%20background&image_size=square' },
  { id: 'm6', name: '林小雨', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20woman%20yoga%20portrait%20avatar%20clean%20background&image_size=square' },
  { id: 'm7', name: '何大力', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20muscular%20man%20portrait%20avatar%20clean%20background&image_size=square' },
  { id: 'm8', name: '曹婷婷', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20woman%20fitness%20portrait%20avatar%20clean%20background&image_size=square' },
  { id: 'm9', name: '许文杰', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20young%20man%20casual%20portrait%20avatar%20clean%20background&image_size=square' },
  { id: 'm10', name: '邓小红', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20woman%20smile%20portrait%20avatar%20clean%20background&image_size=square' },
]

function getDateStr(daysOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().split('T')[0]
}

function getPastDateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

const bookings: Booking[] = [
  { id: 'b1', memberId: 'm1', trainerId: 't1', date: getDateStr(0), time: 9, duration: 60, status: 'booked', createdAt: new Date().toISOString() },
  { id: 'b2', memberId: 'm2', trainerId: 't2', date: getDateStr(0), time: 10, duration: 45, status: 'booked', createdAt: new Date().toISOString() },
  { id: 'b3', memberId: 'm3', trainerId: 't1', date: getDateStr(1), time: 14, duration: 30, status: 'booked', createdAt: new Date().toISOString() },
  { id: 'b4', memberId: 'm4', trainerId: 't3', date: getDateStr(1), time: 11, duration: 60, status: 'booked', createdAt: new Date().toISOString() },
  { id: 'b5', memberId: 'm1', trainerId: 't5', date: getPastDateStr(1), time: 16, duration: 45, status: 'attended', createdAt: new Date().toISOString() },
  { id: 'b6', memberId: 'm2', trainerId: 't2', date: getPastDateStr(2), time: 9, duration: 60, status: 'attended', createdAt: new Date().toISOString() },
  { id: 'b7', memberId: 'm5', trainerId: 't4', date: getPastDateStr(2), time: 15, duration: 30, status: 'cancelled', createdAt: new Date().toISOString() },
  { id: 'b8', memberId: 'm3', trainerId: 't6', date: getPastDateStr(3), time: 8, duration: 45, status: 'attended', createdAt: new Date().toISOString() },
  { id: 'b9', memberId: 'm6', trainerId: 't1', date: getPastDateStr(4), time: 10, duration: 60, status: 'attended', createdAt: new Date().toISOString() },
  { id: 'b10', memberId: 'm7', trainerId: 't3', date: getPastDateStr(5), time: 14, duration: 30, status: 'attended', createdAt: new Date().toISOString() },
  { id: 'b11', memberId: 'm1', trainerId: 't2', date: getPastDateStr(5), time: 11, duration: 60, status: 'cancelled', createdAt: new Date().toISOString() },
  { id: 'b12', memberId: 'm8', trainerId: 't5', date: getPastDateStr(6), time: 17, duration: 45, status: 'attended', createdAt: new Date().toISOString() },
  { id: 'b13', memberId: 'm4', trainerId: 't6', date: getPastDateStr(10), time: 9, duration: 60, status: 'attended', createdAt: new Date().toISOString() },
  { id: 'b14', memberId: 'm9', trainerId: 't4', date: getPastDateStr(15), time: 10, duration: 30, status: 'attended', createdAt: new Date().toISOString() },
  { id: 'b15', memberId: 'm10', trainerId: 't2', date: getPastDateStr(20), time: 8, duration: 45, status: 'cancelled', createdAt: new Date().toISOString() },
  { id: 'b16', memberId: 'm1', trainerId: 't1', date: getPastDateStr(25), time: 15, duration: 60, status: 'attended', createdAt: new Date().toISOString() },
  { id: 'b17', memberId: 'm5', trainerId: 't5', date: getPastDateStr(30), time: 16, duration: 30, status: 'attended', createdAt: new Date().toISOString() },
  { id: 'b18', memberId: 'm3', trainerId: 't3', date: getPastDateStr(40), time: 11, duration: 45, status: 'attended', createdAt: new Date().toISOString() },
  { id: 'b19', memberId: 'm6', trainerId: 't1', date: getPastDateStr(50), time: 14, duration: 60, status: 'cancelled', createdAt: new Date().toISOString() },
  { id: 'b20', memberId: 'm2', trainerId: 't4', date: getPastDateStr(60), time: 9, duration: 30, status: 'attended', createdAt: new Date().toISOString() },
  { id: 'b21', memberId: 'm7', trainerId: 't2', date: getPastDateStr(70), time: 10, duration: 45, status: 'attended', createdAt: new Date().toISOString() },
  { id: 'b22', memberId: 'm8', trainerId: 't6', date: getPastDateStr(80), time: 8, duration: 60, status: 'attended', createdAt: new Date().toISOString() },
]

const sessions: Session[] = bookings
  .filter(b => b.status === 'attended' || b.status === 'booked')
  .map(b => ({
    id: 's' + b.id.slice(1),
    bookingId: b.id,
    memberId: b.memberId,
    trainerId: b.trainerId,
    date: b.date,
    time: b.time,
    duration: b.duration,
    attended: b.status === 'attended',
    feedback: b.status === 'attended' ? '表现优秀，继续保持' : undefined,
    memberStatus: b.status === 'attended' ? 'progress' as const : undefined,
  }))

app.get('/api/trainers', (_req: Request, res: Response) => {
  console.log('[GET /api/trainers] 返回教练列表，共', trainers.length, '位')
  res.json(trainers)
})

app.get('/api/trainers/:id', (req: Request, res: Response) => {
  const trainer = trainers.find(t => t.id === req.params.id)
  if (!trainer) {
    res.status(404).json({ error: '教练不存在' })
    return
  }
  console.log('[GET /api/trainers/:id] 返回教练:', trainer.name)
  res.json(trainer)
})

app.get('/api/trainers/:id/slots', (req: Request, res: Response) => {
  const { id } = req.params
  const date = req.query.date as string || getDateStr(0)
  const trainerBookings = bookings.filter(
    b => b.trainerId === id && b.date === date && b.status !== 'cancelled'
  )
  const slots = []
  for (let hour = 8; hour <= 20; hour++) {
    const booking = trainerBookings.find(b => b.time === hour)
    slots.push({
      date,
      time: hour,
      available: !booking,
      bookingId: booking?.id,
    })
  }
  console.log('[GET /api/trainers/:id/slots] 教练', id, '日期', date, '可用时段:', slots.filter(s => s.available).length)
  res.json(slots)
})

app.get('/api/members', (_req: Request, res: Response) => {
  res.json(members)
})

app.post('/api/bookings', (req: Request, res: Response) => {
  const { memberId, trainerId, date, time, duration } = req.body
  if (!memberId || !trainerId || !date || time === undefined || !duration) {
    res.status(400).json({ error: '缺少必要参数' })
    return
  }
  const existing = bookings.find(
    b => b.trainerId === trainerId && b.date === date && b.time === time && b.status !== 'cancelled'
  )
  if (existing) {
    res.status(409).json({ error: '该时段已被预约' })
    return
  }
  const newBooking: Booking = {
    id: uuidv4(),
    memberId,
    trainerId,
    date,
    time,
    duration,
    status: 'booked',
    createdAt: new Date().toISOString(),
  }
  bookings.push(newBooking)
  const newSession: Session = {
    id: uuidv4(),
    bookingId: newBooking.id,
    memberId,
    trainerId,
    date,
    time,
    duration,
    attended: false,
  }
  sessions.push(newSession)
  console.log('[POST /api/bookings] 新预约:', newBooking.id, '教练:', trainerId, '日期:', date, '时段:', time)
  res.status(201).json(newBooking)
})

app.get('/api/bookings', (req: Request, res: Response) => {
  const { memberId, trainerId, status, page = '1', limit = '10' } = req.query
  let filtered = [...bookings]
  if (memberId) filtered = filtered.filter(b => b.memberId === memberId)
  if (trainerId) filtered = filtered.filter(b => b.trainerId === trainerId)
  if (status) filtered = filtered.filter(b => b.status === status)
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  filtered = filtered.filter(b => new Date(b.date) >= threeMonthsAgo)
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const pageNum = parseInt(page as string, 10)
  const limitNum = parseInt(limit as string, 10)
  const total = filtered.length
  const start = (pageNum - 1) * limitNum
  const paged = filtered.slice(start, start + limitNum)
  const enriched = paged.map(b => {
    const trainer = trainers.find(t => t.id === b.trainerId)
    const member = members.find(m => m.id === b.memberId)
    return { ...b, trainerName: trainer?.name, memberName: member?.name, memberAvatar: member?.avatar, trainerAvatar: trainer?.avatar }
  })
  console.log('[GET /api/bookings] 返回预约列表，共', total, '条，当前页', pageNum)
  res.json({ data: enriched, total, page: pageNum, limit: limitNum })
})

app.delete('/api/bookings/:id', (req: Request, res: Response) => {
  const booking = bookings.find(b => b.id === req.params.id)
  if (!booking) {
    res.status(404).json({ error: '预约不存在' })
    return
  }
  if (booking.status === 'cancelled') {
    res.status(400).json({ error: '预约已取消' })
    return
  }
  const bookingDateTime = new Date(`${booking.date}T${String(booking.time).padStart(2, '0')}:00:00`)
  const now = new Date()
  const diffMs = bookingDateTime.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  if (diffHours < 2) {
    res.status(400).json({ error: '开课前2小时内不可取消' })
    return
  }
  booking.status = 'cancelled'
  const session = sessions.find(s => s.bookingId === booking.id)
  if (session) {
    const idx = sessions.indexOf(session)
    if (idx > -1) sessions.splice(idx, 1)
  }
  console.log('[DELETE /api/bookings/:id] 取消预约:', booking.id)
  res.json({ success: true, booking })
})

app.get('/api/sessions', (req: Request, res: Response) => {
  const { trainerId } = req.query
  let filtered = [...sessions]
  if (trainerId) filtered = filtered.filter(s => s.trainerId === trainerId)
  const today = getDateStr(0)
  const weekLater = getDateStr(7)
  filtered = filtered.filter(s => s.date >= today && s.date <= weekLater)
  filtered.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.time - b.time
  })
  const enriched = filtered.map(s => {
    const member = members.find(m => m.id === s.memberId)
    const trainer = trainers.find(t => t.id === s.trainerId)
    return { ...s, memberName: member?.name, memberAvatar: member?.avatar, trainerName: trainer?.name }
  })
  console.log('[GET /api/sessions] 教练', trainerId, '未来7天课程:', enriched.length, '节')
  res.json(enriched)
})

app.put('/api/sessions/:id', (req: Request, res: Response) => {
  const session = sessions.find(s => s.id === req.params.id)
  if (!session) {
    res.status(404).json({ error: '课程不存在' })
    return
  }
  const { attended, feedback, memberStatus } = req.body
  if (attended !== undefined) session.attended = attended
  if (feedback !== undefined) session.feedback = feedback
  if (memberStatus !== undefined) session.memberStatus = memberStatus
  if (session.attended) {
    const booking = bookings.find(b => b.id === session.bookingId)
    if (booking) {
      booking.status = 'attended'
      console.log('[PUT /api/sessions/:id] 同步更新预约状态为attended:', booking.id)
    }
  }
  console.log('[PUT /api/sessions/:id] 更新课程:', session.id, '出勤:', session.attended)
  res.json(session)
})

app.get('/api/stats/dashboard', (_req: Request, res: Response) => {
  const today = getDateStr(0)
  const todayBookings = bookings.filter(b => b.date === today && b.status !== 'cancelled')
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekBookings = bookings.filter(b => b.date >= weekStartStr && b.status !== 'cancelled')
  const activeTrainerIds = [...new Set(weekBookings.map(b => b.trainerId))]
  const activeMemberIds = [...new Set(weekBookings.map(b => b.memberId))]
  const dailyBookings = []
  for (let i = 6; i >= 0; i--) {
    const d = getPastDateStr(i)
    const count = bookings.filter(b => b.date === d && b.status !== 'cancelled').length
    dailyBookings.push({ date: d, count })
  }
  console.log('[GET /api/stats/dashboard] 今日预约:', todayBookings.length, '活跃教练:', activeTrainerIds.length, '活跃会员:', activeMemberIds.length)
  res.json({
    todayBookings: todayBookings.length,
    weeklyActiveTrainers: activeTrainerIds.length,
    weeklyActiveMembers: activeMemberIds.length,
    dailyBookings,
  })
})

app.use('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', error.message)
  res.status(500).json({ success: false, error: '服务器内部错误' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API不存在' })
})

export default app
