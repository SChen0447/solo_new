import { GameEngine, type GameHUD } from './gameEngine';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`找不到元素 #${id}`);
  }
  return el;
}

function init(): void {
  const canvas = $('gameCanvas') as HTMLCanvasElement;

  const hud: GameHUD = {
    floor: $('floorValue'),
    crystal: $('crystalValue'),
    chest: $('chestValue'),
    timer: $('timerValue'),
    startScreen: $('startScreen'),
    levelClearScreen: $('levelClearScreen'),
    clearTime: $('clearTime'),
    clearCrystals: $('clearCrystals'),
    clearChests: $('clearChests')
  };

  let selectedSize = 9;
  let game: GameEngine | null = null;

  const sizeOptions = $('sizeOptions');
  sizeOptions.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('size-btn')) {
      document.querySelectorAll('.size-btn').forEach((btn) => {
        btn.classList.remove('active');
      });
      target.classList.add('active');
      selectedSize = parseInt(target.dataset.size || '9', 10);
    }
  });

  const startBtn = $('startBtn');
  startBtn.addEventListener('click', () => {
    if (game) {
      game.stop();
      game.unbindEvents();
    }

    game = new GameEngine({
      mazeSize: selectedSize,
      canvas,
      hud
    });

    game.setOnLevelClear(() => {
      game?.showLevelClearScreen();
    });

    hud.startScreen.classList.add('hidden');
    hud.levelClearScreen.classList.add('hidden');
    game.start();
  });

  const nextBtn = $('nextBtn');
  nextBtn.addEventListener('click', () => {
    if (!game) return;
    hud.levelClearScreen.classList.add('hidden');
    game.nextFloor();
    game.resume();
  });

  let resizeTimer: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimer !== null) {
      window.clearTimeout(resizeTimer);
    }
    resizeTimer = window.setTimeout(() => {
      game?.resize();
    }, 100);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
