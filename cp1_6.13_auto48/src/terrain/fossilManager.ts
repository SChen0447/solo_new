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
  iconSprite: THREE.Sprite;
  depthSprite: THREE.Sprite;
  targetPostHeight: number;
  currentPostHeight: number;
  isAnimatingIn: boolean;
  animationStartTime: number;
  isHighlighted: boolean;
  highlightStartTime: number;
  baseScale: number;
}

const FOSSIL_TYPES: FossilType[] = ['trilobite', 'ammonite', 'brachiopod'];

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

  public addFossil(
    position: THREE.Vector3,
    layerName: string
  ): FossilData | null {
    if (this.fossils.size >= this.maxFossils) {
      return null;
    }

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
    marker.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Sprite) {
        if (child.material.map) {
          child.material.map.dispose();
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
    const postGeometry = new THREE.CylinderGeometry(0.06, 0.08, postHeight, 12);
    const postMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8822,
      transparent: true,
      opacity: 0.85
    });
    const postMesh = new THREE.Mesh(postGeometry, postMaterial);
    postMesh.position.y = postHeight / 2;
    postMesh.visible = false;
    group.add(postMesh);

    const glowGeometry = new THREE.CylinderGeometry(0.1, 0.12, postHeight * 1.2, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.y = postHeight / 2;
    glowMesh.visible = false;
    group.add(glowMesh);

    const iconSprite = this.createFossilIcon(type);
    iconSprite.position.y = postHeight + 0.25;
    iconSprite.visible = false;
    group.add(iconSprite);

    const depthSprite = this.createDepthLabel(depth);
    depthSprite.position.y = postHeight + 0.08;
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
      iconSprite,
      depthSprite,
      targetPostHeight: postHeight,
      currentPostHeight: 0,
      isAnimatingIn: true,
      animationStartTime: performance.now(),
      isHighlighted: false,
      highlightStartTime: 0,
      baseScale: 1
    };
  }

  private createFossilIcon(type: FossilType): THREE.Sprite {
    const svgString = this.getFossilSVG(type);
    const canvas = this.svgToCanvas(svgString, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.5, 0.5, 1);

    return sprite;
  }

  private getFossilSVG(type: FossilType): string {
    const size = 200;
    const cx = size / 2;
    const cy = size / 2;

    switch (type) {
      case 'trilobite':
        return `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
            <defs>
              <radialGradient id="gradTri" cx="50%" cy="30%" r="70%">
                <stop offset="0%" style="stop-color:#ffcc66;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#cc7722;stop-opacity:1" />
              </radialGradient>
            </defs>
            <ellipse cx="100" cy="100" rx="65" ry="85" fill="url(#gradTri)" stroke="#885511" stroke-width="3"/>
            <line x1="100" y1="20" x2="100" y2="180" stroke="#885511" stroke-width="2.5"/>
            <line x1="35" y1="55" x2="165" y2="55" stroke="#885511" stroke-width="2"/>
            <line x1="35" y1="90" x2="165" y2="90" stroke="#885511" stroke-width="2"/>
            <line x1="35" y1="125" x2="165" y2="125" stroke="#885511" stroke-width="2"/>
            <line x1="35" y1="160" x2="165" y2="160" stroke="#885511" stroke-width="2"/>
            <circle cx="100" cy="30" r="12" fill="#ffeecc" stroke="#885511" stroke-width="2"/>
            <circle cx="90" cy="28" r="3" fill="#332211"/>
            <circle cx="110" cy="28" r="3" fill="#332211"/>
          </svg>
        `;

      case 'ammonite':
        return `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
            <defs>
              <radialGradient id="gradAmm" cx="40%" cy="40%" r="60%">
                <stop offset="0%" style="stop-color:#ff9966;stop-opacity:1" />
                <stop offset="60%" style="stop-color:#cc5533;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#883322;stop-opacity:1" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="105" r="80" fill="url(#gradAmm)" stroke="#552211" stroke-width="3"/>
            <path d="M 100 25 Q 150 30, 165 70 Q 175 110, 150 145 Q 115 175, 70 165 Q 35 150, 30 110 Q 28 75, 55 45 Q 80 25, 100 25 Z" 
                  fill="none" stroke="#552211" stroke-width="2.5" opacity="0.6"/>
            <path d="M 100 45 Q 135 50, 148 80 Q 155 110, 135 138 Q 105 162, 70 152 Q 45 142, 42 110 Q 40 82, 65 58 Q 85 45, 100 45 Z" 
                  fill="none" stroke="#552211" stroke-width="2" opacity="0.5"/>
            <path d="M 100 65 Q 122 70, 130 92 Q 135 112, 120 130 Q 98 145, 75 138 Q 55 130, 53 108 Q 52 88, 72 73 Q 88 65, 100 65 Z" 
                  fill="none" stroke="#552211" stroke-width="1.8" opacity="0.4"/>
            <path d="M 100 85 Q 112 88, 116 102 Q 118 115, 108 125 Q 95 132, 82 127 Q 68 120, 67 105 Q 66 92, 82 85 Q 92 83, 100 85 Z" 
                  fill="none" stroke="#552211" stroke-width="1.5" opacity="0.3"/>
          </svg>
        `;

      case 'brachiopod':
        return `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
            <defs>
              <linearGradient id="gradBrach" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#eebb88;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#997744;stop-opacity:1" />
              </linearGradient>
            </defs>
            <path d="M 100 30 Q 160 50, 165 110 Q 160 165, 100 180 Q 40 165, 35 110 Q 40 50, 100 30 Z" 
                  fill="url(#gradBrach)" stroke="#554422" stroke-width="3"/>
            <line x1="100" y1="30" x2="100" y2="180" stroke="#554422" stroke-width="2.5"/>
            <path d="M 75 55 Q 100 65, 125 55" fill="none" stroke="#554422" stroke-width="1.5" opacity="0.5"/>
            <path d="M 65 85 Q 100 100, 135 85" fill="none" stroke="#554422" stroke-width="1.5" opacity="0.5"/>
            <path d="M 55 120 Q 100 140, 145 120" fill="none" stroke="#554422" stroke-width="1.5" opacity="0.5"/>
            <path d="M 50 155 Q 100 170, 150 155" fill="none" stroke="#554422" stroke-width="1.5" opacity="0.5"/>
            <ellipse cx="100" cy="25" rx="8" ry="12" fill="#554422"/>
          </svg>
        `;

      default:
        return '';
    }
  }

  private svgToCanvas(svgString: string, width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.src = url;
    if (!img.complete) {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
      };
    } else {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
    }

    return canvas;
  }

  private createDepthLabel(depth: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 236, 44, 10);
    ctx.fill();

    ctx.fillStyle = '#aaddff';
    ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`深度: ${depth.toFixed(1)}`, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.8, 0.2, 1);

    return sprite;
  }

  public update(deltaTime: number, camera: THREE.Camera): void {
    const now = performance.now();

    for (const marker of this.fossils.values()) {
      if (marker.isAnimatingIn) {
        const elapsed = (now - marker.animationStartTime) / 1000;
        const duration = 0.5;

        if (elapsed >= duration) {
          marker.isAnimatingIn = false;
          marker.currentPostHeight = marker.targetPostHeight;
          marker.postMesh.visible = true;
          marker.postMesh.scale.y = 1;
          marker.iconSprite.visible = true;
          marker.depthSprite.visible = true;
        } else {
          const t = elapsed / duration;
          const eased = this.easeOutBack(t);
          const currentHeight = marker.targetPostHeight * eased;
          marker.currentPostHeight = currentHeight;

          marker.postMesh.visible = true;
          marker.postMesh.scale.y = eased;
          marker.postMesh.position.y = currentHeight / 2;

          const glowMesh = marker.group.children[1] as THREE.Mesh;
          if (glowMesh) {
            glowMesh.visible = true;
            glowMesh.scale.y = eased;
            glowMesh.position.y = currentHeight / 2;
            (glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - t);
          }

          if (t > 0.5) {
            const iconT = (t - 0.5) * 2;
            marker.iconSprite.visible = true;
            marker.iconSprite.scale.setScalar(0.5 * iconT);
            marker.iconSprite.position.y = currentHeight + 0.25;
            marker.depthSprite.visible = true;
            marker.depthSprite.scale.y = 0.2 * iconT;
            marker.depthSprite.position.y = currentHeight + 0.08;
          }
        }
      }

      if (marker.isHighlighted) {
        const elapsed = (now - marker.highlightStartTime) / 1000;
        const t = Math.min(elapsed / 0.3, 1);
        const scale = 1 + 0.2 * t;
        marker.group.scale.setScalar(scale);

        const postMat = marker.postMesh.material as THREE.MeshBasicMaterial;
        const goldR = 0xff / 255;
        const goldG = 0xd7 / 255;
        const goldB = 0x00 / 255;
        const origR = 0xff / 255;
        const origG = 0x88 / 255;
        const origB = 0x22 / 255;
        const r = origR + (goldR - origR) * t;
        const g = origG + (goldG - origG) * t;
        const b = origB + (goldB - origB) * t;
        postMat.color.setRGB(r, g, b);
      } else {
        const elapsed = (now - marker.highlightStartTime) / 1000;
        if (marker.highlightStartTime > 0 && elapsed < 0.3) {
          const t = 1 - Math.min(elapsed / 0.3, 1);
          const scale = 1 + 0.2 * t;
          marker.group.scale.setScalar(scale);
        } else {
          marker.group.scale.setScalar(1);
          const postMat = marker.postMesh.material as THREE.MeshBasicMaterial;
          postMat.color.setHex(0xff8822);
        }
      }

      marker.iconSprite.rotation += deltaTime * 0.5;
      marker.depthSprite.lookAt(camera.position);
    }
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private generateId(): string {
    return `fossil_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getFossilTypeLabel(type: FossilType): string {
    const labels: Record<FossilType, string> = {
      trilobite: '三叶虫',
      ammonite: '菊石',
      brachiopod: '腕足类'
    };
    return labels[type];
  }
}
