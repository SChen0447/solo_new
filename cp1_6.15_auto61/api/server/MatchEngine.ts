const RANK_ORDER: Record<string, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  diamond: 3,
}

interface WaitingPlayer {
  socketId: string
  rank: string
  joinTime: number
}

type MatchResult = {
  player1: { userId: string; socketId: string; rank: string }
  player2: { userId: string; socketId: string; rank: string }
} | null

export class MatchEngine {
  private queue: Map<string, WaitingPlayer> = new Map()
  private intervalId: ReturnType<typeof setInterval> | null = null
  private onMatch: ((match: NonNullable<MatchResult>) => void) | null = null

  constructor() {
    this.intervalId = setInterval(() => {
      const match = this.findMatch()
      if (match && this.onMatch) {
        this.onMatch(match)
      }
    }, 2000)
  }

  setOnMatch(callback: (match: NonNullable<MatchResult>) => void): void {
    this.onMatch = callback
  }

  addPlayer(userId: string, socketId: string, rank: string): void {
    this.queue.set(userId, { socketId, rank, joinTime: Date.now() })
  }

  removePlayer(userId: string): void {
    this.queue.delete(userId)
  }

  tryMatch(): void {
    const match = this.findMatch()
    if (match && this.onMatch) {
      this.onMatch(match)
    }
  }

  findMatch(): MatchResult {
    const entries = Array.from(this.queue.entries())
    if (entries.length < 2) return null

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [userId1, player1] = entries[i]
        const [userId2, player2] = entries[j]

        const rankDiff = Math.abs(RANK_ORDER[player1.rank] - RANK_ORDER[player2.rank])
        const waitTime1 = Date.now() - player1.joinTime
        const waitTime2 = Date.now() - player2.joinTime
        const maxWait = Math.max(waitTime1, waitTime2)

        let allowedDiff = 0
        if (maxWait > 30000) allowedDiff = 2
        else if (maxWait > 15000) allowedDiff = 1

        if (rankDiff <= allowedDiff) {
          this.queue.delete(userId1)
          this.queue.delete(userId2)

          return {
            player1: { userId: userId1, socketId: player1.socketId, rank: player1.rank },
            player2: { userId: userId2, socketId: player2.socketId, rank: player2.rank },
          }
        }
      }
    }

    if (entries.length >= 2) {
      const maxWaitEntry = entries.reduce((max, entry) =>
        Date.now() - entry[1].joinTime > Date.now() - max[1].joinTime ? entry : max
      )
      const maxWait = Date.now() - maxWaitEntry[1].joinTime

      if (maxWait > 60000) {
        const sortedByWait = entries.sort((a, b) => a[1].joinTime - b[1].joinTime)
        const [userId1, player1] = sortedByWait[0]
        const [userId2, player2] = sortedByWait[1]

        this.queue.delete(userId1)
        this.queue.delete(userId2)

        return {
          player1: { userId: userId1, socketId: player1.socketId, rank: player1.rank },
          player2: { userId: userId2, socketId: player2.socketId, rank: player2.rank },
        }
      }
    }

    return null
  }

  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}
