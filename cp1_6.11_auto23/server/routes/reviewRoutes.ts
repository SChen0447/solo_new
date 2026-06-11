import { Router, Request, Response } from 'express'
import {
  addReview,
  getAllReviews,
  getApprovedReviews,
  approveReview,
  rejectReview,
  getReviewById,
} from '../models/Review'

const router = Router()

router.post('/api/reviews', (req: Request, res: Response) => {
  try {
    const result = addReview(req.body)
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error })
    }
    res.status(201).json({ success: true, review: result.review })
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

router.get('/api/reviews', (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined
    if (status === 'pending') {
      const reviews = getAllReviews('pending')
      return res.json({ success: true, reviews })
    }
    if (status === 'all') {
      const reviews = getAllReviews()
      return res.json({ success: true, reviews })
    }
    const reviews = getApprovedReviews()
    res.json({ success: true, reviews })
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

router.get('/api/reviews/:id', (req: Request, res: Response) => {
  try {
    const review = getReviewById(req.params.id)
    if (!review) {
      return res.status(404).json({ success: false, error: '评价不存在' })
    }
    res.json({ success: true, review })
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

router.put('/api/reviews/:id/approve', (req: Request, res: Response) => {
  try {
    const result = approveReview(req.params.id)
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error })
    }
    res.json({ success: true, review: result.review })
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

router.put('/api/reviews/:id/reject', (req: Request, res: Response) => {
  try {
    const result = rejectReview(req.params.id)
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error })
    }
    res.json({ success: true, review: result.review })
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

export default router
