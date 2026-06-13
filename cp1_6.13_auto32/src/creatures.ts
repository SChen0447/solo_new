import * as THREE from 'three';
import { Planet, CreatureType, TerrainInfo } from './planet';

export type AnimalState = 'idle' | 'wander' | 'seek_food' | 'mate' | 'dying';

export type PlantType = 'grass' | 'tree';
export type AnimalType = 'rabbit' | 'wolf';

export interface PlantData {
  id: number;
  type: PlantType;
  mesh: THREE.Group;
  position: THREE.Vector3;
  growth: number;
  targetGrowth: number;
  growSpeed: number;
  alive: boolean;
  radius: number;
}

export interface AnimalData {
  id: number;
  type: AnimalType;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  energy: number;
  maxEnergy: number;
  state: AnimalState;
  wanderDir: THREE.Vector3;
  wanderTimer: number;
  wobblePhase: number;
  baseSpeed: number;
  targetPlant: PlantData | null;
  targetMate: AnimalData | null;
  targetPrey: AnimalData | null;
  dyingTimer: number;
  alive: boolean;
  spawnTimer: number;
  mateCooldown: number;
  age: number;
}

export interface ParticleData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  startColor: THREE.Color;
  endColor: THREE.Color;
  startSize: number;
  endSize: number;
}

export interface EnvironmentParams {
  temperature: number;
  humidity: number;
  timeScale: number;
}

export interface CreatureManagerConfig {
  maxTrees?: number;
  maxGrass?: number;
  maxAnimals?: number;
}

let _nextId = 1;
const getNextId = () => _nextId++;

export class ParticleSystem {
  private particles: ParticleData[] = [];
  private scene: THREE.Scene;
  private pool: ParticleData[] = [];
  private poolSize = 200;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  emit(
    position: THREE.Vector3,
    count: number,
    options: {
      startColor?: THREE.Color;
      endColor?: THREE.Color;
      startSize?: number;
      endSize?: number;
      speed?: number;
      life?: number;
    } = {}
  ) {
    const startColor = options.startColor ?? new THREE.Color(0xffddaa);
    const endColor = options.endColor ?? new THREE.Color(0xff4444);
    const startSize = options.startSize ?? 0.08;
    const endSize = options.endSize ?? 0.01;
    const speed = options.speed ?? 1.0;
    const life = options.life ?? 0.8;

    for (let i = 0; i < count; i++) {
      const particle = this.getFromPool();
      particle.mesh.position.copy(position);
      particle.velocity.set(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.8));
      particle.life = life;
      particle.maxLife = life;
      particle.startColor.copy(startColor);
      particle.endColor.copy(endColor);
      particle.startSize = startSize;
      particle.endSize = endSize;
      particle.mesh.visible = true;
      (particle.mesh.material as THREE.MeshBasicMaterial).color.copy(startColor);
      particle.mesh.scale.setScalar(startSize);
      this.particles.push(particle);
    }
  }

  private getFromPool(): ParticleData {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    const geo = new THREE.SphereGeometry(1, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    this.scene.add(mesh);
    return {
      mesh,
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
      startColor: new THREE.Color(),
      endColor: new THREE.Color(),
      startSize: 0.1,
      endSize: 0.01,
    };
  }

  private returnToPool(p: ParticleData) {
    if (this.pool.length < this.poolSize) {
      p.mesh.visible = false;
      this.pool.push(p);
    } else {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
      p.mesh.geometry.dispose();
    }
  }

  update(dt: number) {
    const alive: ParticleData[] = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) {
        this.returnToPool(p);
        continue;
      }
      const t = 1 - p.life / p.maxLife;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.multiplyScalar(0.96);
      p.velocity.y -= dt * 0.5;

      const size = THREE.MathUtils.lerp(p.startSize, p.endSize, t);
      p.mesh.scale.setScalar(size);

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.color.copy(p.startColor).lerp(p.endColor, t);
      mat.opacity = 1 - t;

      alive.push(p);
    }
    this.particles = alive;
  }

  getCount(): number {
    return this.particles.length;
  }
}

export class CreatureManager {
  planet: Planet;
  scene: THREE.Scene;
  plants: PlantData[] = [];
  animals: AnimalData[] = [];
  particles: ParticleSystem;
  env: EnvironmentParams;
  config: Required<CreatureManagerConfig>;

  constructor(planet: Planet, scene: THREE.Scene, config: CreatureManagerConfig = {}) {
    this.planet = planet;
    this.scene = scene;
    this.particles = new ParticleSystem(scene);
    this.env = {
      temperature: 25,
      humidity: 60,
      timeScale: 1,
    };
    this.config = {
      maxTrees: config.maxTrees ?? 500,
      maxGrass: config.maxGrass ?? 1000,
      maxAnimals: config.maxAnimals ?? 300,
    };
  }

  setEnvironment(env: Partial<EnvironmentParams>) {
    Object.assign(this.env, env);
    if (env.temperature !== undefined) {
      this.planet.setTemperature(env.temperature);
    }
  }

  getCounts() {
    return {
      grass: this.plants.filter((p) => p.type === 'grass' && p.alive).length,
      tree: this.plants.filter((p) => p.type === 'tree' && p.alive).length,
      rabbit: this.animals.filter((a) => a.type === 'rabbit' && a.alive).length,
      wolf: this.animals.filter((a) => a.type === 'wolf' && a.alive).length,
    };
  }

  spawnCreature(type: CreatureType) {
    const info = this.planet.getRandomLandPoint();
    if (type === 'grass' || type === 'tree') {
      const treeCount = this.plants.filter((p) => p.type === 'tree' && p.alive).length;
      const grassCount = this.plants.filter((p) => p.type === 'grass' && p.alive).length;
      if (type === 'tree' && treeCount >= this.config.maxTrees) return;
      if (type === 'grass' && grassCount >= this.config.maxGrass) return;
      this.spawnPlant(type, info);
    } else {
      const animalCount = this.animals.filter((a) => a.alive).length;
      if (animalCount >= this.config.maxAnimals) return;
      this.spawnAnimal(type, info);
    }
  }

  private spawnPlant(type: PlantType, info: TerrainInfo): PlantData {
    const group = new THREE.Group();

    if (type === 'grass') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.9 });
      for (let i = 0; i < 7; i++) {
        const geo = new THREE.ConeGeometry(0.025, 0.22, 4);
        const blade = new THREE.Mesh(geo, mat);
        blade.position.set(
          (Math.random() - 0.5) * 0.12,
          0.11,
          (Math.random() - 0.5) * 0.12
        );
        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.x = (Math.random() - 0.5) * 0.4;
        group.add(blade);
      }
      group.scale.setScalar(0);
    } else {
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1.0 });
      const trunkGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.45, 8);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.225;
      group.add(trunk);

      const crownMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.85 });
      const crownGeo = new THREE.ConeGeometry(0.35, 0.8, 8);
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = 0.8;
      crown.scale.setScalar(0);
      crown.name = 'crown';
      group.add(crown);
      group.userData.crown = crown;
    }

    group.userData.dropProgress = 0;
    group.userData.dropOffset = 0;
    this.orientToSurface(group, info.position, info.normal);
    this.planet.addCreature(group);

    const plant: PlantData = {
      id: getNextId(),
      type,
      mesh: group,
      position: info.position.clone(),
      growth: 0,
      targetGrowth: 0.8 + Math.random() * 0.4,
      growSpeed: 0.6 + Math.random() * 0.4,
      alive: true,
      radius: type === 'tree' ? 0.35 : 0.12,
    };
    this.plants.push(plant);
    return plant;
  }

  private spawnAnimal(type: AnimalType, info: TerrainInfo): AnimalData {
    const group = new THREE.Group();
    const size = type === 'rabbit' ? 0.16 : 0.25;

    const bodyColor = type === 'rabbit' ? 0xf5f5f5 : 0x4a4a5a;
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7, metalness: 0.05 });
    const bodyGeo = new THREE.SphereGeometry(size, 12, 12);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.name = 'body';
    body.scale.y = 0.85;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(size * 0.65, 10, 10);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, size * 0.35, size * 0.7);
    group.add(head);

    if (type === 'rabbit') {
      const earMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7 });
      const earGeo = new THREE.ConeGeometry(size * 0.14, size * 0.7, 6);
      const earL = new THREE.Mesh(earGeo, earMat);
      earL.position.set(-size * 0.22, size * 1.0, size * 0.55);
      earL.rotation.x = -0.2;
      group.add(earL);
      const earR = earL.clone();
      earR.position.x = size * 0.22;
      group.add(earR);
    } else {
      const eyeMat = new THREE.MeshStandardMaterial({
        color: 0xff5533,
        emissive: 0xff2200,
        emissiveIntensity: 0.5,
      });
      const eyeGeo = new THREE.SphereGeometry(size * 0.14, 8, 8);
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-size * 0.2, size * 0.5, size * 1.2);
      group.add(eyeL);
      const eyeR = eyeL.clone();
      eyeR.position.x = size * 0.2;
      group.add(eyeR);
    }

    group.userData.bodySize = size;
    group.scale.setScalar(0);
    this.orientToSurface(group, info.position, info.normal);
    this.planet.addCreature(group);

    const animal: AnimalData = {
      id: getNextId(),
      type,
      mesh: group,
      position: info.position.clone(),
      velocity: new THREE.Vector3(),
      energy: 100,
      maxEnergy: 250,
      state: 'wander',
      wanderDir: this.randomTangent(info.normal),
      wanderTimer: Math.random() * 2 + 1,
      wobblePhase: Math.random() * Math.PI * 2,
      baseSpeed: type === 'rabbit' ? 0.35 : 0.42,
      targetPlant: null,
      targetMate: null,
      targetPrey: null,
      dyingTimer: 0,
      alive: true,
      spawnTimer: 0.6,
      mateCooldown: 0,
      age: 0,
    };
    this.animals.push(animal);
    return animal;
  }

  private orientToSurface(obj: THREE.Object3D, pos: THREE.Vector3, normal: THREE.Vector3) {
    obj.position.copy(pos);
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, normal.clone().normalize());
    obj.quaternion.copy(q);
    obj.rotateY(Math.random() * Math.PI * 2);
  }

  private randomTangent(normal: THREE.Vector3): THREE.Vector3 {
    const n = normal.clone().normalize();
    const up = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const tangent = new THREE.Vector3().crossVectors(n, up).normalize();
    const bitangent = new THREE.Vector3().crossVectors(n, tangent).normalize();
    const angle = Math.random() * Math.PI * 2;
    return tangent
      .clone()
      .multiplyScalar(Math.cos(angle))
      .add(bitangent.clone().multiplyScalar(Math.sin(angle)))
      .normalize();
  }

  private getTemperatureSpeedFactor(): number {
    const t = this.env.temperature;
    if (t >= 20) {
      return 1 + ((t - 20) / 10) * 0.1;
    } else {
      return 1 - ((20 - t) / 10) * 0.15;
    }
  }

  private getGrowthSpeedFactor(): number {
    const t = this.env.temperature;
    const h = this.env.humidity;
    const tempOptimal = 25;
    const humOptimal = 60;
    const tempFactor = 1 - Math.abs(t - tempOptimal) / 30;
    const humFactor = 1 - Math.abs(h - humOptimal) / 60;
    return Math.max(0.05, (tempFactor * 0.6 + humFactor * 0.4));
  }

  private updatePlants(dt: number) {
    const growthFactor = this.getGrowthSpeedFactor();

    for (let i = this.plants.length - 1; i >= 0; i--) {
      const plant = this.plants[i];
      if (!plant.alive) {
        this.planet.removeCreature(plant.mesh);
        this.plants.splice(i, 1);
        continue;
      }

      if (plant.growth < plant.targetGrowth) {
        plant.growth = Math.min(
          plant.targetGrowth,
          plant.growth + dt * plant.growSpeed * growthFactor
        );
      }

      if (plant.type === 'tree') {
        const drop = plant.mesh.userData.dropProgress as number;
        if (drop < 1) {
          const newDrop = Math.min(1, drop + dt * 2.2);
          plant.mesh.userData.dropProgress = newDrop;
          const bounce = Math.sin(newDrop * Math.PI * 1.3) * 0.35;
          const squash = newDrop < 1 ? 1 - bounce * 0.3 : 1;
          plant.mesh.scale.set(1 + bounce * 0.12, squash, 1 + bounce * 0.12);
        }
        const crown = plant.mesh.userData.crown as THREE.Mesh | undefined;
        if (crown) {
          const s = THREE.MathUtils.smoothstep(plant.growth, 0, plant.targetGrowth);
          crown.scale.setScalar(s);
        }
      } else {
        const s = THREE.MathUtils.smoothstep(plant.growth, 0, plant.targetGrowth);
        plant.mesh.scale.setScalar(s);
      }
    }
  }

  private findNearestPlant(pos: THREE.Vector3, maxDist: number): PlantData | null {
    let nearest: PlantData | null = null;
    let nearestDist = maxDist;
    for (const p of this.plants) {
      if (!p.alive || p.growth < 0.3) continue;
      const d = pos.distanceTo(p.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = p;
      }
    }
    return nearest;
  }

  private findNearestMate(animal: AnimalData, maxDist: number): AnimalData | null {
    let nearest: AnimalData | null = null;
    let nearestDist = maxDist;
    for (const a of this.animals) {
      if (!a.alive || a.id === animal.id) continue;
      if (a.type !== animal.type) continue;
      if (a.state !== 'mate') continue;
      const d = animal.position.distanceTo(a.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = a;
      }
    }
    return nearest;
  }

  private findNearestPrey(pos: THREE.Vector3, type: AnimalType, maxDist: number): AnimalData | null {
    let nearest: AnimalData | null = null;
    let nearestDist = maxDist;
    for (const a of this.animals) {
      if (!a.alive) continue;
      if (type === 'wolf' && a.type !== 'rabbit') continue;
      if (type === 'rabbit') continue;
      const d = pos.distanceTo(a.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = a;
      }
    }
    return nearest;
  }

  private updateAnimals(dt: number) {
    const speedFactor = this.getTemperatureSpeedFactor();
    const toSpawn: { type: AnimalType; info: TerrainInfo; parentPos: THREE.Vector3 }[] = [];

    for (let i = this.animals.length - 1; i >= 0; i--) {
      const animal = this.animals[i];
      if (!animal.alive) {
        this.planet.removeCreature(animal.mesh);
        this.animals.splice(i, 1);
        continue;
      }

      animal.age += dt;

      if (animal.spawnTimer > 0) {
        animal.spawnTimer -= dt;
        const t = 1 - animal.spawnTimer / 0.6;
        const appear = THREE.MathUtils.smoothstep(t, 0, 1);
        animal.mesh.scale.setScalar(appear);
        const normal = animal.position.clone().normalize();
        const offset = (1 - appear) * 0.9;
        animal.mesh.position.copy(animal.position).add(normal.multiplyScalar(offset));
        const flash = Math.abs(Math.sin(t * Math.PI * 10)) * 0.7;
        animal.mesh.traverse((c) => {
          const mesh = c as THREE.Mesh;
          if (mesh.isMesh && mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat.emissive !== undefined) {
              mat.emissiveIntensity = flash;
            }
          }
        });
        continue;
      }

      const energyDrain = animal.type === 'wolf' ? 4.5 : 3.2;
      animal.energy -= dt * energyDrain;
      animal.energy = Math.max(0, animal.energy);

      if (animal.mateCooldown > 0) {
        animal.mateCooldown -= dt;
      }

      if (animal.energy <= 0) {
        animal.state = 'dying';
        animal.dyingTimer += dt;
        const s = Math.max(0, 1 - animal.dyingTimer * 1.8);
        animal.mesh.scale.setScalar(s);
        animal.mesh.traverse((c) => {
          const mesh = c as THREE.Mesh;
          if (mesh.isMesh && mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.color.lerp(new THREE.Color(0xff0000), 0.08);
          }
        });
        if (animal.dyingTimer >= 0.7) {
          animal.alive = false;
        }
        continue;
      }

      if (animal.state === 'dying') {
        animal.state = 'wander';
      }

      if (animal.energy > 180 && animal.mateCooldown <= 0) {
        animal.state = 'mate';
      } else if (animal.energy < 70) {
        animal.state = 'seek_food';
      } else if (animal.state !== 'mate') {
        animal.state = 'wander';
      }

      let moveDir = animal.wanderDir;
      let speedMult = 1;

      if (animal.state === 'seek_food') {
        speedMult = 1.4;
        if (animal.type === 'rabbit') {
          if (!animal.targetPlant || !animal.targetPlant.alive || animal.targetPlant.growth < 0.3) {
            animal.targetPlant = this.findNearestPlant(animal.position, 4);
          }
          if (animal.targetPlant) {
            const tpos = animal.targetPlant.position;
            const toTarget = tpos.clone().sub(animal.position);
            const normal = animal.position.clone().normalize();
            toTarget.sub(normal.clone().multiplyScalar(toTarget.dot(normal)));
            moveDir = toTarget.normalize();

            if (animal.position.distanceTo(tpos) < animal.targetPlant.radius + 0.2) {
              animal.targetPlant.alive = false;
              animal.energy = Math.min(animal.maxEnergy, animal.energy + 35);
              animal.targetPlant = null;
              this.particles.emit(tpos, 8, {
                startColor: new THREE.Color(0x88ff88),
                endColor: new THREE.Color(0x22aa22),
                startSize: 0.06,
                endSize: 0.02,
                speed: 0.6,
                life: 0.5,
              });
            }
          } else {
            animal.state = 'wander';
          }
        } else if (animal.type === 'wolf') {
          if (!animal.targetPrey || !animal.targetPrey.alive) {
            animal.targetPrey = this.findNearestPrey(animal.position, animal.type, 5);
          }
          if (animal.targetPrey) {
            const tpos = animal.targetPrey.position;
            const toTarget = tpos.clone().sub(animal.position);
            const normal = animal.position.clone().normalize();
            toTarget.sub(normal.clone().multiplyScalar(toTarget.dot(normal)));
            moveDir = toTarget.normalize();
            speedMult = 1.8;

            if (animal.position.distanceTo(tpos) < 0.5) {
              animal.targetPrey.alive = false;
              animal.energy = Math.min(animal.maxEnergy, animal.energy + 70);
              this.particles.emit(tpos, 12, {
                startColor: new THREE.Color(0xff4444),
                endColor: new THREE.Color(0x660000),
                startSize: 0.1,
                endSize: 0.02,
                speed: 0.9,
                life: 0.6,
              });
              animal.targetPrey = null;
            }
          } else {
            animal.state = 'wander';
          }
        }
      } else if (animal.state === 'mate') {
        speedMult = 0.9;
        if (!animal.targetMate || !animal.targetMate.alive || animal.targetMate.state !== 'mate') {
          animal.targetMate = this.findNearestMate(animal, 6);
        }
        if (animal.targetMate) {
          const tpos = animal.targetMate.position;
          const toTarget = tpos.clone().sub(animal.position);
          const normal = animal.position.clone().normalize();
          toTarget.sub(normal.clone().multiplyScalar(toTarget.dot(normal)));
          moveDir = toTarget.normalize();

          if (animal.position.distanceTo(tpos) < 0.6) {
            animal.energy -= 60;
            animal.targetMate.energy -= 60;
            animal.mateCooldown = 5;
            animal.targetMate.mateCooldown = 5;
            animal.state = 'wander';
            animal.targetMate.state = 'wander';
            const mate = animal.targetMate;
            animal.targetMate = null;
            mate.targetMate = null;

            const midPoint = animal.position.clone().add(tpos).multiplyScalar(0.5);
            const info = this.planet.getSurfacePoint(midPoint.clone().normalize());
            if (info.isLand) {
              toSpawn.push({ type: animal.type, info, parentPos: midPoint });
            }
            this.particles.emit(midPoint, 16, {
              startColor: new THREE.Color(0xffaadd),
              endColor: new THREE.Color(0x8866ff),
              startSize: 0.08,
              endSize: 0.02,
              speed: 0.7,
              life: 0.7,
            });
          }
        } else {
          animal.wanderTimer -= dt;
          if (animal.wanderTimer <= 0) {
            animal.wanderDir = this.randomTangent(animal.position.clone().normalize());
            animal.wanderTimer = Math.random() * 2 + 1;
          }
        }
      } else {
        animal.wanderTimer -= dt;
        if (animal.wanderTimer <= 0) {
          animal.wanderDir = this.randomTangent(animal.position.clone().normalize());
          animal.wanderTimer = Math.random() * 2 + 1;
        }
      }

      const speed = animal.baseSpeed * speedFactor * speedMult;
      animal.wobblePhase += dt * 5;
      const wobbleAngle = Math.sin(animal.wobblePhase) * 0.2;

      const moveStep = moveDir.clone().multiplyScalar(speed * dt);
      const newPos = animal.position.clone().add(moveStep);
      const surface = this.planet.getSurfacePoint(newPos.clone().normalize());
      animal.position.copy(surface.position);

      this.orientToSurface(animal.mesh, animal.position, surface.normal);

      const tangent = moveDir.clone();
      const up = surface.normal.clone();
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(animal.mesh.quaternion);
      const cross = new THREE.Vector3().crossVectors(forward, tangent);
      const angle = Math.atan2(cross.dot(up), forward.dot(tangent));
      animal.mesh.rotateOnAxis(up, angle);
      animal.mesh.rotateZ(wobbleAngle);
    }

    for (const spawn of toSpawn) {
      const count = this.animals.filter((a) => a.alive).length;
      if (count < this.config.maxAnimals) {
        const baby = this.spawnAnimal(spawn.type, spawn.info);
        baby.energy = 70;
        baby.position.copy(spawn.parentPos);
        baby.mesh.position.copy(spawn.parentPos);
      }
    }
  }

  update(delta: number) {
    const dt = Math.min(delta, 0.1) * this.env.timeScale;
    this.updatePlants(dt);
    this.updateAnimals(dt);
    this.particles.update(dt);
  }
}
