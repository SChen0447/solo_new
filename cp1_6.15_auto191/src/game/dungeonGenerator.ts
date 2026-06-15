export enum CellType {
  EMPTY = 'empty',
  TREASURE = 'treasure',
  MONSTER = 'monster',
  TRAP = 'trap',
  POTION = 'potion',
  EXIT = 'exit',
  ENTRANCE = 'entrance',
}

export interface CellData {
  gold?: number;
  monsterHp?: number;
  monsterMaxHp?: number;
  monsterDefense?: number;
  trapDamage?: number;
  potionHeal?: number;
}

export interface Cell {
  type: CellType;
  revealed: boolean;
  data?: CellData;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface DungeonConfig {
  rows: number;
  cols: number;
  treasureDensity: number;
  monsterDensity: number;
  trapDensity: number;
  potionDensity: number;
}

export function generateDungeon(
  config?: Partial<DungeonConfig>
): { dungeon: Cell[][]; rows: number; cols: number } {
  const rows = config?.rows ?? randInt(6, 8);
  const cols = config?.cols ?? randInt(6, 8);

  const totalCells = rows * cols;
  const treasureDensity = config?.treasureDensity ?? randInt(2, 4) / totalCells;
  const monsterDensity = config?.monsterDensity ?? randInt(3, 6) / totalCells;
  const trapDensity = config?.trapDensity ?? randInt(2, 5) / totalCells;
  const potionDensity = config?.potionDensity ?? randInt(1, 3) / totalCells;

  const dungeon: Cell[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ type: CellType.EMPTY, revealed: false });
    }
    dungeon.push(row);
  }

  dungeon[0][0] = { type: CellType.ENTRANCE, revealed: true };
  dungeon[rows - 1][cols - 1] = { type: CellType.EXIT, revealed: false };

  const isReserved = (r: number, c: number): boolean => {
    return (r === 0 && c === 0) || (r === rows - 1 && c === cols - 1);
  };

  const placeRandom = (
    type: CellType,
    density: number,
    makeData: () => CellData
  ) => {
    const count = Math.max(1, Math.floor(totalCells * density));
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < 200) {
      const r = randInt(0, rows - 1);
      const c = randInt(0, cols - 1);
      if (!isReserved(r, c) && dungeon[r][c].type === CellType.EMPTY) {
        dungeon[r][c] = { type, revealed: false, data: makeData() };
        placed++;
      }
      attempts++;
    }
  };

  placeRandom(CellType.TREASURE, treasureDensity, () => ({
    gold: randInt(1, 10),
  }));

  placeRandom(CellType.MONSTER, monsterDensity, () => {
    const hp = randInt(20, 50);
    return {
      monsterHp: hp,
      monsterMaxHp: hp,
      monsterDefense: randInt(10, 18),
    };
  });

  placeRandom(CellType.TRAP, trapDensity, () => ({
    trapDamage: randInt(5, 15),
  }));

  placeRandom(CellType.POTION, potionDensity, () => ({
    potionHeal: randInt(10, 20),
  }));

  return { dungeon, rows, cols };
}
