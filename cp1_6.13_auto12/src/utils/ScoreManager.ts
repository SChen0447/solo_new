export type HitAccuracy = 'perfect' | 'good' | 'miss';

export interface ScoreState {
  score: number;
  combo: number;
  maxCombo: number;
  hp: number;
  maxHp: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
}

export interface ScoreChangeEvent {
  type: HitAccuracy;
  scoreDelta: number;
  comboDelta: number;
  hpDelta: number;
  newCombo: number;
  newScore: number;
  newHp: number;
  milestoneHit: number | null;
}

const MILESTONES = [10, 20, 50];

export class ScoreManager {
  private state: ScoreState;

  constructor(maxHp: number = 5) {
    this.state = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      hp: maxHp,
      maxHp,
      perfectCount: 0,
      goodCount: 0,
      missCount: 0,
    };
  }

  reset(): void {
    this.state = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      hp: this.state.maxHp,
      maxHp: this.state.maxHp,
      perfectCount: 0,
      goodCount: 0,
      missCount: 0,
    };
  }

  getState(): Readonly<ScoreState> {
    return { ...this.state };
  }

  getScore(): number {
    return this.state.score;
  }

  getCombo(): number {
    return this.state.combo;
  }

  getMaxCombo(): number {
    return this.state.maxCombo;
  }

  getHp(): number {
    return this.state.hp;
  }

  getMaxHp(): number {
    return this.state.maxHp;
  }

  getPerfectCount(): number {
    return this.state.perfectCount;
  }

  getGoodCount(): number {
    return this.state.goodCount;
  }

  getMissCount(): number {
    return this.state.missCount;
  }

  addHit(type: HitAccuracy): ScoreChangeEvent {
    let scoreDelta = 0;
    let comboDelta = 0;
    let hpDelta = 0;
    let milestoneHit: number | null = null;

    const multiplier = this.getMultiplier();

    switch (type) {
      case 'perfect':
        scoreDelta = Math.floor(3 * multiplier);
        comboDelta = 1;
        this.state.perfectCount++;
        break;
      case 'good':
        scoreDelta = Math.floor(1 * multiplier);
        comboDelta = 1;
        this.state.goodCount++;
        break;
      case 'miss':
        scoreDelta = 0;
        comboDelta = -this.state.combo;
        hpDelta = -1;
        this.state.missCount++;
        break;
    }

    const oldCombo = this.state.combo;

    this.state.score = Math.max(0, this.state.score + scoreDelta);
    this.state.combo = Math.max(0, this.state.combo + comboDelta);
    this.state.hp = Math.max(0, Math.min(this.state.maxHp, this.state.hp + hpDelta));

    if (this.state.combo > this.state.maxCombo) {
      this.state.maxCombo = this.state.combo;
    }

    const newCombo = this.state.combo;
    for (const milestone of MILESTONES) {
      if (oldCombo < milestone && newCombo >= milestone) {
        milestoneHit = milestone;
        break;
      }
    }

    return {
      type,
      scoreDelta,
      comboDelta,
      hpDelta,
      newCombo,
      newScore: this.state.score,
      newHp: this.state.hp,
      milestoneHit,
    };
  }

  getMultiplier(): number {
    const bonus = Math.floor(this.state.combo / 10) * 0.1;
    return Math.min(3.0, 1 + bonus);
  }

  isGameOver(): boolean {
    return this.state.hp <= 0;
  }

  getJudgeStats(): { perfect: number; good: number; miss: number; total: number } {
    const { perfectCount, goodCount, missCount } = this.state;
    return {
      perfect: perfectCount,
      good: goodCount,
      miss: missCount,
      total: perfectCount + goodCount + missCount,
    };
  }
}
