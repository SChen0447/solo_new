export type CreatureLayer = 'shallow' | 'middle' | 'deep';

export interface CompositePart {
  shape: 'sphere' | 'cone' | 'cylinder' | 'torus';
  pos: [number, number, number];
  scale?: [number, number, number];
  color?: string;
  rotation?: [number, number, number];
}

export interface CreatureConfig {
  id: string;
  name: string;
  depthRange: [number, number];
  intro: string;
  color: string;
  accentColor?: string;
  geometryType: 'sphere' | 'cone' | 'cylinder' | 'torus' | 'composite';
  params: {
    size?: number;
    segments?: number;
    radiusTop?: number;
    radiusBottom?: number;
    radius?: number;
    tube?: number;
    radialSegments?: number;
    tubularSegments?: number;
    composite?: CompositePart[];
  };
  layer: CreatureLayer;
  instanceCount: number;
}

export const CREATURES: CreatureConfig[] = [
  {
    id: 'clownfish',
    name: '小丑鱼',
    depthRange: [1, 18],
    intro: '小丑鱼是热带珊瑚礁区最具代表性的居民。它们与海葵形成奇妙的共生关系，体表特殊黏液可抵御海葵毒刺，以此躲避天敌，常在浅海岩礁区穿梭嬉戏。',
    color: '#ff6b35',
    accentColor: '#ffffff',
    geometryType: 'composite',
    params: {
      size: 1.2,
      composite: [
        { shape: 'sphere', pos: [0, 0, 0], scale: [1.4, 0.8, 0.9], color: '#ff6b35' },
        { shape: 'cone', pos: [-1.1, 0, 0], scale: [0.4, 0.6, 0.6], rotation: [0, 0, Math.PI / 2], color: '#ff6b35' },
        { shape: 'cone', pos: [0, 0.4, 0], scale: [0.3, 0.5, 0.4], color: '#ff6b35' },
        { shape: 'sphere', pos: [0.5, 0, 0.2], scale: [0.15, 0.15, 0.1], color: '#000000' },
        { shape: 'sphere', pos: [0.5, 0, -0.2], scale: [0.15, 0.15, 0.1], color: '#000000' },
        { shape: 'torus', pos: [0.3, 0, 0], scale: [0.4, 0.03, 0.9], color: '#ffffff' },
        { shape: 'torus', pos: [-0.1, 0, 0], scale: [0.4, 0.03, 0.9], color: '#ffffff' },
        { shape: 'torus', pos: [-0.5, 0, 0], scale: [0.35, 0.03, 0.9], color: '#ffffff' }
      ]
    },
    layer: 'shallow',
    instanceCount: 3
  },
  {
    id: 'jellyfish',
    name: '水母',
    depthRange: [5, 150],
    intro: '水母是优雅的浮游生物，身体95%由水构成，透明的钟状体在海水中轻轻脉动。它们拥有刺细胞用于捕猎，是海洋中最古老的多细胞动物之一。',
    color: '#e0aaff',
    accentColor: '#b388ff',
    geometryType: 'composite',
    params: {
      size: 2.0,
      composite: [
        { shape: 'sphere', pos: [0, 0.8, 0], scale: [1.0, 0.6, 1.0], color: '#e0aaff' },
        { shape: 'cylinder', pos: [0, 0.3, 0], scale: [0.85, 0.6, 0.85], rotation: [0, 0, 0], color: '#e0aaff' },
        { shape: 'cylinder', pos: [0, -0.4, 0], scale: [0.08, 1.5, 0.08], color: '#c77dff' },
        { shape: 'cylinder', pos: [0.25, -0.5, 0.1], scale: [0.06, 1.4, 0.06], color: '#c77dff' },
        { shape: 'cylinder', pos: [-0.25, -0.5, -0.1], scale: [0.06, 1.4, 0.06], color: '#c77dff' },
        { shape: 'cylinder', pos: [0.15, -0.6, -0.2], scale: [0.05, 1.2, 0.05], color: '#9d4edd' },
        { shape: 'cylinder', pos: [-0.2, -0.5, 0.15], scale: [0.05, 1.3, 0.05], color: '#9d4edd' }
      ]
    },
    layer: 'shallow',
    instanceCount: 3
  },
  {
    id: 'seaturtle',
    name: '海龟',
    depthRange: [0, 60],
    intro: '海龟是古老的海洋爬行动物，已在地球上生存超过1亿年。它们在全球海洋中洄游数千公里，以海藻、水母为食，是海洋生态系统的重要指示物种。',
    color: '#2d6a4f',
    accentColor: '#52b788',
    geometryType: 'composite',
    params: {
      size: 2.5,
      composite: [
        { shape: 'sphere', pos: [0, 0, 0], scale: [1.3, 0.5, 1.0], color: '#2d6a4f' },
        { shape: 'cylinder', pos: [0, 0.15, 0], scale: [1.1, 0.2, 0.9], color: '#40916c' },
        { shape: 'sphere', pos: [1.1, 0, 0], scale: [0.35, 0.3, 0.35], color: '#52b788' },
        { shape: 'sphere', pos: [1.25, 0.05, 0.12], scale: [0.06, 0.06, 0.04], color: '#000000' },
        { shape: 'sphere', pos: [1.25, 0.05, -0.12], scale: [0.06, 0.06, 0.04], color: '#000000' },
        { shape: 'cone', pos: [-0.9, -0.1, 0.4], scale: [0.25, 0.6, 0.35], rotation: [0.2, -0.5, 0.3], color: '#52b788' },
        { shape: 'cone', pos: [-0.9, -0.1, -0.4], scale: [0.25, 0.6, 0.35], rotation: [-0.2, -0.5, -0.3], color: '#52b788' },
        { shape: 'cone', pos: [0.5, -0.1, 0.5], scale: [0.2, 0.5, 0.3], rotation: [0.3, 0.4, 0.2], color: '#52b788' },
        { shape: 'cone', pos: [0.5, -0.1, -0.5], scale: [0.2, 0.5, 0.3], rotation: [-0.3, 0.4, -0.2], color: '#52b788' },
        { shape: 'cone', pos: [-1.3, 0, 0], scale: [0.15, 0.35, 0.2], rotation: [0, Math.PI, 0], color: '#52b788' }
      ]
    },
    layer: 'shallow',
    instanceCount: 2
  },
  {
    id: 'coral',
    name: '珊瑚虫',
    depthRange: [3, 40],
    intro: '珊瑚虫是微小的腔肠动物，它们分泌碳酸钙建造骨骼，经过数万年堆积形成壮观的珊瑚礁。珊瑚礁被称为"海洋热带雨林"，为25%的海洋生物提供栖息地。',
    color: '#ff758f',
    accentColor: '#ffcad4',
    geometryType: 'composite',
    params: {
      size: 1.8,
      composite: [
        { shape: 'cylinder', pos: [0, -0.6, 0], scale: [0.5, 0.8, 0.5], color: '#ff758f' },
        { shape: 'cylinder', pos: [0.4, 0, 0.2], scale: [0.25, 0.9, 0.25], color: '#ff99b4' },
        { shape: 'cylinder', pos: [-0.4, 0, -0.2], scale: [0.25, 0.9, 0.25], color: '#ff99b4' },
        { shape: 'cylinder', pos: [0.2, 0.3, -0.4], scale: [0.2, 0.7, 0.2], color: '#ffb3c6' },
        { shape: 'cylinder', pos: [-0.3, 0.4, 0.3], scale: [0.2, 0.7, 0.2], color: '#ffb3c6' },
        { shape: 'sphere', pos: [0.4, 0.8, 0.2], scale: [0.18, 0.18, 0.18], color: '#ffcad4' },
        { shape: 'sphere', pos: [-0.4, 0.8, -0.2], scale: [0.18, 0.18, 0.18], color: '#ffcad4' },
        { shape: 'sphere', pos: [0, 1.0, 0], scale: [0.16, 0.16, 0.16], color: '#ffcad4' }
      ]
    },
    layer: 'shallow',
    instanceCount: 2
  },
  {
    id: 'shark',
    name: '灰礁鲨',
    depthRange: [10, 200],
    intro: '灰礁鲨是珊瑚礁区的顶级掠食者，流线型的躯体可在水中高速穿梭。它们拥有敏锐的电感受器能探测猎物肌肉收缩，在维持海洋生态平衡中扮演关键角色。',
    color: '#4a5568',
    accentColor: '#a0aec0',
    geometryType: 'composite',
    params: {
      size: 3.5,
      composite: [
        { shape: 'sphere', pos: [0, 0, 0], scale: [2.0, 0.7, 0.8], color: '#4a5568' },
        { shape: 'cone', pos: [-1.9, 0, 0], scale: [0.8, 1.2, 0.7], rotation: [0, 0, Math.PI], color: '#4a5568' },
        { shape: 'cone', pos: [1.7, 0.2, 0], scale: [0.2, 0.8, 0.7], rotation: [0, 0, Math.PI / 2], color: '#2d3748' },
        { shape: 'cone', pos: [0, 0.55, 0], scale: [0.15, 0.6, 0.35], color: '#4a5568' },
        { shape: 'cone', pos: [-0.3, -0.4, 0.4], scale: [0.15, 0.5, 0.3], rotation: [0.3, -0.2, 0], color: '#4a5568' },
        { shape: 'cone', pos: [-0.3, -0.4, -0.4], scale: [0.15, 0.5, 0.3], rotation: [-0.3, -0.2, 0], color: '#4a5568' },
        { shape: 'sphere', pos: [1.65, 0.05, 0.25], scale: [0.12, 0.12, 0.08], color: '#ffffff' },
        { shape: 'sphere', pos: [1.65, 0.05, -0.25], scale: [0.12, 0.12, 0.08], color: '#ffffff' },
        { shape: 'sphere', pos: [1.72, 0.03, 0.25], scale: [0.05, 0.05, 0.04], color: '#000000' },
        { shape: 'sphere', pos: [1.72, 0.03, -0.25], scale: [0.05, 0.05, 0.04], color: '#000000' }
      ]
    },
    layer: 'middle',
    instanceCount: 2
  },
  {
    id: 'squid',
    name: '乌贼',
    depthRange: [50, 250],
    intro: '乌贼是智商最高的无脊椎动物之一，拥有复杂的变色系统可瞬间改变体色用于伪装和交流。它们通过喷水推进高速游动，两只长触腕可快速出击捕猎。',
    color: '#9b5de5',
    accentColor: '#c77dff',
    geometryType: 'composite',
    params: {
      size: 2.2,
      composite: [
        { shape: 'cone', pos: [0, 0, 0], scale: [0.7, 1.4, 0.7], rotation: [-Math.PI / 2, 0, 0], color: '#9b5de5' },
        { shape: 'sphere', pos: [0, 0.85, 0], scale: [0.55, 0.4, 0.55], color: '#b378e0' },
        { shape: 'sphere', pos: [0.18, 0.95, 0.22], scale: [0.1, 0.1, 0.06], color: '#ffffff' },
        { shape: 'sphere', pos: [-0.18, 0.95, 0.22], scale: [0.1, 0.1, 0.06], color: '#ffffff' },
        { shape: 'sphere', pos: [0.2, 0.96, 0.24], scale: [0.05, 0.05, 0.03], color: '#000000' },
        { shape: 'sphere', pos: [-0.2, 0.96, 0.24], scale: [0.05, 0.05, 0.03], color: '#000000' },
        { shape: 'cylinder', pos: [0, 0.2, 0.4], scale: [0.06, 0.8, 0.06], color: '#c77dff' },
        { shape: 'cylinder', pos: [0.15, 0.2, 0.38], scale: [0.05, 0.75, 0.05], color: '#c77dff' },
        { shape: 'cylinder', pos: [-0.15, 0.2, 0.38], scale: [0.05, 0.75, 0.05], color: '#c77dff' },
        { shape: 'cylinder', pos: [0.3, 0.25, 0.35], scale: [0.05, 0.7, 0.05], color: '#e0aaff' },
        { shape: 'cylinder', pos: [-0.3, 0.25, 0.35], scale: [0.05, 0.7, 0.05], color: '#e0aaff' }
      ]
    },
    layer: 'middle',
    instanceCount: 2
  },
  {
    id: 'lionfish',
    name: '狮子鱼',
    depthRange: [10, 180],
    intro: '狮子鱼以其华丽的鳍条和鲜艳的红白斑纹闻名，鳍条基部带有毒腺用于防御。它们原生于印度洋-太平洋海域，是热带海洋中最美丽的危险鱼类。',
    color: '#d62828',
    accentColor: '#ffffff',
    geometryType: 'composite',
    params: {
      size: 1.8,
      composite: [
        { shape: 'sphere', pos: [0, 0, 0], scale: [1.2, 0.7, 0.6], color: '#d62828' },
        { shape: 'cone', pos: [-0.9, 0, 0], scale: [0.35, 0.6, 0.4], rotation: [0, 0, Math.PI / 2], color: '#d62828' },
        { shape: 'torus', pos: [0.3, 0, 0], scale: [0.25, 0.04, 0.7], color: '#ffffff' },
        { shape: 'torus', pos: [-0.2, 0, 0], scale: [0.25, 0.04, 0.7], color: '#ffffff' },
        { shape: 'cone', pos: [0, 0.5, 0], scale: [0.05, 0.9, 0.25], color: '#ffffff' },
        { shape: 'cone', pos: [0.08, 0.45, 0], scale: [0.05, 0.8, 0.25], color: '#d62828' },
        { shape: 'cone', pos: [-0.08, 0.45, 0], scale: [0.05, 0.8, 0.25], color: '#d62828' },
        { shape: 'cone', pos: [0.15, 0.4, 0], scale: [0.05, 0.7, 0.2], color: '#ffffff' },
        { shape: 'cone', pos: [-0.15, 0.4, 0], scale: [0.05, 0.7, 0.2], color: '#ffffff' },
        { shape: 'sphere', pos: [0.45, 0.05, 0.15], scale: [0.1, 0.1, 0.06], color: '#000000' },
        { shape: 'sphere', pos: [0.45, 0.05, -0.15], scale: [0.1, 0.1, 0.06], color: '#000000' }
      ]
    },
    layer: 'middle',
    instanceCount: 2
  },
  {
    id: 'anglerfish',
    name: '安康鱼',
    depthRange: [200, 480],
    intro: '安康鱼是深海中最奇特的居民之一，雌鱼头顶有一根由背鳍演化而来的发光"钓竿"，末端发光器官可发出蓝绿色光芒引诱猎物，是深海伏击捕食的大师。',
    color: '#2b2d42',
    accentColor: '#00ffff',
    geometryType: 'composite',
    params: {
      size: 2.0,
      composite: [
        { shape: 'sphere', pos: [0, -0.1, 0], scale: [1.1, 0.85, 0.9], color: '#2b2d42' },
        { shape: 'cone', pos: [0.8, 0.2, 0], scale: [0.3, 0.4, 0.25], rotation: [0, 0, -0.3], color: '#2b2d42' },
        { shape: 'sphere', pos: [0.9, 0.55, 0], scale: [0.08, 0.08, 0.08], color: '#00ffff' },
        { shape: 'cylinder', pos: [0.85, 0.38, 0], scale: [0.03, 0.3, 0.03], rotation: [0, 0, -0.3], color: '#1a1a2e' },
        { shape: 'sphere', pos: [0.6, 0.1, 0.25], scale: [0.12, 0.12, 0.08], color: '#f5f5f5' },
        { shape: 'sphere', pos: [0.6, 0.1, -0.25], scale: [0.12, 0.12, 0.08], color: '#f5f5f5' },
        { shape: 'sphere', pos: [0.68, 0.08, 0.25], scale: [0.05, 0.05, 0.03], color: '#000000' },
        { shape: 'sphere', pos: [0.68, 0.08, -0.25], scale: [0.05, 0.05, 0.03], color: '#000000' },
        { shape: 'cone', pos: [-0.8, -0.4, 0.25], scale: [0.15, 0.4, 0.2], rotation: [0.3, 0.5, 0], color: '#1a1a2e' },
        { shape: 'cone', pos: [-0.8, -0.4, -0.25], scale: [0.15, 0.4, 0.2], rotation: [-0.3, 0.5, 0], color: '#1a1a2e' }
      ]
    },
    layer: 'deep',
    instanceCount: 2
  },
  {
    id: 'viperfish',
    name: '蝰鱼',
    depthRange: [250, 500],
    intro: '蝰鱼是深海中凶猛的掠食者，长有巨大且向外突出的獠牙，无法闭合嘴巴。它们身体多处长有发光器用于引诱猎物和迷惑捕食者，是深海恐怖的象征。',
    color: '#001219',
    accentColor: '#005f73',
    geometryType: 'composite',
    params: {
      size: 1.6,
      composite: [
        { shape: 'sphere', pos: [0, 0, 0], scale: [1.3, 0.4, 0.35], color: '#001219' },
        { shape: 'cone', pos: [0.7, 0, 0], scale: [0.15, 0.6, 0.2], rotation: [0, 0, -0.2], color: '#001219' },
        { shape: 'cone', pos: [0.8, 0.05, 0.15], scale: [0.04, 0.18, 0.04], color: '#ffffff' },
        { shape: 'cone', pos: [0.8, 0.05, -0.15], scale: [0.04, 0.18, 0.04], color: '#ffffff' },
        { shape: 'cone', pos: [0.78, 0.02, 0.08], scale: [0.03, 0.15, 0.03], color: '#ffffff' },
        { shape: 'cone', pos: [0.78, 0.02, -0.08], scale: [0.03, 0.15, 0.03], color: '#ffffff' },
        { shape: 'sphere', pos: [0.55, 0.1, 0.12], scale: [0.08, 0.08, 0.05], color: '#ffffff' },
        { shape: 'sphere', pos: [0.55, 0.1, -0.12], scale: [0.08, 0.08, 0.05], color: '#ffffff' },
        { shape: 'sphere', pos: [0.58, 0.09, 0.12], scale: [0.04, 0.04, 0.02], color: '#000000' },
        { shape: 'sphere', pos: [0.58, 0.09, -0.12], scale: [0.04, 0.04, 0.02], color: '#000000' },
        { shape: 'sphere', pos: [0, 0.22, 0], scale: [0.05, 0.05, 0.05], color: '#00ffff' },
        { shape: 'sphere', pos: [-0.3, 0.2, 0], scale: [0.04, 0.04, 0.04], color: '#00ffff' },
        { shape: 'sphere', pos: [-0.6, 0.15, 0], scale: [0.04, 0.04, 0.04], color: '#00ffff' }
      ]
    },
    layer: 'deep',
    instanceCount: 2
  },
  {
    id: 'giantisopod',
    name: '大王具足虫',
    depthRange: [180, 450],
    intro: '大王具足虫是等足目动物中体型最大的成员，外形酷似放大版的潮虫，是深海的食腐动物。它们拥有坚硬的外骨骼，在食物匮乏的深海可长时间禁食。',
    color: '#5c677d',
    accentColor: '#33415c',
    geometryType: 'composite',
    params: {
      size: 1.8,
      composite: [
        { shape: 'sphere', pos: [0, 0, 0], scale: [1.2, 0.4, 0.7], color: '#5c677d' },
        { shape: 'cylinder', pos: [0, -0.05, 0], scale: [0.85, 0.2, 0.6], color: '#33415c' },
        { shape: 'sphere', pos: [0.8, 0.1, 0], scale: [0.35, 0.25, 0.4], color: '#5c677d' },
        { shape: 'cylinder', pos: [1.0, 0.1, 0.2], scale: [0.04, 0.35, 0.04], rotation: [0.3, 0, 0.3], color: '#33415c' },
        { shape: 'cylinder', pos: [1.0, 0.1, -0.2], scale: [0.04, 0.35, 0.04], rotation: [-0.3, 0, 0.3], color: '#33415c' },
        { shape: 'cylinder', pos: [0.3, -0.2, 0.35], scale: [0.06, 0.35, 0.06], rotation: [0.5, 0.2, 0], color: '#33415c' },
        { shape: 'cylinder', pos: [0.3, -0.2, -0.35], scale: [0.06, 0.35, 0.06], rotation: [-0.5, 0.2, 0], color: '#33415c' },
        { shape: 'cylinder', pos: [-0.1, -0.2, 0.4], scale: [0.06, 0.35, 0.06], rotation: [0.5, 0, 0], color: '#33415c' },
        { shape: 'cylinder', pos: [-0.1, -0.2, -0.4], scale: [0.06, 0.35, 0.06], rotation: [-0.5, 0, 0], color: '#33415c' },
        { shape: 'cylinder', pos: [-0.5, -0.2, 0.35], scale: [0.06, 0.3, 0.06], rotation: [0.5, -0.2, 0], color: '#33415c' },
        { shape: 'cylinder', pos: [-0.5, -0.2, -0.35], scale: [0.06, 0.3, 0.06], rotation: [-0.5, -0.2, 0], color: '#33415c' }
      ]
    },
    layer: 'deep',
    instanceCount: 2
  },
  {
    id: 'dumboctopus',
    name: '小飞象章鱼',
    depthRange: [300, 500],
    intro: '小飞象章鱼因鳍部长得像大象耳朵而得名，是深海中最可爱的章鱼。它们没有墨囊，通过拍打耳状鳍和喷水推进游动，通常在海床上方优雅滑翔。',
    color: '#ff9ebb',
    accentColor: '#ffc2d1',
    geometryType: 'composite',
    params: {
      size: 1.5,
      composite: [
        { shape: 'sphere', pos: [0, 0.3, 0], scale: [0.7, 0.7, 0.7], color: '#ff9ebb' },
        { shape: 'cone', pos: [0, 0.8, 0], scale: [0.15, 0.5, 0.4], color: '#ffc2d1' },
        { shape: 'cone', pos: [0.4, 0.6, 0], scale: [0.4, 0.25, 0.15], rotation: [0, 0, 0.5], color: '#ffb3c6' },
        { shape: 'cone', pos: [-0.4, 0.6, 0], scale: [0.4, 0.25, 0.15], rotation: [0, 0, -0.5], color: '#ffb3c6' },
        { shape: 'sphere', pos: [0.22, 0.35, 0.25], scale: [0.1, 0.1, 0.06], color: '#ffffff' },
        { shape: 'sphere', pos: [-0.22, 0.35, 0.25], scale: [0.1, 0.1, 0.06], color: '#ffffff' },
        { shape: 'sphere', pos: [0.24, 0.34, 0.27], scale: [0.04, 0.04, 0.03], color: '#000000' },
        { shape: 'sphere', pos: [-0.24, 0.34, 0.27], scale: [0.04, 0.04, 0.03], color: '#000000' },
        { shape: 'cylinder', pos: [0.25, -0.2, 0.1], scale: [0.05, 0.7, 0.05], rotation: [0.2, 0, 0.15], color: '#ffc2d1' },
        { shape: 'cylinder', pos: [-0.25, -0.2, 0.1], scale: [0.05, 0.7, 0.05], rotation: [0.2, 0, -0.15], color: '#ffc2d1' },
        { shape: 'cylinder', pos: [0.4, -0.15, 0], scale: [0.05, 0.65, 0.05], rotation: [0.1, 0, 0.3], color: '#ffc2d1' },
        { shape: 'cylinder', pos: [-0.4, -0.15, 0], scale: [0.05, 0.65, 0.05], rotation: [0.1, 0, -0.3], color: '#ffc2d1' }
      ]
    },
    layer: 'deep',
    instanceCount: 2
  },
  {
    id: 'barreleye',
    name: '管眼鱼',
    depthRange: [200, 450],
    intro: '管眼鱼拥有透明的头部和管状可旋转的眼睛，能够向上凝视寻找猎物剪影。它们奇特的视觉结构是适应深海弱光环境演化的奇迹，曾被认为是外星生物。',
    color: '#1a759f',
    accentColor: '#76c893',
    geometryType: 'composite',
    params: {
      size: 1.7,
      composite: [
        { shape: 'sphere', pos: [0, 0, 0], scale: [1.4, 0.55, 0.55], color: '#1a759f' },
        { shape: 'sphere', pos: [0.6, 0.1, 0], scale: [0.5, 0.4, 0.45], color: 'rgba(118, 200, 147, 0.25)' },
        { shape: 'cylinder', pos: [0.7, 0.35, 0], scale: [0.08, 0.3, 0.08], rotation: [-0.5, 0, 0], color: '#52b69a' },
        { shape: 'cylinder', pos: [0.7, 0.35, 0.15], scale: [0.08, 0.3, 0.08], rotation: [-0.5, 0.2, 0], color: '#52b69a' },
        { shape: 'cylinder', pos: [0.7, 0.35, -0.15], scale: [0.08, 0.3, 0.08], rotation: [-0.5, -0.2, 0], color: '#52b69a' },
        { shape: 'sphere', pos: [0.72, 0.48, 0.08], scale: [0.09, 0.09, 0.09], color: '#34a0a4' },
        { shape: 'sphere', pos: [0.72, 0.48, -0.08], scale: [0.09, 0.09, 0.09], color: '#34a0a4' },
        { shape: 'cone', pos: [-1.1, 0, 0], scale: [0.3, 0.6, 0.35], rotation: [0, 0, Math.PI / 2], color: '#1a759f' },
        { shape: 'cone', pos: [0, 0.4, 0], scale: [0.12, 0.4, 0.15], color: '#184e77' },
        { shape: 'sphere', pos: [0.85, 0, 0.1], scale: [0.06, 0.06, 0.04], color: '#000000' },
        { shape: 'sphere', pos: [0.85, 0, -0.1], scale: [0.06, 0.06, 0.04], color: '#000000' }
      ]
    },
    layer: 'deep',
    instanceCount: 2
  }
];

export const LAYER_CONFIG = {
  shallow: { min: 0, max: 50, color: '#4ea8de', ambient: 0.8, particleDensity: 1 },
  middle: { min: 50, max: 200, color: '#1b4965', ambient: 0.4, particleDensity: 2 },
  deep: { min: 200, max: 500, color: '#0a1628', ambient: 0.15, particleDensity: 4 }
} as const;
