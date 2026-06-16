import * as THREE from 'three';
import type { AnnotationData } from './modelLoader';

interface AnnotationSprite {
  sprite: THREE.Sprite;
  data: AnnotationData;
  baseScale: number;
  targetScale: number;
  currentScale: number;
  glowPhase: number;
}

export class AnnotationSystem {
  private camera: THREE.Camera;
  private annotations: AnnotationSprite[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredAnnotation: AnnotationSprite | null = null;
  private onAnnotationClick: ((data: AnnotationData) => void) | null = null;
  private labelEl: HTMLElement;
  private clock = new THREE.Clock();

  constructor(_scene: THREE.Scene, camera: THREE.Camera) {
    this.camera = camera;
    this.labelEl = document.getElementById('annotation-label')!;
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onClick = this.onClick.bind(this);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('click', this.onClick);
  }

  initAnnotations(
    modelGroup: THREE.Group,
    annotationData: AnnotationData[]
  ): void {
    annotationData.forEach((data) => {
      const sprite = this.createAnnotationSprite();
      sprite.position.set(data.position.x, data.position.y, data.position.z);

      modelGroup.add(sprite);

      const baseScale = 0.35;
      this.annotations.push({
        sprite,
        data,
        baseScale,
        targetScale: baseScale,
        currentScale: baseScale,
        glowPhase: Math.random() * Math.PI * 2,
      });
    });
  }

  private createAnnotationSprite(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;

    const outerGlow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 60);
    outerGlow.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
    outerGlow.addColorStop(0.5, 'rgba(255, 215, 0, 0.15)');
    outerGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = outerGlow;
    ctx.fillRect(0, 0, size, size);

    const innerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24);
    innerGlow.addColorStop(0, 'rgba(255, 230, 100, 0.95)');
    innerGlow.addColorStop(0.6, 'rgba(255, 215, 0, 0.7)');
    innerGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      sizeAttenuation: true,
    });

    return new THREE.Sprite(material);
  }

  setOnAnnotationClick(callback: (data: AnnotationData) => void): void {
    this.onAnnotationClick = callback;
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const sprites = this.annotations.map((a) => a.sprite);
    const intersects = this.raycaster.intersectObjects(sprites);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Sprite;
      const found = this.annotations.find((a) => a.sprite === hit);
      if (found && found !== this.hoveredAnnotation) {
        if (this.hoveredAnnotation) {
          this.hoveredAnnotation.targetScale = this.hoveredAnnotation.baseScale;
        }
        this.hoveredAnnotation = found;
        found.targetScale = found.baseScale * 1.25;
        document.body.style.cursor = 'pointer';

        this.labelEl.textContent = found.data.label;
        this.labelEl.classList.add('visible');
      }

      if (this.hoveredAnnotation) {
        const pos = this.hoveredAnnotation.sprite.position.clone();
        pos.project(this.camera);
        const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
        this.labelEl.style.left = `${x + 20}px`;
        this.labelEl.style.top = `${y - 10}px`;
      }
    } else {
      if (this.hoveredAnnotation) {
        this.hoveredAnnotation.targetScale = this.hoveredAnnotation.baseScale;
        this.hoveredAnnotation = null;
      }
      document.body.style.cursor = 'default';
      this.labelEl.classList.remove('visible');
    }
  }

  private onClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const sprites = this.annotations.map((a) => a.sprite);
    const intersects = this.raycaster.intersectObjects(sprites);

    if (intersects.length > 0 && this.onAnnotationClick) {
      const hit = intersects[0].object as THREE.Sprite;
      const found = this.annotations.find((a) => a.sprite === hit);
      if (found) {
        this.onAnnotationClick(found.data);
      }
    }
  }

  update(): void {
    const elapsed = this.clock.getElapsedTime();

    this.annotations.forEach((a) => {
      a.currentScale += (a.targetScale - a.currentScale) * 0.15;
      a.sprite.scale.set(a.currentScale, a.currentScale, 1);

      a.glowPhase += 0.03;
      const glowFactor = 1 + Math.sin(a.glowPhase) * 0.15;
      a.sprite.material.opacity = 0.7 + Math.sin(a.glowPhase) * 0.3;

      const s = a.currentScale * glowFactor;
      a.sprite.scale.set(s, s, 1);
    });
  }

  dispose(): void {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('click', this.onClick);
    this.annotations.forEach((a) => {
      a.sprite.material.map?.dispose();
      a.sprite.material.dispose();
    });
    this.annotations = [];
  }
}

export function showInfoCard(data: AnnotationData): void {
  const card = document.getElementById('info-card')!;
  const title = document.getElementById('card-title')!;
  const desc = document.getElementById('card-desc')!;
  const img = document.getElementById('card-image') as HTMLImageElement;

  title.textContent = data.title;
  desc.textContent = data.description;

  img.classList.remove('loaded');
  img.src = data.imageUrl;
  img.onload = () => {
    img.classList.add('loaded');
  };

  card.classList.add('visible');
}

export function hideInfoCard(): void {
  const card = document.getElementById('info-card')!;
  card.classList.remove('visible');
}
