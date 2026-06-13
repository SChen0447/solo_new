import * as THREE from 'three';
import { eventBus } from './EventBus';

interface ObstacleData {
  mesh: THREE.Mesh;
  type: 'boulder' | 'laser' | 'fence';
  radius: number;
  basePosition: THREE.Vector3;
  moveOffset: number;
  moveSpeed: number;
  rotationSpeed: number;
}

interface EnergyBallData {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  radius: number;
  collected: boolean;
  respawnTimer: number;
}

export class RaceTrack {
  private scene: THREE.Scene;
  private trackGroup: THREE.Group;
  private obstacles: ObstacleData[] = [];
  private energyBalls: EnergyBallData[] = [];
  private flowParticles: THREE.Points;
  private flowMaterial: THREE.ShaderMaterial;
  private trackRadius = 80;
  private trackWidth = 6;
  private numSegments = 8;
  private segmentArcs: number[] = [];
  private segmentRadii: number[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);

    for (let i = 0; i < this.numSegments; i++) {
      this.segmentArcs.push(Math.PI * 2 / this.numSegments);
      this.segmentRadii.push(this.trackRadius);
    }

    this.buildTrack();
    this.buildShields();
    this.createFlowParticles();
    this.placeObstacles();
    this.placeEnergyBalls();
    this.createStartLine();
  }

  private buildTrack(): void {
    const shape = new THREE.Shape();
    const innerR = this.trackRadius - this.trackWidth / 2;
    const outerR = this.trackRadius + this.trackWidth / 2;
    const segments = 128;

    shape.moveTo(Math.cos(0) * outerR, Math.sin(0) * outerR);
    for (let i = 1; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      shape.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
    }
    for (let i = segments; i >= 0; i--) {
      const angle = (i / segments) * Math.PI * 2;
      shape.lineTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
    }

    const geometry = new THREE.ShapeGeometry(shape, segments);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x00ffff) },
        uColor2: { value: new THREE.Color(0x00ff88) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          float angle = atan(vWorldPos.x, vWorldPos.z);
          float flow = sin(angle * 8.0 - uTime * 3.0) * 0.5 + 0.5;
          vec3 col = mix(uColor1, uColor2, flow);
          float grid = abs(sin(angle * 40.0 - uTime * 5.0));
          float dots = smoothstep(0.95, 1.0, grid);
          col += dots * 0.5;
          col *= 0.3 + flow * 0.3;
          gl_FragColor = vec4(col, 0.85);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -0.5;
    this.trackGroup.add(mesh);
    (this.trackGroup as any)._trackMaterial = material;
  }

  private buildShields(): void {
    const innerR = this.trackRadius - this.trackWidth / 2;
    const outerR = this.trackRadius + this.trackWidth / 2;
    const segments = 128;
    const shieldHeight = 4;

    const createShield = (radius: number) => {
      const geometry = new THREE.CylinderGeometry(radius, radius, shieldHeight, segments, 1, true);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = shieldHeight / 2 - 0.5;
      return mesh;
    };

    this.trackGroup.add(createShield(innerR));
    this.trackGroup.add(createShield(outerR));
  }

  private createFlowParticles(): void {
    const count = 500;
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const offset = (Math.random() - 0.5) * this.trackWidth * 0.8;
      const r = this.trackRadius + offset;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = 0.2;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      randoms[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    this.flowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float aRandom;
        uniform float uTime;
        varying float vAlpha;
        void main() {
          float angle = atan(position.x, position.z);
          float r = length(position.xz);
          float newAngle = angle + uTime * 0.5 * (0.5 + aRandom * 0.5);
          vec3 pos = position;
          pos.x = cos(newAngle) * r;
          pos.z = sin(newAngle) * r;
          pos.y = 0.2 + sin(uTime * 2.0 + aRandom * 6.28) * 0.3;
          vAlpha = 0.3 + aRandom * 0.7;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 3.0 + aRandom * 4.0;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if (d > 1.0) discard;
          float alpha = (1.0 - d) * vAlpha;
          gl_FragColor = vec4(0.0, 1.0, 0.9, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.flowParticles = new THREE.Points(geometry, this.flowMaterial);
    this.trackGroup.add(this.flowParticles);
  }

  private placeObstacles(): void {
    const obstacleCount = 12;
    for (let i = 0; i < obstacleCount; i++) {
      const angle = (i / obstacleCount) * Math.PI * 2 + Math.random() * 0.3;
      const offset = (Math.random() - 0.5) * this.trackWidth * 0.6;
      const r = this.trackRadius + offset;
      const pos = new THREE.Vector3(Math.cos(angle) * r, 0.5, Math.sin(angle) * r);

      const typeIdx = i % 3;
      let type: 'boulder' | 'laser' | 'fence';
      let mesh: THREE.Mesh;
      let radius: number;

      if (typeIdx === 0) {
        type = 'boulder';
        const geo = new THREE.DodecahedronGeometry(1.2, 1);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x661122,
          emissive: 0xff2244,
          emissiveIntensity: 0.4,
          roughness: 0.7,
        });
        mesh = new THREE.Mesh(geo, mat);
        radius = 1.2;
        mesh.position.y = 1.5;
      } else if (typeIdx === 1) {
        type = 'laser';
        const geo = new THREE.CylinderGeometry(0.15, 0.15, 5, 8);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xff0000,
          emissive: 0xff3333,
          emissiveIntensity: 0.8,
          roughness: 0.2,
        });
        mesh = new THREE.Mesh(geo, mat);
        radius = 0.6;
        mesh.position.y = 2.5;
      } else {
        type = 'fence';
        const geo = new THREE.BoxGeometry(2, 2, 0.3);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x991133,
          emissive: 0xff2255,
          emissiveIntensity: 0.3,
          roughness: 0.5,
        });
        mesh = new THREE.Mesh(geo, mat);
        radius = 1.0;
        mesh.position.y = 1.0;
      }

      mesh.position.x = pos.x;
      mesh.position.z = pos.z;
      this.trackGroup.add(mesh);

      this.obstacles.push({
        mesh,
        type,
        radius,
        basePosition: pos.clone(),
        moveOffset: Math.random() * Math.PI * 2,
        moveSpeed: type === 'fence' ? 1.5 : 0,
        rotationSpeed: type === 'laser' ? 2.0 : 0,
      });
    }
  }

  private placeEnergyBalls(): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.PI / count;
      const offset = (Math.random() - 0.5) * this.trackWidth * 0.4;
      const r = this.trackRadius + offset;
      const pos = new THREE.Vector3(Math.cos(angle) * r, 1.5, Math.sin(angle) * r);

      const geo = new THREE.SphereGeometry(0.6, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00ff44,
        emissive: 0x00ff44,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);

      const glowGeo = new THREE.SphereGeometry(0.9, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ff44,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(pos);

      this.trackGroup.add(mesh);
      this.trackGroup.add(glow);

      this.energyBalls.push({
        mesh,
        glow,
        radius: 0.6,
        collected: false,
        respawnTimer: 0,
      });
    }
  }

  private createStartLine(): void {
    const geo = new THREE.PlaneGeometry(this.trackWidth, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(this.trackRadius, 0, 0);
    mesh.rotation.y = 0;
    mesh.position.y = -0.4;
    this.trackGroup.add(mesh);
  }

  getObstaclePositions(): THREE.Vector3[] {
    return this.obstacles.map((o) => o.mesh.position);
  }

  getObstacleRadii(): number[] {
    return this.obstacles.map((o) => o.radius);
  }

  getEnergyPositions(): THREE.Vector3[] {
    return this.energyBalls.map((e) => e.mesh.position);
  }

  getEnergyRadii(): number[] {
    return this.energyBalls.map((e) => e.radius);
  }

  collectEnergy(index: number): void {
    if (index >= 0 && index < this.energyBalls.length) {
      const ball = this.energyBalls[index];
      ball.collected = true;
      ball.respawnTimer = 5;
      ball.mesh.visible = false;
      ball.glow.visible = false;
    }
  }

  update(time: number, delta: number): void {
    const trackMat = (this.trackGroup as any)._trackMaterial;
    if (trackMat) {
      trackMat.uniforms.uTime.value = time;
    }
    if (this.flowMaterial) {
      this.flowMaterial.uniforms.uTime.value = time;
    }

    this.obstacles.forEach((obs) => {
      if (obs.type === 'laser') {
        obs.mesh.rotation.y += obs.rotationSpeed * delta;
      }
      if (obs.type === 'fence') {
        const offset = Math.sin(time * obs.moveSpeed + obs.moveOffset) * 2;
        const angle = Math.atan2(obs.basePosition.z, obs.basePosition.x);
        obs.mesh.position.x = obs.basePosition.x + Math.cos(angle + Math.PI / 2) * offset;
        obs.mesh.position.z = obs.basePosition.z + Math.sin(angle + Math.PI / 2) * offset;
      }
    });

    this.energyBalls.forEach((ball) => {
      if (ball.collected) {
        ball.respawnTimer -= delta;
        if (ball.respawnTimer <= 0) {
          ball.collected = false;
          ball.mesh.visible = true;
          ball.glow.visible = true;
        }
      } else {
        const pulse = Math.sin(time * (Math.PI * 2 / 1.5)) * 0.3 + 1.0;
        ball.mesh.scale.setScalar(pulse);
        ball.glow.scale.setScalar(pulse * 1.5);
        (ball.glow.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(time * 4) * 0.05;
      }
    });
  }

  getTrackRadius(): number {
    return this.trackRadius;
  }

  getStartPosition(angleOffset: number): THREE.Vector3 {
    const angle = angleOffset;
    return new THREE.Vector3(
      Math.cos(angle) * this.trackRadius,
      0.5,
      Math.sin(angle) * this.trackRadius
    );
  }

  getStartRotation(angleOffset: number): number {
    return angleOffset + Math.PI / 2;
  }
}
