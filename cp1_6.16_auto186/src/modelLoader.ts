import * as THREE from 'three';

export interface AnnotationData {
  id: string;
  position: { x: number; y: number; z: number };
  label: string;
  title: string;
  description: string;
  imageUrl: string;
}

export interface ModelLoadResult {
  scene: THREE.Group;
  annotations: AnnotationData[];
}

function createBronzeMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x8B7355,
    metalness: 0.7,
    roughness: 0.35,
    envMapIntensity: 1.0,
  });
}

function createPatinaMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x4A7C59,
    metalness: 0.3,
    roughness: 0.6,
  });
}

function createDingBody(): THREE.Mesh {
  const points: THREE.Vector2[] = [];
  const segments = 32;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let radius: number;
    let y: number;

    if (t < 0.05) {
      radius = 0.85 + t * 2;
      y = t * 8;
    } else if (t < 0.15) {
      const lt = (t - 0.05) / 0.1;
      radius = 0.95 + Math.sin(lt * Math.PI) * 0.15;
      y = 0.4 + lt * 1.2;
    } else if (t < 0.7) {
      const lt = (t - 0.15) / 0.55;
      radius = 1.1 + Math.sin(lt * Math.PI * 0.5) * 0.35;
      y = 1.6 + lt * 3.0;
    } else if (t < 0.85) {
      const lt = (t - 0.7) / 0.15;
      radius = 1.45 - lt * 0.1;
      y = 4.6 + lt * 1.0;
    } else if (t < 0.95) {
      const lt = (t - 0.85) / 0.1;
      radius = 1.35 + lt * 0.15;
      y = 5.6 + lt * 0.6;
    } else {
      const lt = (t - 0.95) / 0.05;
      radius = 1.5 - lt * 0.05;
      y = 6.2 + lt * 0.3;
    }

    points.push(new THREE.Vector2(radius, y));
  }

  const geometry = new THREE.LatheGeometry(points, 64);
  geometry.computeVertexNormals();

  const material = createBronzeMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function createDingRim(): THREE.Mesh {
  const shape = new THREE.Shape();
  const outerR = 1.55;
  const innerR = 1.35;
  const height = 0.25;

  shape.moveTo(outerR, 0);
  shape.lineTo(outerR, height);
  shape.lineTo(innerR, height);
  shape.lineTo(innerR, 0);
  shape.lineTo(outerR, 0);

  const geometry = new THREE.LatheGeometry(
    shape.extractPoints(32).shape.map((p) => new THREE.Vector2(p.x, p.y)),
    64
  );

  const material = createBronzeMaterial();
  material.color = new THREE.Color(0x7A6544);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 6.35;
  mesh.castShadow = true;
  return mesh;
}

function createDingEar(side: number): THREE.Group {
  const group = new THREE.Group();

  const earCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(side * 0.4, 0.3, 0),
    new THREE.Vector3(side * 0.6, 1.2, 0),
    new THREE.Vector3(side * 0.5, 2.0, 0),
    new THREE.Vector3(side * 0.2, 2.4, 0),
    new THREE.Vector3(0, 2.2, 0),
  ]);

  const tubeGeometry = new THREE.TubeGeometry(earCurve, 24, 0.12, 12, false);
  const material = createBronzeMaterial();
  const earMesh = new THREE.Mesh(tubeGeometry, material);
  earMesh.castShadow = true;

  group.add(earMesh);

  const decorGeom = new THREE.TorusGeometry(0.18, 0.06, 8, 16);
  const decorMesh1 = new THREE.Mesh(decorGeom, material);
  decorMesh1.position.set(side * 0.3, 1.0, 0);
  decorMesh1.rotation.y = Math.PI / 2;
  group.add(decorMesh1);

  const decorMesh2 = new THREE.Mesh(decorGeom, material);
  decorMesh2.position.set(side * 0.25, 1.8, 0);
  decorMesh2.rotation.y = Math.PI / 2;
  group.add(decorMesh2);

  group.position.set(side * 1.25, 5.8, 0);
  return group;
}

function createDingLeg(angleDeg: number): THREE.Mesh {
  const points: THREE.Vector2[] = [];
  const segments = 16;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let radius: number;
    let y: number;

    if (t < 0.1) {
      radius = 0.35 - t * 1.5;
      y = -t * 0.8;
    } else if (t < 0.8) {
      const lt = (t - 0.1) / 0.7;
      radius = 0.2 - lt * 0.08;
      y = -0.8 - lt * 2.5;
    } else {
      const lt = (t - 0.8) / 0.2;
      radius = 0.12 + lt * 0.08;
      y = -3.3 - lt * 0.7;
    }

    points.push(new THREE.Vector2(Math.max(radius, 0.05), y));
  }

  const geometry = new THREE.LatheGeometry(points, 16);
  geometry.computeVertexNormals();

  const material = createBronzeMaterial();
  material.color = new THREE.Color(0x6B5B45);
  const mesh = new THREE.Mesh(geometry, material);

  const angleRad = (angleDeg * Math.PI) / 180;
  mesh.position.set(Math.cos(angleRad) * 0.8, 0, Math.sin(angleRad) * 0.8);
  mesh.castShadow = true;
  return mesh;
}

function createDecorBand(y: number, radius: number): THREE.Mesh {
  const geometry = new THREE.TorusGeometry(radius, 0.04, 8, 64);
  const material = createPatinaMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = y;
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function createTaotiePattern(y: number, radius: number, angle: number): THREE.Group {
  const group = new THREE.Group();

  const faceGeom = new THREE.PlaneGeometry(0.8, 0.6);
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0x3D6B4F,
    metalness: 0.4,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const face = new THREE.Mesh(faceGeom, faceMat);

  const eyeGeom = new THREE.SphereGeometry(0.08, 8, 8);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xFFD700,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0x664400,
    emissiveIntensity: 0.3,
  });

  const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
  leftEye.position.set(-0.15, 0.08, 0.02);
  const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
  rightEye.position.set(0.15, 0.08, 0.02);

  const noseGeom = new THREE.ConeGeometry(0.06, 0.2, 4);
  const noseMat = new THREE.MeshStandardMaterial({
    color: 0x4A7C59,
    metalness: 0.4,
    roughness: 0.5,
  });
  const nose = new THREE.Mesh(noseGeom, noseMat);
  nose.position.set(0, -0.05, 0.02);
  nose.rotation.z = Math.PI;

  const hornGeom = new THREE.ConeGeometry(0.04, 0.25, 6);
  const leftHorn = new THREE.Mesh(hornGeom, noseMat);
  leftHorn.position.set(-0.25, 0.2, 0.02);
  leftHorn.rotation.z = 0.4;
  const rightHorn = new THREE.Mesh(hornGeom, noseMat);
  rightHorn.position.set(0.25, 0.2, 0.02);
  rightHorn.rotation.z = -0.4;

  const patternGroup = new THREE.Group();
  patternGroup.add(face);
  patternGroup.add(leftEye);
  patternGroup.add(rightEye);
  patternGroup.add(nose);
  patternGroup.add(leftHorn);
  patternGroup.add(rightHorn);

  const angleRad = (angle * Math.PI) / 180;
  patternGroup.position.set(
    Math.sin(angleRad) * radius,
    y,
    Math.cos(angleRad) * radius
  );
  patternGroup.lookAt(0, y, 0);
  patternGroup.rotateY(Math.PI);

  group.add(patternGroup);
  return group;
}

function getAnnotations(): AnnotationData[] {
  return [
    {
      id: 'ear-left',
      position: { x: -1.55, y: 7.2, z: 0 },
      label: '鼎耳',
      title: '鼎耳',
      description:
        '鼎耳是鼎体上方的环形提手，用于搬运和悬挂。后母戊鼎的双耳厚实庄重，外侧饰有双虎噬人纹，虎口大张，造型威猛，体现了商代青铜铸造的精湛工艺与独特的艺术审美。',
      imageUrl:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ancient+bronze+ding+ear+handle+closeup+Chinese+artifact+museum&image_size=square',
    },
    {
      id: 'ear-right',
      position: { x: 1.55, y: 7.2, z: 0 },
      label: '鼎耳',
      title: '鼎耳（对称）',
      description:
        '两耳对称分布，耳高约1.2米。耳部采用分铸法与鼎身合铸，工艺极为复杂。虎纹耳饰象征着王权威严，是商代王室重器的典型标志。',
      imageUrl:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=bronze+ding+handle+ornate+pattern+ancient+Chinese&image_size=square',
    },
    {
      id: 'rim',
      position: { x: 0, y: 6.5, z: 1.4 },
      label: '口沿',
      title: '口沿',
      description:
        '口沿是鼎体最上方的边缘，宽厚平整，饰有一圈精细的夔龙纹。口沿外翻的设计既增加了结构强度，也赋予了鼎体端庄稳重的视觉效果。',
      imageUrl:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=bronze+vessel+rim+decorative+pattern+ancient&image_size=square',
    },
    {
      id: 'belly',
      position: { x: 0, y: 3.5, z: 1.4 },
      label: '腹部',
      title: '腹部',
      description:
        '腹部是鼎体最宽阔的部分，也是纹饰最为丰富的区域。中央以饕餮纹为主题，两侧辅以夔龙纹和云雷纹，层次分明，庄严肃穆。饕餮纹是商周青铜器最具代表性的纹饰，被认为具有沟通天地、镇压邪灵的神秘力量。',
      imageUrl:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=taotie+mask+pattern+bronze+vessel+ancient+Chinese+artifact&image_size=square',
    },
    {
      id: 'leg-front',
      position: { x: 0.8, y: -2.5, z: 0.6 },
      label: '前足',
      title: '鼎足',
      description:
        '鼎足为四柱足设计（后母戊鼎为四足方鼎），粗壮有力，足面饰有兽面纹和弦纹。足底略外撇，增强了鼎体的稳定性。鼎足高约1.2米，与鼎身浑然一体。',
      imageUrl:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=bronze+ding+leg+foot+ancient+Chinese+artifact+museum&image_size=square',
    },
    {
      id: 'leg-back',
      position: { x: -0.8, y: -2.5, z: -0.6 },
      label: '后足',
      title: '鼎足（后侧）',
      description:
        '三足鼎立的设计使鼎体重心稳固。后足与前足同样饰有精美的兽面纹，柱足内芯为泥范，外部覆以青铜，既减轻重量又保证了结构强度。',
      imageUrl:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=bronze+tripod+leg+decorative+ancient+ritual+vessel&image_size=square',
    },
    {
      id: 'decor-band',
      position: { x: 0, y: 5.0, z: 1.35 },
      label: '纹饰带',
      title: '纹饰带',
      description:
        '鼎身中上部的纹饰带环绕整个器身，以云雷纹为地纹，上饰夔龙纹。这种"三层花"的装饰手法——地纹、主纹、浮雕纹——是商代晚期青铜器装饰的巅峰之作。',
      imageUrl:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ancient+bronze+decorative+band+cloud+thunder+pattern+Chinese&image_size=square',
    },
    {
      id: 'base',
      position: { x: 0, y: -3.8, z: 0 },
      label: '底部',
      title: '鼎底',
      description:
        '鼎底为平底设计，底部铸有"后母戊"三字铭文，意为"祭祀母亲戊"。这一铭文表明此鼎是商王为祭祀其母亲"戊"而铸造的礼器，是中国已发现的最大最重的青铜器。',
      imageUrl:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=bronze+ding+bottom+inscription+ancient+Chinese+characters&image_size=square',
    },
  ];
}

export function loadModel(
  onProgress?: (percent: number) => void
): Promise<ModelLoadResult> {
  return new Promise((resolve) => {
    const group = new THREE.Group();
    group.name = 'bronze-ding';

    const body = createDingBody();
    group.add(body);

    const rim = createDingRim();
    group.add(rim);

    const leftEar = createDingEar(1);
    group.add(leftEar);

    const rightEar = createDingEar(-1);
    group.add(rightEar);

    const leg1 = createDingLeg(0);
    group.add(leg1);
    const leg2 = createDingLeg(120);
    group.add(leg2);
    const leg3 = createDingLeg(240);
    group.add(leg3);

    group.add(createDecorBand(5.0, 1.38));
    group.add(createDecorBand(4.4, 1.42));
    group.add(createDecorBand(2.8, 1.35));

    group.add(createTaotiePattern(3.8, 1.4, 0));
    group.add(createTaotiePattern(3.8, 1.4, 90));
    group.add(createTaotiePattern(3.8, 1.4, 180));
    group.add(createTaotiePattern(3.8, 1.4, 270));

    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.sub(center);

    const totalSteps = 20;
    let step = 0;

    const simulateLoading = () => {
      step++;
      const percent = Math.min(Math.round((step / totalSteps) * 100), 100);
      if (onProgress) {
        onProgress(percent);
      }

      if (step < totalSteps) {
        setTimeout(simulateLoading, 80);
      } else {
        const annotations = getAnnotations();
        const offset = center;
        annotations.forEach((a) => {
          a.position.x -= offset.x;
          a.position.y -= offset.y;
          a.position.z -= offset.z;
        });

        resolve({ scene: group, annotations });
      }
    };

    simulateLoading();
  });
}
