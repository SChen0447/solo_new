import * as THREE from 'three';

export type FossilType = 'trilobite' | 'ammonite' | 'brachiopod';

export interface FossilData {
  id: string;
  type: FossilType;
  position: THREE.Vector3;
  depth: number;
  layerName: string;
  timestamp: number;
}

export interface FossilMarker {
  data: FossilData;
  group: THREE.Group;
  postMesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  iconSprite: THREE.Sprite;
  depthSprite: THREE.Sprite;
  targetPostHeight: number;
  isAnimatingIn: boolean;
  animationStartTime: number;
  isHighlighted: boolean;
  highlightStartTime: number;
  iconAngle: number;
}

const FOSSIL_TYPES: FossilType[] = ['trilobite', 'ammonite', 'brachiopod'];
const FOSSIL_LABELS: Record<FossilType, string> = {
  trilobite: '三叶虫',
  ammonite: '菊石',
  brachiopod: '腕足类'
};

export class FossilManager {
  public group: THREE.Group = new THREE.Group();
  private fossils: Map<string, FossilMarker> = new Map();
  private groundY: number = 0;
  private maxFossils: number = 20;

  constructor(groundY: number = 0) {
    this.groundY = groundY;
  }

  public setGroundY(y: number): void {
    this.groundY = y;
  }

  public getFossilTypeLabel(t: FossilType): string {
    return FOSSIL_LABELS[t];
  }

  public addFossil(position: THREE.Vector3, layerName: string): FossilData | null {
    if (this.fossils.size >= this.maxFossils) return null;

    const id = this.generateId();
    const type = FOSSIL_TYPES[Math.floor(Math.random() * FOSSIL_TYPES.length)];
    const depth = parseFloat((this.groundY - position.y).toFixed(1));

    const marker = this.createFossilMarker(id, type, position, depth, layerName);
    this.fossils.set(id, marker);
    this.group.add(marker.group);

    return marker.data;
  }

  public removeFossil(id: string): boolean {
    const marker = this.fossils.get(id);
    if (!marker) return false;

    this.group.remove(marker.group);
    marker.group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      } else if (child instanceof THREE.Sprite) {
        if ((child.material as THREE.SpriteMaterial).map) {
          (child.material as THREE.SpriteMaterial).map!.dispose();
        }
        child.material.dispose();
      }
    });
    this.fossils.delete(id);
    return true;
  }

  public getFossilList(): FossilData[] {
    return Array.from(this.fossils.values()).map(m => ({
      ...m.data,
      position: m.data.position.clone()
    }));
  }

  public highlightFossil(id: string, highlighted: boolean): void {
    const marker = this.fossils.get(id);
    if (!marker) return;
    marker.isHighlighted = highlighted;
    marker.highlightStartTime = performance.now();
  }

  public getFossilIconCanvas(type: FossilType): HTMLCanvasElement {
    return this.drawFossilIconCanvas(type, 256, 256);
  }

  private createFossilMarker(
    id: string,
    type: FossilType,
    position: THREE.Vector3,
    depth: number,
    layerName: string
  ): FossilMarker {
    const group = new THREE.Group();
    group.position.copy(position);

    const postHeight = 0.2;

    const postGeo = new THREE.CylinderGeometry(0.055, 0.08, postHeight, 14);
    const postMat = new THREE.MeshBasicMaterial({
      color: 0xff8833,
      transparent: true,
      opacity: 0.78
    });
    const postMesh = new THREE.Mesh(postGeo, postMat);
    postMesh.scale.y = 0.001;
    postMesh.visible = false;
    group.add(postMesh);

    const glowGeo = new THREE.CylinderGeometry(0.11, 0.14, postHeight * 1.3, 14);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.scale.y = 0.001;
    glowMesh.visible = false;
    group.add(glowMesh);

    const iconCanvas = this.drawFossilIconCanvas(type, 256, 256);
    const iconTex = new THREE.CanvasTexture(iconCanvas);
    iconTex.minFilter = THREE.LinearFilter;
    iconTex.magFilter = THREE.LinearFilter;
    iconTex.needsUpdate = true;
    const iconMat = new THREE.SpriteMaterial({
      map: iconTex,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    const iconSprite = new THREE.Sprite(iconMat);
    iconSprite.scale.setScalar(0.001);
    iconSprite.visible = false;
    group.add(iconSprite);

    const depthCanvas = this.drawDepthLabelCanvas(depth);
    const depthTex = new THREE.CanvasTexture(depthCanvas);
    depthTex.minFilter = THREE.LinearFilter;
    depthTex.magFilter = THREE.LinearFilter;
    depthTex.needsUpdate = true;
    const depthMat = new THREE.SpriteMaterial({
      map: depthTex,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    const depthSprite = new THREE.Sprite(depthMat);
    depthSprite.scale.set(0.001, 0.001, 1);
    depthSprite.visible = false;
    group.add(depthSprite);

    const data: FossilData = {
      id,
      type,
      position: position.clone(),
      depth,
      layerName,
      timestamp: Date.now()
    };

    return {
      data,
      group,
      postMesh,
      glowMesh,
      iconSprite,
      depthSprite,
      targetPostHeight: postHeight,
      isAnimatingIn: true,
      animationStartTime: performance.now(),
      isHighlighted: false,
      highlightStartTime: 0,
      iconAngle: 0
    };
  }

  private drawFossilIconCanvas(type: FossilType, w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);

    const s = w / 200;
    ctx.save();
    ctx.scale(s, s);

    switch (type) {
      case 'trilobite': this.drawTrilobite(ctx); break;
      case 'ammonite': this.drawAmmonite(ctx); break;
      case 'brachiopod': this.drawBrachiopod(ctx); break;
    }
    ctx.restore();
    return canvas;
  }

  private drawTrilobite(ctx: CanvasRenderingContext2D): void {
    const cx = 100, cy = 100;

    const g = ctx.createRadialGradient(cx, 60, 10, cx, cy, 95);
    g.addColorStop(0, '#ffe29a');
    g.addColorStop(0.5, '#e09a3a');
    g.addColorStop(1, '#7a4212');

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 64, 82, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#4a2907';
    ctx.stroke();

    ctx.strokeStyle = '#5a3310';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, 22);
    ctx.lineTo(cx, 180);
    ctx.stroke();

    const segYs = [54, 88, 122, 156];
    ctx.lineWidth = 2.2;
    for (const sy of segYs) {
      ctx.beginPath();
      const len = 58 + (sy > 100 ? (156 - sy) * 0.15 : 0);
      ctx.moveTo(cx - len, sy);
      for (let x = -len; x <= len; x += 14) {
        const off = Math.sin(x * 0.09 + sy * 0.02) * 2.5;
        ctx.lineTo(cx + x, sy + off);
      }
      ctx.stroke();
    }

    ctx.fillStyle = '#fff3d4';
    ctx.strokeStyle = '#5a3310';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(cx, 34, 16, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#221608';
    ctx.beginPath();
    ctx.arc(cx - 6, 32, 3.2, 0, Math.PI * 2);
    ctx.arc(cx + 6, 32, 3.2, 0, Math.PI * 2);
    ctx.fill();

    const spineOffsets = [[-54, 100], [54, 100], [-52, 62], [52, 62], [-48, 138], [48, 138]];
    ctx.strokeStyle = '#4a2907';
    ctx.lineWidth = 2.2;
    for (const [ox, oy] of spineOffsets) {
      ctx.beginPath();
      const dx = ox < 0 ? -18 : 18;
      ctx.moveTo(cx + ox, oy);
      ctx.lineTo(cx + ox + dx, oy - 4 + (ox < 0 ? -4 : 2));
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawAmmonite(ctx: CanvasRenderingContext2D): void {
    const cx = 100, cy = 108;

    const g = ctx.createRadialGradient(75, 75, 15, cx, cy, 88);
    g.addColorStop(0, '#ffb07a');
    g.addColorStop(0.45, '#d55530');
    g.addColorStop(1, '#661a10');

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 82, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3a0f08';
    ctx.stroke();

    ctx.strokeStyle = '#3a0f08';
    const drawSpiral = (maxR: number, lw: number, op: number) => {
      ctx.save();
      ctx.lineWidth = lw;
      ctx.globalAlpha = op;
      ctx.beginPath();
      const a0 = 0.55, b = 0.155;
      const step = 0.045;
      let first = true;
      for (let th = 0; th <= maxR; th += step) {
        const r = a0 * Math.exp(b * th);
        if (r > 80) break;
        const x = cx + Math.cos(th + 2.35) * r;
        const y = cy + Math.sin(th + 2.35) * r;
        if (first) { ctx.moveTo(x, y); first = false; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };
    drawSpiral(20, 2.8, 0.78);
    drawSpiral(16.5, 2.2, 0.58);
    drawSpiral(13, 1.8, 0.42);
    drawSpiral(9.5, 1.4, 0.3);

    ctx.fillStyle = '#2a0a05';
    ctx.beginPath();
    ctx.arc(cx + 1, cy - 11, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a1a10';
    ctx.beginPath();
    ctx.arc(cx + 1, cy - 11, 4.5, 0, Math.PI * 2);
    ctx.fill();

    const suturePoints = [
      [28, 60], [30, 118], [62, 30], [152, 56], [164, 110], [126, 170], [76, 172]
    ];
    ctx.strokeStyle = '#3a0f08';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.55;
    for (const [sx, sy] of suturePoints) {
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const ang = k * 1.2;
        const rr = 2 + k * 2.2;
        const x = sx + Math.cos(ang) * rr;
        const y = sy + Math.sin(ang * 0.8) * rr;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBrachiopod(ctx: CanvasRenderingContext2D): void {
    const cx = 100, cy = 105;

    const g = ctx.createLinearGradient(cx, 25, cx, 175);
    g.addColorStop(0, '#f2d095');
    g.addColorStop(0.5, '#b3864c');
    g.addColorStop(1, '#5a3d1e');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, 25);
    ctx.bezierCurveTo(165, 45, 170, 102, 165, 152);
    ctx.bezierCurveTo(158, 176, cx, 186, cx, 186);
    ctx.bezierCurveTo(cx, 186, 42, 176, 35, 152);
    ctx.bezierCurveTo(30, 102, 35, 45, cx, 25);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#3a2810';
    ctx.stroke();

    ctx.strokeStyle = '#4a3516';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, 28);
    ctx.lineTo(cx, 184);
    ctx.stroke();

    ctx.fillStyle = '#3a2810';
    ctx.beginPath();
    ctx.ellipse(cx, 20, 9, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    const ribArcs: Array<[number, number, number, number]> = [
      [cx, 160, 54, 58, 122],
      [cx, 128, 60, 52, 128],
      [cx, 92, 62, 50, 130],
      [cx, 58, 50, 48, 132]
    ];
    ctx.strokeStyle = '#4a3516';
    ctx.globalAlpha = 0.6;
    for (const [ay, axR, s, e] of ribArcs as any) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ay, axR, s, (e * Math.PI) / 180, (180 - e * 0.25) * Math.PI / 180);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const radialRibs = 16;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.42;
    for (let r = 0; r < radialRibs; r++) {
      const ang = -Math.PI / 2 + (r - radialRibs / 2) * 0.08 + (r % 2 === 0 ? -0.02 : 0.03);
      const startR = 22;
      const endR = 62 + Math.sin(r * 1.3) * 6;
      ctx.strokeStyle = r % 3 === 0 ? '#5a4220' : '#4a3516';
      ctx.lineWidth = r % 4 === 0 ? 1.8 : 1.1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * startR, 100 + Math.sin(ang) * startR);
      ctx.lineTo(cx + Math.cos(ang) * endR, 100 + Math.sin(ang) * endR);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawDepthLabelCanvas(depth: number): HTMLCanvasElement {
    const w = 260, h = 70;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);

    const pad = 6, r = 14;
    ctx.fillStyle = 'rgba(8, 12, 20, 0.82)';
    ctx.strokeStyle = '#5a8fd4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad + r, pad);
    ctx.lineTo(w - pad - r, pad);
    ctx.quadraticCurveTo(w - pad, pad, w - pad, pad + r);
    ctx.lineTo(w - pad, h - pad - r);
    ctx.quadraticCurveTo(w - pad, h - pad, w - pad - r, h - pad);
    ctx.lineTo(pad + r, h - pad);
    ctx.quadraticCurveTo(pad, h - pad, pad, h - pad - r);
    ctx.lineTo(pad, pad + r);
    ctx.quadraticCurveTo(pad, pad, pad + r, pad);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#9ec9ff';
    ctx.font = 'bold 26px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`深度 ${depth.toFixed(1)} m`, w / 2, h / 2);

    return canvas;
  }

  public update(deltaTime: number, camera: THREE.Camera): void {
    const now = performance.now();

    for (const marker of this.fossils.values()) {
      if (marker.isAnimatingIn) {
        const elapsed = (now - marker.animationStartTime) / 1000;
        const duration = 0.5;

        if (elapsed >= duration) {
          marker.isAnimatingIn = false;
          marker.postMesh.scale.y = 1;
          marker.postMesh.position.y = marker.targetPostHeight / 2;
          marker.postMesh.visible = true;
          marker.glowMesh.scale.y = 1;
          marker.glowMesh.position.y = marker.targetPostHeight / 2;
          marker.glowMesh.visible = true;
          (marker.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0;
          marker.iconSprite.scale.setScalar(0.5);
          marker.iconSprite.position.y = marker.targetPostHeight + 0.28;
          marker.iconSprite.visible = true;
          marker.depthSprite.scale.set(0.85, 0.22, 1);
          marker.depthSprite.position.y = marker.targetPostHeight + 0.1;
          marker.depthSprite.visible = true;
        } else {
          const t = elapsed / duration;
          const eased = this.easeOutBack(t);
          const curH = marker.targetPostHeight * eased;

          marker.postMesh.visible = true;
          marker.postMesh.scale.y = Math.max(0.001, eased);
          marker.postMesh.position.y = curH / 2;

          marker.glowMesh.visible = true;
          marker.glowMesh.scale.y = Math.max(0.001, eased);
          marker.glowMesh.position.y = curH / 2;
          const glowFade = Math.pow(1 - t, 1.6);
          (marker.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * glowFade + 0.08;

          if (t > 0.32) {
            const iconT = Math.min(1, (t - 0.32) / 0.4);
            const iconEase = this.easeOutCubic(iconT);
            marker.iconSprite.visible = true;
            marker.iconSprite.scale.setScalar(0.5 * iconEase);
            marker.iconSprite.position.y = curH + 0.28;
            marker.iconSprite.material.opacity = iconEase;

            marker.depthSprite.visible = true;
            const dScaleX = 0.85 * iconEase;
            const dScaleY = 0.22 * iconEase;
            marker.depthSprite.scale.set(dScaleX, dScaleY, 1);
            marker.depthSprite.position.y = curH + 0.1;
            marker.depthSprite.material.opacity = iconEase;
          }
        }
      }

      if (marker.highlightStartTime > 0 || marker.isHighlighted) {
        const elapsed = (now - marker.highlightStartTime) / 1000;
        let t: number;
        if (marker.isHighlighted) {
          t = Math.min(1, elapsed / 0.3);
        } else {
          t = Math.max(0, 1 - elapsed / 0.3);
          if (t === 0) marker.highlightStartTime = 0;
        }
        const scale = 1 + 0.2 * t;
        marker.group.scale.setScalar(scale);

        const gold = new THREE.Color(0xffd700);
        const orig = new THREE.Color(0xff8833);
        const col = orig.clone().lerp(gold, t);
        (marker.postMesh.material as THREE.MeshBasicMaterial).color.copy(col);
        (marker.glowMesh.material as THREE.MeshBasicMaterial).color.copy(col).lerp(new THREE.Color(0xfff0aa), t * 0.5);
        (marker.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.28 + t * 0.35;
      }

      marker.iconAngle += deltaTime * 0.6;
      const spriteMat = marker.iconSprite.material as THREE.SpriteMaterial;
      spriteMat.rotation = marker.iconAngle;

      const dirToCam = new THREE.Vector3().subVectors(camera.position, marker.group.position);
      const depthFwd = new THREE.Vector3(dirToCam.x, 0, dirToCam.z).normalize();
      const billboardQ = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      const targetQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), depthFwd.lengthSq() > 0 ? depthFwd : new THREE.Vector3(0, 0, 1));
      marker.depthSprite.quaternion.copy(targetQ);
    }
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private generateId(): string {
    return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
