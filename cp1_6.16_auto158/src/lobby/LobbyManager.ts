import {
  GameModule,
  GameInfo,
  Difficulty,
  HighScore,
  GameStats,
  GameEvent,
  GameEventListener,
  GameConfig
} from '../games/GameInterface';

const HIGHSCORE_KEY = 'pixel_game_highscores';
const STATS_KEY = 'pixel_game_stats';

export class LobbyManager {
  private games: Map<string, GameInfo> = new Map();
  private highScores: Map<string, HighScore> = new Map();
  private stats: GameStats = { totalPlays: 0, totalDuration: 0, totalScore: 0 };
  private difficulty: Difficulty = 'normal';
  private currentGameId: string | null = null;
  private currentGame: GameModule | null = null;
  private listeners: GameEventListener[] = [];
  private gameStartTime: number = 0;

  constructor() {
    this.loadHighScores();
    this.loadStats();
  }

  registerGame(info: Omit<GameInfo, 'module'> & { module: GameModule }): void {
    this.games.set(info.id, info);
    if (!this.highScores.has(info.id)) {
      this.highScores.set(info.id, { score: 0, date: '' });
    }
  }

  getGames(): GameInfo[] {
    return Array.from(this.games.values());
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
  }

  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  getDifficultyColor(difficulty: Difficulty = this.difficulty): string {
    const colors: Record<Difficulty, string> = {
      easy: '#81c784',
      normal: '#ffb74d',
      hard: '#e57373'
    };
    return colors[difficulty];
  }

  getDifficultyLabel(difficulty: Difficulty = this.difficulty): string {
    const labels: Record<Difficulty, string> = {
      easy: '简单',
      normal: '普通',
      hard: '困难'
    };
    return labels[difficulty];
  }

  launchGame(gameId: string, canvas: HTMLCanvasElement): void {
    const gameInfo = this.games.get(gameId);
    if (!gameInfo) return;

    this.currentGameId = gameId;
    this.currentGame = gameInfo.module;

    const config: GameConfig = {
      difficulty: this.difficulty,
      onGameEnd: (score: number) => this.handleGameEnd(score)
    };

    this.currentGame.init(canvas, config);
    this.gameStartTime = Date.now();
    this.currentGame.start();

    this.emitEvent({
      type: 'gameStart',
      gameId
    });
  }

  private handleGameEnd(score: number): void {
    const duration = Math.floor((Date.now() - this.gameStartTime) / 1000);
    const gameId = this.currentGameId!;
    const isNewRecord = this.updateHighScore(gameId, score);

    this.updateStats(score, duration);

    this.emitEvent({
      type: 'gameEnd',
      gameId,
      score,
      duration,
      isNewRecord
    });

    if (isNewRecord) {
      this.emitEvent({
        type: 'newRecord',
        gameId,
        score
      });
    }
  }

  pauseGame(): void {
    if (this.currentGame) {
      this.currentGame.pause();
    }
  }

  resumeGame(): void {
    if (this.currentGame) {
      this.currentGame.resume();
    }
  }

  exitGame(): void {
    if (this.currentGame) {
      this.currentGame.destroy();
      this.currentGame = null;
      this.currentGameId = null;
    }
  }

  getHighScore(gameId: string): HighScore | undefined {
    return this.highScores.get(gameId);
  }

  private updateHighScore(gameId: string, score: number): boolean {
    const current = this.highScores.get(gameId);
    if (!current || score > current.score) {
      this.highScores.set(gameId, {
        score,
        date: new Date().toISOString().split('T')[0]
      });
      this.saveHighScores();
      return true;
    }
    return false;
  }

  getStats(): GameStats {
    return { ...this.stats };
  }

  private updateStats(score: number, duration: number): void {
    this.stats.totalPlays += 1;
    this.stats.totalDuration += duration;
    this.stats.totalScore += score;
    this.saveStats();
  }

  private loadHighScores(): void {
    try {
      const data = localStorage.getItem(HIGHSCORE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        Object.entries(parsed).forEach(([key, value]) => {
          this.highScores.set(key, value as HighScore);
        });
      }
    } catch (e) {
      console.error('Failed to load high scores:', e);
    }
  }

  private saveHighScores(): void {
    try {
      const data: Record<string, HighScore> = {};
      this.highScores.forEach((value, key) => {
        data[key] = value;
      });
      localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save high scores:', e);
    }
  }

  private loadStats(): void {
    try {
      const data = localStorage.getItem(STATS_KEY);
      if (data) {
        this.stats = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  }

  private saveStats(): void {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));
    } catch (e) {
      console.error('Failed to save stats:', e);
    }
  }

  addEventListener(listener: GameEventListener): void {
    this.listeners.push(listener);
  }

  removeEventListener(listener: GameEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private emitEvent(event: GameEvent): void {
    this.listeners.forEach(listener => listener(event));
  }
}
