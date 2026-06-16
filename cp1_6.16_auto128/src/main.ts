import { NetworkManager } from './NetworkManager';
import { InputHandler, type PlayerId } from './InputHandler';
import { PLAYER_COLORS } from './GameEngine';

const PLAYER_COUNT = 2;

class GameApp {
  private canvas: HTMLCanvasElement;
  private networkManager: NetworkManager;
  private inputHandler: InputHandler;
  private scorePanel: HTMLElement;
  private timeDisplay: HTMLElement;
  private speedDisplay: HTMLElement;
  private gameOverOverlay: HTMLElement;
  private winnerColor: HTMLElement;
  private winnerText: HTMLElement;
  private finalScore: HTMLElement;
  private restartBtn: HTMLElement;
  private specialFoodNotice: HTMLElement;
  private playerCount: number = PLAYER_COUNT;
  private scoreElements: Map<PlayerId, { name: HTMLElement; value: HTMLElement }> = new Map();

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.scorePanel = document.getElementById('scorePanel') as HTMLElement;
    this.timeDisplay = document.getElementById('timeDisplay') as HTMLElement;
    this.speedDisplay = document.getElementById('speedDisplay') as HTMLElement;
    this.gameOverOverlay = document.getElementById('gameOverOverlay') as HTMLElement;
    this.winnerColor = document.getElementById('winnerColor') as HTMLElement;
    this.winnerText = document.getElementById('winnerText') as HTMLElement;
    this.finalScore = document.getElementById('finalScore') as HTMLElement;
    this.restartBtn = document.getElementById('restartBtn') as HTMLElement;
    this.specialFoodNotice = document.getElementById('specialFoodNotice') as HTMLElement;

    this.networkManager = new NetworkManager(this.canvas);
    this.inputHandler = new InputHandler();

    this.init();
  }

  private init(): void {
    const playerIds: PlayerId[] = ['red', 'blue', 'green', 'purple'].slice(0, this.playerCount) as PlayerId[];
    
    this.inputHandler.setActivePlayers(playerIds);
    this.inputHandler.setDirectionCallback((playerId, direction) => {
      this.networkManager.sendDirection(playerId, direction);
    });
    this.inputHandler.start();

    this.networkManager.setGameStateCallback((state) => {
      this.updateUI(state);
    });

    this.networkManager.setGameOverCallback((winner, scores) => {
      this.showGameOver(winner, scores);
    });

    this.networkManager.setScoreChangeCallback((playerId, _score) => {
      this.triggerScoreBounce(playerId);
    });

    this.networkManager.setSpecialFoodNoticeCallback(() => {
      this.showSpecialFoodNotice();
    });

    this.restartBtn.addEventListener('click', () => {
      this.restart();
    });

    window.addEventListener('resize', () => {
      this.networkManager.resize();
    });

    this.createScorePanel(playerIds);
    this.networkManager.startLocalGame(this.playerCount);
    this.updateSpeedDisplay();
  }

  private createScorePanel(playerIds: PlayerId[]): void {
    this.scorePanel.innerHTML = '';
    this.scoreElements.clear();

    for (const playerId of playerIds) {
      const colors = PLAYER_COLORS[playerId];
      
      const item = document.createElement('div');
      item.className = 'score-item';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = colors.name + ':';
      nameSpan.style.color = colors.body;

      const valueSpan = document.createElement('span');
      valueSpan.className = 'score-value';
      valueSpan.textContent = '0';
      valueSpan.style.color = colors.body;

      item.appendChild(nameSpan);
      item.appendChild(valueSpan);
      this.scorePanel.appendChild(item);

      this.scoreElements.set(playerId, { name: nameSpan, value: valueSpan });
    }
  }

  private updateUI(state: any): void {
    if (state.timeLeft !== undefined) {
      this.timeDisplay.textContent = Math.ceil(state.timeLeft).toString();
    }

    const engine = this.networkManager.getGameEngine();
    for (const [playerId, elements] of this.scoreElements) {
      const score = engine.getSnakeScore(playerId);
      elements.value.textContent = score.toString();

      if (engine.getSnakeScoreBounce(playerId)) {
        elements.value.classList.add('bounce');
      } else {
        elements.value.classList.remove('bounce');
      }
    }

    const noticeTimer = engine.getSpecialFoodNoticeTimer();
    if (noticeTimer > 0 && noticeTimer <= 1.5) {
      this.specialFoodNotice.classList.add('show');
    } else if (noticeTimer <= 0) {
      this.specialFoodNotice.classList.remove('show');
    }
  }

  private triggerScoreBounce(playerId: PlayerId): void {
    const elements = this.scoreElements.get(playerId);
    if (elements) {
      elements.value.classList.remove('bounce');
      void elements.value.offsetWidth;
      elements.value.classList.add('bounce');
    }
  }

  private showSpecialFoodNotice(): void {
    this.specialFoodNotice.classList.remove('show');
    void this.specialFoodNotice.offsetWidth;
    this.specialFoodNotice.classList.add('show');

    setTimeout(() => {
      this.specialFoodNotice.classList.remove('show');
    }, 1500);
  }

  private showGameOver(winner: PlayerId | null, scores: Record<PlayerId, number>): void {
    if (winner) {
      const colors = PLAYER_COLORS[winner];
      this.winnerColor.style.backgroundColor = colors.body;
      this.winnerText.textContent = `${colors.name} 获胜！`;
      this.finalScore.textContent = `得分: ${scores[winner]}`;
    } else {
      this.winnerColor.style.backgroundColor = '#888';
      this.winnerText.textContent = '平局！';
      this.finalScore.textContent = '';
    }

    this.gameOverOverlay.classList.add('show');
  }

  private hideGameOver(): void {
    this.gameOverOverlay.classList.remove('show');
  }

  private updateSpeedDisplay(): void {
    const speed = this.networkManager.getSpeed();
    this.speedDisplay.textContent = `速度: ${speed} 格/秒`;
  }

  public restart(): void {
    this.hideGameOver();
    this.networkManager.restart(this.playerCount);
  }

  public destroy(): void {
    this.inputHandler.stop();
    this.networkManager.disconnect();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
