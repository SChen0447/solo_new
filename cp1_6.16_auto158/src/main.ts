import { LobbyManager } from './lobby/LobbyManager';
import { UIManager } from './lobby/UIManager';
import { snakeGame } from './games/snake/SnakeGame';
import { breakoutGame } from './games/breakout/BreakoutGame';
import { racingGame } from './games/racing/RacingGame';
import { Difficulty, GameEvent } from './games/GameInterface';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Could not find app container');
}

const lobbyManager = new LobbyManager();
const uiManager = new UIManager(app, lobbyManager);

let currentGameId: string | null = null;
let isGameEnded: boolean = false;

lobbyManager.registerGame({
  id: 'snake',
  name: '贪吃蛇',
  description: '控制蛇吃掉食物，不要撞到墙壁或自己的身体！',
  color: '#2e7d32',
  module: snakeGame
});

lobbyManager.registerGame({
  id: 'breakout',
  name: '打砖块',
  description: '用挡板反弹小球，击碎所有彩色砖块！',
  color: '#1565c0',
  module: breakoutGame
});

lobbyManager.registerGame({
  id: 'racing',
  name: '赛车',
  description: '驾驶蓝色赛车，躲避前方的红色卡车！',
  color: '#c62828',
  module: racingGame
});

uiManager.setOnGameSelect((gameId: string) => {
  launchGame(gameId);
});

uiManager.setOnDifficultyChange((difficulty: Difficulty) => {
  lobbyManager.setDifficulty(difficulty);
});

uiManager.setOnExitToLobby(() => {
  exitToLobby();
});

lobbyManager.addEventListener((event: GameEvent) => {
  if (event.type === 'gameEnd') {
    isGameEnded = true;
    uiManager.showGameEnd(
      event.score || 0,
      event.isNewRecord || false,
      () => {
        restartGame();
      }
    );
  }
});

function launchGame(gameId: string): void {
  currentGameId = gameId;
  isGameEnded = false;

  const canvas = uiManager.createGameCanvas();
  uiManager.updateGameScore(0);

  lobbyManager.launchGame(gameId, canvas);
}

function restartGame(): void {
  if (!currentGameId) return;

  isGameEnded = false;
  lobbyManager.exitGame();

  const canvas = uiManager.createGameCanvas();
  uiManager.updateGameScore(0);

  lobbyManager.launchGame(currentGameId, canvas);
}

function exitToLobby(): void {
  lobbyManager.exitGame();
  currentGameId = null;
  isGameEnded = false;
  uiManager.renderLobby();
}

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code === 'Escape' && currentGameId) {
    e.preventDefault();
    if (isGameEnded) {
      exitToLobby();
    } else {
      exitToLobby();
    }
  }
});

uiManager.renderLobby();

console.log('%c像素游戏大厅已启动！', 'color: #ffd700; font-size: 16px; font-weight: bold;');
console.log('%c选择难度并点击游戏卡片开始游戏', 'color: #b0b0b0; font-size: 12px;');
