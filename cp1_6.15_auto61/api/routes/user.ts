import { Router, type Response } from 'express'
import db from '../database.js'
import { authMiddleware, type Request } from './auth.js'

const router = Router()

router.get('/profile', authMiddleware, (req: Request, res: Response): void => {
  const user = db.prepare('SELECT id, nickname, elo, rank, wins, losses, created_at FROM users WHERE id = ?').get(req.userId) as any

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  res.json({
    success: true,
    profile: {
      id: user.id,
      nickname: user.nickname,
      elo: user.elo,
      rank: user.rank,
      wins: user.wins,
      losses: user.losses,
      createdAt: user.created_at,
    },
  })
})

router.get('/battles', authMiddleware, (req: Request, res: Response): void => {
  const battles = db.prepare(`
    SELECT b.id, b.winner_id, b.player1_passed, b.player2_passed, b.player1_time, b.player2_time, b.end_reason, b.created_at,
      p.title as problem_title,
      u1.nickname as opponent_nickname, u1.rank as opponent_rank,
      CASE WHEN b.player1_id = ? THEN 'player1' ELSE 'player2' END as player_side
    FROM battles b
    JOIN problems p ON b.problem_id = p.id
    JOIN users u1 ON CASE WHEN b.player1_id = ? THEN b.player2_id ELSE b.player1_id END = u1.id
    WHERE b.player1_id = ? OR b.player2_id = ?
    ORDER BY b.created_at DESC
  `).all(req.userId, req.userId, req.userId, req.userId) as any[]

  const result = battles.map((b) => {
    const isPlayer1 = b.player_side === 'player1'
    const result2: 'win' | 'loss' = b.winner_id === req.userId ? 'win' : 'loss'
    return {
      id: b.id,
      opponentNickname: b.opponent_nickname,
      opponentRank: b.opponent_rank,
      problemTitle: b.problem_title,
      result: result2,
      passedCases: isPlayer1 ? b.player1_passed : b.player2_passed,
      totalCases: b.player1_passed + b.player2_passed > 0
        ? (isPlayer1 ? b.player1_passed : b.player2_passed) + (isPlayer1 ? b.player2_passed : b.player1_passed)
        : 0,
      totalTime: isPlayer1 ? b.player1_time : b.player2_time,
      createdAt: b.created_at,
    }
  })

  res.json({ success: true, battles: result })
})

router.get('/battles/:id', authMiddleware, (req: Request, res: Response): void => {
  const battle = db.prepare(`
    SELECT b.*, p.title as problem_title, p.test_cases,
      u1.nickname as player1_nickname, u1.rank as player1_rank,
      u2.nickname as player2_nickname, u2.rank as player2_rank
    FROM battles b
    JOIN problems p ON b.problem_id = p.id
    JOIN users u1 ON b.player1_id = u1.id
    JOIN users u2 ON b.player2_id = u2.id
    WHERE b.id = ?
  `).get(req.params.id) as any

  if (!battle) {
    res.status(404).json({ success: false, error: 'Battle not found' })
    return
  }

  if (battle.player1_id !== req.userId && battle.player2_id !== req.userId) {
    res.status(403).json({ success: false, error: 'Access denied' })
    return
  }

  const replays = db.prepare(`
    SELECT id, timestamp, event_type, player_id, event_data
    FROM battle_replays
    WHERE battle_id = ?
    ORDER BY timestamp ASC
  `).all(req.params.id) as any[]

  const isPlayer1 = battle.player1_id === req.userId
  const opponentNickname = isPlayer1 ? battle.player2_nickname : battle.player1_nickname
  const opponentRank = isPlayer1 ? battle.player2_rank : battle.player1_rank

  const testCases = JSON.parse(battle.test_cases || '[]')
  const totalCases = testCases.length

  res.json({
    success: true,
    battle: {
      id: battle.id,
      opponentNickname,
      opponentRank,
      problemTitle: battle.problem_title,
      result: battle.winner_id === req.userId ? 'win' : 'loss' as 'win' | 'loss',
      passedCases: isPlayer1 ? battle.player1_passed : battle.player2_passed,
      totalCases,
      totalTime: isPlayer1 ? battle.player1_time : battle.player2_time,
      createdAt: battle.created_at,
      replay: replays.map((r) => ({
        timestamp: r.timestamp,
        type: r.event_type,
        playerId: r.player_id,
        data: JSON.parse(r.event_data),
      })),
    },
  })
})

export default router
