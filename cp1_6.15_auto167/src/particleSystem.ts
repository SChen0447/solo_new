import * as THREE from 'three';

export interface ParticleData {
  id: string;
  label: string;
  startPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  controlPoint: THREE.Vector3;
  currentPosition: THREE.Vector3;
  color: THREE.Color;
  baseColor: THREE.Color;
  progress: number;
  flightDuration: number;
  startTime: number;
  hasArrived: boolean;
  hovered: boolean;
  hoverProgress: number;
  radius: number;
  targetRadius: number;
  segments: number;
  initialPosition: THREE.Vector3;
  resetProgress: number;
  isResetting: boolean;
  resetStartTime: number;
  resetDuration: number;
}

export interface Connection {
  particleA: string;
  particleB: string;
  similarity: number;
  line: THREE.Line | null;
}

export interface TrailParticle {
  position: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

export class ParticleSystem {
  private particles: Map<string, ParticleData> = new Map();
  private connections: Map<string, Connection> = new Map();
  private trailParticles: TrailParticle[] = [];
  private maxTrailPerFrame = 5;
  private trailLife = 0.5;
  private similarityThreshold = 0.7;
  private paused = false;
  private flickerPhase = 0;
  private idCounter = 0;

  constructor() {}

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private generateTargetPosition(label: string): THREE.Vector3 {
    const hash = this.hashString(label);
    const hash2 = this.hashString(label + '_reverse');
    const x = ((hash % 10000) / 10000) * 20 - 10;
    const y = ((hash2 % 10000) / 10000) * 10 - 5;
    const z = (((hash ^ hash2) % 10000) / 10000) * 16 - 8;
    return new THREE.Vector3(x, y, z);
  }

  private generateControlPoint(start: THREE.Vector3, target: THREE.Vector3): THREE.Vector3 {
    const mid = new THREE.Vector3().addVectors(start, target).multiplyScalar(0.5);
    const hash = this.hashString(start.x + '_' + target.y + '_ctrl');
    const offset = new THREE.Vector3(
      ((hash % 1000) / 1000) * 6 - 3,
      (((hash >> 3) % 1000) / 1000) * 4 - 2,
      (((hash >> 6) % 1000) / 1000) * 6 - 3
    );
    return mid.add(offset);
  }

  private colorFromLabel(label: string): THREE.Color {
    const firstChar = label.charAt(0).toUpperCase();
    const charCode = firstChar.charCodeAt(0);
    const hue = (charCode % 360) / 360;
    const color = new THREE.Color();
    color.setHSL(hue, 0.9, 0.8);
    return color;
  }

  private quadraticBezier(
    t: number,
    p0: THREE.Vector3,
    p1: THREE.Vector3,
    p2: THREE.Vector3
  ): THREE.Vector3 {
    const u = 1 - t;
    return new THREE.Vector3(
      u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
      u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z
    );
  }

  private cosineSimilarity(str1: string, str2: string): number {
    const getCharFreq = (s: string): Map<string, number> => {
      const freq = new Map<string, number>();
      for (const char of s.toLowerCase()) {
        freq.set(char, (freq.get(char) || 0) + 1);
      }
      return freq;
    };

    const freq1 = getCharFreq(str1);
    const freq2 = getCharFreq(str2);
    const allChars = new Set([...freq1.keys(), ...freq2.keys()]);

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const char of allChars) {
      const f1 = freq1.get(char) || 0;
      const f2 = freq2.get(char) || 0;
      dotProduct += f1 * f2;
      norm1 += f1 * f1;
      norm2 += f2 * f2;
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (norm1 * norm2);
  }

  private getConnectionKey(idA: string, idB: string): string {
    return [idA, idB].sort().join('|');
  }

  addParticle(label: string): ParticleData {
    const trimmedLabel = label.substring(0, 12);
    const id = `particle_${this.idCounter++}_${Date.now()}`;
    const startPosition = new THREE.Vector3(0, 0, 0);
    const targetPosition = this.generateTargetPosition(trimmedLabel);
    const controlPoint = this.generateControlPoint(startPosition, targetPosition);
    const baseColor = this.colorFromLabel(trimmedLabel);

    const particle: ParticleData = {
      id,
      label: trimmedLabel,
      startPosition: startPosition.clone(),
      targetPosition,
      controlPoint,
      currentPosition: startPosition.clone(),
      color: baseColor.clone(),
      baseColor: baseColor.clone(),
      progress: 0,
      flightDuration: 2000,
      startTime: performance.now(),
      hasArrived: false,
      hovered: false,
      hoverProgress: 0,
      radius: 0.3,
      targetRadius: 0.3,
      segments: 32,
      initialPosition: startPosition.clone(),
      resetProgress: 0,
      isResetting: false,
      resetStartTime: 0,
      resetDuration: 500
    };

    this.particles.set(id, particle);
    this.connectSimilarForParticle(id);

    return particle;
  }

  removeParticle(id: string): boolean {
    const particle = this.particles.get(id);
    if (!particle) return false;

    const keysToDelete: string[] = [];
    this.connections.forEach((conn, key) => {
      if (conn.particleA === id || conn.particleB === id) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.connections.delete(key));

    this.particles.delete(id);
    return true;
  }

  private connectSimilarForParticle(newId: string): void {
    const newParticle = this.particles.get(newId);
    if (!newParticle) return;

    this.particles.forEach((particle, id) => {
      if (id === newId) return;
      const key = this.getConnectionKey(newId, id);
      if (this.connections.has(key)) return;

      const similarity = this.cosineSimilarity(newParticle.label, particle.label);
      if (similarity >= this.similarityThreshold) {
        this.connections.set(key, {
          particleA: newId,
          particleB: id,
          similarity,
          line: null
        });
      }
    });
  }

  connectSimilar(): void {
    this.connections.clear();
    const ids = Array.from(this.particles.keys());

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const pA = this.particles.get(ids[i])!;
        const pB = this.particles.get(ids[j])!;
        const similarity = this.cosineSimilarity(pA.label, pB.label);

        if (similarity >= this.similarityThreshold) {
          const key = this.getConnectionKey(ids[i], ids[j]);
          this.connections.set(key, {
            particleA: ids[i],
            particleB: ids[j],
            similarity,
            line: null
          });
        }
      }
    }
  }

  setHovered(id: string | null): void {
    this.particles.forEach(p => {
      p.hovered = p.id === id;
    });
  }

  resetAll(): void {
    this.particles.forEach(particle => {
      particle.startPosition = particle.currentPosition.clone();
      particle.initialPosition = new THREE.Vector3(0, 0, 0);
      particle.controlPoint = this.generateControlPoint(particle.startPosition, particle.initialPosition);
      particle.isResetting = true;
      particle.resetStartTime = performance.now();
      particle.resetProgress = 0;
      particle.hasArrived = false;
    });
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.flickerPhase = 0;
    }
  }

  isPaused(): boolean {
    return this.paused;
  }

  getConnectedParticles(id: string): string[] {
    const connected: string[] = [];
    this.connections.forEach(conn => {
      if (conn.particleA === id) {
        connected.push(conn.particleB);
      } else if (conn.particleB === id) {
        connected.push(conn.particleA);
      }
    });
    return connected;
  }

  update(deltaTime: number, cameraDistance?: (pos: THREE.Vector3) => number): void {
    const now = performance.now();
    const dt = deltaTime;

    if (this.paused) {
      this.flickerPhase += dt * 4;
      return;
    }

    this.particles.forEach(particle => {
      if (particle.isResetting) {
        const elapsed = now - particle.resetStartTime;
        particle.resetProgress = Math.min(elapsed / particle.resetDuration, 1);
        const t = particle.resetProgress;
        particle.currentPosition.copy(
          this.quadraticBezier(t, particle.startPosition, particle.controlPoint, particle.initialPosition)
        );

        if (particle.resetProgress >= 1) {
          particle.isResetting = false;
          particle.currentPosition.copy(particle.initialPosition);
          particle.startPosition = particle.initialPosition.clone();
          particle.controlPoint = this.generateControlPoint(particle.startPosition, particle.targetPosition);
          particle.startTime = now;
          particle.progress = 0;
        }
      } else if (!particle.hasArrived) {
        const elapsed = now - particle.startTime;
        particle.progress = Math.min(elapsed / particle.flightDuration, 1);
        const t = particle.progress;
        particle.currentPosition.copy(
          this.quadraticBezier(t, particle.startPosition, particle.controlPoint, particle.targetPosition)
        );

        for (let i = 0; i < this.maxTrailPerFrame; i++) {
          this.trailParticles.push({
            position: particle.currentPosition.clone().add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
              )
            ),
            color: particle.color.clone(),
            life: this.trailLife,
            maxLife: this.trailLife,
            size: 0.05 + Math.random() * 0.05
          });
        }

        if (particle.progress >= 1) {
          particle.hasArrived = true;
          particle.currentPosition.copy(particle.targetPosition);
        }
      }

      const hoverSpeed = 0.3 / 0.3;
      if (particle.hovered) {
        particle.hoverProgress = Math.min(particle.hoverProgress + dt * hoverSpeed, 1);
      } else {
        particle.hoverProgress = Math.max(particle.hoverProgress - dt * hoverSpeed, 0);
      }
      particle.targetRadius = 0.3 + particle.hoverProgress * 0.3;
      const radiusSpeed = 10;
      particle.radius += (particle.targetRadius - particle.radius) * Math.min(dt * radiusSpeed, 1);

      const warmColor = new THREE.Color(0xff4444);
      particle.color.copy(particle.baseColor).lerp(warmColor, particle.hoverProgress * 0.7);

      if (cameraDistance) {
        const dist = cameraDistance(particle.currentPosition);
        if (dist > 20) {
          particle.segments = 16;
        } else {
          particle.segments = 32;
        }
      }
    });

    this.trailParticles = this.trailParticles.filter(trail => {
      trail.life -= dt;
      return trail.life > 0;
    });
  }

  getParticles(): ParticleData[] {
    return Array.from(this.particles.values());
  }

  getConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  getTrailParticles(): TrailParticle[] {
    return this.trailParticles;
  }

  getParticle(id: string): ParticleData | undefined {
    return this.particles.get(id);
  }

  getParticleCount(): number {
    return this.particles.size;
  }

  clear(): void {
    this.particles.clear();
    this.connections.clear();
    this.trailParticles = [];
  }

  getFlickerPhase(): number {
    return this.flickerPhase;
  }

  addRandomParticles(count: number): ParticleData[] {
    const adjectives = ['Cyber', 'Neon', 'Void', 'Quantum', 'Dark', 'Mega', 'Ultra', 'Hyper', 'Proto', 'Nova'];
    const nouns = ['Data', 'Stream', 'Node', 'Pulse', 'Wave', 'Byte', 'Signal', 'Flow', 'Core', 'Link'];
    const added: ParticleData[] = [];

    for (let i = 0; i < count; i++) {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const num = Math.floor(Math.random() * 9999);
      const label = `${adj}${noun}${num}`.substring(0, 12);
      added.push(this.addParticle(label));
    }

    return added;
  }
}
