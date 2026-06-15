import { PhysicsState, PhysicsBody, Platform, MovingPlatform, Gear, Spring, Laser, Key, Door } from './PhysicsEngine';

interface LevelData {
  name: string;
  timeLimit: number;
  player: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  platforms: Array<{
    type: 'fixed' | 'moving';
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
  }>;
  gears: Array<{
    x: number;
    y: number;
    radius: number;
    rotationSpeed: number;
    color: string;
  }>;
  springs: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    springConstant: number;
    bounceBoost: number;
    color: string;
  }>;
  movingPlatforms: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    range: number;
    direction: number;
    startX: number;
    color: string;
  }>;
  lasers: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
  }>;
  keys: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    collected: boolean;
  }>;
  doors: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    openColor: string;
    isOpen: boolean;
  }>;
}

export class LevelLoader {
  private levelData: LevelData | null = null;

  public async load(levelPath: string): Promise<PhysicsState> {
    const response = await fetch(levelPath);
    this.levelData = await response.json();
    return this.parseLevelData();
  }

  public loadSync(levelData: LevelData): PhysicsState {
    this.levelData = levelData;
    return this.parseLevelData();
  }

  private parseLevelData(): PhysicsState {
    if (!this.levelData) {
      throw new Error('Level data not loaded');
    }

    const player: PhysicsBody = {
      x: this.levelData.player.x,
      y: this.levelData.player.y,
      width: this.levelData.player.width,
      height: this.levelData.player.height,
      vx: 0,
      vy: 0,
      onGround: false,
      jumpCount: 0,
      maxJumps: 2
    };

    const platforms: Platform[] = this.levelData.platforms
      .filter(p => p.type === 'fixed')
      .map(p => ({
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        type: 'fixed' as const,
        color: p.color
      }));

    const movingPlatforms: MovingPlatform[] = [
      ...this.levelData.platforms
        .filter(p => p.type === 'moving')
        .map(p => ({
          ...p,
          type: 'moving' as const,
          speed: 60,
          range: 80,
          direction: 1,
          startX: p.x
        })),
      ...this.levelData.movingPlatforms.map(mp => ({
        x: mp.x,
        y: mp.y,
        width: mp.width,
        height: mp.height,
        type: 'moving' as const,
        speed: mp.speed,
        range: mp.range,
        direction: mp.direction,
        startX: mp.startX,
        color: mp.color
      }))
    ];

    const gears: Gear[] = this.levelData.gears.map(g => ({
      x: g.x,
      y: g.y,
      radius: g.radius,
      rotationSpeed: g.rotationSpeed,
      rotation: 0,
      color: g.color
    }));

    const springs: Spring[] = this.levelData.springs.map(s => ({
      x: s.x,
      y: s.y,
      width: s.width,
      height: s.height,
      originalHeight: s.height,
      springConstant: s.springConstant,
      bounceBoost: s.bounceBoost,
      color: s.color,
      compressed: false,
      compressTimer: 0
    }));

    const lasers: Laser[] = this.levelData.lasers.map(l => ({
      x: l.x,
      y: l.y,
      width: l.width,
      height: l.height,
      color: l.color
    }));

    const keys: Key[] = this.levelData.keys.map(k => ({
      id: k.id,
      x: k.x,
      y: k.y,
      width: k.width,
      height: k.height,
      color: k.color,
      collected: k.collected
    }));

    const doors: Door[] = this.levelData.doors.map(d => ({
      x: d.x,
      y: d.y,
      width: d.width,
      height: d.height,
      color: d.color,
      openColor: d.openColor,
      isOpen: d.isOpen
    }));

    return {
      player,
      platforms,
      movingPlatforms,
      gears,
      springs,
      lasers,
      keys,
      doors,
      events: []
    };
  }

  public getTimeLimit(): number {
    return this.levelData?.timeLimit || 90;
  }

  public getPlayerStart(): { x: number; y: number } {
    return {
      x: this.levelData?.player.x || 50,
      y: this.levelData?.player.y || 400
    };
  }
}
