import { create } from 'zustand';
import type { GameStatus, Note, Enemy, GradeType, TrackType, JudgmentType } from '../types/game';
import { AudioEngine } from '../audio/audioEngine';
import { RhythmJudge } from '../rhythm/rhythmJudge';
import { CombatManager } from '../combat/combatManager';
import { PerformanceMonitor } from '../performance/performanceMonitor';
import { UIController } from '../rendering/uiController';
import { GAME_CONFIG, GRADE_THRESHOLDS } from '../utils/constants';

interface GameState {
  status: GameStatus;
  score: number;
  combo: number;
  maxCombo: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  playerHp: number;
  maxPlayerHp: number;
  currentTime: number;
  duration: number;
  progress: number;
  fps: number;
  trailCount: number;
  showPerfHint: boolean;
  grade: GradeType | null;
  notes: Note[];
  enemies: Enemy[];
  
  audioEngine: AudioEngine | null;
  rhythmJudge: RhythmJudge | null;
  combatManager: CombatManager | null;
  performanceMonitor: PerformanceMonitor | null;
  uiController: UIController | null;
  
  initGame: () => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  handleKeyPress: (track: TrackType) => void;
  update: (deltaTime: number) => void;
  setPerformance: (fps: number, optimized: boolean) => void;
  calculateGrade: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  status: 'idle',
  score: 0,
  combo: 0,
  maxCombo: 0,
  perfectCount: 0,
  goodCount: 0,
  missCount: 0,
  playerHp: GAME_CONFIG.maxPlayerHp,
  maxPlayerHp: GAME_CONFIG.maxPlayerHp,
  currentTime: 0,
  duration: 0,
  progress: 0,
  fps: 60,
  trailCount: GAME_CONFIG.trailCount,
  showPerfHint: false,
  grade: null,
  notes: [],
  enemies: [],
  
  audioEngine: null,
  rhythmJudge: null,
  combatManager: null,
  performanceMonitor: null,
  uiController: null,

  initGame: () => {
    const audioEngine = new AudioEngine();
    const rhythmJudge = new RhythmJudge();
    const combatManager = new CombatManager();
    const performanceMonitor = new PerformanceMonitor();
    const uiController = new UIController({
      canvasWidth: GAME_CONFIG.canvasWidth,
      canvasHeight: GAME_CONFIG.canvasHeight,
      trailCount: GAME_CONFIG.trailCount,
    });

    audioEngine.init();
    
    performanceMonitor.setCallback((metrics, needsOptimization) => {
      get().setPerformance(metrics.averageFps, needsOptimization);
    });

    set({
      audioEngine,
      rhythmJudge,
      combatManager,
      performanceMonitor,
      uiController,
      duration: audioEngine.getDuration(),
      notes: audioEngine.getNotes(),
    });
  },

  startGame: () => {
    const { audioEngine, combatManager, performanceMonitor, uiController } = get();
    if (!audioEngine || !combatManager || !performanceMonitor || !uiController) return;

    audioEngine.start();
    combatManager.reset();
    performanceMonitor.start();
    uiController.reset();

    set({
      status: 'playing',
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfectCount: 0,
      goodCount: 0,
      missCount: 0,
      playerHp: GAME_CONFIG.maxPlayerHp,
      currentTime: 0,
      progress: 0,
      grade: null,
      enemies: [],
    });
  },

  pauseGame: () => {
    set({ status: 'paused' });
  },

  resumeGame: () => {
    set({ status: 'playing' });
  },

  resetGame: () => {
    const { audioEngine, combatManager, performanceMonitor, uiController } = get();
    if (!audioEngine || !combatManager || !performanceMonitor || !uiController) return;

    audioEngine.reset();
    combatManager.reset();
    performanceMonitor.reset();
    uiController.reset();

    set({
      status: 'idle',
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfectCount: 0,
      goodCount: 0,
      missCount: 0,
      playerHp: GAME_CONFIG.maxPlayerHp,
      currentTime: 0,
      progress: 0,
      grade: null,
      notes: audioEngine.getNotes(),
      enemies: [],
    });
  },

  handleKeyPress: (track: TrackType) => {
    const { status, audioEngine, rhythmJudge, combatManager, uiController, notes } = get();
    if (status !== 'playing' || !audioEngine || !rhythmJudge || !combatManager || !uiController) return;

    const currentTime = audioEngine.getCurrentTime();
    const pressTime = performance.now();

    const judgment = rhythmJudge.judge(pressTime, track, notes, currentTime);

    if (judgment) {
      const updatedNotes = notes.map((n) =>
        n.id === judgment.noteId ? { ...n, hit: true, judgment: judgment.type } : n
      );

      const scoreGain = rhythmJudge.getScore(judgment.type);
      const newCombo = get().combo + 1;
      const newMaxCombo = Math.max(get().maxCombo, newCombo);

      let perfectCount = get().perfectCount;
      let goodCount = get().goodCount;

      if (judgment.type === 'perfect') perfectCount++;
      if (judgment.type === 'good') goodCount++;

      const combatResult = combatManager.handleHit(judgment.type, track, currentTime);
      
      if (combatResult.killed && combatResult.enemyId) {
        const enemy = combatManager.getEnemies().find((e) => e.id === combatResult.enemyId);
        if (enemy) {
          uiController.spawnEnemyDeathParticles(enemy, currentTime);
        }
      }

      uiController.addJudgmentEffect(judgment.type, track, currentTime);
      uiController.addScorePopup(scoreGain, judgment.type, track, currentTime);

      if (judgment.type === 'perfect' || judgment.type === 'good') {
        const x = track === 'left' ? uiController.getLeftTrackX() : uiController.getRightTrackX();
        uiController.spawnExplosionParticles(x, GAME_CONFIG.judgmentLineY, 15, '#fff', currentTime);
      }

      set({
        notes: updatedNotes,
        score: get().score + scoreGain,
        combo: newCombo,
        maxCombo: newMaxCombo,
        perfectCount,
        goodCount,
        enemies: combatManager.getEnemies(),
        playerHp: combatManager.getPlayerHp(),
      });
    } else {
      const tookDamage = combatManager.handleMiss();
      
      uiController.addJudgmentEffect('miss', track, currentTime);
      
      set((state) => ({
        combo: 0,
        missCount: state.missCount + 1,
        playerHp: combatManager.getPlayerHp(),
        enemies: combatManager.getEnemies(),
      }));

      if (tookDamage) {
        const x = track === 'left' ? uiController.getLeftTrackX() : uiController.getRightTrackX();
        uiController.spawnExplosionParticles(x, GAME_CONFIG.judgmentLineY, 20, '#e74c3c', currentTime);
      }

      if (combatManager.isPlayerDead()) {
        get().calculateGrade();
        set({ status: 'ended' });
      }
    }
  },

  update: (deltaTime: number) => {
    const { status, audioEngine, combatManager, performanceMonitor, uiController, notes } = get();
    if (status !== 'playing' || !audioEngine || !combatManager || !performanceMonitor || !uiController) return;

    const currentTime = audioEngine.getCurrentTime();
    performanceMonitor.tick(performance.now());

    combatManager.update(currentTime, deltaTime);

    const missedNotes = notes.filter(
      (n) => !n.hit && n.time < currentTime - GAME_CONFIG.goodWindow
    );

    if (missedNotes.length > 0) {
      const updatedNotes = notes.map((n) =>
        missedNotes.find((m) => m.id === n.id) ? { ...n, hit: true, judgment: 'miss' as JudgmentType } : n
      );

      for (const note of missedNotes) {
        combatManager.handleMiss();
        uiController.addJudgmentEffect('miss', note.track, currentTime);
      }

      set({
        notes: updatedNotes,
        combo: 0,
        missCount: get().missCount + missedNotes.length,
        playerHp: combatManager.getPlayerHp(),
        enemies: combatManager.getEnemies(),
      });

      if (combatManager.isPlayerDead()) {
        get().calculateGrade();
        set({ status: 'ended' });
        return;
      }
    }

    if (audioEngine.isGameOver(currentTime)) {
      get().calculateGrade();
      set({ status: 'ended' });
      return;
    }

    set({
      currentTime,
      progress: audioEngine.getProgress(),
      enemies: combatManager.getEnemies(),
      fps: performanceMonitor.getFps(),
      showPerfHint: performanceMonitor.shouldShowHint(currentTime),
    });
  },

  setPerformance: (fps: number, optimized: boolean) => {
    const { uiController } = get();
    const trailCount = optimized ? GAME_CONFIG.lowTrailCount : GAME_CONFIG.trailCount;
    
    if (uiController) {
      uiController.setTrailCount(trailCount);
    }

    set({ fps, trailCount });
  },

  calculateGrade: () => {
    const { perfectCount, goodCount, missCount } = get();
    const totalNotes = perfectCount + goodCount + missCount;
    
    if (totalNotes === 0) {
      set({ grade: 'C' });
      return;
    }

    const perfectRatio = perfectCount / totalNotes;
    let grade: GradeType = 'C';

    if (perfectRatio >= GRADE_THRESHOLDS.S) {
      grade = 'S';
    } else if (perfectRatio >= GRADE_THRESHOLDS.A) {
      grade = 'A';
    } else if (perfectRatio >= GRADE_THRESHOLDS.B) {
      grade = 'B';
    }

    set({ grade });
  },
}));
