import { TileMap } from './TileMap';
import { Player } from './Player';
import { InputState, GameState, GameOverInfo, Crystal, Vector2, HexCoord, TileState } from './types';
import { HazardSpawner } from './HazardSpawner';
import { ParticleSystem } from './ParticleSystem';
import {
  VOLCANO_COUNTDOWN,
  CRYSTAL_COUNT,
  METEOR_SHOCKWAVE_RADIUS,
  PLAYER_SIZE,
  HEX_SIZE,
  MAP_RADIUS
} from './constants';

export class GameWorld {
  private tileMap: TileMap;
  private player: Player;
  private hazardSpawner: HazardSpawner;
  private particles: ParticleSystem;
  private crystals: Crystal[] = [];
  private nextCrystalId: number = 1;

  public score: number = 0;
  public scoreAnimTimer: number = 0;
  public lastScore: number = 0;
  public volcanoCountdown: number = VOLCANO_COUNTDOWN;
  public gameState: GameState = GameState.PLAYING;
  public gameOverInfo: GameOverInfo | null = null;
  private survivalTimer: number = 0;
  private cameraZoom: number = 1;
  private targetCameraZoom: number = 1;

  constructor() {
    this.tileMap = new TileMap();
    this.player = new Player({ x: 0, y: 0 });
    this.particles = new ParticleSystem();
    this.hazardSpawner = new HazardSpawner(this.tileMap, this.particles);
    this.generateCrystals();
  }

  private generateCrystals(): void {
    this.crystals = [];
    const tiles = this.tileMap.getTiles().filter(t => {
      const dist = TileMap.getHexDistance(t.coord, { q: 0, r: 0 });
      return dist >= 2 && dist <= MAP_RADIUS - 1 && t.state === TileState.STABLE;
    });
    const shuffled = [...tiles].sort(() => Math.random() - 0.5);
    const count = Math.min(CRYSTAL_COUNT, shuffled.length);
    for (let i = 0; i < count; i++) {
      const tile = shuffled[i];
      const pixel = TileMap.hexToPixel(tile.coord);
      this.crystals.push({
        id: this.nextCrystalId++,
        position: {
          x: pixel.x + (Math.random() - 0.5) * HEX_SIZE * 0.5,
          y: pixel.y + (Math.random() - 0.5) * HEX_SIZE * 0.5
        },
        tileCoord: tile.coord,
        collected: false,
        rotation: Math.random() * Math.PI * 2,
        collectProgress: 0
      });
    }
  }

  public update(deltaTime: number, input: InputState): void {
    if (this.gameState !== GameState.PLAYING) {
      if (this.gameOverInfo) {
        this.gameOverInfo.fadeProgress = Math.min(1, this.gameOverInfo.fadeProgress + deltaTime);
      }
      return;
    }

    this.targetCameraZoom = this.player.isGliding ? 0.85 : 1;
    this.cameraZoom += (this.targetCameraZoom - this.cameraZoom) * Math.min(1, deltaTime * 3);

    this.survivalTimer += deltaTime;
    const newScore = Math.floor(this.survivalTimer * 10) + this.lastScore;
    if (newScore !== this.score) {
      this.score = newScore;
      this.scoreAnimTimer = 1;
    }
    if (this.scoreAnimTimer > 0) this.scoreAnimTimer -= deltaTime * 2;

    this.volcanoCountdown -= deltaTime;
    if (this.volcanoCountdown <= 0) {
      this.triggerGameOver(GameState.VOLCANO);
      return;
    }

    this.tileMap.update(deltaTime);

    const playerTile = this.tileMap.getTileAtPixel(this.player.position);
    const canJump = playerTile && (playerTile.state === TileState.STABLE || playerTile.state === TileState.WARNING);

    this.player.update(deltaTime, input, canJump !== undefined ? canJump : false);

    if (this.player.isSteamJumping && this.player.zVelocity > 300) {
      this.particles.spawnSteam({
        x: this.player.position.x,
        y: this.player.position.y + PLAYER_SIZE * 0.5
      });
    }

    this.hazardSpawner.update(deltaTime);

    this.checkLavaFlowCollision();

    this.checkMeteorShockwaveCollision();

    this.checkCrystalCollection(deltaTime);

    this.checkTileFall();

    this.checkEdgeFall();

    this.particles.update(deltaTime);

    for (const c of this.crystals) {
      if (!c.collected) {
        c.rotation += deltaTime * 1.5;
      } else {
        c.collectProgress += deltaTime * 3;
      }
    }
    this.crystals = this.crystals.filter(c => !c.collected || c.collectProgress < 1.5);

    if (this.crystals.filter(c => !c.collected).length < 4) {
      this.spawnAdditionalCrystal();
    }
  }

  private checkLavaFlowCollision(): void {
    const flows = this.hazardSpawner.getLavaFlows();
    const box = this.player.getCollisionBox();

    for (const flow of flows) {
      const dx = flow.position.x - box.x;
      const dy = flow.position.y - box.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < box.radius + 28) {
        if (this.player.hitByLava()) {
          this.triggerGameOver(GameState.GAMEOVER);
          return;
        }
      }
    }

    const mapRadiusPx = MAP_RADIUS * HEX_SIZE * 1.4;
    const distFromCenter = Math.sqrt(
      this.player.position.x * this.player.position.x +
      this.player.position.y * this.player.position.y
    );
    if (distFromCenter > mapRadiusPx && this.player.z < 20) {
      if (this.player.hitByLava()) {
        this.triggerGameOver(GameState.GAMEOVER);
        return;
      }
    }
  }

  private checkMeteorShockwaveCollision(): void {
    if (this.player.isStunned) return;
    const shockwaves = this.hazardSpawner.getActiveShockwaves();
    const box = this.player.getCollisionBox();

    for (const m of shockwaves) {
      if (m.shockwaveProgress < 0.1 || m.shockwaveProgress > 0.9) continue;
      const dx = m.targetPos.x - box.x;
      const dy = m.targetPos.y - box.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < METEOR_SHOCKWAVE_RADIUS) {
        this.player.stun();
        break;
      }
    }
  }

  private checkCrystalCollection(deltaTime: number): void {
    const box = this.player.getCollisionBox();
    for (const c of this.crystals) {
      if (c.collected) continue;
      const dx = c.position.x - box.x;
      const dy = c.position.y - box.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < box.radius + 18 && this.player.z < 40) {
        c.collected = true;
        c.collectProgress = 0;
        this.player.addSteamCharge();
        this.lastScore += 50;
        this.score += 50;
        this.scoreAnimTimer = 1;
        this.particles.spawnCrystalBreak(c.position);
      }
    }
  }

  private checkTileFall(): void {
    if (this.player.z > 10) return;
    const tile = this.tileMap.getTileAtPixel(this.player.position);
    if (!tile || tile.state === TileState.GONE) {
      this.triggerGameOver(GameState.GAMEOVER);
    }
  }

  private checkEdgeFall(): void {
    if (this.player.z > 10) return;
    const tile = this.tileMap.getTileAtPixel(this.player.position);
    if (!tile || tile.state === TileState.GONE || tile.state === TileState.COLLAPSING) {
      const adjacent = this.tileMap.getAdjacentTiles(tile ? tile.coord : { q: 0, r: 0 });
      let onSolid = false;
      for (const adj of adjacent) {
        const at = this.tileMap.getTile(adj);
        if (at && (at.state === TileState.STABLE || at.state === TileState.WARNING)) {
          const ap = TileMap.hexToPixel(adj);
          const dx = this.player.position.x - ap.x;
          const dy = this.player.position.y - ap.y;
          if (Math.sqrt(dx * dx + dy * dy) < HEX_SIZE) {
            onSolid = true;
            break;
          }
        }
      }
      if (!onSolid && (!tile || tile.state === TileState.GONE)) {
        this.triggerGameOver(GameState.GAMEOVER);
      }
    }
  }

  private spawnAdditionalCrystal(): void {
    const tiles = this.tileMap.getTiles().filter(t => {
      const dist = TileMap.getHexDistance(t.coord, { q: 0, r: 0 });
      if (dist < 2 || dist > MAP_RADIUS - 1) return false;
      if (t.state !== TileState.STABLE && t.state !== TileState.WARNING) return false;
      for (const c of this.crystals) {
        if (!c.collected && c.tileCoord.q === t.coord.q && c.tileCoord.r === t.coord.r) {
          return false;
        }
      }
      return true;
    });
    if (tiles.length === 0) return;
    const tile = tiles[Math.floor(Math.random() * tiles.length)];
    const pixel = TileMap.hexToPixel(tile.coord);
    this.crystals.push({
      id: this.nextCrystalId++,
      position: {
        x: pixel.x + (Math.random() - 0.5) * HEX_SIZE * 0.5,
        y: pixel.y + (Math.random() - 0.5) * HEX_SIZE * 0.5
      },
      tileCoord: tile.coord,
      collected: false,
      rotation: 0,
      collectProgress: 0
    });
  }

  private triggerGameOver(state: GameState): void {
    if (this.gameState !== GameState.PLAYING) return;
    this.gameState = state;
    this.gameOverInfo = {
      state,
      score: this.score,
      fadeProgress: 0
    };
  }

  public getTileMap(): TileMap { return this.tileMap; }
  public getPlayer(): Player { return this.player; }
  public getHazardSpawner(): HazardSpawner { return this.hazardSpawner; }
  public getParticles(): ParticleSystem { return this.particles; }
  public getCrystals(): Crystal[] { return this.crystals; }
  public getCameraZoom(): number { return this.cameraZoom; }
  public getScoreBounce(): number { return 1 + Math.max(0, this.scoreAnimTimer) * 0.3; }

  public getRank(): string {
    if (this.score >= 2000) return '大师';
    if (this.score >= 1000) return '能手';
    return '菜鸟';
  }

  public restart(): void {
    this.tileMap.reset();
    this.player.reset({ x: 0, y: 0 });
    this.hazardSpawner.reset();
    this.particles.reset();
    this.generateCrystals();
    this.score = 0;
    this.lastScore = 0;
    this.survivalTimer = 0;
    this.volcanoCountdown = VOLCANO_COUNTDOWN;
    this.gameState = GameState.PLAYING;
    this.gameOverInfo = null;
    this.cameraZoom = 1;
    this.targetCameraZoom = 1;
    this.scoreAnimTimer = 0;
  }
}
