import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static('uploads'))

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true)
    } else {
      cb(new Error('只支持jpg/png格式'))
    }
  }
})

interface Track {
  id: string
  title: string
  artist: string
  cover: string
  lyrics: string
  audioUrl: string
  createdAt: string
}

interface Concert {
  id: string
  venue: string
  city: string
  dateTime: string
  price: number
  vipPrice: number
  stock: number
  vipStock: number
  description: string
}

interface Order {
  id: string
  concertId: string
  concertName: string
  ticketType: 'normal' | 'vip'
  quantity: number
  totalPrice: number
  status: 'pending' | 'paid' | 'cancelled'
  createdAt: string
  expiresAt: string
}

interface User {
  id: string
  email: string
  password: string
  name: string
  token: string
}

const tracks: Track[] = [
  {
    id: '1',
    title: '星空下的约定',
    artist: '林晓风',
    cover: 'https://picsum.photos/seed/track1/400/400',
    lyrics: `夜空中最亮的星
请照亮我前行
走过春夏秋冬
陪你看遍风景

那年夏天的风
吹过你的发梢
我们许下约定
永远不说分离

时光匆匆流逝
梦想不曾改变
带着你的祝福
飞向更高的天

感谢有你陪伴
走过每段旅程
不管多远的路
我们一起前行`,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    title: '城市漫游',
    artist: '陈雨桐',
    cover: 'https://picsum.photos/seed/track2/400/400',
    lyrics: `走在霓虹闪烁的街道
人群匆匆擦肩而过
每个人都有自己的故事
在这座城市里漂泊

咖啡店的角落
有人在写着歌
窗外的雨落下来
打湿了谁的寂寞

让我们在城市漫游
寻找失落的温柔
就算迷失在人海中
也要保持笑容

让我们在城市漫游
感受生活的节奏
每一个平凡的瞬间
都值得好好拥有`,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    createdAt: '2024-02-20T14:30:00Z'
  },
  {
    id: '3',
    title: '海风轻拂',
    artist: '林晓风',
    cover: 'https://picsum.photos/seed/track3/400/400',
    lyrics: `海风轻轻吹过脸庞
带来咸咸的味道
浪花拍打在礁石上
诉说着古老的歌谣

我站在沙滩上
望着远方的海平线
心中充满了向往
那未知的世界

海鸟在天空翱翔
载着我的梦想
飞向那片蔚蓝
飞向新的希望

让我们一起去看海
放下所有的悲哀
让海风吹走烦恼
只留下快乐和期待`,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    createdAt: '2024-03-10T09:15:00Z'
  },
  {
    id: '4',
    title: '深夜食堂',
    artist: '周明辉',
    cover: 'https://picsum.photos/seed/track4/400/400',
    lyrics: `凌晨两点的街道
只有这家店还亮着灯
推门走进熟悉的角落
老板笑着说又来了

一碗热腾腾的面
驱散了夜的寒冷
那些白天说不出的话
在这里可以慢慢聊

深夜食堂的灯火
温暖着每一个过客
不管你有什么故事
这里都有属于你的角落

生活总有些不如意
但明天还要继续
吃饱了就有力气
去面对所有的难题`,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    createdAt: '2024-04-05T16:45:00Z'
  },
  {
    id: '5',
    title: '追梦人',
    artist: '陈雨桐',
    cover: 'https://picsum.photos/seed/track5/400/400',
    lyrics: `每个人都有一个梦想
藏在心底最柔软的地方
也许它看起来很遥远
但请别轻易说放弃

追梦的路上会有荆棘
会有跌倒和泪水
但只要你坚持走下去
终会看到那道彩虹

做一个勇敢的追梦人
不怕风雨不怕疼
就算全世界都嘲笑
也要守住心中的真

做一个执着的追梦人
让青春不留遗憾
等到梦想成真的那天
你会感谢曾经的自己`,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    createdAt: '2024-05-12T11:20:00Z'
  },
  {
    id: '6',
    title: '秋日私语',
    artist: '苏婉清',
    cover: 'https://picsum.photos/seed/track6/400/400',
    lyrics: `秋叶飘落的季节
我们相遇在那条街
你说你喜欢秋天
因为它像一首诗

金黄的银杏树下
我们轻轻诉说着
那些关于未来的梦
和藏在心底的话

秋日的私语
随风飘向远方
带着我们的祝福
和最美的时光

秋去秋又来
花谢花会开
但那年的秋天
永远在我心里`,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    createdAt: '2024-06-18T13:00:00Z'
  }
]

const concerts: Concert[] = [
  {
    id: 'c1',
    venue: '上海梅赛德斯奔驰文化中心',
    city: '上海',
    dateTime: '2026-07-20T19:30:00',
    price: 380,
    vipPrice: 880,
    stock: 500,
    vipStock: 50,
    description: '林晓风"星空下的约定"全国巡演上海站'
  },
  {
    id: 'c2',
    venue: '北京工人体育馆',
    city: '北京',
    dateTime: '2026-07-25T19:00:00',
    price: 420,
    vipPrice: 980,
    stock: 800,
    vipStock: 80,
    description: '陈雨桐"城市漫游"个人演唱会北京站'
  },
  {
    id: 'c3',
    venue: '广州天河体育馆',
    city: '广州',
    dateTime: '2026-07-20T20:00:00',
    price: 350,
    vipPrice: 780,
    stock: 600,
    vipStock: 60,
    description: '周明辉"深夜食堂"巡演广州站'
  },
  {
    id: 'c4',
    venue: '成都大魔方演艺中心',
    city: '成都',
    dateTime: '2026-08-05T19:30:00',
    price: 320,
    vipPrice: 680,
    stock: 400,
    vipStock: 40,
    description: '苏婉清"秋日私语"演唱会成都站'
  },
  {
    id: 'c5',
    venue: '杭州奥体中心体育馆',
    city: '杭州',
    dateTime: '2026-08-12T19:30:00',
    price: 390,
    vipPrice: 880,
    stock: 700,
    vipStock: 70,
    description: '林晓风"星空下的约定"全国巡演杭州站'
  },
  {
    id: 'c6',
    venue: '深圳湾体育中心',
    city: '深圳',
    dateTime: '2026-08-15T20:00:00',
    price: 360,
    vipPrice: 820,
    stock: 550,
    vipStock: 55,
    description: '陈雨桐"城市漫游"个人演唱会深圳站'
  },
  {
    id: 'c7',
    venue: '南京青奥体育公园',
    city: '南京',
    dateTime: '2026-08-20T19:00:00',
    price: 340,
    vipPrice: 750,
    stock: 450,
    vipStock: 45,
    description: '周明辉"深夜食堂"巡演南京站'
  },
  {
    id: 'c8',
    venue: '武汉光谷国际网球中心',
    city: '武汉',
    dateTime: '2026-08-25T19:30:00',
    price: 310,
    vipPrice: 650,
    stock: 350,
    vipStock: 35,
    description: '苏婉清"秋日私语"演唱会武汉站'
  }
]

const orders: Order[] = []
const users: User[] = []

app.get('/api/tracks', (req, res) => {
  const { search } = req.query
  let result = [...tracks]
  if (search && typeof search === 'string') {
    const keyword = search.toLowerCase()
    result = tracks.filter(
      t => t.title.toLowerCase().includes(keyword) || t.artist.toLowerCase().includes(keyword)
    )
  }
  res.json(result)
})

app.get('/api/tracks/:id', (req, res) => {
  const track = tracks.find(t => t.id === req.params.id)
  if (!track) {
    return res.status(404).json({ error: '作品不存在' })
  }
  res.json(track)
})

app.post('/api/tracks', upload.single('cover'), (req, res) => {
  const { title, artist, lyrics, audioUrl } = req.body
  if (!title || !artist || !audioUrl) {
    return res.status(400).json({ error: '请填写完整信息' })
  }
  try {
    new URL(audioUrl)
  } catch {
    return res.status(400).json({ error: '音频链接格式不正确' })
  }
  const newTrack: Track = {
    id: uuidv4(),
    title,
    artist,
    cover: req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
      : 'https://picsum.photos/seed/default/400/400',
    lyrics: lyrics || '',
    audioUrl,
    createdAt: new Date().toISOString()
  }
  tracks.unshift(newTrack)
  res.status(201).json(newTrack)
})

app.get('/api/concerts', (req, res) => {
  const { date, city } = req.query
  let result = [...concerts]
  if (date && typeof date === 'string') {
    result = result.filter(c => c.dateTime.startsWith(date))
  }
  if (city && typeof city === 'string') {
    result = result.filter(c => c.city.includes(city))
  }
  result.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
  res.json(result)
})

app.get('/api/concerts/:id', (req, res) => {
  const concert = concerts.find(c => c.id === req.params.id)
  if (!concert) {
    return res.status(404).json({ error: '演出不存在' })
  }
  res.json(concert)
})

app.post('/api/concerts', (req, res) => {
  const { venue, city, dateTime, price, vipPrice, stock, vipStock, description } = req.body
  if (!venue || !city || !dateTime || !price || !stock) {
    return res.status(400).json({ error: '请填写完整信息' })
  }
  const newConcert: Concert = {
    id: uuidv4(),
    venue,
    city,
    dateTime,
    price: Number(price),
    vipPrice: Number(vipPrice) || Number(price) * 2,
    stock: Number(stock),
    vipStock: Number(vipStock) || Math.floor(Number(stock) * 0.1),
    description: description || ''
  }
  concerts.push(newConcert)
  res.status(201).json(newConcert)
})

app.post('/api/orders', (req, res) => {
  const { concertId, ticketType, quantity } = req.body
  const concert = concerts.find(c => c.id === concertId)
  if (!concert) {
    return res.status(404).json({ error: '演出不存在' })
  }
  const qty = Number(quantity)
  if (ticketType === 'normal' && concert.stock < qty) {
    return res.status(400).json({ error: '普通票库存不足' })
  }
  if (ticketType === 'vip' && concert.vipStock < qty) {
    return res.status(400).json({ error: 'VIP票库存不足' })
  }
  const price = ticketType === 'normal' ? concert.price : concert.vipPrice
  const totalPrice = price * qty
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000)
  const order: Order = {
    id: uuidv4(),
    concertId,
    concertName: concert.description,
    ticketType,
    quantity: qty,
    totalPrice,
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  }
  orders.push(order)
  res.status(201).json(order)
})

app.get('/api/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === req.params.id)
  if (!order) {
    return res.status(404).json({ error: '订单不存在' })
  }
  res.json(order)
})

app.post('/api/orders/:id/pay', (req, res) => {
  const order = orders.find(o => o.id === req.params.id)
  if (!order) {
    return res.status(404).json({ error: '订单不存在' })
  }
  if (order.status === 'cancelled') {
    return res.status(400).json({ error: '订单已取消' })
  }
  if (order.status === 'paid') {
    return res.status(400).json({ error: '订单已支付' })
  }
  const concert = concerts.find(c => c.id === order.concertId)
  if (concert) {
    if (order.ticketType === 'normal') {
      concert.stock -= order.quantity
    } else {
      concert.vipStock -= order.quantity
    }
  }
  order.status = 'paid'
  res.json(order)
})

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body
  if (!email || !password || !name) {
    return res.status(400).json({ error: '请填写完整信息' })
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: '邮箱格式不正确' })
  }
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: '邮箱已被注册' })
  }
  const user: User = {
    id: uuidv4(),
    email,
    password,
    name,
    token: uuidv4()
  }
  users.push(user)
  res.status(201).json({ token: user.token, user: { id: user.id, email: user.email, name: user.name } })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  const user = users.find(u => u.email === email && u.password === password)
  if (!user) {
    return res.status(401).json({ error: '邮箱或密码错误' })
  }
  user.token = uuidv4()
  res.json({ token: user.token, user: { id: user.id, email: user.email, name: user.name } })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
