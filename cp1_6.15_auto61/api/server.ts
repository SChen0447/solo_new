import http from 'http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import app from './app.js'
import db, { getRankByElo, calculateElo } from './database.js'
import { MatchEngine } from './server/MatchEngine.js'
import { CodeSandbox } from './server/CodeSandbox.js'

const PORT = process.env.PORT || 3001
const JWT_SECRET = 'codearena-secret-2024'
const BATTLE_DURATION = 10 * 60

const server = http.createServer(app)

const io = new Server(server, {
  cors: { origin: '*' },
})

const matchEngine = new MatchEngine()
const codeSandbox = new CodeSandbox()

const activeBattles: Map<
  string,
  {
    player1Id: string
    player2Id: string
    player1SocketId: string
    player2SocketId: string
    problemId: string
    startTime: number
    timerInterval: ReturnType<typeof setInterval>
    player1Submitted: boolean
    player2Submitted: boolean
    player1Passed: number
    player2Passed: number
    player1Time: number
    player2Time: number
    replayEvents: { timestamp: number; event_type: string; player_id: string; event_data: string }[]
  }
> = new Map()

const socketUserMap: Map<string, string> = new Map()

matchEngine.setOnMatch((match) => {
  const { player1, player2 } = match

  const problem = db.prepare('SELECT * FROM problems ORDER BY RANDOM() LIMIT 1').get() as any
  if (!problem) return

  const battleId = uuidv4()
  const now = Date.now()

  db.prepare(
    'INSERT INTO battles (id, problem_id, player1_id, player2_id) VALUES (?, ?, ?, ?)'
  ).run(battleId, problem.id, player1.userId, player2.userId)

  const player1User = db.prepare('SELECT id, nickname, elo, rank, wins, losses FROM users WHERE id = ?').get(player1.userId) as any
  const player2User = db.prepare('SELECT id, nickname, elo, rank, wins, losses FROM users WHERE id = ?').get(player2.userId) as any

  const allTestCases = JSON.parse(problem.test_cases || '[]')

  const battleData = {
    player1Id: player1.userId,
    player2Id: player2.userId,
    player1SocketId: player1.socketId,
    player2SocketId: player2.socketId,
    problemId: problem.id,
    startTime: now,
    timerInterval: null as any,
    player1Submitted: false,
    player2Submitted: false,
    player1Passed: 0,
    player2Passed: 0,
    player1Time: 0,
    player2Time: 0,
    replayEvents: [] as { timestamp: number; event_type: string; player_id: string; event_data: string }[],
  }

  activeBattles.set(battleId, battleData)

  io.to(player1.socketId).emit('match:found', {
    opponent: player2User,
    problemId: problem.id,
  })
  io.to(player2.socketId).emit('match:found', {
    opponent: player1User,
    problemId: problem.id,
  })

  let countdown = 3
  const countdownInterval = setInterval(() => {
    io.to(player1.socketId).emit('match:countdown', { seconds: countdown })
    io.to(player2.socketId).emit('match:countdown', { seconds: countdown })
    countdown--

    if (countdown < 0) {
      clearInterval(countdownInterval)

      const visibleTestCases = allTestCases.filter((tc: any) => !tc.isHidden)

      io.to(player1.socketId).emit('match:start', {
        problem: {
          id: problem.id,
          title: problem.title,
          description: problem.description,
          difficulty: problem.difficulty,
          template: problem.template,
          testCases: visibleTestCases,
        },
        timeLimit: BATTLE_DURATION,
      })
      io.to(player2.socketId).emit('match:start', {
        problem: {
          id: problem.id,
          title: problem.title,
          description: problem.description,
          difficulty: problem.difficulty,
          template: problem.template,
          testCases: visibleTestCases,
        },
        timeLimit: BATTLE_DURATION,
      })

      const currentBattle = activeBattles.get(battleId)
      if (currentBattle) {
        currentBattle.startTime = Date.now()

        let remaining = BATTLE_DURATION
        currentBattle.timerInterval = setInterval(() => {
          remaining--
          io.to(currentBattle.player1SocketId).emit('battle:time', { remaining })
          io.to(currentBattle.player2SocketId).emit('battle:time', { remaining })

          if (remaining <= 0) {
            clearInterval(currentBattle.timerInterval)
            endBattle(battleId, 'timeout')
          }
        }, 1000)
      }
    }
  }, 1000)
})

function endBattle(battleId: string, reason: string, disconnectedUserId?: string): void {
  const battle = activeBattles.get(battleId)
  if (!battle) return

  clearInterval(battle.timerInterval)

  let winnerId: string | null = null
  let endReason = reason

  if (reason === 'all_passed') {
    const lastSubmitPlayerId = battle.replayEvents.length > 0
      ? battle.replayEvents[battle.replayEvents.length - 1].player_id
      : null
    winnerId = lastSubmitPlayerId
  } else if (reason === 'disconnect') {
    winnerId = disconnectedUserId === battle.player1Id
      ? battle.player2Id
      : battle.player1Id
  } else if (reason === 'timeout') {
    if (battle.player1Passed > battle.player2Passed) {
      winnerId = battle.player1Id
    } else if (battle.player2Passed > battle.player1Passed) {
      winnerId = battle.player2Id
    } else if (battle.player1Passed === battle.player2Passed && battle.player1Time > 0 && battle.player2Time > 0) {
      winnerId = battle.player1Time <= battle.player2Time ? battle.player1Id : battle.player2Id
    } else {
      endReason = 'draw'
    }
  }

  let eloChange = 0
  if (winnerId) {
    const winner = db.prepare('SELECT * FROM users WHERE id = ?').get(winnerId) as any
    const loserId = winnerId === battle.player1Id ? battle.player2Id : battle.player1Id
    const loser = db.prepare('SELECT * FROM users WHERE id = ?').get(loserId) as any

    const { winnerNew, loserNew } = calculateElo(winner.elo, loser.elo)
    eloChange = winnerNew - winner.elo

    const winnerRank = getRankByElo(winnerNew)
    const loserRank = getRankByElo(loserNew)

    db.prepare('UPDATE users SET elo = ?, rank = ?, wins = wins + 1 WHERE id = ?').run(winnerNew, winnerRank, winnerId)
    db.prepare('UPDATE users SET elo = ?, rank = ?, losses = losses + 1 WHERE id = ?').run(loserNew, loserRank, loserId)

    db.prepare(
      'UPDATE battles SET winner_id = ?, player1_passed = ?, player2_passed = ?, player1_time = ?, player2_time = ?, end_reason = ? WHERE id = ?'
    ).run(winnerId, battle.player1Passed, battle.player2Passed, battle.player1Time, battle.player2Time, endReason, battleId)
  } else {
    db.prepare(
      'UPDATE battles SET player1_passed = ?, player2_passed = ?, player1_time = ?, player2_time = ?, end_reason = ? WHERE id = ?'
    ).run(battle.player1Passed, battle.player2Passed, battle.player1Time, battle.player2Time, endReason, battleId)
  }

  if (battle.replayEvents.length > 0) {
    const insertReplay = db.prepare(
      'INSERT INTO battle_replays (id, battle_id, timestamp, event_type, player_id, event_data) VALUES (?, ?, ?, ?, ?, ?)'
    )
    const insertMany = db.transaction((events: typeof battle.replayEvents) => {
      for (const event of events) {
        insertReplay.run(uuidv4(), battleId, event.timestamp, event.event_type, event.player_id, event.event_data)
      }
    })
    insertMany(battle.replayEvents)
  }

  io.to(battle.player1SocketId).emit('battle:end', {
    winner: winnerId || '',
    reason: endReason,
    eloChange: winnerId ? (winnerId === battle.player1Id ? eloChange : -eloChange) : 0,
  })
  io.to(battle.player2SocketId).emit('battle:end', {
    winner: winnerId || '',
    reason: endReason,
    eloChange: winnerId ? (winnerId === battle.player2Id ? eloChange : -eloChange) : 0,
  })

  activeBattles.delete(battleId)
}

io.use((socket, next) => {
  const token = socket.handshake.auth.token
  if (!token) {
    next(new Error('Authentication error'))
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    socket.data.userId = decoded.userId
    next()
  } catch {
    next(new Error('Authentication error'))
  }
})

io.on('connection', (socket) => {
  const userId = socket.data.userId as string
  socketUserMap.set(socket.id, userId)

  socket.on('match:join', () => {
    const user = db.prepare('SELECT rank FROM users WHERE id = ?').get(userId) as any
    if (!user) return

    matchEngine.addPlayer(userId, socket.id, user.rank)
    socket.emit('match:waiting', {})

    matchEngine.tryMatch()
  })

  socket.on('match:cancel', () => {
    matchEngine.removePlayer(userId)
  })

  socket.on('code:sync', (data: { range: { startLine: number; endLine: number } }) => {
    for (const [, battle] of activeBattles) {
      const isPlayer1 = battle.player1Id === userId
      const opponentSocketId = isPlayer1 ? battle.player2SocketId : battle.player1SocketId

      if (isPlayer1 || battle.player2Id === userId) {
        io.to(opponentSocketId).emit('opponent:editing', { range: data.range })

        battle.replayEvents.push({
          timestamp: Date.now() - battle.startTime,
          event_type: 'code_sync',
          player_id: userId,
          event_data: JSON.stringify({ editRange: data.range }),
        })
        break
      }
    }
  })

  socket.on('code:submit', (data: { code: string; language: string }) => {
    for (const [battleId, battle] of activeBattles) {
      const isPlayer1 = battle.player1Id === userId
      const isPlayer2 = battle.player2Id === userId

      if (!isPlayer1 && !isPlayer2) continue

      const problem = db.prepare('SELECT test_cases FROM problems WHERE id = ?').get(battle.problemId) as any
      if (!problem) break

      const testCases = JSON.parse(problem.test_cases || '[]')
      const results = codeSandbox.executeCode(data.code, testCases)
      const passedCount = results.filter((r) => r.passed).length
      const totalTime = results.reduce((sum, r) => sum + r.time, 0)

      if (isPlayer1) {
        battle.player1Passed = passedCount
        battle.player1Time = totalTime
        battle.player1Submitted = true
      } else {
        battle.player2Passed = passedCount
        battle.player2Time = totalTime
        battle.player2Submitted = true
      }

      battle.replayEvents.push({
        timestamp: Date.now() - battle.startTime,
        event_type: 'submit',
        player_id: userId,
        event_data: JSON.stringify({ passedCases: passedCount, totalTime }),
      })

      battle.replayEvents.push({
        timestamp: Date.now() - battle.startTime,
        event_type: 'test_result',
        player_id: userId,
        event_data: JSON.stringify({ passedCases: passedCount, totalTime }),
      })

      io.to(battle.player1SocketId).emit('battle:result', {
        playerId: userId,
        passedCases: passedCount,
        totalTime,
      })
      io.to(battle.player2SocketId).emit('battle:result', {
        playerId: userId,
        passedCases: passedCount,
        totalTime,
      })

      const allTestCases = testCases.length
      if (passedCount === allTestCases) {
        endBattle(battleId, 'all_passed')
      }

      break
    }
  })

  socket.on('disconnect', () => {
    matchEngine.removePlayer(userId)
    socketUserMap.delete(socket.id)

    for (const [battleId, battle] of activeBattles) {
      if (battle.player1Id === userId || battle.player2Id === userId) {
        endBattle(battleId, 'disconnect', userId)
        break
      }
    }
  })
})

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received')
  matchEngine.destroy()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received')
  matchEngine.destroy()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app
