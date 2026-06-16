import * as THREE from 'three';

export class Terrain {
  public group: THREE.Group;
  public mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private material: THREE.MeshLambertMaterial[];

  constructor() {
    this.group = new THREE.Group();
    this.geometry = new THREE.BufferGeometry();
    this.material = [];
    this.mesh = new THREE.Mesh();
    this.createTerrain();
  }

  private createTerrain(): void {
    const gridSize = 50;
    const segments = 50;
    const layers = 10;
    const layerHeight = 2;

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const groups: { start: number; count: number; materialIndex: number }[] = [];

    const surfaceColor = new THREE.Color(0x8B5E3C);
    const deepColor = new THREE.Color(0x424242);

    for (let layer = 0; layer < layers; layer++) {
      const layerY = -layer * layerHeight;
      const layerColor = surfaceColor.clone().lerp(deepColor, layer / (layers - 1));
      const materialIndex = layer;

      this.material.push(
        new THREE.MeshLambertMaterial({
          color: layerColor,
          flatShading: true,
          transparent: true,
          opacity: 0.95
        })
      );

      const startIndex = indices.length;

      for (let i = 0; i <= segments; i++) {
        for (let j = 0; j <= segments; j++) {
          const x = (i / segments - 0.5) * gridSize;
          const z = (j / segments - 0.5) * gridSize;

          let heightOffset = 0;
          if (layer === 0) {
            heightOffset = Math.sin(x * 0.15) * Math.cos(z * 0.15) * 2 +
                           Math.sin(x * 0.08 + z * 0.05) * 1.5;
          }

          positions.push(x, layerY + heightOffset, z);
          colors.push(layerColor.r, layerColor.g, layerColor.b);
        }
      }

      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
          const a = i * (segments + 1) + j + layer * (segments + 1) * (segments + 1);
          const b = a + 1;
          const c = a + (segments + 1);
          const d = c + 1;

          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }

      const count = indices.length - startIndex;
      groups.push({ start: startIndex, count, materialIndex });

      if (layer < layers - 1) {
        const sideStartIndex = indices.length;
        const sideColor = layerColor.clone().multiplyScalar(0.8);

        for (let side = 0; side < 4; side++) {
          for (let k = 0; k < segments; k++) {
            let i1: number, j1: number, i2: number, j2: number;

            if (side === 0) { i1 = k; j1 = 0; i2 = k + 1; j2 = 0; }
            else if (side === 1) { i1 = segments; j1 = k; i2 = segments; j2 = k + 1; }
            else if (side === 2) { i1 = k + 1; j1 = segments; i2 = k; j2 = segments; }
            else { i1 = 0; j1 = k + 1; i2 = 0; j2 = k; }

            const p1 = i1 * (segments + 1) + j1 + layer * (segments + 1) * (segments + 1);
            const p2 = i2 * (segments + 1) + j2 + layer * (segments + 1) * (segments + 1);
            const p3 = p1 + (segments + 1) * (segments + 1);
            const p4 = p2 + (segments + 1) * (segments + 1);

            indices.push(p1, p3, p2);
            indices.push(p2, p3, p4);
          }
        }

        const sideCount = indices.length - sideStartIndex;
        groups.push({ start: sideStartIndex, count: sideCount, materialIndex });
      }
    }

    const bottomLayer = layers - 1;
    const bottomStartIndex = indices.length;
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < segments; j++) {
        const a = i * (segments + 1) + j + bottomLayer * (segments + 1) * (segments + 1);
        const b = a + 1;
        const c = a + (segments + 1);
        const d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
    const bottomCount = indices.length - bottomStartIndex;
    groups.push({ start: bottomStartIndex, count: bottomCount, materialIndex: layers - 1 });

    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.geometry.setIndex(indices);
    this.geometry.computeVertexNormals();

    groups.forEach(g => this.geometry.addGroup(g.start, g.count, g.materialIndex));

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    const gridHelper = new THREE.GridHelper(gridSize, segments, 0x444444, 0x333333);
    gridHelper.position.y = -layers * layerHeight - 0.1;
    this.group.add(gridHelper);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.forEach(m => m.dispose());
  }
}
