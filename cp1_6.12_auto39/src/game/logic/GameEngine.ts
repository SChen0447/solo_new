import {
  GameState,
  Unit,
  Action,
  DamageInfo,
  Position,
  PlayerSide,
  GamePhase,
  HighlightType,
  UnitType,
  BOARD_SIZE,
  UNIT_CONFIGS,
  INITIAL_BLUE_POSITIONS,
  INITIAL_RED_POSITIONS,
  BLUE_UNIT_ORDER,
  RED_UNIT_ORDER,
  posEqual,
  manhattanDistance,
  cloneGameState,
} from './types';

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `unit_${idCounter}`;
}

export function createInitialGameState(): GameState {
  const units: Unit[] = [];
  const board: (string | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  );

  BLUE_UNIT_ORDER.forEach((type, i) => {
    const cfg = UNIT_CONFIGS[type];
    const id = nextId();
    const pos = INITIAL_BLUE_POSITIONS[i];
    const unit: Unit = {
      id,
      type,
      side: 'blue',
      pos: { ...pos },
      hp: cfg.maxHp,
      maxHp: cfg.maxHp,
      attack: cfg.attack,
      defense: cfg.defense,
      moveRange: cfg.moveRange,
      attackRange: cfg.attackRange,
      skillName: cfg.skillName,
      skillDescription: cfg.skillDescription,
      isAoe: cfg.isAoe,
      hasMoved: false,
      hasAttacked: false,
      isAlive: true,
      kills: 0,
    };
    units.push(unit);
    board[pos.y][pos.x] = id;
  });

  RED_UNIT_ORDER.forEach((type, i) => {
    const cfg = UNIT_CONFIGS[type];
    const id = nextId();
    const pos = INITIAL_RED_POSITIONS[i];
    const unit: Unit = {
      id,
      type,
      side: 'red',
      pos: { ...pos },
      hp: cfg.maxHp,
      maxHp: cfg.maxHp,
      attack: cfg.attack,
      defense: cfg.defense,
      moveRange: cfg.moveRange,
      attackRange: cfg.attackRange,
      skillName: cfg.skillName,
      skillDescription: cfg.skillDescription,
      isAoe: cfg.isAoe,
      hasMoved: false,
      hasAttacked: false,
      isAlive: true,
      kills: 0,
    };
    units.push(unit);
    board[pos.y][pos.x] = id;
  });

  return {
    board,
    units,
    currentTurn: 'blue',
    phase: 'player_move',
    turnNumber: 1,
    selectedUnitId: null,
    highlightedCells: [],
    lastAction: null,
    damageAnimations: [],
    gameOverWinner: null,
    blueKills: 0,
    redKills: 0,
  };
}

export function getUnit(state: GameState, unitId: string): Unit | undefined {
  return state.units.find((u) => u.id === unitId);
}

export function getAliveUnits(state: GameState, side: PlayerSide): Unit[] {
  return state.units.filter((u) => u.side === side && u.isAlive);
}

export function getUnitAt(state: GameState, pos: Position): Unit | undefined {
  const id = state.board[pos.y][pos.x];
  if (!id) return undefined;
  return getUnit(state, id);
}

export function getValidMovePositions(state: GameState, unitId: string): Position[] {
  const unit = getUnit(state, unitId);
  if (!unit || !unit.isAlive || unit.hasMoved) return [];

  const positions: Position[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const pos = { x, y };
      if (posEqual(pos, unit.pos)) continue;
      if (manhattanDistance(unit.pos, pos) > unit.moveRange) continue;
      if (state.board[y][x] !== null) continue;
      positions.push(pos);
    }
  }
  return positions;
}

export function getValidAttackTargets(state: GameState, unitId: string): Unit[] {
  const unit = getUnit(state, unitId);
  if (!unit || !unit.isAlive || unit.hasAttacked) return [];

  const enemySide: PlayerSide = unit.side === 'blue' ? 'red' : 'blue';
  const enemies = getAliveUnits(state, enemySide);

  return enemies.filter((e) => manhattanDistance(unit.pos, e.pos) <= unit.attackRange);
}

export function selectUnit(state: GameState, unitId: string): GameState {
  const newState = cloneGameState(state);
  const unit = getUnit(newState, unitId);
  if (!unit || !unit.isAlive || unit.side !== newState.currentTurn) {
    newState.selectedUnitId = null;
    newState.highlightedCells = [];
    return newState;
  }

  newState.selectedUnitId = unitId;
  newState.highlightedCells = [];

  if (!unit.hasMoved) {
    const moves = getValidMovePositions(newState, unitId);
    moves.forEach((pos) => {
      newState.highlightedCells.push({ pos, type: 'move' as HighlightType });
    });
  }

  if (!unit.hasAttacked) {
    const targets = getValidAttackTargets(newState, unitId);
    targets.forEach((t) => {
      newState.highlightedCells.push({ pos: t.pos, type: 'attack' as HighlightType });
    });
  }

  newState.highlightedCells.push({ pos: unit.pos, type: 'selected' as HighlightType });

  return newState;
}

export function deselectUnit(state: GameState): GameState {
  const newState = cloneGameState(state);
  newState.selectedUnitId = null;
  newState.highlightedCells = [];
  return newState;
}

export function moveUnit(state: GameState, unitId: string, targetPos: Position): GameState {
  const newState = cloneGameState(state);
  const unit = getUnit(newState, unitId);
  if (!unit || !unit.isAlive || unit.hasMoved) return newState;

  const validMoves = getValidMovePositions(newState, unitId);
  if (!validMoves.some((p) => posEqual(p, targetPos))) return newState;

  newState.board[unit.pos.y][unit.pos.x] = null;
  unit.pos = { ...targetPos };
  newState.board[targetPos.y][targetPos.x] = unitId;
  unit.hasMoved = true;
  newState.lastAction = { type: 'move', unitId, targetPos };

  const attackTargets = getValidAttackTargets(newState, unitId);
  if (attackTargets.length > 0 && !unit.hasAttacked) {
    newState.phase = 'player_attack';
    newState.highlightedCells = attackTargets.map((t) => ({
      pos: t.pos,
      type: 'attack' as HighlightType,
    }));
    newState.highlightedCells.push({ pos: unit.pos, type: 'selected' as HighlightType });
  } else {
    newState.selectedUnitId = null;
    newState.highlightedCells = [];
    newState.phase = 'player_move';
  }

  return newState;
}

export function attackUnit(
  state: GameState,
  attackerId: string,
  targetId: string
): GameState {
  const newState = cloneGameState(state);
  const attacker = getUnit(newState, attackerId);
  const target = getUnit(newState, targetId);

  if (!attacker || !target || !attacker.isAlive || !target.isAlive || attacker.hasAttacked) {
    return newState;
  }

  const validTargets = getValidAttackTargets(newState, attackerId);
  if (!validTargets.some((t) => t.id === targetId)) return newState;

  const damageAnimations: DamageInfo[] = [];

  const baseDamage = Math.max(1, attacker.attack - target.defense + Math.floor(Math.random() * 2));

  target.hp -= baseDamage;
  damageAnimations.push({
    attackerId,
    targetId,
    damage: baseDamage,
    targetPos: { ...target.pos },
    wasKilled: target.hp <= 0,
  });

  if (target.hp <= 0) {
    target.hp = 0;
    target.isAlive = false;
    newState.board[target.pos.y][target.pos.x] = null;
    attacker.kills += 1;
    if (target.side === 'red') {
      newState.blueKills += 1;
    } else {
      newState.redKills += 1;
    }
  }

  if (attacker.isAoe) {
    const enemySide: PlayerSide = attacker.side === 'blue' ? 'red' : 'blue';
    const adjacentEnemies = getAliveUnits(newState, enemySide).filter(
      (e) =>
        e.id !== targetId &&
        manhattanDistance(target.pos, e.pos) <= 1
    );

    adjacentEnemies.forEach((ae) => {
      const aoeDamage = Math.max(1, Math.floor(baseDamage * 0.5));
      ae.hp -= aoeDamage;
      damageAnimations.push({
        attackerId,
        targetId: ae.id,
        damage: aoeDamage,
        targetPos: { ...ae.pos },
        wasKilled: ae.hp <= 0,
      });
      if (ae.hp <= 0) {
        ae.hp = 0;
        ae.isAlive = false;
        newState.board[ae.pos.y][ae.pos.x] = null;
        attacker.kills += 1;
        if (ae.side === 'red') {
          newState.blueKills += 1;
        } else {
          newState.redKills += 1;
        }
      }
    });
  }

  attacker.hasAttacked = true;
  newState.lastAction = { type: 'attack', unitId: attackerId, targetId };
  newState.damageAnimations = damageAnimations;
  newState.selectedUnitId = null;
  newState.highlightedCells = [];
  newState.phase = 'player_move';

  const winner = checkGameOver(newState);
  if (winner) {
    newState.phase = 'game_over';
    newState.gameOverWinner = winner;
  }

  return newState;
}

export function skipUnitAction(state: GameState, unitId: string): GameState {
  const newState = cloneGameState(state);
  const unit = getUnit(newState, unitId);
  if (!unit || !unit.isAlive) return newState;

  unit.hasMoved = true;
  unit.hasAttacked = true;
  newState.selectedUnitId = null;
  newState.highlightedCells = [];
  newState.lastAction = { type: 'skip', unitId };
  newState.phase = 'player_move';
  return newState;
}

export function endTurn(state: GameState): GameState {
  const newState = cloneGameState(state);

  getAliveUnits(newState, newState.currentTurn).forEach((u) => {
    u.hasMoved = false;
    u.hasAttacked = false;
  });

  newState.currentTurn = newState.currentTurn === 'blue' ? 'red' : 'blue';
  if (newState.currentTurn === 'blue') {
    newState.turnNumber += 1;
  }

  newState.selectedUnitId = null;
  newState.highlightedCells = [];
  newState.lastAction = null;
  newState.damageAnimations = [];

  if (newState.currentTurn === 'red') {
    newState.phase = 'ai_turn';
  } else {
    newState.phase = 'player_move';
  }

  return newState;
}

export function applyAction(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'move':
      return moveUnit(state, action.unitId, action.targetPos!);
    case 'attack':
      return attackUnit(state, action.unitId, action.targetId!);
    case 'skip':
      return skipUnitAction(state, action.unitId);
    default:
      return state;
  }
}

export function checkGameOver(state: GameState): PlayerSide | null {
  const blueAlive = getAliveUnits(state, 'blue').length;
  const redAlive = getAliveUnits(state, 'red').length;

  if (blueAlive === 0) return 'red';
  if (redAlive === 0) return 'blue';
  return null;
}

export function allUnitsActed(state: GameState, side: PlayerSide): boolean {
  const alive = getAliveUnits(state, side);
  return alive.every((u) => u.hasMoved && u.hasAttacked);
}

export function clearDamageAnimations(state: GameState): GameState {
  const newState = cloneGameState(state);
  newState.damageAnimations = [];
  return newState;
}
