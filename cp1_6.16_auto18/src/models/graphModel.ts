import * as THREE from 'three';
import {
  FlowNode,
  FlowConnection,
  DataPacket,
  NODE_COLORS,
  NODE_COLOR_KEYS,
  MAX_NODES,
  MAX_CONNECTIONS,
  MAX_PACKETS,
  NODE_RADIUS,
} from './types';

type ModelChangeListener = () => void;

export class GraphModel {
  private nodes: Map<string, FlowNode> = new Map();
  private connections: Map<string, FlowConnection> = new Map();
  private packets: DataPacket[] = [];
  private nodeCounter = 0;
  private packetCounter = 0;
  private packetRate = 3;
  private lastPacketTime = 0;
  private listeners: ModelChangeListener[] = [];
  private selectedNodeId: string | null = null;

  addListener(fn: ModelChangeListener): void {
    this.listeners.push(fn);
  }

  removeListener(fn: ModelChangeListener): void {
    this.listeners = this.listeners.filter((l) => l !== fn);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  addNode(position?: THREE.Vector3): FlowNode | null {
    if (this.nodes.size >= MAX_NODES) return null;
    const id = `node-${this.nodeCounter++}`;
    const colorKey = NODE_COLOR_KEYS[Math.floor(Math.random() * NODE_COLOR_KEYS.length)];
    const color = NODE_COLORS[colorKey];
    const pos =
      position ??
      new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6
      );
    const node: FlowNode = {
      id,
      name: `Node-${this.nodeCounter}`,
      position: pos,
      colorKey,
      color,
      type: 'source',
      receivedPackets: 0,
      originalScale: 1,
      isFlashing: false,
      flashTimer: 0,
    };
    this.nodes.set(id, node);
    this.notify();
    return node;
  }

  removeNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    const connIds: string[] = [];
    this.connections.forEach((conn) => {
      if (conn.sourceId === nodeId || conn.targetId === nodeId) {
        connIds.push(conn.id);
      }
    });
    connIds.forEach((cid) => this.removeConnection(cid));
    this.packets = this.packets.filter(
      (p) => p.sourceId !== nodeId && p.targetId !== nodeId
    );
    if (this.selectedNodeId === nodeId) this.selectedNodeId = null;
    this.nodes.delete(nodeId);
    this.notify();
    return true;
  }

  getNode(nodeId: string): FlowNode | undefined {
    return this.nodes.get(nodeId);
  }

  getAllNodes(): FlowNode[] {
    return Array.from(this.nodes.values());
  }

  addConnection(sourceId: string, targetId: string): FlowConnection | null {
    if (sourceId === targetId) return null;
    if (this.connections.size >= MAX_CONNECTIONS) return null;
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) return null;
    let exists = false;
    this.connections.forEach((c) => {
      if (c.sourceId === sourceId && c.targetId === targetId) exists = true;
    });
    if (exists) return null;
    const id = `conn-${sourceId}-${targetId}`;
    const conn: FlowConnection = {
      id,
      sourceId,
      targetId,
      flowParticles: [],
    };
    this.connections.set(id, conn);
    this.notify();
    return conn;
  }

  removeConnection(connId: string): boolean {
    const result = this.connections.delete(connId);
    if (result) {
      this.packets = this.packets.filter((p) => p.connectionId !== connId);
      this.notify();
    }
    return result;
  }

  getConnection(connId: string): FlowConnection | undefined {
    return this.connections.get(connId);
  }

  getAllConnections(): FlowConnection[] {
    return Array.from(this.connections.values());
  }

  getConnectionsForNode(nodeId: string): FlowConnection[] {
    const result: FlowConnection[] = [];
    this.connections.forEach((c) => {
      if (c.sourceId === nodeId || c.targetId === nodeId) result.push(c);
    });
    return result;
  }

  getConnectionCount(nodeId: string): number {
    return this.getConnectionsForNode(nodeId).length;
  }

  setPacketRate(rate: number): void {
    this.packetRate = Math.max(1, Math.min(10, rate));
  }

  getPacketRate(): number {
    return this.packetRate;
  }

  getSelectedNodeId(): string | null {
    return this.selectedNodeId;
  }

  setSelectedNodeId(id: string | null): void {
    this.selectedNodeId = id;
    this.notify();
  }

  spawnPacket(): DataPacket | null {
    if (this.packets.length >= MAX_PACKETS) return null;
    const connArray = Array.from(this.connections.values());
    if (connArray.length === 0) return null;
    const conn = connArray[Math.floor(Math.random() * connArray.length)];
    const id = `pkt-${this.packetCounter++}`;
    const packet: DataPacket = {
      id,
      sourceId: conn.sourceId,
      targetId: conn.targetId,
      connectionId: conn.id,
      progress: 0,
      speed: 0.3 + Math.random() * 0.2,
      active: true,
    };
    this.packets.push(packet);
    return packet;
  }

  updatePackets(delta: number): void {
    for (const packet of this.packets) {
      if (!packet.active) continue;
      packet.progress += packet.speed * delta;
      if (packet.progress >= 1) {
        packet.active = false;
        const target = this.nodes.get(packet.targetId);
        if (target) {
          target.receivedPackets++;
          target.isFlashing = true;
          target.flashTimer = 0.2;
        }
      }
    }
    this.packets = this.packets.filter((p) => p.active);
  }

  updateFlashes(delta: number): void {
    this.nodes.forEach((node) => {
      if (node.isFlashing) {
        node.flashTimer -= delta;
        if (node.flashTimer <= 0) {
          node.isFlashing = false;
          node.flashTimer = 0;
        }
      }
    });
  }

  tryAutoSpawn(currentTime: number): DataPacket | null {
    const interval = 1 / this.packetRate;
    if (currentTime - this.lastPacketTime >= interval) {
      this.lastPacketTime = currentTime;
      return this.spawnPacket();
    }
    return null;
  }

  getActivePackets(): DataPacket[] {
    return this.packets;
  }

  updateNodePosition(nodeId: string, position: THREE.Vector3): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.position.copy(position);
    }
  }

  reset(): void {
    this.nodes.clear();
    this.connections.clear();
    this.packets = [];
    this.nodeCounter = 0;
    this.packetCounter = 0;
    this.selectedNodeId = null;
    this.notify();
  }
}
