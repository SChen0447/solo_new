import * as THREE from 'three';

export type OwnerType = 'player' | 'ai' | 'neutral';

export interface GraphNodeData {
  id: string;
  position: THREE.Vector3;
  owner: OwnerType;
  isCore: boolean;
  isStart: boolean;
  isAIStart: boolean;
  captureProgress: number;
  captureRequired: number;
  firewall: number;
  connections: string[];
  lastAttacker?: OwnerType;
}

export interface GraphEdgeData {
  from: string;
  to: string;
}

const CORE_CAPTURE_REQUIRED = 2;
const NORMAL_CAPTURE_REQUIRED = 1;

export class GraphManager {
  public nodes: Map<string, GraphNodeData> = new Map();
  public edges: GraphEdgeData[] = [];

  private readonly minNodeCount = 12;
  private readonly minEdgeCount = 20;
  private readonly spreadRadius = 18;

  public generateGraph(nodeCount = 14, edgeCount = 22): void {
    this.nodes.clear();
    this.edges = [];

    const actualNodeCount = Math.max(nodeCount, this.minNodeCount);
    const actualEdgeCount = Math.max(edgeCount, this.minEdgeCount);

    const positions = this.layoutNodes(actualNodeCount);

    for (let i = 0; i < actualNodeCount; i++) {
      const id = `N${i.toString().padStart(2, '0')}`;
      const pos = positions[i];
      const isCore = i === 0;
      const isStart = i === 1;
      const isAIStart = i === 2;

      let owner: OwnerType = 'neutral';
      if (isStart) owner = 'player';
      if (isAIStart) owner = 'ai';

      this.nodes.set(id, {
        id,
        position: pos,
        owner,
        isCore,
        isStart,
        isAIStart,
        captureProgress: 0,
        captureRequired: isCore ? CORE_CAPTURE_REQUIRED : NORMAL_CAPTURE_REQUIRED,
        firewall: 0,
        connections: [],
      });
    }

    this.generateEdges(actualEdgeCount);
    this.ensureConnectivity();
  }

  private layoutNodes(count: number): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];

    positions.push(new THREE.Vector3(0, 0, 0));

    const ring1Count = 3;
    const ring1Radius = this.spreadRadius * 0.35;
    for (let i = 0; i < ring1Count; i++) {
      const angle = (i / ring1Count) * Math.PI * 2 + Math.PI / 6;
      positions.push(new THREE.Vector3(
        Math.cos(angle) * ring1Radius,
        Math.sin(angle) * ring1Radius * 0.6,
        (Math.random() - 0.5) * 2
      ));
    }

    const ring2Count = 5;
    const ring2Radius = this.spreadRadius * 0.65;
    for (let i = 0; i < ring2Count; i++) {
      const angle = (i / ring2Count) * Math.PI * 2 - Math.PI / 3;
      positions.push(new THREE.Vector3(
        Math.cos(angle) * ring2Radius + (Math.random() - 0.5) * 2,
        Math.sin(angle) * ring2Radius * 0.6 + (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 3
      ));
    }

    const ring3Count = Math.max(0, count - positions.length);
    const ring3Radius = this.spreadRadius;
    for (let i = 0; i < ring3Count; i++) {
      const angle = (i / ring3Count) * Math.PI * 2;
      positions.push(new THREE.Vector3(
        Math.cos(angle) * ring3Radius + (Math.random() - 0.5) * 3,
        Math.sin(angle) * ring3Radius * 0.55 + (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 4
      ));
    }

    while (positions.length < count) {
      positions.push(new THREE.Vector3(
        (Math.random() - 0.5) * this.spreadRadius * 2,
        (Math.random() - 0.5) * this.spreadRadius,
        (Math.random() - 0.5) * 4
      ));
    }

    return positions.slice(0, count);
  }

  private generateEdges(targetCount: number): void {
    const nodeIds = Array.from(this.nodes.keys());
    const edgeSet = new Set<string>();

    for (let i = 1; i < nodeIds.length; i++) {
      const a = nodeIds[i];
      const posA = this.nodes.get(a)!.position;
      let nearest = 0;
      let nearestDist = Infinity;
      for (let j = 0; j < i; j++) {
        const b = nodeIds[j];
        const posB = this.nodes.get(b)!.position;
        const d = posA.distanceTo(posB);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = j;
        }
      }
      this.addEdge(a, nodeIds[nearest], edgeSet);
    }

    let attempts = 0;
    while (edgeSet.size < targetCount && attempts < 2000) {
      attempts++;
      const i = Math.floor(Math.random() * nodeIds.length);
      const j = Math.floor(Math.random() * nodeIds.length);
      if (i === j) continue;
      const a = nodeIds[i];
      const b = nodeIds[j];
      const posA = this.nodes.get(a)!.position;
      const posB = this.nodes.get(b)!.position;
      const dist = posA.distanceTo(posB);
      if (dist < this.spreadRadius * 0.9) {
        this.addEdge(a, b, edgeSet);
      }
    }

    this.edges = Array.from(edgeSet).map(k => {
      const [from, to] = k.split('|');
      return { from, to };
    });

    for (const node of this.nodes.values()) {
      node.connections = [];
    }
    for (const e of this.edges) {
      if (!this.nodes.get(e.from)!.connections.includes(e.to)) {
        this.nodes.get(e.from)!.connections.push(e.to);
      }
      if (!this.nodes.get(e.to)!.connections.includes(e.from)) {
        this.nodes.get(e.to)!.connections.push(e.from);
      }
    }
  }

  private addEdge(a: string, b: string, set: Set<string>): void {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (set.has(key)) return;
    set.add(key);
  }

  private ensureConnectivity(): void {
    const nodeIds = Array.from(this.nodes.keys());
    const visited = new Set<string>();
    const stack = [nodeIds[0]];
    while (stack.length) {
      const id = stack.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const node = this.nodes.get(id)!;
      for (const adj of node.connections) {
        if (!visited.has(adj)) stack.push(adj);
      }
    }

    const edgeSet = new Set(this.edges.map(e =>
      e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`
    ));

    for (const id of nodeIds) {
      if (!visited.has(id)) {
        let nearest = nodeIds[0];
        let nd = Infinity;
        const posA = this.nodes.get(id)!.position;
        for (const v of visited) {
          const posB = this.nodes.get(v)!.position;
          const d = posA.distanceTo(posB);
          if (d < nd) { nd = d; nearest = v; }
        }
        this.addEdge(id, nearest, edgeSet);
        visited.add(id);
      }
    }

    this.edges = Array.from(edgeSet).map(k => {
      const [from, to] = k.split('|');
      return { from, to };
    });

    for (const node of this.nodes.values()) {
      node.connections = [];
    }
    for (const e of this.edges) {
      if (!this.nodes.get(e.from)!.connections.includes(e.to)) {
        this.nodes.get(e.from)!.connections.push(e.to);
      }
      if (!this.nodes.get(e.to)!.connections.includes(e.from)) {
        this.nodes.get(e.to)!.connections.push(e.from);
      }
    }
  }

  public getNode(id: string): GraphNodeData | undefined {
    return this.nodes.get(id);
  }

  public getAdjacentNodes(nodeId: string): GraphNodeData[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    return node.connections
      .map(id => this.nodes.get(id))
      .filter((n): n is GraphNodeData => !!n);
  }

  public findPath(fromId: string, toId: string): string[] {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) return [];
    if (fromId === toId) return [fromId];

    const visited = new Set<string>([fromId]);
    const parent = new Map<string, string>();
    const queue: string[] = [fromId];

    while (queue.length) {
      const curr = queue.shift()!;
      if (curr === toId) break;
      const node = this.nodes.get(curr)!;
      for (const adj of node.connections) {
        if (!visited.has(adj)) {
          visited.add(adj);
          parent.set(adj, curr);
          queue.push(adj);
        }
      }
    }

    if (!parent.has(toId) && fromId !== toId) return [];

    const path: string[] = [];
    let cur: string | undefined = toId;
    while (cur && cur !== fromId) {
      path.unshift(cur);
      cur = parent.get(cur);
    }
    path.unshift(fromId);
    return path;
  }

  public captureNode(
    nodeId: string,
    attacker: OwnerType,
    useCrack = false
  ): { success: boolean; newlyCaptured: boolean; isCore: boolean } {
    const node = this.nodes.get(nodeId);
    if (!node) return { success: false, newlyCaptured: false, isCore: false };
    if (node.owner === attacker) return { success: false, newlyCaptured: false, isCore: node.isCore };

    if (node.lastAttacker && node.lastAttacker !== attacker && !node.isCore) {
      node.captureProgress = 0;
    }
    node.lastAttacker = attacker;

    let firewallEffect = node.firewall > 0 ? Math.max(0, 1 - node.firewall * 0.3) : 1;
    let progress = (useCrack ? 2 : 1) * firewallEffect;

    node.captureProgress += progress;
    if (node.firewall > 0) {
      node.firewall = Math.max(0, node.firewall - 1);
    }

    const newlyCaptured = node.captureProgress >= node.captureRequired;
    if (newlyCaptured) {
      node.owner = attacker;
      node.captureProgress = 0;
      node.lastAttacker = undefined;
    }

    return { success: true, newlyCaptured, isCore: node.isCore };
  }

  public reinforceNode(nodeId: string, amount = 1): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    if (node.owner !== 'player') return false;
    node.firewall = Math.min(3, node.firewall + amount);
    return true;
  }

  public getCoreNode(): GraphNodeData | undefined {
    for (const node of this.nodes.values()) {
      if (node.isCore) return node;
    }
    return undefined;
  }

  public getPlayerStartNode(): GraphNodeData | undefined {
    for (const node of this.nodes.values()) {
      if (node.isStart) return node;
    }
    return undefined;
  }

  public getAIStartNode(): GraphNodeData | undefined {
    for (const node of this.nodes.values()) {
      if (node.isAIStart) return node;
    }
    return undefined;
  }

  public getNodesByOwner(owner: OwnerType): GraphNodeData[] {
    const result: GraphNodeData[] = [];
    for (const node of this.nodes.values()) {
      if (node.owner === owner) result.push(node);
    }
    return result;
  }

  public getDistance(aId: string, bId: string): number {
    const a = this.nodes.get(aId);
    const b = this.nodes.get(bId);
    if (!a || !b) return Infinity;
    return a.position.distanceTo(b.position);
  }

  public getEdgeKey(from: string, to: string): string {
    return from < to ? `${from}|${to}` : `${to}|${from}`;
  }
}
