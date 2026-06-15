import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  const totalBooks = db.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number }

  const totalMembers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'member'").get() as { count: number }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthlyBorrowings = db
    .prepare('SELECT COUNT(*) as count FROM borrowings WHERE borrow_date >= ?')
    .get(monthStart) as { count: number }

  const pendingReviews = db
    .prepare("SELECT COUNT(*) as count FROM reviews WHERE status = 'pending'")
    .get() as { count: number }

  const weeklyTrend = db
    .prepare(
      `SELECT DATE(borrow_date) as date, COUNT(*) as count
       FROM borrowings
       WHERE borrow_date >= DATE('now', '-6 days')
       GROUP BY DATE(borrow_date)
       ORDER BY date ASC`
    )
    .all() as { date: string; count: number }[]

  const trend: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const found = weeklyTrend.find((t) => t.date === dateStr)
    trend.push({ date: dateStr, count: found ? found.count : 0 })
  }

  res.json({
    totalBooks: totalBooks.count,
    totalMembers: totalMembers.count,
    monthlyBorrowings: monthlyBorrowings.count,
    pendingReviews: pendingReviews.count,
    weeklyTrend: trend,
  })
})

export default router
