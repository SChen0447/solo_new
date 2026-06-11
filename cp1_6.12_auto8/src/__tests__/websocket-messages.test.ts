import { describe, it, expect } from 'vitest';
import type {
  ServerMessage,
  ClientMessage,
  DrawPath,
  DrawShape,
  StickyNote,
  CanvasImage,
  UserCursor,
  HistoryVersion,
  ToolType,
  Point,
} from '../shared/types';

describe('WebSocket message format', () => {
  describe('ClientMessage serialization', () => {
    it('should serialize and deserialize draw message with pen', () => {
      const pen: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
        color: '#ff6b35',
        thickness: 4,
        userId: 'u1',
      };
      const msg: ClientMessage = { type: 'draw', element: pen };
      const serialized = JSON.stringify(msg);
      const deserialized: ClientMessage = JSON.parse(serialized);
      expect(deserialized.type).toBe('draw');
      expect(deserialized.element.type).toBe('pen');
      if (deserialized.element.type === 'pen') {
        expect(deserialized.element.color).toBe('#ff6b35');
        expect(deserialized.element.thickness).toBe(4);
        expect(deserialized.element.points).toHaveLength(2);
      }
    });

    it('should serialize and deserialize draw-update with shape', () => {
      const shape: DrawShape = {
        id: 'rect1',
        type: 'rectangle',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#2d6a4f',
        thickness: 2,
        userId: 'u1',
      };
      const msg: ClientMessage = { type: 'draw-update', element: shape };
      const serialized = JSON.stringify(msg);
      const deserialized: ClientMessage = JSON.parse(serialized);
      expect(deserialized.type).toBe('draw-update');
      if (deserialized.element.type === 'rectangle') {
        expect(deserialized.element.start.x).toBe(0);
        expect(deserialized.element.end.x).toBe(100);
        expect(deserialized.element.color).toBe('#2d6a4f');
        expect(deserialized.element.thickness).toBe(2);
      }
    });

    it('should serialize and deserialize draw-finish with circle', () => {
      const circle: DrawShape = {
        id: 'c1',
        type: 'circle',
        start: { x: 50, y: 50 },
        end: { x: 150, y: 150 },
        color: '#e91e63',
        thickness: 3,
        userId: 'u1',
      };
      const msg: ClientMessage = { type: 'draw-finish', element: circle };
      const deserialized: ClientMessage = JSON.parse(JSON.stringify(msg));
      if (deserialized.element.type === 'circle') {
        expect(deserialized.element.color).toBe('#e91e63');
        expect(deserialized.element.thickness).toBe(3);
      }
    });

    it('should serialize and deserialize draw-finish with line', () => {
      const line: DrawShape = {
        id: 'l1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 200, y: 100 },
        color: '#000000',
        thickness: 1,
        userId: 'u1',
      };
      const msg: ClientMessage = { type: 'draw-finish', element: line };
      const deserialized: ClientMessage = JSON.parse(JSON.stringify(msg));
      if (deserialized.element.type === 'line') {
        expect(deserialized.element.color).toBe('#000000');
        expect(deserialized.element.thickness).toBe(1);
      }
    });

    it('should serialize and deserialize sticky-add', () => {
      const sticky: StickyNote = {
        id: 's1',
        x: 100,
        y: 200,
        width: 180,
        height: 140,
        content: 'Hello World',
        color: '#fff9c4',
        borderColor: '#ff6b35',
        userId: 'u1',
      };
      const msg: ClientMessage = { type: 'sticky-add', sticky };
      const deserialized: ClientMessage = JSON.parse(JSON.stringify(msg));
      expect(deserialized.type).toBe('sticky-add');
      if (deserialized.type === 'sticky-add') {
        expect(deserialized.sticky.content).toBe('Hello World');
        expect(deserialized.sticky.borderColor).toBe('#ff6b35');
      }
    });

    it('should serialize and deserialize sticky-update', () => {
      const sticky: StickyNote = {
        id: 's1',
        x: 100,
        y: 200,
        width: 180,
        height: 140,
        content: 'Updated content',
        color: '#fff9c4',
        borderColor: '#ff6b35',
        userId: 'u1',
      };
      const msg: ClientMessage = { type: 'sticky-update', sticky };
      const deserialized: ClientMessage = JSON.parse(JSON.stringify(msg));
      if (deserialized.type === 'sticky-update') {
        expect(deserialized.sticky.content).toBe('Updated content');
      }
    });

    it('should serialize and deserialize image-add', () => {
      const img: CanvasImage = {
        id: 'img1',
        x: 50,
        y: 50,
        width: 200,
        height: 150,
        src: 'data:image/png;base64,iVBOR',
        userId: 'u1',
      };
      const msg: ClientMessage = { type: 'image-add', image: img };
      const deserialized: ClientMessage = JSON.parse(JSON.stringify(msg));
      expect(deserialized.type).toBe('image-add');
      if (deserialized.type === 'image-add') {
        expect(deserialized.image.src).toContain('data:image/png');
        expect(deserialized.image.width).toBe(200);
      }
    });

    it('should serialize and deserialize cursor-move', () => {
      const cursor: UserCursor = {
        userId: 'u1',
        x: 100,
        y: 200,
        color: '#ff6b35',
        name: '快乐的小猫',
      };
      const msg: ClientMessage = { type: 'cursor-move', cursor };
      const deserialized: ClientMessage = JSON.parse(JSON.stringify(msg));
      if (deserialized.type === 'cursor-move') {
        expect(deserialized.cursor.x).toBe(100);
        expect(deserialized.cursor.color).toBe('#ff6b35');
        expect(deserialized.cursor.name).toBe('快乐的小猫');
      }
    });

    it('should serialize and deserialize restore-version', () => {
      const msg: ClientMessage = { type: 'restore-version', versionId: 'v123' };
      const deserialized: ClientMessage = JSON.parse(JSON.stringify(msg));
      if (deserialized.type === 'restore-version') {
        expect(deserialized.versionId).toBe('v123');
      }
    });

    it('should serialize and deserialize clear-canvas', () => {
      const msg: ClientMessage = { type: 'clear-canvas' };
      const deserialized: ClientMessage = JSON.parse(JSON.stringify(msg));
      expect(deserialized.type).toBe('clear-canvas');
    });
  });

  describe('ServerMessage serialization', () => {
    it('should serialize and deserialize init message', () => {
      const msg: ServerMessage = {
        type: 'init',
        userId: 'u1',
        state: { drawings: [], stickies: [], images: [] },
        versions: [],
      };
      const deserialized: ServerMessage = JSON.parse(JSON.stringify(msg));
      expect(deserialized.type).toBe('init');
      if (deserialized.type === 'init') {
        expect(deserialized.userId).toBe('u1');
        expect(deserialized.state.drawings).toEqual([]);
      }
    });

    it('should serialize and deserialize version-saved', () => {
      const version: HistoryVersion = {
        id: 'v1',
        timestamp: Date.now(),
        drawings: [],
        stickies: [],
        images: [],
      };
      const msg: ServerMessage = { type: 'version-saved', version };
      const deserialized: ServerMessage = JSON.parse(JSON.stringify(msg));
      if (deserialized.type === 'version-saved') {
        expect(deserialized.version.id).toBe('v1');
      }
    });

    it('should serialize and deserialize version-restore', () => {
      const msg: ServerMessage = {
        type: 'version-restore',
        versionId: 'v1',
        state: {
          drawings: [{
            id: 'pen1',
            type: 'pen',
            points: [{ x: 0, y: 0 }],
            color: '#ff6b35',
            thickness: 4,
            userId: 'u1',
          }],
          stickies: [],
          images: [],
        },
      };
      const deserialized: ServerMessage = JSON.parse(JSON.stringify(msg));
      if (deserialized.type === 'version-restore') {
        expect(deserialized.versionId).toBe('v1');
        expect(deserialized.state.drawings).toHaveLength(1);
        const pen = deserialized.state.drawings[0] as DrawPath;
        expect(pen.color).toBe('#ff6b35');
        expect(pen.thickness).toBe(4);
      }
    });

    it('should serialize and deserialize user-joined', () => {
      const msg: ServerMessage = {
        type: 'user-joined',
        userId: 'u1',
        color: '#ff6b35',
        name: '快乐的小猫',
      };
      const deserialized: ServerMessage = JSON.parse(JSON.stringify(msg));
      if (deserialized.type === 'user-joined') {
        expect(deserialized.color).toBe('#ff6b35');
        expect(deserialized.name).toBe('快乐的小猫');
      }
    });

    it('should preserve all draw element fields through serialization', () => {
      const pen: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 60 }],
        color: '#ff6b35',
        thickness: 8,
        userId: 'u1',
      };
      const msg: ServerMessage = { type: 'draw', element: pen };
      const deserialized: ServerMessage = JSON.parse(JSON.stringify(msg));
      if (deserialized.type === 'draw' && deserialized.element.type === 'pen') {
        expect(deserialized.element.id).toBe('pen1');
        expect(deserialized.element.color).toBe('#ff6b35');
        expect(deserialized.element.thickness).toBe(8);
        expect(deserialized.element.userId).toBe('u1');
        expect(deserialized.element.points).toHaveLength(3);
        expect(deserialized.element.points[0]).toEqual({ x: 10, y: 20 });
      }
    });
  });
});

describe('Draw sync data integrity', () => {
  it('should preserve pen stroke color through full update cycle', () => {
    const steps: DrawPath[] = [
      { id: 'p1', type: 'pen', points: [{ x: 0, y: 0 }], color: '#ff6b35', thickness: 6, userId: 'u1' },
      { id: 'p1', type: 'pen', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#ff6b35', thickness: 6, userId: 'u1' },
      { id: 'p1', type: 'pen', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 20 }], color: '#ff6b35', thickness: 6, userId: 'u1' },
    ];

    for (const step of steps) {
      const serialized = JSON.stringify(step);
      const deserialized: DrawPath = JSON.parse(serialized);
      expect(deserialized.color).toBe('#ff6b35');
      expect(deserialized.thickness).toBe(6);
      expect(deserialized.userId).toBe('u1');
    }
  });

  it('should preserve shape color and thickness through full update cycle', () => {
    const steps: DrawShape[] = [
      { id: 'r1', type: 'rectangle', start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, color: '#2d6a4f', thickness: 3, userId: 'u1' },
      { id: 'r1', type: 'rectangle', start: { x: 0, y: 0 }, end: { x: 50, y: 50 }, color: '#2d6a4f', thickness: 3, userId: 'u1' },
      { id: 'r1', type: 'rectangle', start: { x: 0, y: 0 }, end: { x: 100, y: 100 }, color: '#2d6a4f', thickness: 3, userId: 'u1' },
    ];

    for (const step of steps) {
      const deserialized: DrawShape = JSON.parse(JSON.stringify(step));
      expect(deserialized.color).toBe('#2d6a4f');
      expect(deserialized.thickness).toBe(3);
    }
  });

  it('should handle unicode content in sticky notes', () => {
    const sticky: StickyNote = {
      id: 's1',
      x: 0,
      y: 0,
      width: 180,
      height: 140,
      content: '你好世界 🌍 こんにちは',
      color: '#fff9c4',
      borderColor: '#ff6b35',
      userId: 'u1',
    };
    const deserialized: StickyNote = JSON.parse(JSON.stringify(sticky));
    expect(deserialized.content).toBe('你好世界 🌍 こんにちは');
  });

  it('should handle large base64 image data', () => {
    const largeSrc = 'data:image/png;base64,' + 'A'.repeat(100000);
    const img: CanvasImage = {
      id: 'img1',
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      src: largeSrc,
      userId: 'u1',
    };
    const deserialized: CanvasImage = JSON.parse(JSON.stringify(img));
    expect(deserialized.src.length).toBe(largeSrc.length);
    expect(deserialized.width).toBe(800);
  });

  it('should handle multiple concurrent draw elements from different users', () => {
    const elements: DrawElement[] = [
      { id: 'p1', type: 'pen', points: [{ x: 0, y: 0 }], color: '#ff6b35', thickness: 2, userId: 'u1' },
      { id: 'p2', type: 'pen', points: [{ x: 10, y: 10 }], color: '#2d6a4f', thickness: 4, userId: 'u2' },
      { id: 'r1', type: 'rectangle', start: { x: 0, y: 0 }, end: { x: 100, y: 100 }, color: '#2196f3', thickness: 3, userId: 'u3' },
      { id: 'c1', type: 'circle', start: { x: 50, y: 50 }, end: { x: 150, y: 150 }, color: '#9c27b0', thickness: 5, userId: 'u1' },
      { id: 'l1', type: 'line', start: { x: 0, y: 0 }, end: { x: 200, y: 100 }, color: '#e91e63', thickness: 1, userId: 'u2' },
    ];

    for (const el of elements) {
      const deserialized: DrawElement = JSON.parse(JSON.stringify(el));
      expect(deserialized.id).toBe(el.id);
      expect(deserialized.color).toBe(el.color);
      expect(deserialized.thickness).toBe(el.thickness);
      expect(deserialized.userId).toBe(el.userId);
    }
  });
});
