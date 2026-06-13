import * as THREE from 'three';
import { eventBus } from './EventBus';
import { PhysicsEngine, PhysicsState } from './PhysicsEngine';

interface ShipInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

interface Particle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
}

export class ShipController {
  private scene: THREE.Scene;
  private physics: PhysicsEngine;
  private playerId: number;
  private ship: THREE.Group;
  private state: PhysicsState;
  private input: ShipInput = { forward: false, backward: false, left: false, right: false };
  private keyMap: Record<string, string>;
  private particles: Particle[] = [];
  private maxParticles: number;
  private particleGeometry: THREE.SphereGeometry;
  private flashTimer: number = 0;
  private flashMesh: THREE.Mesh;
  private boostGlow: THREE.Mesh;
  private boostGlowTimer: number = 0;
  private shipBody: THREE.Mesh;
  private shipEdge: THREE.LineSegments;
  private shipLOD: THREE.Group;
  private shipLowPoly: THREE.Group;
  private camera: THREE.PerspectiveCamera;
  private cameraOffset = new THREE.Vector3(0, 6, -12);
  private cameraLookOffset = new THREE.Vector3(0, 1, 5);

  constructor(scene: THREE.Scene, physics: PhysicsEngine, playerId: number, camera: THREE.PerspectiveCamera, isSplit: boolean) {
    this.scene = scene;
    this.physics = physics;
    this.playerId = playerId;
    this.camera = camera;
    this.maxParticles = isSplit ? 100 : 200;

    this.keyMap = playerId === 0
      ? { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' }
      : { KeyI: 'forward', KeyK: 'backward', KeyJ: 'left', KeyL: 'right' };

    const startPos = physics.getStartPosition(playerId === 0 ? 0 : 0.15);
    const startRot = physics.getStartRotation(playerId === 0 ? 0 : 0.15);
    this.state = physics.createState(playerId, startPos);
    this.state.rotation = startRot;

    this.ship = new THREE.Group();
    this.shipLOD = this.createHighPolyShip();
    this.shipLowPoly = this.createLowPolyShip();
    this.ship.add(this.shipLOD);
    this.ship.add(this.shipLowPoly);
    this.shipLowPoly.visible = false;
    this.scene.add(this.ship);

    this.particleGeometry = new THREE.SphereGeometry(0.08, 4, 4);

    this.flashMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    );
    this.ship.add(this.flashMesh);

    this.boostGlow = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0, side: THREE.BackSide })
    );
    this.ship.add(this.boostGlow);

    this.shipBody = this.shipLOD.children[0] as THREE.Mesh;
    this.shipEdge = this.shipLOD.children[1] as THREE.LineSegments;

    this.bindInput();

    eventBus.on('collision:obstacle', (data: any) => {
      if (data.playerId === this.playerId) {
        this.flashTimer = 0.3;
      }
    });

    eventBus.on('collision:energy', (data: any) => {
      if (data.playerId === this.playerId) {
        this.boostGlowTimer = 0.5;
      }
    });
  }

  private createHighPolyShip(): THREE.Group {
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(1.0, 0.3, 2.5);
    const positions = bodyGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      if (z > 0.5) {
        positions.setX(i, x * (1 - (z - 0.5) / 2.5));
      }
      if (z < -0.5) {
        positions.setX(i, x * (1 + (z + 0.5) / 3));
      }
    }
    bodyGeo.computeVertexNormals();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.playerId === 0 ? 0x4488ff : 0xff4444,
      metalness: 0.8,
      roughness: 0.2,
      emissive: this.playerId === 0 ? 0x1133aa : 0xaa1133,
      emissiveIntensity: 0.3,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(bodyMesh);

    const edgesGeo = new THREE.EdgesGeometry(bodyGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: this.playerId === 0 ? 0x66ccff : 0xff6666,
      transparent: true,
      opacity: 0.8,
    });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    group.add(edges);

    const wingGeo = new THREE.BoxGeometry(2.5, 0.08, 0.8);
    const wingMat = new THREE.MeshStandardMaterial({
      color: this.playerId === 0 ? 0x3366cc : 0xcc3333,
      metalness: 0.7,
      roughness: 0.3,
      emissive: this.playerId === 0 ? 0x1122aa : 0xaa1122,
      emissiveIntensity: 0.2,
    });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.z = 0.3;
    group.add(wings);

    const cockpitGeo = new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0xaaddff,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7,
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.15, 0.5);
    group.add(cockpit);

    return group;
  }

  private createLowPolyShip(): THREE.Group {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(1.0, 0.3, 2.5);
    const mat = new THREE.MeshStandardMaterial({
      color: this.playerId === 0 ? 0x4488ff : 0xff4444,
      metalness: 0.5,
      roughness: 0.5,
    });
    group.add(new THREE.Mesh(geo, mat));
    return group;
  }

  private bindInput(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      const action = this.keyMap[e.code];
      if (action) {
        (this.input as any)[action] = true;
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const action = this.keyMap[e.code];
      if (action) {
        (this.input as any)[action] = false;
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  getInput(): ShipInput {
    return this.input;
  }

  update(delta: number, cameraEnabled: boolean): void {
    this.ship.position.copy(this.state.position);
    this.ship.rotation.y = this.state.rotation;

    const distToCamera = cameraEnabled ? this.camera.position.distanceTo(this.ship.position) : 0;
    if (distToCamera > 80) {
      this.shipLOD.visible = false;
      this.shipLowPoly.visible = true;
    } else {
      this.shipLOD.visible = true;
      this.shipLowPoly.visible = false;
    }

    this.updateParticles(delta);
    this.updateFlash(delta);
    this.updateBoostGlow(delta);

    if (cameraEnabled) {
      this.updateCamera(delta);
    }
  }

  private updateParticles(delta: number): void {
    const speed = Math.abs(this.state.speed);
    const isAccelerating = this.input.forward;
    const isBraking = this.input.backward;

    const particleRate = isAccelerating ? 3 : (speed > 0.01 ? 1 : 0);
    for (let i = 0; i < particleRate; i++) {
      if (this.particles.length >= this.maxParticles) break;
      this.spawnParticle(isAccelerating, isBraking);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      const lifeRatio = p.life / p.maxLife;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = lifeRatio;
      p.mesh.scale.setScalar(lifeRatio);
    }
  }

  private spawnParticle(accelerating: boolean, braking: boolean): void {
    const behindOffset = new THREE.Vector3(0, 0, -1.3);
    behindOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.state.rotation);

    const pos = this.state.position.clone().add(behindOffset);
    pos.x += (Math.random() - 0.5) * 0.4;
    pos.y += Math.random() * 0.3;

    const spread = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      Math.random() * 0.2,
      (Math.random() - 0.5) * 0.3
    );
    const backDir = new THREE.Vector3(
      -Math.sin(this.state.rotation),
      0.2,
      -Math.cos(this.state.rotation)
    ).multiplyScalar(2 + Math.random() * 2);
    const velocity = backDir.add(spread);

    let color: number;
    let brightness: number;
    if (braking) {
      color = 0xff4400;
      brightness = 0.3;
    } else if (accelerating) {
      color = 0x00ccff;
      brightness = 0.8 + Math.random() * 0.2;
    } else {
      color = 0x0088ff;
      brightness = 0.5;
    }

    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: brightness,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(this.particleGeometry, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1.0,
      velocity,
    });
  }

  private updateFlash(delta: number): void {
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      const mat = this.flashMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, this.flashTimer / 0.3) * 0.6;
    }
  }

  private updateBoostGlow(delta: number): void {
    if (this.boostGlowTimer > 0) {
      this.boostGlowTimer -= delta;
      const mat = this.boostGlow.material as THREE.MeshBasicMaterial;
      const t = 1 - this.boostGlowTimer / 0.5;
      mat.opacity = (1 - t) * 0.3;
      this.boostGlow.scale.setScalar(1 + t * 2);
    } else {
      const mat = this.boostGlow.material as THREE.MeshBasicMaterial;
      mat.opacity = 0;
      this.boostGlow.scale.setScalar(1);
    }
  }

  private updateCamera(delta: number): void {
    const targetPos = this.state.position.clone()
      .add(new THREE.Vector3(
        Math.sin(this.state.rotation) * this.cameraOffset.z,
        this.cameraOffset.y,
        Math.cos(this.state.rotation) * this.cameraOffset.z
      ).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0));

    const behindDir = new THREE.Vector3(
      -Math.sin(this.state.rotation) * this.cameraOffset.z,
      this.cameraOffset.y,
      -Math.cos(this.state.rotation) * this.cameraOffset.z
    );
    const desiredPos = this.state.position.clone().add(behindDir);

    this.camera.position.lerp(desiredPos, 0.05);
    const lookTarget = this.state.position.clone().add(
      new THREE.Vector3(
        Math.sin(this.state.rotation) * this.cameraLookOffset.z,
        this.cameraLookOffset.y,
        Math.cos(this.state.rotation) * this.cameraLookOffset.z
      )
    );
    this.camera.lookAt(lookTarget);
  }

  getState(): PhysicsState {
    return this.state;
  }

  getShip(): THREE.Group {
    return this.ship;
  }

  dispose(): void {
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.scene.remove(this.ship);
  }
}
