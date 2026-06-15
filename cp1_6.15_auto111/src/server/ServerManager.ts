import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { CollisionDetector } from './CollisionDetector';
import {
  Player,
  Bullet,
  GameState,
  HitEffect,
  ClientToServerEvents,
  ServerToClientEvents,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  INITIAL_LIVES,
  INVINCIBLE_DURATION,
  HIT_EFFECT_DURATION,
  SYNC_INTERVAL,
  HIGH_LATENCY_THRESHOLD,
  LOW_LATENCY_THRESHOLD,
} from '../shared/types';

const PORT = 3001;

const httpServer = createServer();
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
  },
  maxHttpBufferSize: 1e6,
});

const players: Record<string, Player> = {};
let bullets: Bullet[] = [];
let hitEffects: HitEffect[] = [];
const playerSockets = new Map<string, Socket>();
const playerLatencies = new Map<string, number>();

function createPlayer(playerId: string, isPlayer1: boolean): Player {
  return {
    id: playerId,
    x: isPlayer1 ? 150 : CANVAS_WIDTH - 150,
    y: CANVAS_HEIGHT / 2,
    angle: isPlayer1 ? 0 : Math.PI,
    lives: INITIAL_LIVES,
    pattern: 'fan',
    isInvincible: false,
    invincibleEndTime: 0,
    lastFireTime: 0,
    spiralAngle: 0,
    score: 0,
  };
}

function getRandomSpawnPosition(): { x: number; y: number } {
  const margin = 100;
  return {
    x: margin + Math.random() * (CANVAS_WIDTH - margin * 2),
    y: margin + Math.random() * (CANVAS_HEIGHT - margin * 2),
  };
}

function resetGame(): void {
  const playerIds = Object.keys(players);
  playerIds.forEach((id, index) => {
    const pos = getRandomSpawnPosition();
    players[id] = {
      ...players[id],
      x: pos.x,
      y: pos.y,
      angle: index === 0 ? 0 : Math.PI,
      lives: INITIAL_LIVES,
      pattern: 'fan',
      isInvincible: true,
      invincibleEndTime: Date.now() + INVINCIBLE_DURATION,
      lastFireTime: 0,
      spiralAngle: 0,
      score: 0,
    };
  });
  bullets = [];
  hitEffects = [];
}

let lastUpdateTime = Date.now();

function gameLoop(): void {
  const now = Date.now();
  const deltaTime = now - lastUpdateTime;
  lastUpdateTime = now;

  for (const playerId of Object.keys(players)) {
    const player = players[playerId];
    if (player.isInvincible && now > player.invincibleEndTime) {
      player.isInvincible = false;
    }
  }

  bullets = CollisionDetector.updateHomingBullets(bullets, players);
  bullets = CollisionDetector.updateBulletPositions(bullets, deltaTime);

  const collisions = CollisionDetector.checkBulletPlayerCollision(bullets, players);

  for (const collision of collisions) {
    const hitPlayer = players[collision.hitPlayerId];
    const shooter = players[collision.shooterId];

    if (hitPlayer && shooter) {
      hitPlayer.lives--;
      shooter.score++;

      hitEffects.push({
        id: uuidv4(),
        playerId: collision.hitPlayerId,
        x: hitPlayer.x,
        y: hitPlayer.y,
        startTime: now,
      });

      io.emit('collision', collision);

      if (hitPlayer.lives <= 0) {
        const pos = getRandomSpawnPosition();
        hitPlayer.x = pos.x;
        hitPlayer.y = pos.y;
        hitPlayer.lives = INITIAL_LIVES;
        hitPlayer.isInvincible = true;
        hitPlayer.invincibleEndTime = now + INVINCIBLE_DURATION;
      } else {
        hitPlayer.isInvincible = true;
        hitPlayer.invincibleEndTime = now + INVINCIBLE_DURATION;
      }
    }

    bullets = bullets.filter((b) => b.id !== collision.bulletId);
  }

  hitEffects = hitEffects.filter((effect) => now - effect.startTime < HIT_EFFECT_DURATION);

  playerSockets.forEach((socket, playerId) => {
    const latency = playerLatencies.get(playerId) || 0;
    if (latency > HIGH_LATENCY_THRESHOLD) {
      socket.emit('latencyWarning', 'high');
    } else if (latency < LOW_LATENCY_THRESHOLD) {
      socket.emit('latencyWarning', 'low');
    } else {
      socket.emit('latencyWarning', 'normal');
    }
  });
}

setInterval(() => {
  const gameState: GameState = {
    players,
    bullets,
    hitEffects,
  };
  io.emit('gameState', gameState);
}, SYNC_INTERVAL);

setInterval(gameLoop, 16);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  const playerCount = Object.keys(players).length;
  const isPlayer1 = playerCount === 0;
  const playerId = socket.id;

  if (playerCount >= 2) {
    console.log('Server full, rejecting connection:', socket.id);
    socket.disconnect(true);
    return;
  }

  const newPlayer = createPlayer(playerId, isPlayer1);
  players[playerId] = newPlayer;
  playerSockets.set(playerId, socket);

  socket.emit('playerJoined', newPlayer);
  io.emit('playerJoined', newPlayer);

  socket.on('ping', (timestamp) => {
    const latency = Date.now() - timestamp;
    playerLatencies.set(playerId, latency);
    socket.emit('pong', timestamp);
  });

  socket.on('playerInput', (data) => {
    if (players[data.playerId]) {
      players[data.playerId].x = Math.max(30, Math.min(CANVAS_WIDTH - 30, data.x));
      players[data.playerId].y = Math.max(30, Math.min(CANVAS_HEIGHT - 30, data.y));
      players[data.playerId].angle = data.angle;
      players[data.playerId].pattern = data.pattern;
    }
  });

  socket.on('fireBullet', (data) => {
    if (players[data.playerId]) {
      for (const bullet of data.bullets) {
        if (!bullets.find((b) => b.id === bullet.id)) {
          bullets.push(bullet);
        }
      }
    }
  });

  socket.on('switchPattern', (data) => {
    if (players[data.playerId]) {
      players[data.playerId].pattern = data.pattern;
    }
  });

  socket.on('resetGame', () => {
    resetGame();
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    delete players[playerId];
    playerSockets.delete(playerId);
    playerLatencies.delete(playerId);
    io.emit('playerLeft', playerId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
});
