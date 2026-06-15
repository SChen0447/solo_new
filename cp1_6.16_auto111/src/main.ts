import { InputManager, type InputState } from './input';
import { PhantomRecorder, type Phantom } from './phantom_recorder';
import { Level, type PlayerState } from './level';
import { Renderer, type Particle, type RenderData } from './renderer';

const inputManager = new InputManager();
const phantomRecorder = new PhantomRecorder();
const level = new Level();
const renderer = new Renderer('gameCanvas');

let lastTime = 0;
let gameTime = 0;

let player: PlayerState = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  width: 20,
  height: 20,
  onGround: false,
  facingRight: true,
  alive: true
};

const trail: Array<{ x: number; y: number; life: number }> = [];
const rippleParticles: Particle[] = [];
let flashOpacity = 0;
let anchorSet = false;
let anchorBlink = false;
let spaceWasHeld = false;
let gameWon = false;

function resetPlayer(): void {
  const start = level.getLevelData().playerStart;
  player.x = start.x;
  player.y = start.y;
  player.vx = 0;
  player.vy = 0;
  player.alive = true;
  player.onGround = false;
}

function respawnAtAnchor(): void {
  const anchor = level.getLastAnchor();
  if (anchor) {
    player.x = anchor.x;
    player.y = anchor.y;
    player.vx = 0;
    player.vy = 0;
    player.alive = true;
    flashOpacity = 1;
  } else {
    resetPlayer();
    flashOpacity = 1;
  }
}

function createRippleEffect(x: number, y: number): void {
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 / 12) * i;
    const speed = 60 + Math.random() * 40;
    rippleParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed / 100,
      vy: Math.sin(angle) * speed / 100,
      life: 300,
      maxLife: 300,
      color: '#87CEEB',
      size: 3 + Math.random() * 2
    });
  }
}

function updateRippleParticles(dt: number): void {
  for (let i = rippleParticles.length - 1; i >= 0; i--) {
    const p = rippleParticles[i];
    p.x += p.vx * dt / 16;
    p.y += p.vy * dt / 16;
    p.life -= dt;
    if (p.life <= 0) {
      rippleParticles.splice(i, 1);
    }
  }
}

function updateTrail(): void {
  if (Math.abs(player.vx) > 0.5 || Math.abs(player.vy) > 0.5) {
    trail.push({
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
      life: 1
    });
  }
  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].life -= 1 / 6;
    if (trail[i].life <= 0) {
      trail.splice(i, 1);
    }
  }
}

function getPhantomRenderData(): Array<{ x: number; y: number; width: number; height: number; opacity: number }> {
  const phantoms: Array<{ x: number; y: number; width: number; height: number; opacity: number }> = [];
  const rewindPhantom = phantomRecorder.getRewindPhantom();
  if (rewindPhantom) {
    phantoms.push(rewindPhantom);
  }
  for (const p of phantomRecorder.getPhantoms()) {
    phantoms.push({
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      opacity: p.opacity
    });
  }
  return phantoms;
}

function buildRenderData(): RenderData {
  const levelData = level.getLevelData();
  return {
    player: {
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height,
      facingRight: player.facingRight,
      onGround: player.onGround
    },
    phantoms: getPhantomRenderData(),
    platforms: levelData.platforms,
    walls: levelData.walls,
    pressurePlates: levelData.pressurePlates,
    lightningBridges: levelData.lightningBridges,
    electricParticles: level.getElectricParticles(),
    timeCrystals: levelData.timeCrystals,
    spikes: levelData.spikes,
    goal: levelData.goal,
    trail,
    rippleParticles,
    screenOpacity: phantomRecorder.getScreenOpacity(),
    flashOpacity,
    anchorBlink,
    anchorSet,
    time: gameTime / 1000
  };
}

function gameLoop(currentTime: number): void {
  const dt = lastTime ? Math.min(currentTime - lastTime, 33) : 16;
  lastTime = currentTime;
  gameTime += dt;

  inputManager.update();
  const input = inputManager.getState();

  const spaceIsHeld = inputManager.isHeld('Space');

  if (spaceIsHeld && !spaceWasHeld && !phantomRecorder.isRewindActive() && !gameWon) {
    phantomRecorder.startRewind(currentTime);
    level.setIsRewinding(true);
  }

  if (!spaceIsHeld && spaceWasHeld && phantomRecorder.isRewindActive()) {
    const newPhantom = phantomRecorder.stopRewind(currentTime);
    level.setIsRewinding(false);
    if (newPhantom) {
      anchorBlink = true;
      setTimeout(() => { anchorBlink = false; }, 1500);
    }
  }
  spaceWasHeld = spaceIsHeld;

  phantomRecorder.update(dt, currentTime);

  if (!phantomRecorder.isRewindActive() && player.alive && !gameWon) {
    phantomRecorder.record(
      player.x,
      player.y,
      player.vx,
      player.vy,
      currentTime
    );
  }

  const levelResult = level.update(
    dt,
    currentTime,
    player,
    phantomRecorder.getPhantoms(),
    { jump: input.up, left: input.left, right: input.right }
  );

  if (levelResult.phantomDestroyed !== null) {
    phantomRecorder.destroyPhantom(levelResult.phantomDestroyed);
  }

  if (levelResult.crystalActivated) {
    createRippleEffect(levelResult.crystalActivated.x, levelResult.crystalActivated.y);
    anchorSet = true;
    anchorBlink = true;
    setTimeout(() => { anchorBlink = false; }, 1500);
  }

  if (levelResult.playerDied && player.alive) {
    player.alive = false;
    setTimeout(() => {
      respawnAtAnchor();
    }, 100);
  }

  if (levelResult.goalReached && !gameWon) {
    gameWon = true;
    console.log('Level Complete!');
  }

  updateRippleParticles(dt);
  updateTrail();

  if (flashOpacity > 0) {
    flashOpacity = Math.max(0, flashOpacity - dt / 300);
  }

  renderer.render(buildRenderData());

  requestAnimationFrame(gameLoop);
}

resetPlayer();
requestAnimationFrame(gameLoop);
