import { v4 as uuidv4 } from 'uuid';

export type TerrainType = 'grass' | 'forest' | 'water' | 'stone';

export interface Cell {
  x: number;
  y: number;
  terrain: TerrainType;
  building: BuildingType | null;
  explored: boolean;
  illuminated: boolean;
  flashTimer: number;
  lastCollectedTurn: number;
}

export type BuildingType = 'wall' | 'torch';

export interface Building {
  type: BuildingType;
  x: number;
  y: number;
}

export interface Resources {
  wood: number;
  water: number;
  stone: number;
}

export interface Player {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  attack: number;
  resources: Resources;
  buildingsBuilt: number;
}

export interface Monster {
  id: string;
  x: number;
  y: number;
  level: number;
  health: number;
  attack: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface GameConfig {
  mapSize: number;
  resourceDensity: number;
  monsterSpawnRate: number;
  playerHealth: number;
  simulationRounds: number;
}

export interface CombatLog {
  turn: number;
  day: number;
  monsterLevel: number;
  playerDamage: number;
  monsterDamage: number;
  playerWon: boolean;
}

export interface DailyStats {
  day: number;
  woodConsumed: number;
  waterConsumed: number;
  stoneConsumed: number;
  woodCollected: number;
  waterCollected: number;
  stoneCollected: number;
  combats: number;
  combatWins: number;
  buildingsBuilt: number;
}

export interface GameState {
  turn: number;
  day: number;
  isNight: boolean;
  nightTransition: number;
  map: Cell[][];
  player: Player;
  monsters: Monster[];
  buildings: Building[];
  gameOver: boolean;
  survivedDays: number;
  floatingTexts: FloatingText[];
  combatLogs: CombatLog[];
  dailyStats: DailyStats[];
  currentDayStats: DailyStats;
  simulationRound: number;
  totalSimulationRounds: number;
}

export type GameEvent =
  | { type: 'turn_update'; state: GameState }
  | { type: 'game_over'; state: GameState }
  | { type: 'simulation_complete'; allResults: GameState[] };

type EventCallback = (event: GameEvent) => void;

const TURNS_PER_DAY = 10;
const TORCH_RADIUS = 1;
const WALL_WOOD_COST = 10;
const WALL_STONE_COST = 5;
const TORCH_WOOD_COST = 5;
const BASE_RESOURCE_COLLECT = 2;

export class GameEngine {
  private config: GameConfig;
  private state: GameState | null = null;
  private listeners: Set<EventCallback> = new Set();
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private turnInterval: number = 200;
  private accumulator: number = 0;
  private isRunning: boolean = false;
  private allResults: GameState[] = [];
  private currentSimulationRound: number = 1;

  constructor(config: GameConfig) {
    this.config = { ...config };
  }

  subscribe(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: GameEvent): void {
    this.listeners.forEach((cb) => cb(event));
  }

  updateConfig(config: Partial<GameConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): GameConfig {
    return { ...this.config };
  }

  getState(): GameState | null {
    return this.state ? this.cloneState(this.state) : null;
  }

  reset(): void {
    this.stop();
    this.state = this.createInitialState();
    this.allResults = [];
    this.currentSimulationRound = 1;
    this.emit({ type: 'turn_update', state: this.cloneState(this.state) });
  }

  private createInitialState(): GameState {
    const mapSize = this.config.mapSize;
    const map: Cell[][] = [];

    for (let y = 0; y < mapSize; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < mapSize; x++) {
        row.push({
          x,
          y,
          terrain: 'grass',
          building: null,
          explored: false,
          illuminated: false,
          flashTimer: 0,
          lastCollectedTurn: -100,
        });
      }
      map.push(row);
    }

    this.generateTerrain(map);

    const centerX = Math.floor(mapSize / 2);
    const centerY = Math.floor(mapSize / 2);

    this.exploreArea(map, centerX, centerY, 2);

    const player: Player = {
      x: centerX,
      y: centerY,
      health: this.config.playerHealth,
      maxHealth: this.config.playerHealth,
      attack: 10,
      resources: { wood: 20, water: 10, stone: 10 },
      buildingsBuilt: 0,
    };

    const firstDayStats: DailyStats = {
      day: 1,
      woodConsumed: 0,
      waterConsumed: 0,
      stoneConsumed: 0,
      woodCollected: 0,
      waterCollected: 0,
      stoneCollected: 0,
      combats: 0,
      combatWins: 0,
      buildingsBuilt: 0,
    };

    return {
      turn: 0,
      day: 1,
      isNight: false,
      nightTransition: 0,
      map,
      player,
      monsters: [],
      buildings: [],
      gameOver: false,
      survivedDays: 0,
      floatingTexts: [],
      combatLogs: [],
      dailyStats: [],
      currentDayStats: firstDayStats,
      simulationRound: 1,
      totalSimulationRounds: this.config.simulationRounds,
    };
  }

  private generateTerrain(map: Cell[][]): void {
    const mapSize = map.length;
    const density = this.config.resourceDensity;

    const forestCount = Math.floor(mapSize * mapSize * density * 0.4);
    const waterCount = Math.floor(mapSize * mapSize * density * 0.2);
    const stoneCount = Math.floor(mapSize * mapSize * density * 0.3);

    for (let i = 0; i < forestCount; i++) {
      const x = Math.floor(Math.random() * mapSize);
      const y = Math.floor(Math.random() * mapSize);
      map[y][x].terrain = 'forest';
    }

    for (let i = 0; i < waterCount; i++) {
      const x = Math.floor(Math.random() * mapSize);
      const y = Math.floor(Math.random() * mapSize);
      map[y][x].terrain = 'water';
    }

    for (let i = 0; i < stoneCount; i++) {
      const x = Math.floor(Math.random() * mapSize);
      const y = Math.floor(Math.random() * mapSize);
      map[y][x].terrain = 'stone';
    }
  }

  private exploreArea(map: Cell[][], cx: number, cy: number, radius: number): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && y >= 0 && x < map.length && y < map.length) {
          map[y][x].explored = true;
        }
      }
    }
  }

  start(): void {
    if (this.isRunning) return;
    if (!this.state) {
      this.state = this.createInitialState();
    }
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.gameLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop = (): void => {
    if (!this.isRunning || !this.state) return;

    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;
    this.accumulator += deltaTime;

    while (this.accumulator >= this.turnInterval) {
      this.processTurn();
      this.accumulator -= this.turnInterval;
    }

    this.updateVisuals(deltaTime);

    if (this.state) {
      this.emit({ type: 'turn_update', state: this.cloneState(this.state) });
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private processTurn(): void {
    if (!this.state || this.state.gameOver) return;

    this.state.turn++;

    const dayTurn = this.state.turn % TURNS_PER_DAY;
    const newIsNight = dayTurn >= TURNS_PER_DAY / 2;

    if (newIsNight !== this.state.isNight) {
      this.state.isNight = newIsNight;
      this.state.nightTransition = 1;
    }

    if (dayTurn === 0 && this.state.turn > 0) {
      this.state.day++;
      this.state.dailyStats.push({ ...this.state.currentDayStats });
      this.state.currentDayStats = {
        day: this.state.day,
        woodConsumed: 0,
        waterConsumed: 0,
        stoneConsumed: 0,
        woodCollected: 0,
        waterCollected: 0,
        stoneCollected: 0,
        combats: 0,
        combatWins: 0,
        buildingsBuilt: 0,
      };
    }

    this.collectResources();
    this.autoBuild();

    if (this.state.isNight) {
      if (dayTurn === TURNS_PER_DAY / 2 || Math.random() < this.config.monsterSpawnRate * 0.3) {
        this.spawnMonsters();
      }
      this.moveMonsters();
      this.resolveCombat();
    }

    this.updateIllumination();
  }

  private updateVisuals(deltaTime: number): void {
    if (!this.state) return;

    if (this.state.nightTransition > 0) {
      this.state.nightTransition = Math.max(0, this.state.nightTransition - deltaTime / 1500);
    }

    for (let y = 0; y < this.state.map.length; y++) {
      for (let x = 0; x < this.state.map[y].length; x++) {
        if (this.state.map[y][x].flashTimer > 0) {
          this.state.map[y][x].flashTimer = Math.max(0, this.state.map[y][x].flashTimer - deltaTime);
        }
      }
    }

    this.state.floatingTexts = this.state.floatingTexts
      .map((ft) => ({ ...ft, life: ft.life - deltaTime, y: ft.y - deltaTime * 0.03 }))
      .filter((ft) => ft.life > 0);
  }

  private collectResources(): void {
    if (!this.state) return;

    const { player, map, turn, currentDayStats } = this.state;
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1],
    ];

    for (const [dx, dy] of directions) {
      const x = player.x + dx;
      const y = player.y + dy;

      if (x < 0 || y < 0 || x >= map.length || y >= map.length) continue;

      const cell = map[y][x];
      if (turn - cell.lastCollectedTurn < 3) continue;

      let collected = 0;
      const collectAmount = BASE_RESOURCE_COLLECT;

      switch (cell.terrain) {
        case 'forest':
          player.resources.wood += collectAmount;
          currentDayStats.woodCollected += collectAmount;
          collected = collectAmount;
          break;
        case 'water':
          player.resources.water += collectAmount;
          currentDayStats.waterCollected += collectAmount;
          collected = collectAmount;
          break;
        case 'stone':
          player.resources.stone += collectAmount;
          currentDayStats.stoneCollected += collectAmount;
          collected = collectAmount;
          break;
      }

      if (collected > 0) {
        cell.flashTimer = 300;
        cell.lastCollectedTurn = turn;
        cell.explored = true;

        const color = cell.terrain === 'forest' ? '#8B4513' : cell.terrain === 'water' ? '#00BFFF' : '#808080';
        this.state.floatingTexts.push({
          id: uuidv4(),
          x: cell.x,
          y: cell.y,
          text: `+${collected}`,
          color,
          life: 1000,
        });
      }
    }
  }

  private autoBuild(): void {
    if (!this.state) return;

    const { player, map, currentDayStats } = this.state;

    if (player.resources.wood >= TORCH_WOOD_COST && this.state.isNight) {
      const buildPositions = this.getBuildablePositions(player.x, player.y);
      for (const pos of buildPositions) {
        const cell = map[pos.y][pos.x];
        if (cell.terrain === 'grass' && !cell.building) {
          this.buildTorch(pos.x, pos.y);
          currentDayStats.buildingsBuilt++;
          break;
        }
      }
    }

    if (player.resources.wood >= WALL_WOOD_COST && player.resources.stone >= WALL_STONE_COST) {
      const wallsBuilt = this.state.buildings.filter((b) => b.type === 'wall').length;
      if (wallsBuilt < 8) {
        const buildPositions = this.getBuildablePositions(player.x, player.y);
        for (const pos of buildPositions) {
          const cell = map[pos.y][pos.x];
          if (cell.terrain === 'grass' && !cell.building) {
            this.buildWall(pos.x, pos.y);
            currentDayStats.buildingsBuilt++;
            break;
          }
        }
      }
    }
  }

  private getBuildablePositions(cx: number, cy: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const mapSize = this.config.mapSize;

    for (let r = 1; r <= 3; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) === r || Math.abs(dy) === r) {
            const x = cx + dx;
            const y = cy + dy;
            if (x >= 0 && y >= 0 && x < mapSize && y < mapSize) {
              positions.push({ x, y });
            }
          }
        }
      }
    }

    return positions.sort(() => Math.random() - 0.5);
  }

  private buildWall(x: number, y: number): void {
    if (!this.state) return;

    const { player, map } = this.state;
    const cell = map[y][x];

    if (cell.terrain !== 'grass' || cell.building) return;
    if (player.resources.wood < WALL_WOOD_COST || player.resources.stone < WALL_STONE_COST) return;

    player.resources.wood -= WALL_WOOD_COST;
    player.resources.stone -= WALL_STONE_COST;
    this.state.currentDayStats.woodConsumed += WALL_WOOD_COST;
    this.state.currentDayStats.stoneConsumed += WALL_STONE_COST;

    cell.building = 'wall';
    this.state.buildings.push({ type: 'wall', x, y });
    player.buildingsBuilt++;
  }

  private buildTorch(x: number, y: number): void {
    if (!this.state) return;

    const { player, map } = this.state;
    const cell = map[y][x];

    if (cell.terrain !== 'grass' || cell.building) return;
    if (player.resources.wood < TORCH_WOOD_COST) return;

    player.resources.wood -= TORCH_WOOD_COST;
    this.state.currentDayStats.woodConsumed += TORCH_WOOD_COST;

    cell.building = 'torch';
    this.state.buildings.push({ type: 'torch', x, y });
    player.buildingsBuilt++;
  }

  private updateIllumination(): void {
    if (!this.state) return;

    const { map } = this.state;

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        map[y][x].illuminated = false;
      }
    }

    for (const building of this.state.buildings) {
      if (building.type === 'torch') {
        for (let dy = -TORCH_RADIUS; dy <= TORCH_RADIUS; dy++) {
          for (let dx = -TORCH_RADIUS; dx <= TORCH_RADIUS; dx++) {
            const x = building.x + dx;
            const y = building.y + dy;
            if (x >= 0 && y >= 0 && x < map.length && y < map.length) {
              map[y][x].illuminated = true;
            }
          }
        }
      }
    }
  }

  private spawnMonsters(): void {
    if (!this.state) return;

    const count = Math.floor(Math.random() * 3) + 1;
    const mapSize = this.config.mapSize;

    for (let i = 0; i < count; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x: number, y: number;

      switch (edge) {
        case 0:
          x = Math.floor(Math.random() * mapSize);
          y = 0;
          break;
        case 1:
          x = mapSize - 1;
          y = Math.floor(Math.random() * mapSize);
          break;
        case 2:
          x = Math.floor(Math.random() * mapSize);
          y = mapSize - 1;
          break;
        default:
          x = 0;
          y = Math.floor(Math.random() * mapSize);
          break;
      }

      const level = Math.floor(Math.random() * 3) + 1;
      const monster: Monster = {
        id: uuidv4(),
        x,
        y,
        level,
        health: level * 30,
        attack: level * 5,
      };

      this.state.monsters.push(monster);
    }
  }

  private moveMonsters(): void {
    if (!this.state) return;

    const { player, map, monsters } = this.state;

    for (const monster of monsters) {
      const path = this.findPath(monster.x, monster.y, player.x, player.y, map);
      if (path.length > 1) {
        const next = path[1];
        monster.x = next.x;
        monster.y = next.y;
      }
    }
  }

  private findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    map: Cell[][]
  ): { x: number; y: number }[] {
    const mapSize = map.length;

    const openSet: { x: number; y: number; g: number; h: number; f: number; parent: any }[] = [];
    const closedSet = new Set<string>();

    const heuristic = (x: number, y: number) => Math.abs(x - endX) + Math.abs(y - endY);

    openSet.push({
      x: startX,
      y: startY,
      g: 0,
      h: heuristic(startX, startY),
      f: heuristic(startX, startY),
      parent: null,
    });

    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
    ];

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (current.x === endX && current.y === endY) {
        const path: { x: number; y: number }[] = [];
        let node = current;
        while (node) {
          path.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }
        return path;
      }

      closedSet.add(`${current.x},${current.y}`);

      for (const [dx, dy] of directions) {
        const nx = current.x + dx;
        const ny = current.y + dy;

        if (nx < 0 || ny < 0 || nx >= mapSize || ny >= mapSize) continue;
        if (closedSet.has(`${nx},${ny}`)) continue;

        const cell = map[ny][nx];
        if (cell.building === 'wall') continue;

        const g = current.g + 1;
        const h = heuristic(nx, ny);
        const f = g + h;

        const existingIdx = openSet.findIndex((n) => n.x === nx && n.y === ny);
        if (existingIdx === -1) {
          openSet.push({ x: nx, y: ny, g, h, f, parent: current });
        } else if (g < openSet[existingIdx].g) {
          openSet[existingIdx] = { x: nx, y: ny, g, h, f, parent: current };
        }
      }
    }

    return [{ x: startX, y: startY }];
  }

  private resolveCombat(): void {
    if (!this.state) return;

    const { player, monsters, currentDayStats } = this.state;

    for (let i = monsters.length - 1; i >= 0; i--) {
      const monster = monsters[i];

      if (monster.x === player.x && monster.y === player.y) {
        currentDayStats.combats++;

        const playerDamage = player.attack;
        const monsterDamage = monster.attack;

        monster.health -= playerDamage;
        player.health -= monsterDamage;

        this.state.floatingTexts.push({
          id: uuidv4(),
          x: player.x,
          y: player.y,
          text: `-${monsterDamage}`,
          color: '#ff4444',
          life: 1000,
        });

        this.state.floatingTexts.push({
          id: uuidv4(),
          x: monster.x,
          y: monster.y - 0.5,
          text: `-${playerDamage}`,
          color: '#ffffff',
          life: 1000,
        });

        const playerWon = monster.health <= 0;

        this.state.combatLogs.push({
          turn: this.state.turn,
          day: this.state.day,
          monsterLevel: monster.level,
          playerDamage,
          monsterDamage,
          playerWon,
        });

        if (monster.health <= 0) {
          currentDayStats.combatWins++;
          monsters.splice(i, 1);
        }

        if (player.health <= 0) {
          this.state.gameOver = true;
          this.state.survivedDays = this.state.day - 1;
          this.endSimulation();
          return;
        }
      }
    }
  }

  private endSimulation(): void {
    if (!this.state) return;

    if (this.state.currentDayStats) {
      this.state.dailyStats.push({ ...this.state.currentDayStats });
    }

    this.allResults.push(this.cloneState(this.state));

    if (this.currentSimulationRound < this.config.simulationRounds) {
      this.currentSimulationRound++;
      this.state = this.createInitialState();
      this.state.simulationRound = this.currentSimulationRound;
    } else {
      this.isRunning = false;
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      this.emit({ type: 'game_over', state: this.allResults[this.allResults.length - 1] });
      this.emit({ type: 'simulation_complete', allResults: this.allResults });
    }
  }

  private cloneState(state: GameState): GameState {
    return {
      ...state,
      player: {
        ...state.player,
        resources: { ...state.player.resources },
      },
      monsters: state.monsters.map((m) => ({ ...m })),
      buildings: state.buildings.map((b) => ({ ...b })),
      floatingTexts: state.floatingTexts.map((f) => ({ ...f })),
      combatLogs: state.combatLogs.map((c) => ({ ...c })),
      dailyStats: state.dailyStats.map((d) => ({ ...d })),
      currentDayStats: { ...state.currentDayStats },
      map: state.map.map((row) => row.map((cell) => ({ ...cell }))),
    };
  }

  runFullSimulation(): GameState[] {
    const results: GameState[] = [];

    for (let round = 0; round < this.config.simulationRounds; round++) {
      const state = this.createInitialState();
      state.simulationRound = round + 1;

      let safetyCounter = 0;
      while (!state.gameOver && safetyCounter < 10000) {
        this.processTurnStatic(state);
        safetyCounter++;
      }

      if (state.currentDayStats) {
        state.dailyStats.push({ ...state.currentDayStats });
      }

      results.push(state);
    }

    return results;
  }

  private processTurnStatic(state: GameState): void {
    state.turn++;

    const dayTurn = state.turn % TURNS_PER_DAY;
    const newIsNight = dayTurn >= TURNS_PER_DAY / 2;

    if (newIsNight !== state.isNight) {
      state.isNight = newIsNight;
    }

    if (dayTurn === 0 && state.turn > 0) {
      state.day++;
      state.dailyStats.push({ ...state.currentDayStats });
      state.currentDayStats = {
        day: state.day,
        woodConsumed: 0,
        waterConsumed: 0,
        stoneConsumed: 0,
        woodCollected: 0,
        waterCollected: 0,
        stoneCollected: 0,
        combats: 0,
        combatWins: 0,
        buildingsBuilt: 0,
      };
    }

    this.collectResourcesStatic(state);
    this.autoBuildStatic(state);

    if (state.isNight) {
      if (dayTurn === TURNS_PER_DAY / 2 || Math.random() < this.config.monsterSpawnRate * 0.3) {
        this.spawnMonstersStatic(state);
      }
      this.moveMonstersStatic(state);
      this.resolveCombatStatic(state);
    }
  }

  private collectResourcesStatic(state: GameState): void {
    const { player, map, turn, currentDayStats } = state;
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1],
    ];

    for (const [dx, dy] of directions) {
      const x = player.x + dx;
      const y = player.y + dy;

      if (x < 0 || y < 0 || x >= map.length || y >= map.length) continue;

      const cell = map[y][x];
      if (turn - cell.lastCollectedTurn < 3) continue;

      const collectAmount = BASE_RESOURCE_COLLECT;
      let collected = 0;

      switch (cell.terrain) {
        case 'forest':
          player.resources.wood += collectAmount;
          currentDayStats.woodCollected += collectAmount;
          collected = collectAmount;
          break;
        case 'water':
          player.resources.water += collectAmount;
          currentDayStats.waterCollected += collectAmount;
          collected = collectAmount;
          break;
        case 'stone':
          player.resources.stone += collectAmount;
          currentDayStats.stoneCollected += collectAmount;
          collected = collectAmount;
          break;
      }

      if (collected > 0) {
        cell.lastCollectedTurn = turn;
        cell.explored = true;
      }
    }
  }

  private autoBuildStatic(state: GameState): void {
    const { player, map, currentDayStats } = state;

    if (player.resources.wood >= TORCH_WOOD_COST && state.isNight) {
      const positions = this.getBuildablePositionsStatic(player.x, player.y, map.length);
      for (const pos of positions) {
        const cell = map[pos.y][pos.x];
        if (cell.terrain === 'grass' && !cell.building) {
          this.buildWallStatic(state, pos.x, pos.y);
          currentDayStats.buildingsBuilt++;
          break;
        }
      }
    }

    if (player.resources.wood >= WALL_WOOD_COST && player.resources.stone >= WALL_STONE_COST) {
      const wallsBuilt = state.buildings.filter((b) => b.type === 'wall').length;
      if (wallsBuilt < 8) {
        const positions = this.getBuildablePositionsStatic(player.x, player.y, map.length);
        for (const pos of positions) {
          const cell = map[pos.y][pos.x];
          if (cell.terrain === 'grass' && !cell.building) {
            this.buildWallStatic(state, pos.x, pos.y);
            currentDayStats.buildingsBuilt++;
            break;
          }
        }
      }
    }
  }

  private getBuildablePositionsStatic(cx: number, cy: number, mapSize: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];

    for (let r = 1; r <= 3; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) === r || Math.abs(dy) === r) {
            const x = cx + dx;
            const y = cy + dy;
            if (x >= 0 && y >= 0 && x < mapSize && y < mapSize) {
              positions.push({ x, y });
            }
          }
        }
      }
    }

    return positions.sort(() => Math.random() - 0.5);
  }

  private buildWallStatic(state: GameState, x: number, y: number): void {
    const { player, map } = state;
    const cell = map[y][x];

    if (cell.terrain !== 'grass' || cell.building) return;
    if (player.resources.wood < WALL_WOOD_COST || player.resources.stone < WALL_STONE_COST) return;

    player.resources.wood -= WALL_WOOD_COST;
    player.resources.stone -= WALL_STONE_COST;
    state.currentDayStats.woodConsumed += WALL_WOOD_COST;
    state.currentDayStats.stoneConsumed += WALL_STONE_COST;

    cell.building = 'wall';
    state.buildings.push({ type: 'wall', x, y });
    player.buildingsBuilt++;
  }

  private spawnMonstersStatic(state: GameState): void {
    const count = Math.floor(Math.random() * 3) + 1;
    const mapSize = this.config.mapSize;

    for (let i = 0; i < count; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x: number, y: number;

      switch (edge) {
        case 0:
          x = Math.floor(Math.random() * mapSize);
          y = 0;
          break;
        case 1:
          x = mapSize - 1;
          y = Math.floor(Math.random() * mapSize);
          break;
        case 2:
          x = Math.floor(Math.random() * mapSize);
          y = mapSize - 1;
          break;
        default:
          x = 0;
          y = Math.floor(Math.random() * mapSize);
          break;
      }

      const level = Math.floor(Math.random() * 3) + 1;
      state.monsters.push({
        id: uuidv4(),
        x,
        y,
        level,
        health: level * 30,
        attack: level * 5,
      });
    }
  }

  private moveMonstersStatic(state: GameState): void {
    const { player, map, monsters } = state;

    for (const monster of monsters) {
      const path = this.findPath(monster.x, monster.y, player.x, player.y, map);
      if (path.length > 1) {
        const next = path[1];
        monster.x = next.x;
        monster.y = next.y;
      }
    }
  }

  private resolveCombatStatic(state: GameState): void {
    const { player, monsters, currentDayStats } = state;

    for (let i = monsters.length - 1; i >= 0; i--) {
      const monster = monsters[i];

      if (monster.x === player.x && monster.y === player.y) {
        currentDayStats.combats++;

        const playerDamage = player.attack;
        const monsterDamage = monster.attack;

        monster.health -= playerDamage;
        player.health -= monsterDamage;

        const playerWon = monster.health <= 0;

        state.combatLogs.push({
          turn: state.turn,
          day: state.day,
          monsterLevel: monster.level,
          playerDamage,
          monsterDamage,
          playerWon,
        });

        if (monster.health <= 0) {
          currentDayStats.combatWins++;
          monsters.splice(i, 1);
        }

        if (player.health <= 0) {
          state.gameOver = true;
          state.survivedDays = state.day - 1;
          return;
        }
      }
    }
  }
}
