import * as THREE from 'three';
import { EventBus, SimParams, WaveRadii } from './eventBus';
import { P_SPEED, S_SPEED } from './earthquakeSource';

interface LayerSpec {
  name: string;
  color: THREE.Color;
  yTop: number;
  thickness: number;
  waveSpeedFactor: number;
}

interface MassPoint {
  pos: THREE.Vector3;
  basePos: THREE.Vector3;
  arrow: THREE.ArrowHelper;
  layer: number;
  phase: number;
}

export class GeologicalLayer {
  private scene: THREE.Scene;
  private bus: EventBus;
  private group = new THREE.Group();

  private params: SimParams | null = null;
  private simulating = false;
  private elapsed = 0;
  private dispAcc = 0;
  private rayAcc = 0;
  private radii: WaveRadii = { pRadius: 0, sRadius: 0, lRadius: 0, time: 0 };

  private layers: LayerSpec[] = [];
  private layerMeshes: THREE.Mesh[] = [];
  private rayPLine!: THREE.Line;
  private raySLine!: THREE.Line;
  private massPoints: MassPoint[] = [];
  private surfaceGrid!: THREE.GridHelper;
  private haloLight!: THREE.PointLight;

  private readonly TOTAL_THICKNESS = 140;

  constructor(scene: THREE.Scene, bus: EventBus) {
    this.scene = scene;
    this.bus = bus;
    this.scene.add(this.group);
    this.defineLayers();
    this.initializeLayers();
    this.createSurfaceGrid();
    this.createRays();
    this.createMassPoints();
    this.createHalo();
    this.setupListeners();
  }

  private defineLayers(): void {
    const ratioTotal = 2 + 3 + 2;
    const unit = this.TOTAL_THICKNESS / ratioTotal;
    this.layers = [
      { name: 'crust', color: new THREE.Color(0x3db87b), yTop: 0, thickness: unit * 2, waveSpeedFactor: 1.0 },
      { name: 'mantle', color: new THREE.Color(0xff8a3d), yTop: -unit * 2, thickness: unit * 3, waveSpeedFactor: 1.35 },
      { name: 'outerCore', color: new THREE.Color(0xe94560), yTop: -(unit * 2 + unit * 3), thickness: unit * 2, waveSpeedFactor: 0.75 }
    ];
  }

  private createRippleTexture(baseColor: THREE.Color): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d')!;
    const base = `rgb(${Math.floor(baseColor.r * 255)},${Math.floor(baseColor.g * 255)},${Math.floor(baseColor.b * 255)})`;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.04 + i * 0.01})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const y = 256 + Math.sin(x * 0.015 + i) * (10 + i * 4);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    return t;
  }

  private initializeLayers(): void {
    const layerSize = 240;
    for (const layer of this.layers) {
      const tex = this.createRippleTexture(layer.color);
      const uniforms = {
        uTexture: { value: tex },
        uTime: { value: 0 },
        uColor: { value: layer.color.clone() },
        uOpacity: { value: 0.4 }
      };
      const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vPos;
          uniform float uTime;
          void main(){
            vUv = uv;
            vPos = position;
            vec3 p = position;
            float w = sin(position.x*0.05 + uTime*0.8) * cos(position.z*0.06 + uTime*0.6) * 0.35;
            p.y += w;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          varying vec3 vPos;
          uniform sampler2D uTexture;
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uTime;
          void main(){
            vec2 uv = vUv;
            uv.y += uTime * 0.03;
            uv.x += sin(uv.y * 20.0 + uTime) * 0.008;
            vec4 t = texture2D(uTexture, uv);
            float edge = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
            vec3 col = mix(uColor, t.rgb, 0.45);
            float scan = 0.03 * max(0.0, sin((vUv.y + uTime*0.05) * 160.0));
            col += vec3(scan);
            gl_FragColor = vec4(col, uOpacity * (0.6 + edge*0.4));
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const geom = new THREE.PlaneGeometry(layerSize, layerSize, 48, 48);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = layer.yTop - 0.1;
      mesh.renderOrder = 1;
      this.group.add(mesh);
      this.layerMeshes.push(mesh);

      const borderGeom = new THREE.RingGeometry(layerSize / 2 - 0.5, layerSize / 2, 128);
      const borderMat = new THREE.MeshBasicMaterial({
        color: layer.color,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const border = new THREE.Mesh(borderGeom, borderMat);
      border.rotation.x = -Math.PI / 2;
      border.position.y = layer.yTop - 0.05;
      this.group.add(border);
    }

    this.addLayerLabels();
  }

  private addLayerLabels(): void {
    const labels: [string, number, THREE.Color][] = [
      ['CRUST 地壳', this.layers[0].yTop - this.layers[0].thickness / 2, this.layers[0].color],
      ['MANTLE 地幔', this.layers[1].yTop - this.layers[1].thickness / 2, this.layers[1].color],
      ['OUTER CORE 外核', this.layers[2].yTop - this.layers[2].thickness / 2, this.layers[2].color]
    ];
    for (const [text, y, color] of labels) {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 64;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, 512, 64);
      ctx.font = 'bold 26px sans-serif';
      ctx.fillStyle = `rgba(${color.r*255},${color.g*255},${color.b*255},0.95)`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = `rgba(${color.r*255},${color.g*255},${color.b*255},0.8)`;
      ctx.shadowBlur = 14;
      ctx.fillText(text, 256, 32);
      const tex = new THREE.CanvasTexture(c);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false
      }));
      spr.position.set(-95, y, -95);
      spr.scale.set(36, 4.5, 1);
      this.group.add(spr);
    }
  }

  private createSurfaceGrid(): void {
    this.surfaceGrid = new THREE.GridHelper(240, 48, 0x3ddbd9, 0x1e4569);
    (this.surfaceGrid.material as THREE.Material).transparent = true;
    (this.surfaceGrid.material as THREE.Material).opacity = 0.35;
    this.surfaceGrid.position.y = 0.02;
    this.group.add(this.surfaceGrid);

    const surfPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshBasicMaterial({
        color: 0x0f3460,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide
      })
    );
    surfPlane.rotation.x = -Math.PI / 2;
    surfPlane.position.y = -0.01;
    this.group.add(surfPlane);
  }

  private createRays(): void {
    const emptyGeom = new THREE.BufferGeometry();
    emptyGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 60), 3));
    this.rayPLine = new THREE.Line(
      emptyGeom,
      new THREE.LineBasicMaterial({
        color: 0x3ddbd9,
        transparent: true,
        opacity: 0.9,
        linewidth: 2,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.rayPLine.visible = false;
    this.raySLine = new THREE.Line(
      emptyGeom.clone(),
      new THREE.LineBasicMaterial({
        color: 0xff8a3d,
        transparent: true,
        opacity: 0.9,
        linewidth: 2,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.raySLine.visible = false;
    this.group.add(this.rayPLine);
    this.group.add(this.raySLine);
  }

  private createMassPoints(): void {
    const samplePoints: Array<[number, number, number]> = [];
    for (const layer of this.layers) {
      const y = layer.yTop - layer.thickness * 0.2;
      const y2 = layer.yTop - layer.thickness * 0.7;
      for (const r of [20, 45, 75]) {
        for (const ang of [0, Math.PI / 3, 2 * Math.PI / 3, Math.PI, 4 * Math.PI / 3, 5 * Math.PI / 3]) {
          samplePoints.push([Math.cos(ang) * r, y, Math.sin(ang) * r]);
          samplePoints.push([Math.cos(ang + 0.4) * (r + 10), y2, Math.sin(ang + 0.4) * (r + 10)]);
        }
      }
    }
    for (let i = 0; i < samplePoints.length; i++) {
      const [x, y, z] = samplePoints[i];
      const pos = new THREE.Vector3(x, y, z);
      const color = new THREE.Color(0xffffff);
      const dir = new THREE.Vector3(0, 1, 0);
      const arrow = new THREE.ArrowHelper(dir, pos.clone(), 3, color.getHex(), 1.4, 0.9);
      const idx = this.layers.findIndex(l => y <= l.yTop && y >= l.yTop - l.thickness);
      this.group.add(arrow);
      this.massPoints.push({
        pos: pos.clone(),
        basePos: pos.clone(),
        arrow,
        layer: idx < 0 ? 0 : idx,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  private createHalo(): void {
    this.haloLight = new THREE.PointLight(0xe94560, 1.2, 120, 1.8);
    this.haloLight.position.set(0, -15, 0);
    this.group.add(this.haloLight);
  }

  private setupListeners(): void {
    this.bus.on('params:changed', (p) => this.onParamsChanged(p));
    this.bus.on('simulation:start', (p) => this.onStart(p));
    this.bus.on('simulation:complete', () => this.onComplete());
    this.bus.on('wavefront:update', (r) => { this.radii = r; });
  }

  private onParamsChanged(p: SimParams): void {
    this.haloLight.position.set(0, -p.depth, 0);
  }

  private onStart(p: SimParams): void {
    this.params = p;
    this.simulating = true;
    this.elapsed = 0;
    this.dispAcc = 0;
    this.rayAcc = 0;
    this.haloLight.position.set(0, -p.depth, 0);
    this.haloLight.intensity = 2.4;
    this.rayPLine.visible = p.waveTypes.has('P');
    this.raySLine.visible = p.waveTypes.has('S');
    this.buildRayPath(p, 0);
  }

  private onComplete(): void {
    setTimeout(() => {
      this.simulating = false;
      this.haloLight.intensity = 1.2;
    }, 1200);
  }

  private buildRayPath(p: SimParams, time: number): void {
    const source = new THREE.Vector3(0, -p.depth, 0);
    const angles = [Math.PI / 3.2, Math.PI / 2 - 0.25, Math.PI / 2 - 0.05];

    for (const [line, speed, enabled] of [
      [this.rayPLine, P_SPEED, p.waveTypes.has('P')],
      [this.raySLine, S_SPEED, p.waveTypes.has('S')]
    ] as const) {
      if (!enabled) continue;
      const allPts: number[] = [];
      for (const ang of angles) {
        const pts = this.traceRay(source, ang, speed * Math.max(0, time), 0);
        for (let i = 0; i < pts.length; i++) {
          allPts.push(pts[i].x, pts[i].y, pts[i].z);
        }
      }
      const geom = line.geometry as THREE.BufferGeometry;
      let arr = geom.getAttribute('position') as THREE.BufferAttribute;
      if (!arr || arr.array.length < allPts.length) {
        arr = new THREE.BufferAttribute(new Float32Array(allPts.length), 3);
        geom.setAttribute('position', arr);
      }
      for (let i = 0; i < allPts.length; i++) (arr.array as Float32Array)[i] = allPts[i];
      geom.setDrawRange(0, allPts.length / 3);
      arr.needsUpdate = true;
    }
  }

  private traceRay(start: THREE.Vector3, startAngleFromUp: number, lengthRemaining: number, _depth: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [start.clone()];
    let pos = start.clone();
    let dir = new THREE.Vector3(Math.sin(startAngleFromUp), -Math.cos(startAngleFromUp), 0).normalize();
    let remain = lengthRemaining;
    let layerIdx = this.layerAt(pos.y);

    while (remain > 0 && layerIdx >= 0 && layerIdx < this.layers.length) {
      const layer = this.layers[layerIdx];
      const layerBottom = layer.yTop - layer.thickness;
      let t = Infinity;
      let hitY = pos.y;
      if (dir.y < 0) {
        const ty = (layerBottom - pos.y) / dir.y;
        if (ty > 0 && ty < t) { t = ty; hitY = layerBottom; }
      } else if (dir.y > 0) {
        const ty = (layer.yTop - pos.y) / dir.y;
        if (ty > 0 && ty < t) { t = ty; hitY = layer.yTop; }
      }
      const horizLimit = 115;
      if (dir.x !== 0) {
        const txXPos = (horizLimit - pos.x) / dir.x;
        const txXNeg = (-horizLimit - pos.x) / dir.x;
        for (const tx of [txXPos, txXNeg]) {
          if (tx > 0 && tx < t) { t = tx; }
        }
      }
      if (t === Infinity) t = remain;
      const dist = Math.min(t, remain);
      const newPos = pos.clone().addScaledVector(dir, dist);
      pts.push(newPos.clone());
      pos = newPos;
      remain -= dist;
      if (remain <= 0) break;
      if (Math.abs(pos.y - hitY) < 0.01 && (dir.y !== 0)) {
        const enteringIdx = dir.y < 0 ? layerIdx + 1 : layerIdx - 1;
        if (enteringIdx < 0 || enteringIdx >= this.layers.length) break;
        const v1 = this.layers[layerIdx].waveSpeedFactor;
        const v2 = this.layers[enteringIdx].waveSpeedFactor;
        const horiz = new THREE.Vector3(dir.x, 0, dir.z);
        const horizLen = horiz.length();
        if (horizLen < 1e-6) {
          layerIdx = enteringIdx;
          continue;
        }
        const sinTheta1 = horizLen;
        let sinTheta2 = sinTheta1 * (v2 / v1);
        if (sinTheta2 >= 1) {
          dir = new THREE.Vector3(dir.x, -dir.y, dir.z).normalize();
          continue;
        }
        const cosTheta2 = Math.sqrt(1 - sinTheta2 * sinTheta2);
        const ny = dir.y < 0 ? -cosTheta2 : cosTheta2;
        horiz.normalize().multiplyScalar(sinTheta2);
        dir = new THREE.Vector3(horiz.x, ny, horiz.z).normalize();
        layerIdx = enteringIdx;
      } else {
        break;
      }
    }
    return pts;
  }

  private layerAt(y: number): number {
    for (let i = 0; i < this.layers.length; i++) {
      const l = this.layers[i];
      if (y <= l.yTop + 0.01 && y >= l.yTop - l.thickness) return i;
    }
    if (y > 0) return 0;
    return this.layers.length - 1;
  }

  update(dt: number): void {
    this.haloLight.intensity = this.simulating
      ? 1.6 + Math.sin(performance.now() * 0.006) * 0.7
      : 1.0 + Math.sin(performance.now() * 0.002) * 0.2;

    for (let i = 0; i < this.layerMeshes.length; i++) {
      const m = this.layerMeshes[i];
      const mat = m.material as THREE.ShaderMaterial;
      if (mat.uniforms && mat.uniforms.uTime) {
        mat.uniforms.uTime.value += dt;
      }
    }
    this.surfaceGrid.position.y = 0.02 + Math.sin(performance.now() * 0.0015) * 0.01;

    if (!this.simulating || !this.params) return;

    this.elapsed += dt;
    this.rayAcc += dt;
    if (this.rayAcc >= 0.05) {
      this.rayAcc = 0;
      this.buildRayPath(this.params, this.elapsed);
    }

    this.dispAcc += dt;
    if (this.dispAcc >= 0.2) {
      this.dispAcc = 0;
      this.updateDisplacementVectors();
    }
  }

  private updateDisplacementVectors(): void {
    const t = this.elapsed;
    const { pRadius, sRadius, lRadius } = this.radii;
    const src = new THREE.Vector3(0, -(this.params?.depth ?? 15), 0);
    const P_FREQ = 2.4;
    const S_FREQ = 1.4;
    const L_FREQ = 0.9;

    for (const mp of this.massPoints) {
      const distToSource = mp.basePos.distanceTo(src);
      const horizR = Math.sqrt(mp.basePos.x ** 2 + mp.basePos.z ** 2);
      const isSurface = mp.basePos.y >= -2;

      let displacement = new THREE.Vector3();

      if (pRadius > 0 && distToSource * 0.9 <= pRadius) {
        const falloff = Math.max(0, 1 - distToSource / Math.max(pRadius * 1.3, 1));
        const dir = mp.basePos.clone().sub(src).normalize();
        const phase = t * P_FREQ * Math.PI * 2 + distToSource * 0.15 + mp.phase;
        const mag = (2.5 + falloff * 4.5) * (0.7 + 0.3 * Math.sin(phase));
        displacement.addScaledVector(dir, mag);
      }
      if (sRadius > 0 && distToSource * 0.9 <= sRadius) {
        const falloff = Math.max(0, 1 - distToSource / Math.max(sRadius * 1.3, 1));
        const srcDir = mp.basePos.clone().sub(src).normalize();
        const tangent = new THREE.Vector3(-srcDir.y, srcDir.x, srcDir.z * 0.3).normalize();
        const phase = t * S_FREQ * Math.PI * 2 + distToSource * 0.22 + mp.phase + 0.8;
        const mag = (3 + falloff * 5) * (0.7 + 0.3 * Math.sin(phase));
        displacement.addScaledVector(tangent, mag);
      }
      if (lRadius > 0 && isSurface && horizR <= lRadius) {
        const falloff = Math.max(0, 1 - horizR / Math.max(lRadius * 1.3, 1));
        const horiz = new THREE.Vector3(mp.basePos.x, 0, mp.basePos.z);
        if (horiz.lengthSq() > 0.01) {
          const radial = horiz.normalize();
          const perp = new THREE.Vector3(-radial.z, 0, radial.x);
          const phase = t * L_FREQ * Math.PI * 2 + horizR * 0.28 + mp.phase;
          const ellipse = 1.2 + 0.6 * Math.sin(phase * 0.5);
          displacement.addScaledVector(radial, Math.sin(phase) * (3.5 + falloff * 5.5) * ellipse);
          displacement.addScaledVector(perp, Math.cos(phase * 0.8) * (2 + falloff * 3));
          displacement.y += Math.sin(phase * 1.4) * (2.5 + falloff * 3.5);
        }
      }

      const mag = displacement.length();
      if (mag < 0.01) {
        mp.arrow.setLength(0.1, 0.05, 0.03);
        mp.arrow.setDirection(new THREE.Vector3(0, 1, 0));
        (mp.arrow as any).cone.material.opacity = 0.08;
        (mp.arrow as any).line.material.opacity = 0.08;
      } else {
        const clampedMag = THREE.MathUtils.clamp(mag, 2, 5);
        const dir = displacement.clone().normalize();
        mp.arrow.setDirection(dir);
        mp.arrow.setLength(clampedMag, clampedMag * 0.45, clampedMag * 0.35);
        const opacity = THREE.MathUtils.clamp(0.4 + (clampedMag - 2) / 3 * 0.6, 0.4, 1);
        const coneMat = (mp.arrow as any).cone.material as THREE.Material;
        const lineMat = (mp.arrow as any).line.material as THREE.LineBasicMaterial;
        coneMat.transparent = true;
        lineMat.transparent = true;
        coneMat.opacity = opacity;
        lineMat.opacity = opacity;
      }
    }
  }

  dispose(): void {
    this.scene.remove(this.group);
    this.group.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose?.();
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(m => m.dispose());
      }
    });
  }
}
