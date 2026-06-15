import * as THREE from 'three';
import { useGameStore, type MagicType, type Side, type GestureType, type AIState } from '../store/gameStore';
import {
  createProjectile,
  createExplosionParticles,
  GESTURE_TO_MAGIC,
  getCooldownForType,
  getMagicConfig,
  nextParticleId,
} from './MagicSystem';

export const PLATFORM_RADIUS = 5;
export const PLATFORM_GAP = 2;
export const PLAYER_POSITION = new THREE.Vector3(-PLATFORM_RADIUS - PLATFORM_GAP / 2, 0, 0);
export const AI_POSITION = new THREE.Vector3(PLATFORM_RADIUS + PLATFORM_GAP / 2, 0, 0);
export const COLLISION_THRESHOLD = 1.8;
export const DODGE_TRIGGER_DISTANCE = 2.0;
export const GESTURE_CONFIDENCE_THRESHOLD = 0.7;

export interface PlayerPlatform {
  center: THREE.Vector3;
  radius: number;
}

export interface AIPlatform {
  center: THREE.Vector3;
  radius: number;
}

export const playerPlatform: PlayerPlatform = {
  center: PLAYER_POSITION.clone(),
  radius: PLATFORM_RADIUS,
};

export const aiPlatform: AIPlatform = {
  center: AI_POSITION.clone(),
  radius: PLATFORM_RADIUS,
};

export class GameManager {
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private running: boolean = false;

  private gestureHoldTimes: Record<GestureType, number> = {
    fist: 0,
    open: 0,
    circle: 0,
    swipe: 0,
    none: 0,
  };

  private requiredGestureHold: Record<'fist' | 'open' | 'circle', number> = {
    fist: 0.5,
    open: 0.3,
    circle: 1.0,
  };

  private swipeHoldTime = 0;
  private swipeHoldRequired = 0.2;

  private aiStates: AIState[] = ['defense', 'counter', 'dodge'];

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = () => {
    if (!this.running) return;

    const now = performance.now();
    const delta = Math.min((now - this.lastTimestamp) / 1000, 0.05);
    this.lastTimestamp = now;

    this.tick(delta, now);

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private tick(delta: number, now: number) {
    const state = useGameStore.getState();

    if (state.phase !== 'playing') {
      useGameStore.getState().removeExpiredExplosions(now);
      useGameStore.getState().removeExpiredScreenShocks(now);
      useGameStore.getState().removeExpiredAfterimages(now);
      useGameStore.getState().updateParticles(delta);
      return;
    }

    useGameStore.getState().reduceCooldown(delta);

    this.processGesture(delta);

    this.checkDodge(delta);

    this.updateProjectiles(delta);

    this.detectCollisions(now);

    this.updateAI(delta, now);

    useGameStore.getState().updateParticles(delta);
    useGameStore.getState().removeExpiredExplosions(now);
    useGameStore.getState().removeExpiredScreenShocks(now);
    useGameStore.getState().removeExpiredAfterimages(now);

    useGameStore.getState().updateAIDodgeOffset(delta);
    useGameStore.getState().updatePlayerDodgeOffset(delta);

    this.updateDodgeFlash(now);
  }

  private processGesture(delta: number) {
    const state = useGameStore.getState();
    const { currentGesture, gestureConfidence, magicCooldown } = state;

    if (gestureConfidence < GESTURE_CONFIDENCE_THRESHOLD) {
      this.resetGestureTimes();
      return;
    }

    if (magicCooldown > 0) {
      this.resetGestureTimes();
      return;
    }

    if (currentGesture === 'fist' || currentGesture === 'open' || currentGesture === 'circle') {
      this.gestureHoldTimes[currentGesture] += delta;
      const required = this.requiredGestureHold[currentGesture];

      if (this.gestureHoldTimes[currentGesture] >= required) {
        this.castPlayerSpell(GESTURE_TO_MAGIC[currentGesture]);
        this.gestureHoldTimes[currentGesture] = 0;
      }
    } else {
      this.resetGestureTimes();
    }
  }

  private resetGestureTimes() {
    this.gestureHoldTimes.fist = 0;
    this.gestureHoldTimes.open = 0;
    this.gestureHoldTimes.circle = 0;
  }

  private checkDodge(delta: number) {
    const state = useGameStore.getState();
    const { currentGesture, gestureConfidence, projectiles, playerDodging, playerDodgeOffset } = state;

    if (playerDodging) {
      return;
    }

    const incomingAIProjectiles = projectiles.filter((p) => p.owner === 'ai');
    let imminentDanger = false;

    const playerCenter = PLAYER_POSITION.clone();
    playerCenter.x += playerDodgeOffset;

    for (const p of incomingAIProjectiles) {
      const dist = p.position.distanceTo(playerCenter);
      if (dist < DODGE_TRIGGER_DISTANCE) {
        imminentDanger = true;
        break;
      }
    }

    if (!imminentDanger) {
      this.swipeHoldTime = 0;
      return;
    }

    if (currentGesture === 'swipe' && gestureConfidence >= GESTURE_CONFIDENCE_THRESHOLD) {
      this.swipeHoldTime += delta;
      if (this.swipeHoldTime >= this.swipeHoldRequired) {
        this.triggerPlayerDodge();
        this.swipeHoldTime = 0;
      }
    } else {
      this.swipeHoldTime = 0;
    }
  }

  private triggerPlayerDodge() {
    const now = Date.now();
    const state = useGameStore.getState();
    const dodgeOffset = state.playerDodgeOffset;
    const afterimagePos = PLAYER_POSITION.clone();
    afterimagePos.x += dodgeOffset;

    useGameStore.getState().setPlayerDodging(true);
    useGameStore.getState().addAfterimage(nextParticleId(), afterimagePos, now + 300);
    useGameStore.getState().setDodgeFlash(true, now + 200);

    setTimeout(() => {
      useGameStore.getState().setPlayerDodging(false);
    }, 500);
  }

  private updateDodgeFlash(now: number) {
    const state = useGameStore.getState();
    if (state.dodgeFlashActive && now >= state.dodgeFlashEnd) {
      useGameStore.getState().setDodgeFlash(false, 0);
    }
  }

  castPlayerSpell(type: MagicType) {
    const state = useGameStore.getState();
    if (state.magicCooldown > 0) return;

    const cooldown = getCooldownForType(type);
    const startPos = PLAYER_POSITION.clone();
    startPos.x += state.playerDodgeOffset;
    startPos.y += 1;
    startPos.x += 1;

    const direction = new THREE.Vector3(1, 0, 0);
    const projectile = createProjectile(type, startPos, direction, 'player');

    useGameStore.getState().addProjectile(projectile);
    useGameStore.getState().setCooldown(cooldown);
    useGameStore.getState().incrementPlayerSpellCount();

    const newCount = state.playerSpellCount + 1;
    if (newCount > 0 && newCount % 3 === 0) {
      this.switchAIState();
    }
  }

  private switchAIState() {
    const state = useGameStore.getState();
    const currentIdx = this.aiStates.indexOf(state.aiState);
    const nextIdx = (currentIdx + 1) % this.aiStates.length;
    const nextState = this.aiStates[nextIdx];

    useGameStore.getState().setAIState(nextState);
    useGameStore.getState().setAIShieldActive(false);

    if (nextState === 'defense') {
      useGameStore.getState().setAIShieldActive(true);
    } else if (nextState === 'dodge') {
      const randomDir = Math.random() > 0.5 ? 1 : -1;
      useGameStore.getState().setAIDodgeTarget(randomDir * 1);
      setTimeout(() => {
        useGameStore.getState().setAIDodgeTarget(0);
      }, 1500);
    }
  }

  private castAISpell(matchPlayerType: MagicType | null = null) {
    const state = useGameStore.getState();

    let spellType: MagicType;
    if (matchPlayerType && state.aiState === 'counter') {
      spellType = matchPlayerType;
    } else {
      const types: MagicType[] = ['fireball', 'iceShard', 'lightning'];
      spellType = types[Math.floor(Math.random() * types.length)];
    }

    const speedMultiplier = state.aiState === 'counter' ? 0.8 : 1.0;

    const startPos = AI_POSITION.clone();
    startPos.x += state.aiDodgeOffset;
    startPos.y += 1;
    startPos.x -= 1;

    const direction = new THREE.Vector3(-1, 0, 0);
    const projectile = createProjectile(spellType, startPos, direction, 'ai', speedMultiplier);

    useGameStore.getState().addProjectile(projectile);
    useGameStore.getState().incrementAIMagicCount();
    useGameStore.getState().setAILastCastTime(performance.now());
    useGameStore.getState().setAINextCastInterval(2 + Math.random() * 2);
  }

  private updateProjectiles(delta: number) {
    const state = useGameStore.getState();
    const updated = state.projectiles.map((p) => ({
      ...p,
      position: p.position.clone().add(p.velocity.clone().multiplyScalar(p.speed * delta)),
    }));
    useGameStore.setState({ projectiles: updated });
  }

  private detectCollisions(now: number) {
    const state = useGameStore.getState();
    const { projectiles, aiShieldActive, playerDodging } = state;

    const toRemove: number[] = [];

    for (const p of projectiles) {
      let hit = false;

      if (p.owner === 'player') {
        const aiCenter = AI_POSITION.clone();
        aiCenter.x += state.aiDodgeOffset;

        if (aiShieldActive) {
          const shieldCenter = aiCenter.clone();
          shieldCenter.y += 1;
          const distToShield = p.position.distanceTo(shieldCenter);
          if (distToShield < 1.5 + 0.5) {
            hit = true;
            useGameStore.getState().setAIShieldActive(false);
            this.spawnHitEffect(p.position, p.color, p.type);
          }
        }

        if (!hit) {
          const distToAI = p.position.distanceTo(aiCenter);
          if (distToAI < COLLISION_THRESHOLD) {
            hit = true;
            useGameStore.getState().damageAI(p.damage);
            useGameStore.getState().incrementPlayerScore();
            this.spawnHitEffect(p.position, p.color, p.type);
            this.triggerScreenShock(p.position, 'player');
            this.castAISpell(p.type);
          }
        }

        if (!hit && p.position.x > AI_POSITION.x + PLATFORM_RADIUS) {
          hit = true;
        }
      } else {
        const playerCenter = PLAYER_POSITION.clone();
        playerCenter.x += state.playerDodgeOffset;

        if (playerDodging) {
          const distToPlayer = p.position.distanceTo(playerCenter);
          if (distToPlayer < COLLISION_THRESHOLD * 1.5) {
            hit = true;
            this.spawnHitEffect(p.position.clone().add(new THREE.Vector3(1, 0, 0)), p.color, p.type);
          }
        }

        if (!hit) {
          const distToPlayer = p.position.distanceTo(playerCenter);
          if (distToPlayer < COLLISION_THRESHOLD) {
            hit = true;
            useGameStore.getState().damagePlayer(p.damage);
            useGameStore.getState().incrementAIScore();
            this.spawnHitEffect(p.position, p.color, p.type);
            this.triggerScreenShock(p.position, 'ai');
          }
        }

        if (!hit && p.position.x < PLAYER_POSITION.x - PLATFORM_RADIUS) {
          hit = true;
        }
      }

      if (hit) {
        toRemove.push(p.id);
      }
    }

    for (const id of toRemove) {
      useGameStore.getState().removeProjectile(id);
    }
  }

  private spawnHitEffect(position: THREE.Vector3, color: string, type: MagicType) {
    useGameStore.getState().addExplosion(position, color);
    const particles = createExplosionParticles(position, type);
    useGameStore.getState().addParticles(particles);
  }

  private triggerScreenShock(worldPos: THREE.Vector3, hitSide: Side) {
    let screenX = 0.5;
    let screenY = 0.5;

    if (hitSide === 'player') {
      screenX = 0.2;
    } else {
      screenX = 0.8;
    }

    const normZ = Math.max(-1, Math.min(1, worldPos.z / 5));
    screenY = 0.5 + normZ * 0.2;

    useGameStore.getState().addScreenShock(screenX, screenY);
  }

  private updateAI(delta: number, now: number) {
    const state = useGameStore.getState();
    const { aiLastCastTime, aiNextCastInterval, phase, aiState } = state;

    if (phase !== 'playing') return;

    const timeSinceCast = (now - aiLastCastTime) / 1000;

    if (timeSinceCast >= aiNextCastInterval) {
      if (aiState === 'counter' || aiState === 'defense') {
        this.castAISpell();
      } else {
        this.castAISpell();
      }
    }
  }
}

export const gameManager = new GameManager();
