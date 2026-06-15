import { eventBus } from './EventBus';
import { MazeEngine, GRID_SIZE, TILE_SIZE, Direction, Tile } from './MazeEngine';
import { PathfindingAI } from './PathfindingAI';

interface Position {
  row: number;
  col: number;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  bornTime: number;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  alpha: number;
  offsetY: number;
  bornTime: number;
}

interface ResourcePoint {
  row: number;
  col: number;
  collected: boolean;
  scale: number;
  flashAlpha: number;
  collectedBy: 'player' | 'ai' | null;
}

interface GameState {
  mazeEngine: MazeEngine;
  pathfindingAI: PathfindingAI;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  playerPos: { x: number; y: number; row: number; col: number };
  playerTarget: { row: number; col: number } | null;
  playerTrail: TrailPoint[];
  aiTrail: TrailPoint[];
  scorePopups: ScorePopup[];
  resources: ResourcePoint[];
  playerScore: number;
  aiScore: number;
  keys: Set<string>;
  paused: boolean;
  gameStarted: boolean;
  gameOver: boolean;
  winner: string | null;
  shakeOffset: { x: number; y: number };
  shakeTimer: number;
  lastTime: number;
  playerMoveCooldown: number;
  minimapSize: number;
  minimapX: number;
  minimapY: number;
  pauseButton: { x: number; y: number; radius: number; hovered: boolean };
  targetScore: number;
  mazeOffsetY: number;
}

const TRAIL_DURATION = 300;
const SCORE_POPUP_DURATION = 600;
const PLAYER_SPEED = 3;
const RESOURCE_ROTATION_PERIOD = 1500;
const COLLECT_ANIMATION_DURATION = 200;

class Game {
  private state: GameState;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;

    const totalWidth = GRID_SIZE * TILE_SIZE;
    const totalHeight = GRID_SIZE * TILE_SIZE + 80;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    this.state = {
      mazeEngine: new MazeEngine(),
      pathfindingAI: new PathfindingAI(),
      canvas,
      ctx,
      playerPos: { x: 0, y: 0, row: 0, col: 0 },
      playerTarget: null,
      playerTrail: [],
      aiTrail: [],
      scorePopups: [],
      resources: [],
      playerScore: 0,
      aiScore: 0,
      keys: new Set(),
      paused: false,
      gameStarted: false,
      gameOver: false,
      winner: null,
      shakeOffset: { x: 0, y: 0 },
      shakeTimer: 0,
      lastTime: performance.now(),
      playerMoveCooldown: 0,
      minimapSize: 150,
      minimapX: 20,
      minimapY: 100,
      pauseButton: { x: 0, y: 0, radius: 25, hovered: false },
      targetScore: 3,
      mazeOffsetY: 60,
    };

    this.setupEventListeners();
    this.startGame();
    this.renderLoop();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.state.keys.add(e.key.toLowerCase());
      if (e.key === ' ') {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.state.keys.delete(e.key.toLowerCase());
    });

    this.state.canvas.addEventListener('mousemove', (e) => {
      const rect = this.state.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const dx = mx - this.state.pauseButton.x;
      const dy = my - this.state.pauseButton.y;
      this.state.pauseButton.hovered = Math.sqrt(dx * dx + dy * dy) < this.state.pauseButton.radius;
      this.state.canvas.style.cursor = this.state.pauseButton.hovered ? 'pointer' : 'default';
    });

    this.state.canvas.addEventListener('click', (e) => {
      if (this.state.gameOver) return;
      const rect = this.state.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const dx = mx - this.state.pauseButton.x;
      const dy = my - this.state.pauseButton.y;
      if (Math.sqrt(dx * dx + dy * dy) < this.state.pauseButton.radius) {
        this.togglePause();
      }
    });

    eventBus.on('maze:complete', () => {
      this.onMazeComplete();
    });
  }

  private startGame(): void {
    this.state.playerScore = 0;
    this.state.aiScore = 0;
    this.state.gameOver = false;
    this.state.winner = null;
    this.state.gameStarted = false;
    this.state.paused = false;
    this.state.playerTrail = [];
    this.state.aiTrail = [];
    this.state.scorePopups = [];
    this.state.resources = [];
    this.state.playerTarget = null;
    this.state.mazeEngine.generate();

    this.state.pauseButton.x = this.state.canvas.width - 50;
    this.state.pauseButton.y = this.state.canvas.height - 50;
  }

  private onMazeComplete(): void {
    const engine = this.state.mazeEngine;

    const playerStart = engine.getRandomWalkablePosition(3);
    this.state.playerPos = {
      x: playerStart.col * TILE_SIZE + TILE_SIZE / 2,
      y: playerStart.row * TILE_SIZE + TILE_SIZE / 2,
      row: playerStart.row,
      col: playerStart.col,
    };
    eventBus.emit('player:position', { row: playerStart.row, col: playerStart.col });

    let aiStart = engine.getRandomWalkablePosition(3);
    let attempts = 0;
    while (
      Math.abs(aiStart.row - playerStart.row) + Math.abs(aiStart.col - playerStart.col) < 8 &&
      attempts < 100
    ) {
      aiStart = engine.getRandomWalkablePosition(3);
      attempts++;
    }
    this.state.pathfindingAI.setInitialPosition(aiStart.row, aiStart.col, TILE_SIZE);
    eventBus.emit('ai:setPosition', { row: aiStart.row, col: aiStart.col });

    this.generateResources();
    this.state.gameStarted = true;
    this.state.lastTime = performance.now();
  }

  private generateResources(): void {
    const resources: ResourcePoint[] = [];
    const engine = this.state.mazeEngine;

    for (let i = 0; i < 5; i++) {
      let pos = engine.getRandomWalkablePosition(2);
      let valid = true;
      let attempts = 0;

      do {
        valid = true;
        pos = engine.getRandomWalkablePosition(2);
        attempts++;

        const playerDist = Math.abs(pos.row - this.state.playerPos.row) + Math.abs(pos.col - this.state.playerPos.col);
        const aiPos = this.state.pathfindingAI.getAiPosition();
        const aiDist = Math.abs(pos.row - aiPos.row) + Math.abs(pos.col - aiPos.col);

        if (playerDist < 5 || aiDist < 5) {
          valid = false;
        }

        for (const r of resources) {
          const dist = Math.abs(pos.row - r.row) + Math.abs(pos.col - r.col);
          if (dist < 3) {
            valid = false;
            break;
          }
        }
      } while (!valid && attempts < 200);

      resources.push({
        row: pos.row,
        col: pos.col,
        collected: false,
        scale: 1,
        flashAlpha: 0,
        collectedBy: null,
      });
    }

    this.state.resources = resources;
    eventBus.emit(
      'resources:update',
      resources.filter((r) => !r.collected).map((r) => ({ row: r.row, col: r.col }))
    );
  }

  private togglePause(): void {
    if (!this.state.gameStarted || this.state.gameOver) return;
    this.state.paused = !this.state.paused;
    if (!this.state.paused) {
      this.state.lastTime = performance.now();
    }
  }

  private renderLoop(): void {
    const currentTime = performance.now();
    
    if (this.state.gameStarted && !this.state.paused && !this.state.gameOver) {
      const deltaTime = (currentTime - this.state.lastTime) / 1000;
      this.state.lastTime = currentTime;
      this.update(deltaTime, currentTime);
    }
    
    this.render(currentTime);
    requestAnimationFrame(this.renderLoop.bind(this));
  }

  private update(deltaTime: number, currentTime: number): void {
    this.updatePlayer(deltaTime);
    this.updateAI(deltaTime);
    this.updateTrails(currentTime);
    this.updateScorePopups(currentTime);
    this.updateResourceAnimations(deltaTime);
    this.checkCollisions();
    this.updateScreenShake(deltaTime);
  }

  private updatePlayer(deltaTime: number): void {
    const { playerPos, keys, mazeEngine, playerTrail } = this.state;

    if (!this.state.playerTarget) {
      let dir: Direction | null = null;
      let dx = 0;
      let dy = 0;

      if (keys.has('w') || keys.has('arrowup')) {
        dir = 'top';
        dy = -1;
      } else if (keys.has('s') || keys.has('arrowdown')) {
        dir = 'bottom';
        dy = 1;
      } else if (keys.has('a') || keys.has('arrowleft')) {
        dir = 'left';
        dx = -1;
      } else if (keys.has('d') || keys.has('arrowright')) {
        dir = 'right';
        dx = 1;
      }

      if (dir && mazeEngine.canMove(playerPos.row, playerPos.col, dir)) {
        this.state.playerTarget = {
          row: playerPos.row + dy,
          col: playerPos.col + dx,
        };
      }
    }

    if (this.state.playerTarget) {
      const targetX = this.state.playerTarget.col * TILE_SIZE + TILE_SIZE / 2;
      const targetY = this.state.playerTarget.row * TILE_SIZE + TILE_SIZE / 2;
      const moveDistance = PLAYER_SPEED * TILE_SIZE * deltaTime;

      const dx = targetX - playerPos.x;
      const dy = targetY - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= moveDistance) {
        playerPos.x = targetX;
        playerPos.y = targetY;
        playerPos.row = this.state.playerTarget.row;
        playerPos.col = this.state.playerTarget.col;
        this.state.playerTarget = null;

        this.state.playerTrail.push({
          x: playerPos.x,
          y: playerPos.y,
          alpha: 1,
          bornTime: performance.now(),
        });

        eventBus.emit('player:position', { row: playerPos.row, col: playerPos.col });
        this.triggerShake();
      } else {
        const oldX = playerPos.x;
        const oldY = playerPos.y;
        playerPos.x += (dx / dist) * moveDistance;
        playerPos.y += (dy / dist) * moveDistance;
        
        const movedDist = Math.sqrt(
          Math.pow(playerPos.x - oldX, 2) + Math.pow(playerPos.y - oldY, 2)
        );
        if (movedDist > 0) {
          const lastTrail = playerTrail[playerTrail.length - 1];
          const trailDist = lastTrail
            ? Math.sqrt(
                Math.pow(playerPos.x - lastTrail.x, 2) + Math.pow(playerPos.y - lastTrail.y, 2)
              )
            : Infinity;
          if (trailDist > TILE_SIZE * 0.3) {
            playerTrail.push({
              x: playerPos.x,
              y: playerPos.y,
              alpha: 1,
              bornTime: performance.now(),
            });
          }
        }
      }
    }
  }

  private updateAI(deltaTime: number): void {
    const result = this.state.pathfindingAI.update(deltaTime, TILE_SIZE);
    const { aiTrail } = this.state;
    
    const lastTrail = aiTrail[aiTrail.length - 1];
    const trailDist = lastTrail
      ? Math.sqrt(
          Math.pow(result.x - lastTrail.x, 2) + Math.pow(result.y - lastTrail.y, 2)
        )
      : Infinity;
    
    if (trailDist > TILE_SIZE * 0.3) {
      this.state.aiTrail.push({
        x: result.x,
        y: result.y,
        alpha: 1,
        bornTime: performance.now(),
      });
    }
  }

  private updateTrails(currentTime: number): void {
    this.state.playerTrail = this.state.playerTrail.filter((point) => {
      const age = currentTime - point.bornTime;
      point.alpha = 1 - age / TRAIL_DURATION;
      return age < TRAIL_DURATION;
    });

    this.state.aiTrail = this.state.aiTrail.filter((point) => {
      const age = currentTime - point.bornTime;
      point.alpha = 1 - age / TRAIL_DURATION;
      return age < TRAIL_DURATION;
    });
  }

  private updateScorePopups(currentTime: number): void {
    this.state.scorePopups = this.state.scorePopups.filter((popup) => {
      const age = currentTime - popup.bornTime;
      popup.alpha = 1 - age / SCORE_POPUP_DURATION;
      popup.offsetY = (age / SCORE_POPUP_DURATION) * 30;
      return age < SCORE_POPUP_DURATION;
    });
  }

  private updateResourceAnimations(deltaTime: number): void {
    for (const resource of this.state.resources) {
      if (resource.collected && resource.scale > 0) {
        resource.scale = Math.max(0, resource.scale - deltaTime * (1 / (COLLECT_ANIMATION_DURATION / 1000)));
        resource.flashAlpha = Math.max(0, resource.flashAlpha - deltaTime * 5);
      }
    }
  }

  private checkCollisions(): void {
    const { playerPos, pathfindingAI } = this.state;

    for (let i = 0; i < this.state.resources.length; i++) {
      const resource = this.state.resources[i];
      if (resource.collected) continue;

      const resourceX = resource.col * TILE_SIZE + TILE_SIZE / 2;
      const resourceY = resource.row * TILE_SIZE + TILE_SIZE / 2;

      const playerDist = Math.sqrt(
        Math.pow(playerPos.x - resourceX, 2) + Math.pow(playerPos.y - resourceY, 2)
      );

      if (playerDist < TILE_SIZE / 2.5) {
        this.collectResource(i, 'player');
        continue;
      }

      const aiPixelPos = pathfindingAI.getAiPixelPosition();
      const aiDist = Math.sqrt(
        Math.pow(aiPixelPos.x - resourceX, 2) + Math.pow(aiPixelPos.y - resourceY, 2)
      );

      if (aiDist < TILE_SIZE / 2.5) {
        this.collectResource(i, 'ai');
      }
    }
  }

  private collectResource(index: number, collectedBy: 'player' | 'ai'): void {
    const resource = this.state.resources[index];
    if (resource.collected) return;

    resource.collected = true;
    resource.flashAlpha = 1;
    resource.collectedBy = collectedBy;

    const resourceX = resource.col * TILE_SIZE + TILE_SIZE / 2;
    const resourceY = resource.row * TILE_SIZE + TILE_SIZE / 2;

    if (collectedBy === 'player') {
      this.state.playerScore++;
      this.state.scorePopups.push({
        x: resourceX,
        y: resourceY,
        text: '+1',
        alpha: 1,
        offsetY: 0,
        bornTime: performance.now(),
      });
      if (this.state.playerScore >= this.state.targetScore) {
        this.endGame('玩家');
      }
    } else {
      this.state.aiScore++;
      this.state.scorePopups.push({
        x: resourceX,
        y: resourceY,
        text: '+1',
        alpha: 1,
        offsetY: 0,
        bornTime: performance.now(),
      });
      if (this.state.aiScore >= this.state.targetScore) {
        this.endGame('AI');
      }
    }

    eventBus.emit('resource:collected', index);
  }

  private endGame(winner: string): void {
    this.state.gameOver = true;
    this.state.winner = winner;
    
    const handleClick = () => {
      this.state.canvas.removeEventListener('click', handleClick);
      setTimeout(() => {
        this.state.canvas.addEventListener('click', this.canvasClickHandler);
      }, 100);
      this.startGame();
    };
    
    setTimeout(() => {
      this.state.canvas.addEventListener('click', handleClick, { once: true });
    }, 500);
  }

  private canvasClickHandler = (e: MouseEvent) => {
    if (this.state.gameOver) return;
    const rect = this.state.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dx = mx - this.state.pauseButton.x;
    const dy = my - this.state.pauseButton.y;
    if (Math.sqrt(dx * dx + dy * dy) < this.state.pauseButton.radius) {
      this.togglePause();
    }
  };

  private triggerShake(): void {
    this.state.shakeTimer = 0.08;
  }

  private updateScreenShake(deltaTime: number): void {
    if (this.state.shakeTimer > 0) {
      this.state.shakeTimer -= deltaTime;
      const intensity = this.state.shakeTimer * 6;
      this.state.shakeOffset.x = (Math.random() - 0.5) * intensity;
      this.state.shakeOffset.y = (Math.random() - 0.5) * intensity;
    } else {
      this.state.shakeOffset.x = 0;
      this.state.shakeOffset.y = 0;
    }
  }

  private render(currentTime: number): void {
    const { ctx, canvas, shakeOffset, mazeOffsetY } = this.state;

    ctx.save();
    ctx.fillStyle = '#0A0E27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(shakeOffset.x, shakeOffset.y + mazeOffsetY);

    this.renderMaze(currentTime);
    this.renderResources(currentTime);
    this.renderTrails();
    this.renderAI();
    this.renderPlayer();
    this.renderScorePopups();

    ctx.restore();

    this.renderUI();
    this.renderMinimap();
    this.renderPauseButton();

    if (this.state.gameOver) {
      this.renderGameOver();
    }
  }

  private renderMaze(currentTime: number): void {
    const { ctx, mazeEngine } = this.state;
    const grid = mazeEngine.getGrid();
    const animRow = mazeEngine.getAnimationRow();
    const fadeProgress = mazeEngine.getFadeProgress();

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = grid[row][col];
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        let alpha = 0;
        if (row < animRow) {
          alpha = 1;
        } else if (row === animRow) {
          alpha = 1;
        }

        if (fadeProgress > 0) {
          alpha = Math.max(alpha, fadeProgress);
        }

        if (alpha <= 0) continue;

        ctx.globalAlpha = alpha;
        this.drawTile(ctx, cell.tile, x, y);
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      }
    }

    ctx.globalAlpha = 1;
  }

  private drawTile(ctx: CanvasRenderingContext2D, tile: Tile | null, x: number, y: number): void {
    const size = TILE_SIZE;

    if (!tile || tile.type === 'wall') {
      ctx.fillStyle = tile ? tile.color : '#1a1f3a';
      ctx.fillRect(x, y, size, size);
      
      ctx.fillStyle = 'rgba(40, 60, 80, 0.3)';
      const mossSize = 3;
      for (let i = 0; i < 4; i++) {
        const mx = x + 4 + (i * 7) % (size - 8);
        const my = y + 6 + (i * 11) % (size - 12);
        ctx.fillRect(mx, my, mossSize, mossSize);
      }
    } else {
      ctx.fillStyle = '#15192e';
      ctx.fillRect(x, y, size, size);

      const pathWidth = 12;
      const halfPath = pathWidth / 2;
      const center = size / 2;

      ctx.fillStyle = tile.color;

      if (tile.connections.top || tile.connections.bottom || tile.connections.left || tile.connections.right) {
        ctx.fillRect(x + center - halfPath, y + center - halfPath, pathWidth, pathWidth);
      }

      if (tile.connections.top) {
        ctx.fillRect(x + center - halfPath, y, pathWidth, center);
      }
      if (tile.connections.bottom) {
        ctx.fillRect(x + center - halfPath, y + center, pathWidth, center);
      }
      if (tile.connections.left) {
        ctx.fillRect(x, y + center - halfPath, center, pathWidth);
      }
      if (tile.connections.right) {
        ctx.fillRect(x + center, y + center - halfPath, center, pathWidth);
      }

      ctx.fillStyle = 'rgba(80, 100, 140, 0.2)';
      if (tile.connections.top) {
        ctx.fillRect(x + center - halfPath, y, 2, center);
      }
      if (tile.connections.left) {
        ctx.fillRect(x, y + center - halfPath, center, 2);
      }
    }
  }

  private renderResources(currentTime: number): void {
    const { ctx } = this.state;

    for (const resource of this.state.resources) {
      const x = resource.col * TILE_SIZE + TILE_SIZE / 2;
      const y = resource.row * TILE_SIZE + TILE_SIZE / 2;
      const size = 10 * resource.scale;

      if (resource.flashAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = resource.flashAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (resource.scale <= 0) continue;

      const rotation = (currentTime / RESOURCE_ROTATION_PERIOD) * Math.PI * 2;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 10;

      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FFF8DC';
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.5);
      ctx.lineTo(size * 0.3, 0);
      ctx.lineTo(0, size * 0.3);
      ctx.lineTo(-size * 0.3, 0);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private renderTrails(): void {
    const { ctx } = this.state;

    for (const point of this.state.playerTrail) {
      ctx.save();
      ctx.globalAlpha = point.alpha * 0.4;
      ctx.fillStyle = '#4488ff';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const point of this.state.aiTrail) {
      ctx.save();
      ctx.globalAlpha = point.alpha * 0.4;
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderPlayer(): void {
    const { ctx, playerPos } = this.state;

    ctx.save();
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#4488ff';
    ctx.beginPath();
    ctx.arc(playerPos.x, playerPos.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(150, 200, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(playerPos.x - 2, playerPos.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private renderAI(): void {
    const { ctx, pathfindingAI } = this.state;
    const aiPixelPos = pathfindingAI.getAiPixelPosition();
    const x = aiPixelPos.x;
    const y = aiPixelPos.y;
    const radius = 8;

    ctx.save();
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff4444';

    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const px = x + radius * Math.cos(angle);
      const py = y + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 180, 180, 0.5)';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const px = x + radius * 0.4 * Math.cos(angle);
      const py = y + radius * 0.4 * Math.sin(angle) - 1;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private renderScorePopups(): void {
    const { ctx } = this.state;

    for (const popup of this.state.scorePopups) {
      ctx.save();
      ctx.globalAlpha = popup.alpha;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 4;
      ctx.fillText(popup.text, popup.x, popup.y - popup.offsetY);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private renderUI(): void {
    const { ctx, canvas } = this.state;

    const centerX = canvas.width / 2;

    ctx.save();
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#4488ff';
    ctx.beginPath();
    ctx.arc(centerX - 100, 30, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.state.playerScore}`, centerX - 65, 30);

    ctx.fillStyle = '#888888';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(':', centerX, 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial';
    ctx.fillText(`${this.state.aiScore}`, centerX + 65, 30);

    ctx.save();
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ff4444';
    const aiX = centerX + 100;
    const aiY = 30;
    const aiRadius = 12;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const px = aiX + aiRadius * Math.cos(angle);
      const py = aiY + aiRadius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private renderMinimap(): void {
    const { ctx, mazeEngine, minimapSize, minimapX, minimapY } = this.state;
    const grid = mazeEngine.getGrid();
    const cellSize = minimapSize / GRID_SIZE;

    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(minimapX - 3, minimapY - 3, minimapSize + 6, minimapSize + 6);

    ctx.strokeStyle = '#555566';
    ctx.lineWidth = 2;
    ctx.strokeRect(minimapX - 3, minimapY - 3, minimapSize + 6, minimapSize + 6);

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = grid[row][col];
        const x = minimapX + col * cellSize;
        const y = minimapY + row * cellSize;

        if (cell.collapsed && cell.tile) {
          if (cell.tile.type === 'wall') {
            ctx.fillStyle = '#2a2f4c';
          } else {
            ctx.fillStyle = '#4a5070';
          }
        } else {
          ctx.fillStyle = '#0a0e27';
        }
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    for (const resource of this.state.resources) {
      if (!resource.collected) {
        const rx = minimapX + resource.col * cellSize + cellSize / 2;
        const ry = minimapY + resource.row * cellSize + cellSize / 2;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(rx - 2, ry - 2, 4, 4);
      }
    }

    const px = minimapX + this.state.playerPos.col * cellSize + cellSize / 2;
    const py = minimapY + this.state.playerPos.row * cellSize + cellSize / 2;
    ctx.fillStyle = '#4488ff';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();

    const aiPos = this.state.pathfindingAI.getAiPosition();
    const ax = minimapX + aiPos.col * cellSize + cellSize / 2;
    const ay = minimapY + aiPos.row * cellSize + cellSize / 2;

    const dx = aiPos.col - this.state.playerPos.col;
    const dy = aiPos.row - this.state.playerPos.row;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 6) {
      const angle = Math.atan2(dy, dx);
      const indicatorDist = minimapSize / 2 - 6;
      const indicatorX = minimapX + minimapSize / 2 + Math.cos(angle) * indicatorDist;
      const indicatorY = minimapY + minimapSize / 2 + Math.sin(angle) * indicatorDist;

      ctx.fillStyle = '#ff4444';
      ctx.save();
      ctx.translate(indicatorX, indicatorY);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(-3, -4);
      ctx.lineTo(-3, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(ax, ay, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderPauseButton(): void {
    const { ctx, pauseButton, paused } = this.state;
    const { x, y, radius, hovered } = pauseButton;

    ctx.save();

    const scale = hovered ? 1.1 : 1;
    const alpha = hovered ? 0.7 : 0.5;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, radius * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0A0E27';

    if (paused) {
      const playSize = 10 * scale;
      ctx.beginPath();
      ctx.moveTo(x - playSize / 2, y - playSize);
      ctx.lineTo(x + playSize, y);
      ctx.lineTo(x - playSize / 2, y + playSize);
      ctx.closePath();
      ctx.fill();
    } else {
      const barWidth = 4 * scale;
      const barHeight = 12 * scale;
      ctx.fillRect(x - 5 * scale, y - barHeight / 2, barWidth, barHeight);
      ctx.fillRect(x + 2 * scale, y - barHeight / 2, barWidth, barHeight);
    }

    ctx.restore();
  }

  private renderGameOver(): void {
    const { ctx, canvas, winner } = this.state;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.fillText(`${winner} 获胜!`, canvas.width / 2, canvas.height / 2 - 40);
    ctx.shadowBlur = 0;

    ctx.font = '22px Arial';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('点击任意位置重新开始', canvas.width / 2, canvas.height / 2 + 30);
    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});

export default Game;
