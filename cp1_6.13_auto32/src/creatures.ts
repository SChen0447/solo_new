import * as THREE from 'three';
import { Planet, CreatureType, TerrainInfo } from './planet';

type AnimalState = 'wander' | 'seek_food' | 'mate' | 'dying';

interface Plant {
  id: number;
  type: 'grass' | 'tree';
  mesh: THREE.Group;
  position: THREE.Vector3;
  growth: number;
  targetGrowth: number;
  alive: boolean;
}

interface Animal {
  id: number;
  type: 'rabbit' | 'wolf';
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  energy: number;
  state: AnimalState;
  wanderDir: THREE.Vector3;
  wanderTimer: number;
  wobble: number;
  baseSpeed: number;
  target: Plant | Animal | null;
  dying: number;
  alive: boolean;
  flashTimer: number;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

let nextId = 1;

export interface EnvironmentParams {
  temperature: number;
  humidity: number;
  timeScale: number;
}

export class CreatureManager {
  planet: Planet;
  scene: THREE.Scene;
  plants: Plant[] = [];
  animals: Animal[] = [];
  particles: Particle[] = [];
  env: EnvironmentParams = {
    temperature: 25,
    humidity: 60,
    timeScale: 1,
  };
  private treeLimit = 500;

  constructor(planet: Planet, scene: THREE.Scene) {
    this.planet = planet;
    this.scene = scene;
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
      if (type === 'tree' && this.plants.filter((p) => p.type === 'tree' && p.alive).length >= this.treeLimit) {
        return;
      }
      this.spawnPlant(type, info);
    } else {
      this.spawnAnimal(type, info);
    }
  }

  private spawnPlant(type: 'grass' | 'tree', info: TerrainInfo): Plant {
    const group = new THREE.Group();
    if (type === 'grass') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.9 });
      for (let i = 0; i < 5; i++) {
        const geo = new THREE.ConeGeometry(0.03, 0.18, 4);
        const blade = new THREE.Mesh(geo, mat);
        blade.position.set(
          (Math.random() - 0.5) * 0.1,
          0.09,
          (Math.random() - 0.5) * 0.1
        );
        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.x = (Math.random() - 0.5) * 0.3;
        group.add(blade);
      }
      group.scale.setScalar(0);
    } else {
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1.0 });
      const trunkGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.4, 8);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.2;
      group.add(trunk);

      const crownMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });
      const crownGeo = new THREE.ConeGeometry(0.3, 0.7, 8);
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = 0.7;
      crown.name = 'crown';
      crown.scale.setScalar(0);
      group.add(crown);
      group.scale.setScalar(1);
      group.userData.crown = crown;
      group.userData.dropProgress = 0;
    }

    this.orientToSurface(group, info.position, info.normal);
    this.planet.addCreature(group);

    const plant: Plant = {
      id: nextId++,
      type,
      mesh: group,
      position: info.position.clone(),
      growth: 0,
      targetGrowth: 1,
      alive: true,
    };
    this.plants.push(plant);
    return plant;
  }

  private spawnAnimal(type: 'rabbit' | 'wolf', info: TerrainInfo): Animal {
    const group = new THREE.Group();
    const color = type === 'rabbit' ? 0xf5f5f5 : 0x555566;
    const size = type === 'rabbit' ? 0.15 : 0.22;

    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 });
    const bodyGeo = new THREE.SphereGeometry(size, 12, 12);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.name = 'body';
    group.add(body);

    const headGeo = new THREE.SphereGeometry(size * 0.6, 10, 10);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, size * 0.4, size * 0.7);
    group.add(head);

    if (type === 'rabbit') {
      const earGeo = new THREE.ConeGeometry(size * 0.12, size * 0.6, 6);
      const earL = new THREE.Mesh(earGeo, bodyMat);
      earL.position.set(-size * 0.2, size * 1.0, size * 0.6);
      group.add(earL);
      const earR = earL.clone();
      earR.position.x = size * 0.2;
      group.add(earR);
    } else {
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff0000, emissiveIntensity: 0.4 });
      const eyeGeo = new THREE.SphereGeometry(size * 0.12, 8, 8);
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-size * 0.18, size * 0.55, size * 1.2);
      group.add(eyeL);
      const eyeR = eyeL.clone();
      eyeR.position.x = size * 0.18;
      group.add(eyeR);
    }

    group.userData.baseY = size;
    group.scale.setScalar(0);
    this.orientToSurface(group, info.position, info.normal);
    this.planet.addCreature(group);

    const animal: Animal = {
      id: nextId++,
      type,
      mesh: group,
      position: info.position.clone(),
      velocity: new THREE.Vector3(),
      energy: 100,
      state: 'wander',
      wanderDir: this.randomTangent(info.normal),
      wanderTimer: Math.random() * 2 + 1,
      wobble: 0,
      baseSpeed: type === 'rabbit' ? 0.3 : 0.35,
      target: null,
      dying: 0,
      alive: true,
      flashTimer: 0.3,
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
    return tangent.multiplyScalar(Math.cos(angle)).add(bitangent.multiplyScalar(Math.sin(angle))).normalize();
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
    const tempFactor = 1 - Math.abs(t - 25) / 25;
    const humFactor = 1 - Math.abs(h - 60) / 60;
    return Math.max(0.05, (tempFactor + humFactor) / 2);
  }

  private spawnExplosionParticles(pos: THREE.Vector3, color: number) {
    const count = 12;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.06, 6, 6);
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.copy(pos);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(0.8 + Math.random() * 0.8);
      this.scene.add(mesh);
      this.particles.push({ mesh, velocity: vel, life: 0.7, maxLife: 0.7 });
    }
  }

  update(delta: number) {
    const dt = delta * this.env.timeScale;

    const toRemove: Plant[] = [];
    const growthFactor = this.getGrowthSpeedFactor();

    for (const plant of this.plants) {
      if (!plant.alive) {
        toRemove.push(plant);
        continue;
      }
      if (plant.growth < plant.targetGrowth) {
        plant.growth = Math.min(plant.targetGrowth, plant.growth + dt * 0.8 * growthFactor);
      }

      if (plant.type === 'tree') {
        const drop = plant.mesh.userData.dropProgress as number;
        if (drop < 1) {
          const newDrop = Math.min(1, drop + dt * 2.5);
          plant.mesh.userData.dropProgress = newDrop;
          const bounce = Math.sin(newDrop * Math.PI * 1.2) * 0.4;
          const squash = newDrop < 1 ? 1 - bounce * 0.35 : 1;
          plant.mesh.scale.set(1 + bounce * 0.15, squash, 1 + bounce * 0.15);
        }
        const crown = plant.mesh.userData.crown as THREE.Mesh | undefined;
        if (crown) {
          const s = THREE.MathUtils.smoothstep(plant.growth, 0, 1);
          crown.scale.setScalar(s);
        }
      } else {
        const s = THREE.MathUtils.smoothstep(plant.growth, 0, 1);
        plant.mesh.scale.setScalar(s);
      }
    }

    for (const p of toRemove) {
      this.planet.removeCreature(p.mesh);
    }
    this.plants = this.plants.filter((p) => p.alive);

    const speedFactor = this.getTemperatureSpeedFactor();
    const animalsToRemove: Animal[] = [];
    const newAnimals: Animal[] = [];

    for (const animal of this.animals) {
      if (!animal.alive) {
        animalsToRemove.push(animal);
        continue;
      }

      if (animal.flashTimer > 0) {
        animal.flashTimer -= dt;
        const appear = THREE.MathUtils.smoothstep(1 - animal.flashTimer / 0.3, 0, 1);
        animal.mesh.scale.setScalar(appear);
        const offset = (1 - appear) * 0.8;
        const normal = animal.position.clone().normalize();
        animal.mesh.position.copy(animal.position).add(normal.multiplyScalar(offset));
        const flash = Math.abs(Math.sin((1 - animal.flashTimer / 0.3) * Math.PI * 8)) * 0.6;
        animal.mesh.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (m.emissive) m.emissiveIntensity = flash;
          }
        });
      }

      animal.energy -= dt * (animal.type === 'wolf' ? 4 : 3);

      if (animal.energy <= 0) {
        animal.state = 'dying';
        animal.dying += dt;
        const s = Math.max(0, 1 - animal.dying * 1.5);
        animal.mesh.scale.setScalar(s);
        animal.mesh.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
            m.color.lerp(new THREE.Color(0xff0000), 0.1);
          }
        });
        if (animal.dying >= 0.8) {
          animal.alive = false;
        }
        continue;
      }

      if (animal.energy > 200) {
        animal.energy = 100;
        const newPos = this.planet.getSurfacePoint(animal.position.clone().normalize());
        this.spawnExplosionParticles(animal.position, animal.type === 'rabbit' ? 0xffddaa : 0xaaaaaa);
        const newAnimal = this.spawnAnimal(animal.type, newPos);
        newAnimal.energy = 80;
        newAnimal.position.copy(animal.position);
        newAnimal.mesh.position.copy(animal.position);
        newAnimals.push(newAnimal);
      }

      const alivePlants = this.plants.filter((p) => p.alive && p.growth > 0.2);
      if (animal.type === 'rabbit' && alivePlants.length > 0) {
        let nearestPlant: Plant | null = null;
        let nearestDist = Infinity;
        for (const p of alivePlants) {
          const d = animal.position.distanceTo(p.position);
          if (d < nearestDist) {
            nearestDist = d;
            nearestPlant = p;
          }
        }
        if (nearestPlant) {
          if (nearestDist < 1) {
            nearestPlant.alive = false;
            animal.energy = Math.min(250, animal.energy + 30);
            animal.target = null;
          } else if (nearestDist < 3) {
            animal.state = 'seek_food';
            animal.target = nearestPlant;
          }
        }
      } else if (animal.type === 'wolf') {
        const preys = this.animals.filter((a) => a.type === 'rabbit' && a.alive);
        if (preys.length > 0) {
          let nearestPrey: Animal | null = null;
          let nearestDist = Infinity;
          for (const p of preys) {
            const d = animal.position.distanceTo(p.position);
            if (d < nearestDist) {
              nearestDist = d;
              nearestPrey = p;
            }
          }
          if (nearestPrey && nearestDist < 4) {
            if (nearestDist < 0.8) {
              nearestPrey.alive = false;
              animal.energy = Math.min(250, animal.energy + 60);
              animal.target = null;
            } else {
              animal.state = 'seek_food';
              animal.target = nearestPrey;
            }
          }
        }
      }

      let moveDir = animal.wanderDir;
      if (animal.state === 'seek_food' && animal.target) {
        const tpos = (animal.target as Plant | Animal).position;
        moveDir = tpos.clone().sub(animal.position);
        const normal = animal.position.clone().normalize();
        moveDir.sub(normal.clone().multiplyScalar(moveDir.dot(normal)));
        moveDir.normalize();
      } else {
        animal.wanderTimer -= dt;
        if (animal.wanderTimer <= 0) {
          animal.wanderDir = this.randomTangent(animal.position.clone().normalize());
          animal.wanderTimer = Math.random() * 2 + 1;
        }
      }

      const speed = animal.baseSpeed * speedFactor * (animal.state === 'seek_food' ? 1.5 : 1);
      animal.wobble += dt * 6;
      const wobbleOffset = Math.sin(animal.wobble) * 0.15;
      animal.velocity.copy(moveDir).multiplyScalar(speed * dt);

      const newPos = animal.position.clone().add(animal.velocity);
      const surface = this.planet.getSurfacePoint(newPos.clone().normalize());
      animal.position.copy(surface.position);

      this.orientToSurface(animal.mesh, animal.position, surface.normal);
      const tangent = moveDir.clone();
      const up = surface.normal;
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(animal.mesh.quaternion);
      const cross = new THREE.Vector3().crossVectors(forward, tangent);
      const angle = Math.atan2(cross.dot(up), forward.dot(tangent));
      animal.mesh.rotateOnAxis(up, angle);
      animal.mesh.rotateZ(wobbleOffset);
    }

    for (const a of animalsToRemove) {
      this.planet.removeCreature(a.mesh);
    }
    this.animals = this.animals.filter((a) => a.alive).concat(newAnimals);

    const deadParticles: Particle[] = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) {
        deadParticles.push(p);
        continue;
      }
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
      p.velocity.multiplyScalar(0.92);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life / p.maxLife;
      p.mesh.scale.setScalar(p.life / p.maxLife);
    }
    for (const p of deadParticles) {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
      p.mesh.geometry.dispose();
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }
}
