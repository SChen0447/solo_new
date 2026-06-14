import * as THREE from 'three';
import { BuildingData } from './CityGenerator';

const textureCache = new Map<string, THREE.CanvasTexture>();

function getWindowTextureKey(floors: number, isNight: boolean): string {
  return `${floors}_${isNight ? 'n' : 'd'}`;
}

function createWindowTexture(floors: number, isNight: boolean): THREE.CanvasTexture {
  const key = getWindowTextureKey(floors, isNight);
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }

  const canvas = document.createElement('canvas');
  const floorH = 16;
  const windowW = 12;
  const windowGap = 4;
  const windowsPerRow = 4;
  const canvasW = windowsPerRow * (windowW + windowGap) + windowGap;
  const canvasH = floors * floorH + 2;
  canvas.width = canvasW;
  canvas.height = canvasH;

  const ctx = canvas.getContext('2d')!;

  if (isNight) {
    ctx.fillStyle = '#1a1a2e';
  } else {
    ctx.fillStyle = '#b8c4d0';
  }
  ctx.fillRect(0, 0, canvasW, canvasH);

  for (let f = 0; f < floors; f++) {
    for (let w = 0; w < windowsPerRow; w++) {
      const lit = Math.random() > (isNight ? 0.3 : 0.6);
      if (isNight) {
        ctx.fillStyle = lit ? '#ffd966' : '#0d0d1a';
      } else {
        ctx.fillStyle = lit ? '#87ceeb' : '#6a7d8a';
      }
      const wx = windowGap + w * (windowW + windowGap);
      const wy = canvasH - (f + 1) * floorH + 3;
      ctx.fillRect(wx, wy, windowW, floorH - 5);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  textureCache.set(key, texture);
  return texture;
}

export class BuildingGenerator {
  private materialCache = new Map<string, THREE.MeshLambertMaterial>();

  createBuildingMesh(data: BuildingData, isNight: boolean): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(data.width, data.height, data.depth);

    const frontTexture = createWindowTexture(data.floors, isNight);
    const sideTexture = createWindowTexture(data.floors, isNight);
    sideTexture.repeat.set(data.depth / data.width, 1);

    const topColor = isNight ? 0x1a1a2e : 0x8899aa;
    const topMat = new THREE.MeshLambertMaterial({ color: topColor });

    const frontMat = new THREE.MeshLambertMaterial({ map: frontTexture });
    const sideMat = new THREE.MeshLambertMaterial({ map: sideTexture });
    const bottomMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const materials = [sideMat, sideMat, topMat, bottomMat, frontMat, frontMat];

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.position.set(data.x, data.height / 2, data.z);
    mesh.userData = { buildingData: data, targetHeight: data.height, currentHeight: 0 };

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMat = new THREE.LineBasicMaterial({
      color: isNight ? 0x2a2a4e : 0x556677,
      transparent: true,
      opacity: 0.3,
    });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    mesh.add(wireframe);

    return mesh;
  }

  updateBuildingNightMode(mesh: THREE.Mesh, isNight: boolean): void {
    const data = mesh.userData.buildingData as BuildingData;
    const newMaterials = this.createMaterials(data, isNight);
    (mesh.material as THREE.Material[]).forEach((m) => {
      if (m instanceof THREE.MeshLambertMaterial && m.map) {
        m.map.dispose();
      }
      m.dispose();
    });
    mesh.material = newMaterials;

    if (mesh.children.length > 0) {
      const wireframe = mesh.children[0] as THREE.LineSegments;
      const lineMat = wireframe.material as THREE.LineBasicMaterial;
      lineMat.color.set(isNight ? 0x2a2a4e : 0x556677);
    }
  }

  private createMaterials(data: BuildingData, isNight: boolean): THREE.Material[] {
    const frontTexture = createWindowTexture(data.floors, isNight);
    const sideTexture = createWindowTexture(data.floors, isNight);
    sideTexture.repeat.set(data.depth / data.width, 1);

    const topColor = isNight ? 0x1a1a2e : 0x8899aa;
    const topMat = new THREE.MeshLambertMaterial({ color: topColor });
    const frontMat = new THREE.MeshLambertMaterial({ map: frontTexture });
    const sideMat = new THREE.MeshLambertMaterial({ map: sideTexture });
    const bottomMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

    return [sideMat, sideMat, topMat, bottomMat, frontMat, frontMat];
  }

  dispose(): void {
    textureCache.forEach((tex) => tex.dispose());
    textureCache.clear();
    this.materialCache.forEach((mat) => mat.dispose());
    this.materialCache.clear();
  }
}
