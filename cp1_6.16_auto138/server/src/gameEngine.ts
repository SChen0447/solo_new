import { v4 as uuidv4 } from 'uuid';
import {
  CANVAS_SIZE,
  COLORS,
  THEMES,
  ROUND_TIME,
  TOTAL_ROUNDS,
  INITIAL_ITEMS,
  GameState,
  Player,
  Item,
  ItemType
} from './types';

export function createEmptyCanvas(): number[][] {
  return Array(CANVAS_SIZE).fill(null).map(() => Array(CANVAS_SIZE).fill(-1));
}

export function createEmptyOwners(): (string | null)[][] {
  return Array(CANVAS_SIZE).fill(null).map(() => Array(CANVAS_SIZE).fill(null));
}

export function getRandomTheme(): string {
  return THEMES[Math.floor(Math.random() * THEMES.length)];
}

export function createPlayer(
  id: string,
  socketId: string,
  name: string,
  color: string
): Player {
  const items: ItemType[] = [];
  for (let i = 0; i < INITIAL_ITEMS; i++) {
    items.push(Math.random() > 0.5 ? 'trap' : 'speedBoost');
  }
  return {
    id,
    socketId,
    name,
    color,
    score: 0,
    items,
    isDrawing: false,
    isFrozen: false,
    frozenUntil: 0,
    speedBoostUntil: 0,
    votesReceived: {},
    hasVoted: false
  };
}

export function createInitialState(roomId: string, hostId: string): GameState {
  return {
    roomId,
    phase: 'waiting',
    round: 0,
    theme: '',
    timeLeft: 0,
    canvas: createEmptyCanvas(),
    pixelOwners: createEmptyOwners(),
    players: {},
    items: [],
    hostId
  };
}

export function validatePixel(x: number, y: number, colorIndex: number): boolean {
  if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return false;
  if (colorIndex < -1 || colorIndex >= COLORS.length) return false;
  return true;
}

export function drawPixel(
  state: GameState,
  playerId: string,
  x: number,
  y: number,
  colorIndex: number
): { success: boolean; triggeredItem?: Item } {
  const player = state.players[playerId];
  if (!player || player.isFrozen) return { success: false };

  if (!validatePixel(x, y, colorIndex)) return { success: false };

  const now = Date.now();
  if (player.frozenUntil > now) {
    player.isFrozen = true;
    return { success: false };
  } else {
    player.isFrozen = false;
  }

  let triggeredItem: Item | undefined;
  const itemIndex = state.items.findIndex(i => i.x === x && i.y === y);
  if (itemIndex !== -1) {
    const item = state.items[itemIndex];
    if (item.ownerId !== playerId) {
      if (item.type === 'trap') {
        player.isFrozen = true;
        player.frozenUntil = now + 5000;
        triggeredItem = item;
      }
      state.items.splice(itemIndex, 1);
    } else if (item.type === 'speedBoost') {
      player.speedBoostUntil = now + 10000;
      triggeredItem = item;
      state.items.splice(itemIndex, 1);
    }
  }

  state.canvas[y][x] = colorIndex;
  state.pixelOwners[y][x] = colorIndex === -1 ? null : playerId;

  return { success: true, triggeredItem };
}

export function placeItem(
  state: GameState,
  playerId: string,
  x: number,
  y: number,
  itemType: ItemType
): { success: boolean; item?: Item } {
  const player = state.players[playerId];
  if (!player) return { success: false };

  if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return { success: false };

  const itemIndex = player.items.indexOf(itemType);
  if (itemIndex === -1) return { success: false };

  if (state.items.some(i => i.x === x && i.y === y)) return { success: false };

  const item: Item = {
    id: uuidv4(),
    type: itemType,
    x,
    y,
    ownerId: playerId
  };

  if (itemType === 'speedBoost') {
    const now = Date.now();
    player.speedBoostUntil = now + 10000;
    player.items.splice(itemIndex, 1);
    return { success: true, item };
  }

  state.items.push(item);
  player.items.splice(itemIndex, 1);

  return { success: true, item };
}

export function startRound(state: GameState): void {
  if (state.round >= TOTAL_ROUNDS) {
    state.phase = 'results';
    return;
  }
  state.round += 1;
  state.phase = 'playing';
  state.theme = getRandomTheme();
  state.timeLeft = ROUND_TIME;
  state.canvas = createEmptyCanvas();
  state.pixelOwners = createEmptyOwners();
  state.items = [];
  Object.values(state.players).forEach(p => {
    p.isFrozen = false;
    p.frozenUntil = 0;
    p.speedBoostUntil = 0;
    p.votesReceived = {};
    p.hasVoted = false;
    for (let i = 0; i < INITIAL_ITEMS; i++) {
      if (p.items.length < INITIAL_ITEMS) {
        p.items.push(Math.random() > 0.5 ? 'trap' : 'speedBoost');
      }
    }
  });
}

export function calculateCompletion(state: GameState): number {
  let filled = 0;
  const total = CANVAS_SIZE * CANVAS_SIZE;
  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < CANVAS_SIZE; x++) {
      if (state.canvas[y][x] !== -1) filled++;
    }
  }
  return filled / total;
}

export function submitVote(
  state: GameState,
  voterId: string,
  targetId: string,
  score: number
): boolean {
  if (state.phase !== 'voting') return false;
  const voter = state.players[voterId];
  const target = state.players[targetId];
  if (!voter || !target || voter.hasVoted || voterId === targetId) return false;
  if (score < 1 || score > 5) return false;

  target.votesReceived[voterId] = score;
  voter.hasVoted = true;

  return true;
}

export function allVoted(state: GameState): boolean {
  const players = Object.values(state.players);
  if (players.length < 2) return false;
  return players.every(p => p.hasVoted);
}

export function calculateRoundScores(state: GameState): void {
  const completion = calculateCompletion(state);
  Object.values(state.players).forEach(player => {
    const voteValues = Object.values(player.votesReceived);
    const avgVote = voteValues.length > 0
      ? voteValues.reduce((a, b) => a + b, 0) / voteValues.length
      : 0;
    const playerPixels = countPlayerPixels(state, player.id);
    const pixelRatio = playerPixels / (CANVAS_SIZE * CANVAS_SIZE);
    const roundScore = Math.round((avgVote * 20) * (1 + completion) * (1 + pixelRatio));
    player.score += roundScore;
  });
}

function countPlayerPixels(state: GameState, playerId: string): number {
  let count = 0;
  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < CANVAS_SIZE; x++) {
      if (state.pixelOwners[y][x] === playerId) count++;
    }
  }
  return count;
}

export function tickTimer(state: GameState): void {
  if (state.phase === 'playing' && state.timeLeft > 0) {
    state.timeLeft -= 1;
    if (state.timeLeft <= 0) {
      state.phase = 'voting';
    }
  }
}
