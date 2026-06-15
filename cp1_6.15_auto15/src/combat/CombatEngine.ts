import skillMappingData from '@/data/skillMapping.json';
import type { AudioFeatures } from '@/audio/AudioEngine';

export interface SkillConfig {
  id: string;
  name: string;
  frequencyRange: [number, number];
  volumeThreshold: number;
  bpmRange: [number, number];
  rhythmPattern: string;
  cooldown: number;
  damage: number;
  particleColor: string;
  particleCount: number;
  particleLifeMin: number;
  particleLifeMax: number;
  shakeAmplitude: number;
  shakeDuration: number;
  description: string;
}

export interface SkillEffect {
  skillId: string;
  skillName: string;
  damage: number;
  particleColor: string;
  particleCount: number;
  particleLifeMin: number;
  particleLifeMax: number;
  shakeAmplitude: number;
  shakeDuration: number;
  isAoe: boolean;
  position: { x: number; y: number };
  timestamp: number;
}

export interface Enemy {
  id: string;
  type: 'flying' | 'ground' | 'boss';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  width: number;
  height: number;
  knockback: number;
  color: string;
}

export interface CombatRecord {
  id: string;
  timestamp: number;
  pitch: number;
  volume: number;
  bpm: number;
  skillName: string;
  skillId: string;
  hit: boolean;
  enemyType: string;
}

type CombatCallback = (effect: SkillEffect, enemies: Enemy[]) => void;

export class CombatEngine {
  private skills: SkillConfig[] = [];
  private cooldowns: Map<string, number> = new Map();
  private enemies: Enemy[] = [];
  private enemyIdCounter: number = 0;
  private lastEnemySpawn: number = 0;
  private spawnInterval: number = 2000;
  private callback: CombatCallback | null = null;
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;
  private playerX: number = 120;
  private playerY: number = 0;
  private groundY: number = 0;
  private recentOnsets: number = 0;
  private highBpmStartTime: number = 0;
  private combatRecords: CombatRecord[] = [];
  private recordsCallback: ((records: CombatRecord[]) => void) | null = null;
  private skillHitCounts: Map<string, { hits: number; total: number }> = new Map();
  private shieldActive: boolean = false;
  private shieldEndTime: number = 0;

  constructor() {
    this.skills = skillMappingData.skills as SkillConfig[];
    this.skills.forEach((s) => {
      this.skillHitCounts.set(s.id, { hits: 0, total: 0 });
    });
  }

  setCallback(cb: CombatCallback): void {
    this.callback = cb;
  }

  setRecordsCallback(cb: (records: CombatRecord[]) => void): void {
    this.recordsCallback = cb;
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.groundY = height - 80;
    this.playerY = this.groundY - 80;
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  getRecords(): CombatRecord[] {
    return this.combatRecords;
  }

  getSkillHitRates(): Map<string, { hits: number; total: number }> {
    return this.skillHitCounts;
  }

  isShieldActive(): boolean {
    return this.shieldActive && performance.now() < this.shieldEndTime;
  }

  processAudioFeatures(features: AudioFeatures): void {
    this.updateEnemies(features.timestamp);
    this.spawnEnemies(features.timestamp);
    if (features.onset) {
      this.recentOnsets++;
      setTimeout(() => { this.recentOnsets = Math.max(0, this.recentOnsets - 1); }, 500);
    }
    if (features.bpm > 120 && features.volume > 0.5) {
      if (this.highBpmStartTime === 0) {
        this.highBpmStartTime = features.timestamp;
      }
    } else {
      this.highBpmStartTime = 0;
    }
    const matchedSkill = this.matchSkill(features);
    if (matchedSkill) {
      this.triggerSkill(matchedSkill, features);
    }
  }

  private matchSkill(features: AudioFeatures): SkillConfig | null {
    const now = features.timestamp;
    for (const skill of this.skills) {
      const lastUsed = this.cooldowns.get(skill.id) || 0;
      if (now - lastUsed < skill.cooldown) continue;
      const inFreq = features.pitch >= skill.frequencyRange[0] && features.pitch <= skill.frequencyRange[1];
      const inVol = features.volume >= skill.volumeThreshold;
      const inBpm = features.bpm === 0 || (features.bpm >= skill.bpmRange[0] && features.bpm <= skill.bpmRange[1]);
      let patternMatch = false;
      switch (skill.rhythmPattern) {
        case 'single':
          patternMatch = features.onset && inFreq && inVol;
          break;
        case 'steady':
          patternMatch = inFreq && inVol && features.volume > 0.3;
          break;
        case 'rapid':
          patternMatch = features.onset && this.recentOnsets >= 2 && inFreq && inVol;
          break;
        case 'sustained':
          if (this.highBpmStartTime > 0 && now - this.highBpmStartTime >= 2000) {
            patternMatch = inFreq && inVol;
          }
          break;
        case 'delayed':
          patternMatch = features.onset && inFreq && inVol && inBpm;
          break;
      }
      if (patternMatch && inBpm) {
        return skill;
      }
    }
    return null;
  }

  private triggerSkill(skill: SkillConfig, features: AudioFeatures): void {
    const now = features.timestamp;
    this.cooldowns.set(skill.id, now);
    if (skill.id === 'shieldResonance') {
      this.shieldActive = true;
      this.shieldEndTime = now + 3000;
    }
    const isAoe = skill.id === 'shockwave' || skill.id === 'echoTrap';
    const effectPosition = isAoe
      ? { x: this.canvasWidth / 2, y: this.groundY }
      : { x: this.playerX + 60, y: this.playerY + 40 };
    const effect: SkillEffect = {
      skillId: skill.id,
      skillName: skill.name,
      damage: skill.damage,
      particleColor: skill.particleColor,
      particleCount: skill.particleCount,
      particleLifeMin: skill.particleLifeMin,
      particleLifeMax: skill.particleLifeMax,
      shakeAmplitude: skill.shakeAmplitude,
      shakeDuration: skill.shakeDuration,
      isAoe,
      position: effectPosition,
      timestamp: now,
    };
    const hitEnemies: Enemy[] = [];
    if (skill.damage > 0) {
      if (isAoe) {
        this.enemies.forEach((e) => {
          const dist = Math.abs(e.x - effectPosition.x);
          if (dist < 250) {
            e.hp -= skill.damage;
            e.knockback = skill.id === 'shockwave' ? -30 : -15;
            hitEnemies.push({ ...e });
            if (e.hp <= 0) {
              this.removeEnemy(e.id);
            }
          }
        });
      } else {
        const target = this.findNearestEnemy(effectPosition);
        if (target) {
          target.hp -= skill.damage;
          target.knockback = -20;
          hitEnemies.push({ ...target });
          if (target.hp <= 0) {
            this.removeEnemy(target.id);
          }
        }
      }
    }
    const stats = this.skillHitCounts.get(skill.id);
    if (stats) {
      stats.total++;
      if (hitEnemies.length > 0) stats.hits++;
    }
    const record: CombatRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: now,
      pitch: Math.round(features.pitch),
      volume: parseFloat(features.volume.toFixed(3)),
      bpm: Math.round(features.bpm),
      skillName: skill.name,
      skillId: skill.id,
      hit: hitEnemies.length > 0,
      enemyType: hitEnemies.length > 0 ? hitEnemies[0].type : 'none',
    };
    this.combatRecords.unshift(record);
    if (this.combatRecords.length > 100) this.combatRecords.pop();
    if (this.recordsCallback) this.recordsCallback([...this.combatRecords]);
    if (this.callback) this.callback(effect, [...this.enemies]);
  }

  private findNearestEnemy(from: { x: number; y: number }): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;
    for (const e of this.enemies) {
      const dist = Math.sqrt((e.x - from.x) ** 2 + (e.y - from.y) ** 2);
      if (dist < minDist && e.x > from.x - 50) {
        minDist = dist;
        nearest = e;
      }
    }
    return nearest;
  }

  private removeEnemy(id: string): void {
    this.enemies = this.enemies.filter((e) => e.id !== id);
  }

  private spawnEnemies(timestamp: number): void {
    if (timestamp - this.lastEnemySpawn < this.spawnInterval) return;
    this.lastEnemySpawn = timestamp;
    const rand = Math.random();
    let type: 'flying' | 'ground' | 'boss';
    let hp: number, speed: number, w: number, h: number, color: string;
    if (rand < 0.15) {
      type = 'boss'; hp = 200; speed = 0.5 + Math.random() * 0.3;
      w = 60; h = 60; color = '#da3633';
    } else if (rand < 0.5) {
      type = 'flying'; hp = 40; speed = 1.5 + Math.random() * 0.5;
      w = 30; h = 30; color = '#f0883e';
    } else {
      type = 'ground'; hp = 60; speed = 0.8 + Math.random() * 0.4;
      w = 40; h = 40; color = '#8b949e';
    }
    const y = type === 'flying'
      ? this.groundY - 120 - Math.random() * 80
      : type === 'boss'
        ? this.groundY - 60
        : this.groundY - 40;
    this.enemies.push({
      id: `enemy-${this.enemyIdCounter++}`,
      type, x: this.canvasWidth + 20, y, hp, maxHp: hp,
      speed, width: w, height: h, knockback: 0, color,
    });
    if (this.enemies.length > 15) {
      this.enemies.shift();
    }
  }

  private updateEnemies(timestamp: number): void {
    for (const e of this.enemies) {
      e.x -= e.speed;
      if (e.knockback !== 0) {
        e.x += e.knockback;
        e.knockback *= 0.85;
        if (Math.abs(e.knockback) < 0.5) e.knockback = 0;
      }
      if (e.type === 'flying') {
        e.y += Math.sin(timestamp / 400 + parseInt(e.id.split('-')[1] || '0')) * 0.5;
      }
    }
    this.enemies = this.enemies.filter((e) => e.x > -80);
  }
}
