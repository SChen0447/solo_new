import * as THREE from 'three';

export type BuildingStyle = 'modern' | 'gothic' | 'cyberpunk';

export interface BuildingParams {
  count: number;
  maxHeight: number;
  density: number;
  style: BuildingStyle;
}

export interface BuildingData {
  mesh: THREE.Mesh;
  height: number;
  floors: number;
  colorHex: string;
  aabb: THREE.Box3;
}

interface ColorPalette {
  primary: number[];
  secondary: number[];
  accent: number[];
}

const PALETTES: Record<BuildingStyle, ColorPalette> = {
  modern: {
    primary: [0x4a90d9, 0x5ba3e0, 0x3d7cc4, 0x6bb6eb, 0x2f6bae],
    secondary: [0xc0c8d0, 0xa8b0b8, 0xd8dde3, 0x9098a0, 0xb0b8c0],
    accent: [0x00bcd4, 0x2196f3, 0xff9800, 0x4caf50, 0xe91e63]
  },
  gothic: {
    primary: [0x3e2723, 0x4e342e, 0x5d4037, 0x6d4c41, 0x795548],
    secondary: [0x263238, 0x37474f, 0x455a64, 0x546e7a, 0x607d8b],
    accent: [0x7b1fa2, 0x512da8, 0x303f9f, 0x1a237e, 0x4a148c]
  },
  cyberpunk: {
    primary: [0x0a0a1a, 0x12122a, 0x1a1a3a, 0x22224a, 0x0d0d24],
    secondary: [0x880e4f, 0xad1457, 0x006064, 0x00838f, 0x1a237e],
    accent: [0xff00ff, 0x00ffff, 0xff0080, 0x80ff00, 0xffff00]
  }
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hexToString(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0').toUpperCase();
}

function generateBuildingMesh(
  params: BuildingParams,
  palette: ColorPalette,
  posX: number,
  posZ: number,
  gridSize: number
): BuildingData {
  const style = params.style;
  const maxH = params.maxHeight;

  const baseWidth = 1 + Math.random() * 2.5;
  const baseDepth = 1 + Math.random() * 2.5;

  const heightFactor = Math.pow(Math.random(), 1.5);
  const height = 3 + heightFactor * (maxH - 3);

  const isAccent = Math.random() < 0.15;
  const colorHexNum = isAccent
    ? pickRandom(palette.accent)
    : Math.random() < 0.6
    ? pickRandom(palette.primary)
    : pickRandom(palette.secondary);

  const colorHex = hexToString(colorHexNum);

  const group = new THREE.Group();
  let mainMesh: THREE.Mesh;

  if (style === 'gothic') {
    const segments = Math.random() < 0.3 ? 6 : 4;
    if (segments === 6) {
      const radius = Math.min(baseWidth, baseDepth) * 0.6;
      const geom = new THREE.CylinderGeometry(radius, radius * 1.05, height, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: colorHexNum,
        roughness: 0.85,
        metalness: 0.1,
        flatShading: true
      });
      mainMesh = new THREE.Mesh(geom, mat);
    } else {
      const steppedHeight = height * 0.7;
      const topHeight = height * 0.3;
      const lowerGeom = new THREE.BoxGeometry(baseWidth * 1.15, steppedHeight, baseDepth * 1.15);
      const upperGeom = new THREE.BoxGeometry(baseWidth, topHeight, baseDepth);
      const mat = new THREE.MeshStandardMaterial({
        color: colorHexNum,
        roughness: 0.8,
        metalness: 0.15,
        flatShading: true
      });
      const lower = new THREE.Mesh(lowerGeom, mat);
      lower.position.y = steppedHeight / 2;
      const upper = new THREE.Mesh(upperGeom, mat);
      upper.position.y = steppedHeight + topHeight / 2;
      group.add(lower);
      group.add(upper);
      mainMesh = upper;

      if (Math.random() < 0.5) {
        const spikeH = 1 + Math.random() * 2;
        const spikeGeom = new THREE.ConeGeometry(baseWidth * 0.25, spikeH, 4);
        const spike = new THREE.Mesh(spikeGeom, mat);
        spike.position.y = steppedHeight + topHeight + spikeH / 2;
        group.add(spike);
      }
    }

    if (!group.children.length) {
      mainMesh.position.y = height / 2;
      group.add(mainMesh);
    }

    if (Math.random() < 0.4) {
      const winRows = Math.max(3, Math.floor(height / 3));
      const winCols = 2;
      const winColor = 0xffe4b5;
      for (let r = 1; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const winGeom = new THREE.PlaneGeometry(0.25, 0.4);
          const winMat = new THREE.MeshBasicMaterial({
            color: winColor,
            transparent: true,
            opacity: 0.7 + Math.random() * 0.3
          });
          const win = new THREE.Mesh(winGeom, winMat);
          const xOff = (c - (winCols - 1) / 2) * 0.5;
          win.position.set(xOff, r * 2.5 + 0.5, baseWidth * 0.58 + 0.01);
          group.add(win);
        }
      }
    }
  } else if (style === 'cyberpunk') {
    const stackCount = 1 + Math.floor(Math.random() * 4);
    let currentY = 0;
    const mat = new THREE.MeshStandardMaterial({
      color: colorHexNum,
      roughness: 0.3,
      metalness: 0.85,
      emissive: new THREE.Color(isAccent ? colorHexNum : 0x000000),
      emissiveIntensity: isAccent ? 0.3 : 0
    });

    for (let i = 0; i < stackCount; i++) {
      const layerRatio = 1 - (i / stackCount) * 0.4;
      const layerW = baseWidth * layerRatio;
      const layerD = baseDepth * layerRatio;
      const layerH = (height / stackCount) * (0.8 + Math.random() * 0.4);

      const geom = new THREE.BoxGeometry(layerW, layerH, layerD);
      const layer = new THREE.Mesh(geom, mat);
      layer.position.y = currentY + layerH / 2;
      group.add(layer);

      if (Math.random() < 0.7) {
        const neonColor = pickRandom(palette.accent);
        const neonGeom = new THREE.EdgesGeometry(geom);
        const neonMat = new THREE.LineBasicMaterial({
          color: neonColor,
          transparent: true,
          opacity: 0.8
        });
        const edges = new THREE.LineSegments(neonGeom, neonMat);
        edges.position.copy(layer.position);
        group.add(edges);
      }

      currentY += layerH;
    }

    if (!group.children.length) {
      const geom = new THREE.BoxGeometry(baseWidth, height, baseDepth);
      mainMesh = new THREE.Mesh(geom, mat);
      mainMesh.position.y = height / 2;
      group.add(mainMesh);
    } else {
      mainMesh = group.children[0] as THREE.Mesh;
    }
  } else {
    const mat = new THREE.MeshStandardMaterial({
      color: colorHexNum,
      roughness: 0.4,
      metalness: 0.5
    });
    const sections: THREE.Mesh[] = [];

    if (Math.random() < 0.35) {
      const sectionCount = 1 + Math.floor(Math.random() * 3);
      let y = 0;
      for (let i = 0; i < sectionCount; i++) {
        const scale = 1 - i * 0.15;
        const secH = height / sectionCount * (0.9 + Math.random() * 0.2);
        const secW = baseWidth * scale;
        const secD = baseDepth * scale;
        const geom = new THREE.BoxGeometry(secW, secH, secD);
        const section = new THREE.Mesh(geom, mat);
        section.position.y = y + secH / 2;
        sections.push(section);
        y += secH;
      }
      sections.forEach(s => group.add(s));
      mainMesh = sections[0];
    } else {
      const geom = new THREE.BoxGeometry(baseWidth, height, baseDepth);
      mainMesh = new THREE.Mesh(geom, mat);
      mainMesh.position.y = height / 2;
      group.add(mainMesh);
    }

    if (Math.random() < 0.6) {
      const winRows = Math.max(4, Math.floor(height / 2.5));
      const winCols = Math.max(2, Math.floor(baseWidth * 1.2));
      for (let r = 1; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          if (Math.random() < 0.75) {
            const winGeom = new THREE.PlaneGeometry(0.3, 0.5);
            const isLit = Math.random() < 0.5;
            const winMat = new THREE.MeshBasicMaterial({
              color: isLit ? 0xfff8dc : 0x3a5a7a,
              transparent: true,
              opacity: 0.6 + Math.random() * 0.4
            });
            const win = new THREE.Mesh(winGeom, winMat);
            const stepX = baseWidth / (winCols + 1);
            win.position.set(
              -baseWidth / 2 + stepX * (c + 1),
              r * 2.2 + 0.5,
              baseDepth / 2 + 0.01
            );
            group.add(win);
          }
        }
      }
    }
  }

  const jitterX = (Math.random() - 0.5) * gridSize * 0.2;
  const jitterZ = (Math.random() - 0.5) * gridSize * 0.2;
  group.position.set(posX + jitterX, 0, posZ + jitterZ);
  group.rotation.y = Math.random() < 0.08 ? (Math.PI / 2) * Math.round(Math.random() * 4) : 0;

  const maxDim = Math.max(baseWidth, baseDepth) * 1.3;
  const halfW = maxDim / 2;
  const halfD = maxDim / 2;
  const aabb = new THREE.Box3(
    new THREE.Vector3(group.position.x - halfW, 0, group.position.z - halfD),
    new THREE.Vector3(group.position.x + halfW, height, group.position.z + halfD)
  );

  const wrapper = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  wrapper.add(group);
  wrapper.position.set(0, 0, 0);
  (wrapper as any).userData = {
    buildingHeight: height,
    buildingFloors: Math.floor(height / 3),
    buildingColor: colorHex,
    aabb: aabb
  };

  return {
    mesh: wrapper,
    height,
    floors: Math.floor(height / 3),
    colorHex,
    aabb
  };
}

export function generateBuildings(params: BuildingParams): BuildingData[] {
  const palette = PALETTES[params.style];
  const buildings: BuildingData[] = [];
  const areaSize = 50;
  const gridDim = Math.ceil(Math.sqrt(params.count / params.density));
  const cellSize = areaSize / gridDim;
  const positions: { x: number; z: number }[] = [];

  for (let i = 0; i < gridDim; i++) {
    for (let j = 0; j < gridDim; j++) {
      if (Math.random() < params.density) {
        positions.push({
          x: -areaSize / 2 + cellSize * (i + 0.5),
          z: -areaSize / 2 + cellSize * (j + 0.5)
        });
      }
    }
  }

  const shuffled = positions.sort(() => Math.random() - 0.5);
  const targetCount = Math.min(params.count, shuffled.length);

  for (let i = 0; i < targetCount; i++) {
    const pos = shuffled[i];
    const data = generateBuildingMesh(params, palette, pos.x, pos.z, cellSize);
    buildings.push(data);
  }

  return buildings;
}

export function createHighlight(mesh: THREE.Mesh): THREE.LineSegments | null {
  const group = mesh.children[0];
  if (!group) return null;
  const bbox = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);
  const geom = new THREE.BoxGeometry(size.x * 1.01, size.y * 1.01, size.z * 1.01);
  const edges = new THREE.EdgesGeometry(geom);
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0
  });
  const line = new THREE.LineSegments(edges, mat);
  line.position.copy(center);
  (line as any).userData = { targetOpacity: 1, startOpacity: 0, startTime: performance.now() };
  mesh.add(line);
  return line;
}

export function removeHighlight(mesh: THREE.Mesh): void {
  for (let i = mesh.children.length - 1; i >= 0; i--) {
    const child = mesh.children[i];
    if (child instanceof THREE.LineSegments) {
      mesh.remove(child);
      (child.geometry as THREE.BufferGeometry).dispose();
      const mat = child.material as THREE.LineBasicMaterial;
      mat.dispose();
    }
  }
}
