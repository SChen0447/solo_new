import { HexCoord, Tile, TileState, Vector2 } from './types';
import {
  HEX_SIZE,
  HEX_WIDTH,
  MAP_RADIUS,
  TILE_WARNING_DURATION,
  TILE_COLLAPSE_DURATION,
  COLLAPSE_INTERVAL
} from './constants';

export class TileMap {
  private tiles: Map<string, Tile> = new Map();
  private collapseTimer: number = 0;
  private currentCollapseRing: number = MAP_RADIUS;

  constructor() {
    this.generateMap();
  }

  private coordKey(q: number, r: number): string {
    return `${q},${r}`;
  }

  private generateMap(): void {
    for (let q = -MAP_RADIUS; q <= MAP_RADIUS; q++) {
      const r1 = Math.max(-MAP_RADIUS, -q - MAP_RADIUS);
      const r2 = Math.min(MAP_RADIUS, -q + MAP_RADIUS);
      for (let r = r1; r <= r2; r++) {
        const key = this.coordKey(q, r);
        this.tiles.set(key, {
          coord: { q, r },
          state: TileState.STABLE,
          timer: 0,
          collapseProgress: 0
        });
      }
    }
  }

  public static hexToPixel(coord: HexCoord): Vector2 {
    const x = HEX_SIZE * Math.sqrt(3) * (coord.q + coord.r / 2);
    const y = HEX_SIZE * 1.5 * coord.r;
    return { x, y };
  }

  public static pixelToHex(pos: Vector2): HexCoord {
    const q = (Math.sqrt(3) / 3 * pos.x - 1 / 3 * pos.y) / HEX_SIZE;
    const r = (2 / 3 * pos.y) / HEX_SIZE;
    return this.roundHex({ q, r });
  }

  private static roundHex(coord: HexCoord): HexCoord {
    let rq = Math.round(coord.q);
    let rr = Math.round(coord.r);
    const rs = Math.round(-coord.q - coord.r);
    const qDiff = Math.abs(rq - coord.q);
    const rDiff = Math.abs(rr - coord.r);
    const sDiff = Math.abs(rs - (-coord.q - coord.r));
    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }
    return { q: rq, r: rr };
  }

  public static getHexDistance(a: HexCoord, b: HexCoord): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  }

  public getTiles(): Tile[] {
    return Array.from(this.tiles.values());
  }

  public getTile(coord: HexCoord): Tile | undefined {
    return this.tiles.get(this.coordKey(coord.q, coord.r));
  }

  public getTileAtPixel(pos: Vector2): Tile | undefined {
    const hex = TileMap.pixelToHex(pos);
    return this.getTile(hex);
  }

  public isPositionWalkable(pos: Vector2): boolean {
    const tile = this.getTileAtPixel(pos);
    if (!tile) return false;
    return tile.state === TileState.STABLE || tile.state === TileState.WARNING;
  }

  public update(deltaTime: number): void {
    this.collapseTimer += deltaTime;

    for (const tile of this.tiles.values()) {
      if (tile.state === TileState.WARNING) {
        tile.timer += deltaTime;
        if (tile.timer >= TILE_WARNING_DURATION) {
          tile.state = TileState.COLLAPSING;
          tile.timer = 0;
          tile.collapseProgress = 0;
        }
      } else if (tile.state === TileState.COLLAPSING) {
        tile.timer += deltaTime;
        tile.collapseProgress = tile.timer / TILE_COLLAPSE_DURATION;
        if (tile.timer >= TILE_COLLAPSE_DURATION) {
          tile.state = TileState.GONE;
        }
      }
    }

    if (this.collapseTimer >= COLLAPSE_INTERVAL && this.currentCollapseRing > 0) {
      this.triggerRingCollapse(this.currentCollapseRing);
      this.currentCollapseRing--;
      this.collapseTimer = 0;
    }
  }

  private triggerRingCollapse(ring: number): void {
    for (const tile of this.tiles.values()) {
      const distance = TileMap.getHexDistance(tile.coord, { q: 0, r: 0 });
      if (Math.floor(distance) === ring && tile.state === TileState.STABLE) {
        tile.state = TileState.WARNING;
        tile.timer = 0;
      }
    }
  }

  public getCurrentCollapseRing(): number {
    return this.currentCollapseRing;
  }

  public getCenterPixel(): Vector2 {
    return { x: 0, y: 0 };
  }

  public getAdjacentTiles(coord: HexCoord): HexCoord[] {
    const directions = [
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
    ];
    return directions.map(d => ({ q: coord.q + d.q, r: coord.r + d.r }));
  }

  public reset(): void {
    this.tiles.clear();
    this.collapseTimer = 0;
    this.currentCollapseRing = MAP_RADIUS;
    this.generateMap();
  }
}
