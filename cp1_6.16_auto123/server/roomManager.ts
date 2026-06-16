import { v4 as uuidv4 } from 'uuid';

export type SkillType = 'passive' | 'active' | 'ultimate';
export type EffectType = 'damage' | 'defense' | 'heal' | 'buff';

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  x: number;
  y: number;
  parentId: string | null;
  maxLevel: number;
  currentLevel: number;
  costPerLevel: number;
  effectType: EffectType;
  baseEffect: number;
  growthPerLevel: number;
}

export interface SkillTree {
  id: string;
  name: string;
  nodes: SkillNode[];
  totalPoints: number;
  usedPoints: number;
}

export interface Room {
  id: string;
  skillTree: SkillTree;
  clients: Set<string>;
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(roomId?: string): Room {
    const id = roomId || uuidv4();
    if (this.rooms.has(id)) {
      return this.rooms.get(id)!;
    }

    const rootNode: SkillNode = {
      id: uuidv4(),
      name: '基础天赋',
      description: '技能树的起点',
      type: 'passive',
      x: 400,
      y: 400,
      parentId: null,
      maxLevel: 1,
      currentLevel: 1,
      costPerLevel: 0,
      effectType: 'buff',
      baseEffect: 0,
      growthPerLevel: 0,
    };

    const skillTree: SkillTree = {
      id,
      name: '新技能树',
      nodes: [rootNode],
      totalPoints: 100,
      usedPoints: 0,
    };

    const room: Room = {
      id,
      skillTree,
      clients: new Set(),
    };

    this.rooms.set(id, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addClient(roomId: string, clientId: string): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = this.createRoom(roomId);
    }
    room.clients.add(clientId);
    return room;
  }

  removeClient(roomId: string, clientId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.clients.delete(clientId);
      if (room.clients.size === 0) {
        // 房间空了，保留数据一段时间（这里简化为保留）
      }
    }
  }

  updateSkillTree(roomId: string, skillTree: SkillTree): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.skillTree = skillTree;
    }
  }

  addNode(roomId: string, node: SkillNode): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.skillTree.nodes.push(node);
    }
  }

  updateNode(roomId: string, nodeId: string, updates: Partial<SkillNode>): void {
    const room = this.rooms.get(roomId);
    if (room) {
      const node = room.skillTree.nodes.find(n => n.id === nodeId);
      if (node) {
        Object.assign(node, updates);
      }
    }
  }

  deleteNode(roomId: string, nodeId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.skillTree.nodes = room.skillTree.nodes.filter(n => n.id !== nodeId);
      // 同时移除子节点的父引用
      room.skillTree.nodes.forEach(n => {
        if (n.parentId === nodeId) {
          n.parentId = null;
        }
      });
    }
  }

  setTotalPoints(roomId: string, points: number): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.skillTree.totalPoints = Math.max(50, Math.min(500, points));
    }
  }

  resetPoints(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.skillTree.nodes.forEach(node => {
        if (node.parentId !== null) {
          node.currentLevel = 0;
        }
      });
      room.skillTree.usedPoints = 0;
    }
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }
}

export const roomManager = new RoomManager();
