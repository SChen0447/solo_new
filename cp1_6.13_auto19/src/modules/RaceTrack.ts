import * as THREE from 'three';
import { eventBus } from './EventBus';

export interface TrackObstacle {
  mesh: THREE.Object3D;
  boulderMesh?: THREE.Mesh;
  lowMesh?: THREE.Mesh;
  type: 'boulder' | 'laser' | 'fence';
  box: THREE.Box3;
  radius: number;
  basePosition: THREE.Vector3;
  baseRotation: number;
  moveOffset: number;
  moveSpeed: number;
  rotationSpeed: number;
  active: boolean;
}

export interface TrackEnergyBall {
  mesh: THREE.Mesh;
  lowMesh?: THREE.Mesh;
  glow: THREE.Mesh;
  box: THREE.Box3;
  radius: number;
  collected: boolean;
  respawnTimer: number;
  t: number;
  offset: number;
}

export class RaceTrack {
  private scene: THREE.Scene;
  private trackGroup: THREE.Group = new THREE.Group();
  private centerCurve: THREE.CatmullRomCurve3;
  private obstacles: TrackObstacle[] = [];
  private energyBalls: TrackEnergyBall[] = [];
  private flowParticles: THREE.Points;
  private flowMaterial: THREE.ShaderMaterial;
  private trackMaterial: THREE.ShaderMaterial;
  private trackWidth = 6;
  private curvePoints: THREE.Vector3[] = [];
  private curveLength = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.add(this.trackGroup);

    const controlPoints = this.generateControlPoints();
    this.centerCurve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.5);
    this.curveLength = this.centerCurve.getLength();

    this.buildTrackSurface();
    this.buildSideShields();
    this.createFlowParticles();
    this.placeObstacles();
    this.placeEnergyBalls();
    this.createStartLine();
  }

  private generateControlPoints(): THREE.Vector3[] {
    const baseR = 80;
    const points: THREE.Vector3[] = [];
    const numControl = 10;
    for (let i = 0; i < numControl; i++) {
      const angle = (i / numControl) * Math.PI * 2;
      const r = baseR + Math.sin(i * 2.3) * 12 + Math.cos(i * 3.7) * 6;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = Math.sin(i * 1.5) * 3;
      points.push(new THREE.Vector3(x, y, z));
    }
    return points;
  }

  private buildTrackSurface(): void {
    const numSamples = 400;
    const halfW = this.trackWidth / 2;

    const outerPoints: THREE.Vector3[] = [];
    const innerPoints: THREE.Vector3[] = [];
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const center = this.centerCurve.getPointAt(t);
      const tangent = this.centerCurve.getTangentAt(t).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      outerPoints.push(center.clone().add(normal.clone().multiplyScalar(halfW)));
      innerPoints.push(center.clone().add(normal.clone().multiplyScalar(-halfW)));
    }

    const segLen = 1 / numSamples;
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      positions.push(innerPoints[i].x, innerPoints[i].y, innerPoints[i].z);
      positions.push(outerPoints[i].x, outerPoints[i].y, outerPoints[i].z);
      uvs.push(t, 0);
      uvs.push(t, 1);
    }

    for (let i = 0; i < numSamples; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = i * 2 + 2;
      const d = i * 2 + 3;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    this.trackMaterial = new THREE.ShaderMaterial({
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
          float flow = sin(vUv.x * 40.0 - uTime * 4.0) * 0.5 + 0.5;
          vec3 col = mix(uColor1, uColor2, flow);
          float dots = smoothstep(0.92, 1.0, abs(sin(vUv.x * 120.0 - uTime * 6.0)));
          col += dots * 0.8;
          float edgeFade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
          col *= 0.25 + flow * 0.35;
          gl_FragColor = vec4(col, 0.88 * edgeFade + 0.05);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, this.trackMaterial);
    this.trackGroup.add(mesh);
  }

  private buildSideShields(): void {
    const numSamples = 300;
    const halfW = this.trackWidth / 2;
    const shieldHeight = 4;

    for (const side of [-1, 1]) {
      const positions: number[] = [];
      const indices: number[] = [];
      const uvs: number[] = [];

      for (let i = 0; i <= numSamples; i++) {
        const t = i / numSamples;
        const center = this.centerCurve.getPointAt(t);
        const tangent = this.centerCurve.getTangentAt(t).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
        const edge = center.clone().add(normal.clone().multiplyScalar(halfW * side));
        positions.push(edge.x, edge.y - 0.5, edge.z);
        positions.push(edge.x, edge.y + shieldHeight, edge.z);
        uvs.push(t, 0);
        uvs.push(t, 1);
      }

      for (let i = 0; i < numSamples; i++) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = i * 2 + 2;
        const d = i * 2 + 3;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);

      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            float edge = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
            float flow = sin(vUv.x * 20.0 - uTime * 2.0) * 0.5 + 0.5;
            vec3 col = mix(vec3(0.0, 0.8, 1.0), vec3(0.0, 1.0, 0.6), flow);
            gl_FragColor = vec4(col, 0.15 * edge);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const shield = new THREE.Mesh(geo, mat);
      (shield as any)._mat = mat;
      this.trackGroup.add(shield);
    }
  }

  private createFlowParticles(): void {
    const count = 600;
    const positions = new Float32Array(count * 3);
    const ts = new Float32Array(count);
    const randoms = new Float32Array(count);
    const offsets = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      ts[i] = Math.random();
      offsets[i] = (Math.random() - 0.5) * this.trackWidth * 0.7;
      randoms[i] = Math.random();
      const p = this.getPointOnTrack(ts[i], offsets[i]);
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y + 0.3;
      positions[i * 3 + 2] = p.z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aT', new THREE.BufferAttribute(ts, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));

    this.flowMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCurveLen: { value: this.curveLength } },
      vertexShader: `
        attribute float aT;
        attribute float aRandom;
        attribute float aOffset;
        uniform float uTime;
        uniform float uCurveLen;
        varying float vAlpha;
        void main() {
          float t = fract(aT + uTime * 0.08 * (0.3 + aRandom * 0.7));
          vec3 pos = position;
          pos.y += sin(uTime * 2.0 + aRandom * 6.28) * 0.2;
          vAlpha = 0.25 + aRandom * 0.75;
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (2.5 + aRandom * 4.0) * (300.0 / -mv.z);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if (d > 1.0) discard;
          float alpha = (1.0 - d * d) * vAlpha;
          gl_FragColor = vec4(0.0, 1.0, 0.95, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.flowParticles = new THREE.Points(geometry, this.flowMaterial);
    this.trackGroup.add(this.flowParticles);
  }

  getPointOnTrack(t: number, offset: number = 0): THREE.Vector3 {
    const center = this.centerCurve.getPointAt(t);
    const tangent = this.centerCurve.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    return center.clone().add(normal.multiplyScalar(offset));
  }

  getTangentOnTrack(t: number): THREE.Vector3 {
    return this.centerCurve.getTangentAt(t).normalize();
  }

  getTrackCurveLength(): number {
    return this.curveLength;
  }

  getTrackTFromProgress(progress: number): number {
    return ((progress % 1) + 1) % 1;
  }

  getTrackWidth(): number {
    return this.trackWidth;
  }

  private placeObstacles(): void {
    const obstacleCount = 14;
    for (let i = 0; i < obstacleCount; i++) {
      const t = ((i + 0.5) / obstacleCount + Math.random() * 0.03) % 1;
      const offset = (Math.random() - 0.5) * this.trackWidth * 0.55;
      const basePos = this.getPointOnTrack(t, offset);

      const typeIdx = i % 3;
      const type: 'boulder' | 'laser' | 'fence' = (['boulder', 'laser', 'fence'] as const)[typeIdx];

      const group = new THREE.Group();

      let highMesh: THREE.Mesh;
      let lowMesh: THREE.Mesh;
      let radius: number;

      if (type === 'boulder') {
        const highGeo = new THREE.DodecahedronGeometry(1.2, 1);
        const lowGeo = new THREE.DodecahedronGeometry(1.2, 0);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x661122,
          emissive: 0xff2244,
          emissiveIntensity: 0.45,
          roughness: 0.7,
        });
        highMesh = new THREE.Mesh(highGeo, mat);
        lowMesh = new THREE.Mesh(lowGeo, mat);
        lowMesh.visible = false;
        radius = 1.2;
        highMesh.position.y = 1.5;
        lowMesh.position.y = 1.5;
      } else if (type === 'laser') {
        const highGeo = new THREE.CylinderGeometry(0.15, 0.15, 5, 16);
        const lowGeo = new THREE.CylinderGeometry(0.2, 0.2, 5, 6);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xff0000,
          emissive: 0xff3333,
          emissiveIntensity: 0.9,
          roughness: 0.2,
        });
        highMesh = new THREE.Mesh(highGeo, mat);
        lowMesh = new THREE.Mesh(lowGeo, mat);
        lowMesh.visible = false;
        radius = 0.5;
        highMesh.position.y = 2.5;
        lowMesh.position.y = 2.5;
      } else {
        const highGeo = new THREE.BoxGeometry(2.2, 2, 0.3);
        const lowGeo = new THREE.BoxGeometry(2.2, 2, 0.3);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x991133,
          emissive: 0xff2255,
          emissiveIntensity: 0.35,
          roughness: 0.5,
        });
        highMesh = new THREE.Mesh(highGeo, mat);
        lowMesh = new THREE.Mesh(lowGeo, mat);
        lowMesh.visible = false;
        radius = 1.3;
        highMesh.position.y = 1.0;
        lowMesh.position.y = 1.0;
      }

      group.add(highMesh);
      group.add(lowMesh);
      group.position.copy(basePos);

      const tangent = this.getTangentOnTrack(t);
      const angle = Math.atan2(tangent.x, tangent.z);
      if (type === 'fence') {
        group.rotation.y = angle;
      }

      this.trackGroup.add(group);

      const box = new THREE.Box3().setFromObject(group);

      this.obstacles.push({
        mesh: group,
        boulderMesh: highMesh,
        lowMesh,
        type,
        box,
        radius,
        basePosition: basePos.clone(),
        baseRotation: angle,
        moveOffset: Math.random() * Math.PI * 2,
        moveSpeed: type === 'fence' ? 1.8 : 0,
        rotationSpeed: type === 'laser' ? 2.5 : 0,
        active: true,
      });
    }

    eventBus.emit('track:obstaclesReady', this.obstacles.map((o) => o.mesh));
  }

  private placeEnergyBalls(): void {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const t = (i / count + 0.07) % 1;
      const offset = (Math.random() - 0.5) * this.trackWidth * 0.35;
      const basePos = this.getPointOnTrack(t, offset);
      basePos.y += 1.5;

      const highGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const lowGeo = new THREE.SphereGeometry(0.6, 6, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00ff44,
        emissive: 0x00ff44,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(highGeo, mat);
      mesh.position.copy(basePos);
      const lowMesh = new THREE.Mesh(lowGeo, mat);
      lowMesh.position.copy(basePos);
      lowMesh.visible = false;

      const glowGeo = new THREE.SphereGeometry(1.2, 12, 12);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ff44,
        transparent: true,
        opacity: 0.18,
        side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(basePos);

      this.trackGroup.add(mesh);
      this.trackGroup.add(lowMesh);
      this.trackGroup.add(glow);

      const box = new THREE.Box3().setFromObject(mesh);

      this.energyBalls.push({
        mesh,
        lowMesh,
        glow,
        box,
        radius: 0.6,
        collected: false,
        respawnTimer: 0,
        t,
        offset,
      });
    }
  }

  private createStartLine(): void {
    const t = 0;
    const tangent = this.getTangentOnTrack(t);
    const angle = Math.atan2(tangent.x, tangent.z);
    const geo = new THREE.PlaneGeometry(this.trackWidth, 1.2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.y = angle;
    const pos = this.getPointOnTrack(t, 0);
    mesh.position.set(pos.x, pos.y - 0.4, pos.z);
    this.trackGroup.add(mesh);
  }

  getObstacles(): TrackObstacle[] {
    return this.obstacles;
  }

  getEnergyBalls(): TrackEnergyBall[] {
    return this.energyBalls;
  }

  getObstacleMeshes(): THREE.Object3D[] {
    return this.obstacles.map((o) => o.mesh);
  }

  getEnergyBallMeshes(): THREE.Object3D[] {
    return this.energyBalls.map((e) => e.mesh);
  }

  collectEnergy(index: number): void {
    if (index >= 0 && index < this.energyBalls.length) {
      const ball = this.energyBalls[index];
      ball.collected = true;
      ball.respawnTimer = 5;
      ball.mesh.visible = false;
      if (ball.lowMesh) ball.lowMesh.visible = false;
      ball.glow.visible = false;
      eventBus.emit('track:energyCollected', { index });
    }
  }

  update(time: number, delta: number, viewerPosition?: THREE.Vector3): void {
    this.trackMaterial.uniforms.uTime.value = time;
    this.flowMaterial.uniforms.uTime.value = time;

    this.trackGroup.children.forEach((child) => {
      if ((child as any)._mat) {
        (child as any)._mat.uniforms.uTime.value = time;
      }
    });

    this.animateFlowParticles(time, delta);

    this.obstacles.forEach((obs) => {
      if (obs.type === 'laser') {
        obs.boulderMesh!.rotation.y += obs.rotationSpeed * delta;
        if (obs.lowMesh) obs.lowMesh.rotation.y = obs.boulderMesh!.rotation.y;
      }
      if (obs.type === 'fence') {
        const swing = Math.sin(time * obs.moveSpeed + obs.moveOffset) * 2.5;
        const tangent = this.getTangentOnTrack(0).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const perp = new THREE.Vector3().crossVectors(tangent, up).normalize();
        obs.mesh.position.x = obs.basePosition.x + perp.x * swing;
        obs.mesh.position.z = obs.basePosition.z + perp.z * swing;
      }
      obs.box.setFromObject(obs.mesh);

      if (viewerPosition) {
        const dist = obs.mesh.position.distanceTo(viewerPosition);
        if (obs.lowMesh) {
          const useLow = dist > 70;
          obs.boulderMesh!.visible = !useLow;
          obs.lowMesh.visible = useLow;
        }
      }
    });

    this.energyBalls.forEach((ball) => {
      if (ball.collected) {
        ball.respawnTimer -= delta;
        if (ball.respawnTimer <= 0) {
          ball.collected = false;
          ball.mesh.visible = true;
          if (ball.lowMesh) ball.lowMesh.visible = true;
          ball.glow.visible = true;
        }
      } else {
        const pulse = Math.sin(time * (Math.PI * 2 / 1.5)) * 0.35 + 1.0;
        ball.mesh.scale.setScalar(pulse);
        if (ball.lowMesh) ball.lowMesh.scale.setScalar(pulse);
        ball.glow.scale.setScalar(pulse * 1.6);
        (ball.glow.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(time * 4) * 0.07;
        ball.mesh.position.y = ball.glow.position.y + Math.sin(time * 2) * 0.2;
        if (ball.lowMesh) ball.lowMesh.position.y = ball.mesh.position.y;
        ball.box.setFromObject(ball.mesh);

        if (viewerPosition) {
          const dist = ball.mesh.position.distanceTo(viewerPosition);
          if (ball.lowMesh) {
            const useLow = dist > 50;
            ball.mesh.visible = !useLow;
            ball.lowMesh.visible = useLow;
          }
        }
      }
    });
  }

  private animateFlowParticles(time: number, delta: number): void {
    const positions = this.flowParticles.geometry.attributes.position.array as Float32Array;
    const ts = this.flowParticles.geometry.attributes.aT.array as Float32Array;
    const randoms = this.flowParticles.geometry.attributes.aRandom.array as Float32Array;
    const offsets = this.flowParticles.geometry.attributes.aOffset.array as Float32Array;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
      const speed = 0.05 * (0.3 + randoms[i] * 0.7);
      ts[i] = (ts[i] + speed * delta) % 1;
      const p = this.getPointOnTrack(ts[i], offsets[i]);
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y + 0.3 + Math.sin(time * 2 + randoms[i] * 6.28) * 0.2;
      positions[i * 3 + 2] = p.z;
    }
    this.flowParticles.geometry.attributes.position.needsUpdate = true;
  }

  getCenterCurve(): THREE.CatmullRomCurve3 {
    return this.centerCurve;
  }

  getStartPosition(idx: number): THREE.Vector3 {
    const t = 0.002;
    const offset = (idx === 0 ? -1 : 1) * 1.8;
    return this.getPointOnTrack(t, offset);
  }

  getStartRotation(idx: number): number {
    const t = 0.002;
    const tangent = this.getTangentOnTrack(t);
    return Math.atan2(tangent.x, tangent.z);
  }
}
