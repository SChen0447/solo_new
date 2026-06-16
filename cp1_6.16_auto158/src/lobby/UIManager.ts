import { LobbyManager } from './LobbyManager';
import { GameInfo, Difficulty, GameEvent } from '../games/GameInterface';

type ViewMode = 'lobby' | 'game';

export class UIManager {
  private container: HTMLElement;
  private lobbyManager: LobbyManager;
  private viewMode: ViewMode = 'lobby';
  private newRecordBlinkInterval: number | null = null;
  private onGameSelect: ((gameId: string) => void) | null = null;
  private onDifficultyChange: ((difficulty: Difficulty) => void) | null = null;
  private onExitToLobby: (() => void) | null = null;

  constructor(container: HTMLElement, lobbyManager: LobbyManager) {
    this.container = container;
    this.lobbyManager = lobbyManager;
    this.lobbyManager.addEventListener(this.handleGameEvent.bind(this));
  }

  setOnGameSelect(callback: (gameId: string) => void): void {
    this.onGameSelect = callback;
  }

  setOnDifficultyChange(callback: (difficulty: Difficulty) => void): void {
    this.onDifficultyChange = callback;
  }

  setOnExitToLobby(callback: () => void): void {
    this.onExitToLobby = callback;
  }

  renderLobby(): void {
    this.viewMode = 'lobby';
    this.container.innerHTML = '';
    this.container.className = '';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.alignItems = 'center';
    this.container.style.padding = '40px 20px';
    this.container.style.overflowY = 'auto';
    this.container.style.height = '100vh';

    const title = document.createElement('h1');
    title.textContent = '像素游戏大厅';
    title.style.color = '#ffd700';
    title.style.fontSize = '24px';
    title.style.marginBottom = '30px';
    title.style.textAlign = 'center';
    title.classList.add('fade-in');
    this.container.appendChild(title);

    this.renderDifficultySelector();
    this.renderGameGrid();
    this.renderStats();
  }

  private renderDifficultySelector(): void {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '30px';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '15px';

    const label = document.createElement('label');
    label.textContent = '难度:';
    label.style.color = '#e0e0e0';
    label.style.fontSize = '12px';
    wrapper.appendChild(label);

    const select = document.createElement('select');
    select.style.fontFamily = "'Press Start 2P', cursive";
    select.style.fontSize = '10px';
    select.style.padding = '10px 15px';
    select.style.backgroundColor = '#2a2a4e';
    select.style.color = '#e0e0e0';
    select.style.border = '2px solid #4a4a6e';
    select.style.borderRadius = '8px';
    select.style.cursor = 'pointer';
    select.style.outline = 'none';

    const difficulties: { value: Difficulty; label: string }[] = [
      { value: 'easy', label: '简单' },
      { value: 'normal', label: '普通' },
      { value: 'hard', label: '困难' }
    ];

    difficulties.forEach(d => {
      const option = document.createElement('option');
      option.value = d.value;
      option.textContent = d.label;
      if (d.value === this.lobbyManager.getDifficulty()) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      const difficulty = (e.target as HTMLSelectElement).value as Difficulty;
      if (this.onDifficultyChange) {
        this.onDifficultyChange(difficulty);
      }
      this.updateCardBorders();
    });

    wrapper.appendChild(select);
    this.container.appendChild(wrapper);
  }

  private renderGameGrid(): void {
    const grid = document.createElement('div');
    grid.id = 'game-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(2, 300px)';
    grid.style.gap = '20px';
    grid.style.marginBottom = '40px';

    const games = this.lobbyManager.getGames();
    games.forEach(game => {
      const card = this.createGameCard(game);
      grid.appendChild(card);
    });

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleResponsive = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        grid.style.gridTemplateColumns = '1fr';
        grid.style.width = '100%';
        grid.style.maxWidth = '400px';
      } else {
        grid.style.gridTemplateColumns = 'repeat(2, 300px)';
        grid.style.width = 'auto';
        grid.style.maxWidth = 'none';
      }
    };
    handleResponsive(mediaQuery);
    mediaQuery.addEventListener('change', handleResponsive);

    this.container.appendChild(grid);
  }

  private createGameCard(game: GameInfo): HTMLElement {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.dataset.gameId = game.id;
    card.style.width = '300px';
    card.style.height = '200px';
    card.style.backgroundColor = game.color;
    card.style.borderRadius = '12px';
    card.style.padding = '20px';
    card.style.cursor = 'pointer';
    card.style.position = 'relative';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.justifyContent = 'space-between';
    card.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s ease-out';
    card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    card.style.border = `2px solid ${this.lobbyManager.getDifficultyColor()}`;
    card.style.boxSizing = 'border-box';

    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-8px)';
      card.style.boxShadow = '0 8px 25px rgba(0,0,0,0.5)';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    });

    card.addEventListener('click', () => {
      if (this.onGameSelect) {
        this.onGameSelect(game.id);
      }
    });

    const difficultyTag = document.createElement('span');
    difficultyTag.className = 'difficulty-tag';
    difficultyTag.textContent = this.lobbyManager.getDifficultyLabel();
    difficultyTag.style.position = 'absolute';
    difficultyTag.style.top = '10px';
    difficultyTag.style.left = '10px';
    difficultyTag.style.backgroundColor = this.lobbyManager.getDifficultyColor();
    difficultyTag.style.color = '#1a1a2e';
    difficultyTag.style.padding = '4px 8px';
    difficultyTag.style.borderRadius = '4px';
    difficultyTag.style.fontSize = '8px';
    card.appendChild(difficultyTag);

    const title = document.createElement('h3');
    title.textContent = game.name;
    title.style.color = '#e0e0e0';
    title.style.fontSize = '14px';
    title.style.marginTop = '20px';
    title.style.marginBottom = '8px';
    card.appendChild(title);

    const description = document.createElement('p');
    description.textContent = game.description;
    description.style.color = '#b0b0b0';
    description.style.fontSize = '8px';
    description.style.lineHeight = '1.5';
    description.style.marginBottom = '15px';
    card.appendChild(description);

    const scoreWrapper = document.createElement('div');
    scoreWrapper.style.display = 'flex';
    scoreWrapper.style.justifyContent = 'space-between';
    scoreWrapper.style.alignItems = 'center';

    const highScoreLabel = document.createElement('span');
    highScoreLabel.textContent = '最高分:';
    highScoreLabel.style.color = '#b0b0b0';
    highScoreLabel.style.fontSize = '8px';
    scoreWrapper.appendChild(highScoreLabel);

    const highScoreValue = document.createElement('span');
    highScoreValue.className = 'high-score monospace';
    highScoreValue.dataset.gameId = game.id;
    const highScore = this.lobbyManager.getHighScore(game.id);
    highScoreValue.textContent = String(highScore?.score || 0);
    highScoreValue.style.color = '#ffd700';
    highScoreValue.style.fontSize = '12px';
    highScoreValue.style.fontWeight = 'bold';
    scoreWrapper.appendChild(highScoreValue);

    card.appendChild(scoreWrapper);

    const newRecord = document.createElement('div');
    newRecord.className = 'new-record';
    newRecord.dataset.gameId = game.id;
    newRecord.textContent = 'NEW RECORD!';
    newRecord.style.position = 'absolute';
    newRecord.style.top = '50%';
    newRecord.style.left = '50%';
    newRecord.style.transform = 'translate(-50%, -50%)';
    newRecord.style.color = '#ffd700';
    newRecord.style.fontSize = '10px';
    newRecord.style.display = 'none';
    newRecord.style.backgroundColor = 'rgba(0,0,0,0.8)';
    newRecord.style.padding = '8px 12px';
    newRecord.style.borderRadius = '4px';
    card.appendChild(newRecord);

    return card;
  }

  private updateCardBorders(): void {
    const cards = this.container.querySelectorAll('.game-card');
    const color = this.lobbyManager.getDifficultyColor();
    const label = this.lobbyManager.getDifficultyLabel();

    cards.forEach(card => {
      (card as HTMLElement).style.borderColor = color;
      const tag = card.querySelector('.difficulty-tag');
      if (tag) {
        (tag as HTMLElement).textContent = label;
        (tag as HTMLElement).style.backgroundColor = color;
      }
    });
  }

  private renderStats(): void {
    const stats = this.lobbyManager.getStats();
    const statsContainer = document.createElement('div');
    statsContainer.id = 'stats-container';
    statsContainer.style.display = 'flex';
    statsContainer.style.gap = '40px';
    statsContainer.style.flexWrap = 'wrap';
    statsContainer.style.justifyContent = 'center';
    statsContainer.style.padding = '20px';
    statsContainer.style.backgroundColor = 'rgba(255,255,255,0.05)';
    statsContainer.style.borderRadius = '12px';
    statsContainer.style.marginTop = 'auto';

    this.createStatItem(statsContainer, '总游玩次数', String(stats.totalPlays));
    this.createStatItem(statsContainer, '总游戏时长', `${stats.totalDuration}秒`);
    this.createStatItem(statsContainer, '总分数', String(stats.totalScore));

    this.container.appendChild(statsContainer);
  }

  private createStatItem(container: HTMLElement, label: string, value: string): void {
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'center';
    item.style.gap = '8px';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.color = '#b0b0b0';
    labelEl.style.fontSize = '8px';
    item.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.className = 'monospace';
    valueEl.textContent = value;
    valueEl.style.color = '#ffd700';
    valueEl.style.fontSize = '14px';
    valueEl.style.fontWeight = 'bold';
    item.appendChild(valueEl);

    container.appendChild(item);
  }

  createGameCanvas(): HTMLCanvasElement {
    this.viewMode = 'game';
    this.container.innerHTML = '';
    this.container.style.display = 'block';
    this.container.style.padding = '0';
    this.container.style.overflow = 'hidden';

    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100vh';
    canvas.style.display = 'block';
    canvas.classList.add('fade-in');

    const pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'pause-overlay';
    pauseOverlay.style.position = 'fixed';
    pauseOverlay.style.top = '0';
    pauseOverlay.style.left = '0';
    pauseOverlay.style.width = '100%';
    pauseOverlay.style.height = '100vh';
    pauseOverlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
    pauseOverlay.style.display = 'none';
    pauseOverlay.style.alignItems = 'center';
    pauseOverlay.style.justifyContent = 'center';
    pauseOverlay.style.zIndex = '100';

    const pauseText = document.createElement('div');
    pauseText.textContent = 'PAUSED';
    pauseText.style.color = '#ffffff';
    pauseText.style.fontSize = '48px';
    pauseText.style.textAlign = 'center';
    pauseOverlay.appendChild(pauseText);

    const hint = document.createElement('div');
    hint.textContent = '空格键继续  |  ESC返回大厅';
    hint.style.color = '#b0b0b0';
    hint.style.fontSize = '12px';
    hint.style.marginTop = '20px';
    hint.style.textAlign = 'center';
    pauseOverlay.appendChild(hint);

    const returnBtn = document.createElement('button');
    returnBtn.textContent = '返回大厅';
    returnBtn.style.fontFamily = "'Press Start 2P', cursive";
    returnBtn.style.fontSize = '10px';
    returnBtn.style.padding = '12px 24px';
    returnBtn.style.marginTop = '30px';
    returnBtn.style.backgroundColor = '#2a2a4e';
    returnBtn.style.color = '#e0e0e0';
    returnBtn.style.border = '2px solid #ffd700';
    returnBtn.style.borderRadius = '8px';
    returnBtn.style.cursor = 'pointer';
    returnBtn.style.transition = 'transform 0.1s';
    returnBtn.addEventListener('click', () => {
      if (this.onExitToLobby) {
        this.onExitToLobby();
      }
    });
    returnBtn.addEventListener('mouseenter', () => {
      returnBtn.style.transform = 'scale(1.05)';
      returnBtn.style.backgroundColor = '#3a3a5e';
    });
    returnBtn.addEventListener('mouseleave', () => {
      returnBtn.style.transform = 'scale(1)';
      returnBtn.style.backgroundColor = '#2a2a4e';
    });
    pauseOverlay.appendChild(returnBtn);

    const scoreDisplay = document.createElement('div');
    scoreDisplay.id = 'game-score';
    scoreDisplay.style.position = 'fixed';
    scoreDisplay.style.top = '20px';
    scoreDisplay.style.left = '20px';
    scoreDisplay.style.color = '#ffd700';
    scoreDisplay.style.fontSize = '14px';
    scoreDisplay.style.zIndex = '50';
    scoreDisplay.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';

    const gameEndOverlay = document.createElement('div');
    gameEndOverlay.id = 'game-end-overlay';
    gameEndOverlay.style.position = 'fixed';
    gameEndOverlay.style.top = '0';
    gameEndOverlay.style.left = '0';
    gameEndOverlay.style.width = '100%';
    gameEndOverlay.style.height = '100vh';
    gameEndOverlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
    gameEndOverlay.style.display = 'none';
    gameEndOverlay.style.alignItems = 'center';
    gameEndOverlay.style.justifyContent = 'center';
    gameEndOverlay.style.flexDirection = 'column';
    gameEndOverlay.style.zIndex = '200';

    const gameOverText = document.createElement('div');
    gameOverText.textContent = 'GAME OVER';
    gameOverText.style.color = '#e57373';
    gameOverText.style.fontSize = '36px';
    gameOverText.style.marginBottom = '20px';
    gameEndOverlay.appendChild(gameOverText);

    const finalScore = document.createElement('div');
    finalScore.id = 'final-score';
    finalScore.style.color = '#ffd700';
    finalScore.style.fontSize = '20px';
    finalScore.style.marginBottom = '10px';
    gameEndOverlay.appendChild(finalScore);

    const newRecordText = document.createElement('div');
    newRecordText.id = 'new-record-text';
    newRecordText.textContent = 'NEW RECORD!';
    newRecordText.style.color = '#ffd700';
    newRecordText.style.fontSize = '16px';
    newRecordText.style.display = 'none';
    newRecordText.classList.add('blink');
    newRecordText.style.marginBottom = '30px';
    gameEndOverlay.appendChild(newRecordText);

    const restartBtn = document.createElement('button');
    restartBtn.textContent = '再玩一次';
    restartBtn.style.fontFamily = "'Press Start 2P', cursive";
    restartBtn.style.fontSize = '10px';
    restartBtn.style.padding = '12px 24px';
    restartBtn.style.marginRight = '15px';
    restartBtn.style.backgroundColor = '#2e7d32';
    restartBtn.style.color = '#e0e0e0';
    restartBtn.style.border = '2px solid #4caf50';
    restartBtn.style.borderRadius = '8px';
    restartBtn.style.cursor = 'pointer';
    restartBtn.style.transition = 'transform 0.1s';
    restartBtn.addEventListener('click', () => {
      this.restartGame();
    });
    restartBtn.addEventListener('mouseenter', () => {
      restartBtn.style.transform = 'scale(1.05)';
    });
    restartBtn.addEventListener('mouseleave', () => {
      restartBtn.style.transform = 'scale(1)';
    });

    const backBtn = document.createElement('button');
    backBtn.textContent = '返回大厅';
    backBtn.style.fontFamily = "'Press Start 2P', cursive";
    backBtn.style.fontSize = '10px';
    backBtn.style.padding = '12px 24px';
    backBtn.style.backgroundColor = '#2a2a4e';
    backBtn.style.color = '#e0e0e0';
    backBtn.style.border = '2px solid #4a4a6e';
    backBtn.style.borderRadius = '8px';
    backBtn.style.cursor = 'pointer';
    backBtn.style.transition = 'transform 0.1s';
    backBtn.addEventListener('click', () => {
      if (this.onExitToLobby) {
        this.onExitToLobby();
      }
    });
    backBtn.addEventListener('mouseenter', () => {
      backBtn.style.transform = 'scale(1.05)';
      backBtn.style.backgroundColor = '#3a3a5e';
    });
    backBtn.addEventListener('mouseleave', () => {
      backBtn.style.transform = 'scale(1)';
      backBtn.style.backgroundColor = '#2a2a4e';
    });

    const btnContainer = document.createElement('div');
    btnContainer.appendChild(restartBtn);
    btnContainer.appendChild(backBtn);
    gameEndOverlay.appendChild(btnContainer);

    this.container.appendChild(canvas);
    this.container.appendChild(scoreDisplay);
    this.container.appendChild(pauseOverlay);
    this.container.appendChild(gameEndOverlay);

    return canvas;
  }

  showPauseOverlay(show: boolean): void {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  updateGameScore(score: number): void {
    const scoreDisplay = document.getElementById('game-score');
    if (scoreDisplay) {
      scoreDisplay.textContent = `分数: ${score}`;
    }
  }

  showGameEnd(score: number, isNewRecord: boolean, onRestart: () => void): void {
    const overlay = document.getElementById('game-end-overlay');
    const finalScoreEl = document.getElementById('final-score');
    const newRecordEl = document.getElementById('new-record-text');

    if (overlay) overlay.style.display = 'flex';
    if (finalScoreEl) finalScoreEl.textContent = `得分: ${score}`;
    if (newRecordEl) newRecordEl.style.display = isNewRecord ? 'block' : 'none';

    this._restartCallback = onRestart;
  }

  private _restartCallback: (() => void) | null = null;

  private restartGame(): void {
    const overlay = document.getElementById('game-end-overlay');
    if (overlay) overlay.style.display = 'none';
    if (this._restartCallback) {
      this._restartCallback();
    }
  }

  private handleGameEvent(event: GameEvent): void {
    if (event.type === 'gameEnd') {
      this.updateHighScoreDisplay(event.gameId, event.score || 0);
      this.updateStatsDisplay();
      if (event.isNewRecord) {
        this.showNewRecordBlink(event.gameId);
      }
    }
  }

  private updateHighScoreDisplay(gameId: string, score: number): void {
    const scoreEl = this.container.querySelector(`.high-score[data-game-id="${gameId}"]`);
    if (scoreEl) {
      scoreEl.textContent = String(score);
    }
  }

  private updateStatsDisplay(): void {
    const statsContainer = document.getElementById('stats-container');
    if (!statsContainer || this.viewMode !== 'lobby') return;

    const stats = this.lobbyManager.getStats();
    const items = statsContainer.querySelectorAll('div');
    if (items.length >= 3) {
      const values = [
        String(stats.totalPlays),
        `${stats.totalDuration}秒`,
        String(stats.totalScore)
      ];
      items.forEach((item, index) => {
        const valueEl = item.querySelector('.monospace');
        if (valueEl && values[index]) {
          valueEl.textContent = values[index];
        }
      });
    }
  }

  private showNewRecordBlink(gameId: string): void {
    if (this.newRecordBlinkInterval) {
      clearInterval(this.newRecordBlinkInterval);
    }

    const recordEl = this.container.querySelector(`.new-record[data-game-id="${gameId}"]`);
    if (!recordEl) return;

    (recordEl as HTMLElement).style.display = 'block';
    (recordEl as HTMLElement).classList.add('blink');

    this.newRecordBlinkInterval = window.setInterval(() => {
      if (recordEl) {
        (recordEl as HTMLElement).style.display = 'none';
        (recordEl as HTMLElement).classList.remove('blink');
      }
      if (this.newRecordBlinkInterval) {
        clearInterval(this.newRecordBlinkInterval);
        this.newRecordBlinkInterval = null;
      }
    }, 3000);
  }

  destroy(): void {
    if (this.newRecordBlinkInterval) {
      clearInterval(this.newRecordBlinkInterval);
    }
  }
}
