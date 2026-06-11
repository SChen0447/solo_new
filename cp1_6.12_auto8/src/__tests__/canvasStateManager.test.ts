import { describe, it, expect, beforeEach } from 'vitest';
import { CanvasStateManager, validateImageFile } from '../backend/canvasStateManager';
import type { DrawPath, DrawShape, StickyNote, CanvasImage } from '../shared/types';

describe('CanvasStateManager', () => {
  let manager: CanvasStateManager;

  beforeEach(() => {
    manager = new CanvasStateManager();
  });

  describe('initial state', () => {
    it('should start with empty state', () => {
      const state = manager.getState();
      expect(state.drawings).toEqual([]);
      expect(state.stickies).toEqual([]);
      expect(state.images).toEqual([]);
    });

    it('should accept initial state', () => {
      const m = new CanvasStateManager({
        drawings: [{ id: '1', type: 'pen', points: [{ x: 0, y: 0 }], color: '#000', thickness: 2, userId: 'u1' }],
        stickies: [],
        images: [],
      });
      expect(m.getState().drawings).toHaveLength(1);
    });
  });

  describe('draw elements', () => {
    it('should add a pen element', () => {
      const pen: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
        color: '#ff6b35',
        thickness: 4,
        userId: 'user1',
      };
      manager.addDrawElement(pen);
      const state = manager.getState();
      expect(state.drawings).toHaveLength(1);
      expect(state.drawings[0]).toEqual(pen);
    });

    it('should add a shape element', () => {
      const rect: DrawShape = {
        id: 'rect1',
        type: 'rectangle',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#2d6a4f',
        thickness: 2,
        userId: 'user1',
      };
      manager.addDrawElement(rect);
      expect(manager.getState().drawings).toHaveLength(1);
    });

    it('should update an existing draw element', () => {
      const pen: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 10, y: 20 }],
        color: '#000',
        thickness: 2,
        userId: 'u1',
      };
      manager.addDrawElement(pen);

      const updated: DrawPath = {
        ...pen,
        points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
        color: '#ff6b35',
        thickness: 6,
      };
      manager.updateDrawElement(updated);

      const state = manager.getState();
      expect(state.drawings).toHaveLength(1);
      expect(state.drawings[0].color).toBe('#ff6b35');
      expect(state.drawings[0].thickness).toBe(6);
      expect((state.drawings[0] as DrawPath).points).toHaveLength(2);
    });

    it('should not duplicate when updating non-existent element', () => {
      const pen: DrawPath = {
        id: 'nonexistent',
        type: 'pen',
        points: [],
        color: '#000',
        thickness: 2,
        userId: 'u1',
      };
      manager.updateDrawElement(pen);
      expect(manager.getState().drawings).toHaveLength(0);
    });

    it('should finish draw element by updating existing', () => {
      const pen: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 0, y: 0 }],
        color: '#000',
        thickness: 2,
        userId: 'u1',
      };
      manager.addDrawElement(pen);
      const finished: DrawPath = { ...pen, points: [{ x: 0, y: 0 }, { x: 50, y: 50 }] };
      manager.finishDrawElement(finished);
      expect(manager.getState().drawings).toHaveLength(1);
      expect((manager.getState().drawings[0] as DrawPath).points).toHaveLength(2);
    });

    it('should finish draw element by adding new if not exists', () => {
      const pen: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 0, y: 0 }],
        color: '#000',
        thickness: 2,
        userId: 'u1',
      };
      manager.finishDrawElement(pen);
      expect(manager.getState().drawings).toHaveLength(1);
    });

    it('should preserve color and thickness through draw lifecycle', () => {
      const pen: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 0, y: 0 }],
        color: '#ff6b35',
        thickness: 8,
        userId: 'u1',
      };
      manager.addDrawElement(pen);

      const updated: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
        color: '#ff6b35',
        thickness: 8,
        userId: 'u1',
      };
      manager.updateDrawElement(updated);

      const finished: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 20 }],
        color: '#ff6b35',
        thickness: 8,
        userId: 'u1',
      };
      manager.finishDrawElement(finished);

      const result = manager.getState().drawings[0] as DrawPath;
      expect(result.color).toBe('#ff6b35');
      expect(result.thickness).toBe(8);
      expect(result.points).toHaveLength(3);
    });
  });

  describe('sticky notes', () => {
    const sticky: StickyNote = {
      id: 's1',
      x: 100,
      y: 200,
      width: 180,
      height: 140,
      content: 'Hello',
      color: '#fff9c4',
      borderColor: '#ff6b35',
      userId: 'u1',
    };

    it('should add a sticky note', () => {
      manager.addSticky(sticky);
      expect(manager.getState().stickies).toHaveLength(1);
      expect(manager.getState().stickies[0].content).toBe('Hello');
    });

    it('should update a sticky note content', () => {
      manager.addSticky(sticky);
      manager.updateSticky({ ...sticky, content: 'Updated' });
      expect(manager.getState().stickies[0].content).toBe('Updated');
    });

    it('should update a sticky note position', () => {
      manager.addSticky(sticky);
      manager.updateSticky({ ...sticky, x: 300, y: 400 });
      expect(manager.getState().stickies[0].x).toBe(300);
      expect(manager.getState().stickies[0].y).toBe(400);
    });

    it('should delete a sticky note', () => {
      manager.addSticky(sticky);
      manager.deleteSticky('s1');
      expect(manager.getState().stickies).toHaveLength(0);
    });

    it('should not crash deleting non-existent sticky', () => {
      manager.deleteSticky('nonexistent');
      expect(manager.getState().stickies).toHaveLength(0);
    });
  });

  describe('images', () => {
    const img: CanvasImage = {
      id: 'img1',
      x: 50,
      y: 50,
      width: 200,
      height: 150,
      src: 'data:image/png;base64,abc',
      userId: 'u1',
    };

    it('should add an image', () => {
      manager.addImage(img);
      expect(manager.getState().images).toHaveLength(1);
    });

    it('should update an image position', () => {
      manager.addImage(img);
      manager.updateImage({ ...img, x: 100, y: 200 });
      expect(manager.getState().images[0].x).toBe(100);
      expect(manager.getState().images[0].y).toBe(200);
    });

    it('should update an image size', () => {
      manager.addImage(img);
      manager.updateImage({ ...img, width: 400, height: 300 });
      expect(manager.getState().images[0].width).toBe(400);
      expect(manager.getState().images[0].height).toBe(300);
    });

    it('should delete an image', () => {
      manager.addImage(img);
      manager.deleteImage('img1');
      expect(manager.getState().images).toHaveLength(0);
    });
  });

  describe('history versions', () => {
    it('should not save version when canvas is empty', () => {
      const version = manager.saveVersion();
      expect(version).toBeNull();
      expect(manager.getVersions()).toHaveLength(0);
    });

    it('should save a version when canvas has content', () => {
      const pen: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 0, y: 0 }],
        color: '#000',
        thickness: 2,
        userId: 'u1',
      };
      manager.addDrawElement(pen);
      const version = manager.saveVersion();
      expect(version).not.toBeNull();
      expect(version!.drawings).toHaveLength(1);
      expect(manager.getVersions()).toHaveLength(1);
    });

    it('should not save duplicate version if nothing changed', () => {
      const pen: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 0, y: 0 }],
        color: '#000',
        thickness: 2,
        userId: 'u1',
      };
      manager.addDrawElement(pen);
      manager.saveVersion();
      const v2 = manager.saveVersion();
      expect(v2).toBeNull();
      expect(manager.getVersions()).toHaveLength(1);
    });

    it('should save new version when content changes', () => {
      const pen1: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 0, y: 0 }],
        color: '#000',
        thickness: 2,
        userId: 'u1',
      };
      manager.addDrawElement(pen1);
      manager.saveVersion();

      const pen2: DrawPath = {
        id: 'pen2',
        type: 'pen',
        points: [{ x: 10, y: 10 }],
        color: '#ff6b35',
        thickness: 4,
        userId: 'u1',
      };
      manager.addDrawElement(pen2);
      const v2 = manager.saveVersion();
      expect(v2).not.toBeNull();
      expect(manager.getVersions()).toHaveLength(2);
    });

    it('should restore a version by id', () => {
      const pen1: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 0, y: 0 }],
        color: '#000',
        thickness: 2,
        userId: 'u1',
      };
      manager.addDrawElement(pen1);
      const v1 = manager.saveVersion();

      const pen2: DrawPath = {
        id: 'pen2',
        type: 'pen',
        points: [{ x: 10, y: 10 }],
        color: '#ff6b35',
        thickness: 4,
        userId: 'u1',
      };
      manager.addDrawElement(pen2);

      expect(manager.getState().drawings).toHaveLength(2);

      const restored = manager.restoreVersion(v1!.id);
      expect(restored).toBe(true);
      expect(manager.getState().drawings).toHaveLength(1);
      expect(manager.getState().drawings[0].id).toBe('pen1');
    });

    it('should return false for non-existent version id', () => {
      const result = manager.restoreVersion('nonexistent');
      expect(result).toBe(false);
    });

    it('should preserve color and thickness in saved versions', () => {
      const pen: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 0, y: 0 }, { x: 50, y: 50 }],
        color: '#ff6b35',
        thickness: 8,
        userId: 'u1',
      };
      manager.addDrawElement(pen);
      const version = manager.saveVersion();

      const saved = version!.drawings[0] as DrawPath;
      expect(saved.color).toBe('#ff6b35');
      expect(saved.thickness).toBe(8);
      expect(saved.points).toHaveLength(2);
    });

    it('should limit versions to max 50', () => {
      for (let i = 0; i < 55; i++) {
        const pen: DrawPath = {
          id: `pen${i}`,
          type: 'pen',
          points: [{ x: i, y: i }],
          color: '#000',
          thickness: 2,
          userId: 'u1',
        };
        manager.addDrawElement(pen);
        manager.saveVersion();
      }
      expect(manager.getVersions().length).toBeLessThanOrEqual(50);
    });
  });

  describe('clear', () => {
    it('should clear all elements', () => {
      const pen: DrawPath = {
        id: 'pen1',
        type: 'pen',
        points: [{ x: 0, y: 0 }],
        color: '#000',
        thickness: 2,
        userId: 'u1',
      };
      manager.addDrawElement(pen);
      manager.addSticky({
        id: 's1', x: 0, y: 0, width: 100, height: 100,
        content: 'test', color: '#fff9c4', borderColor: '#000', userId: 'u1',
      });
      manager.addImage({
        id: 'img1', x: 0, y: 0, width: 100, height: 100,
        src: 'data:image/png;base64,abc', userId: 'u1',
      });

      manager.clear();
      const state = manager.getState();
      expect(state.drawings).toHaveLength(0);
      expect(state.stickies).toHaveLength(0);
      expect(state.images).toHaveLength(0);
    });
  });
});

describe('validateImageFile', () => {
  it('should accept valid PNG files', () => {
    const result = validateImageFile({ type: 'image/png', size: 1024 });
    expect(result.valid).toBe(true);
  });

  it('should accept valid JPEG files', () => {
    const result = validateImageFile({ type: 'image/jpeg', size: 1024 });
    expect(result.valid).toBe(true);
  });

  it('should reject non-image files', () => {
    const result = validateImageFile({ type: 'application/pdf', size: 1024 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('PNG');
  });

  it('should reject SVG files', () => {
    const result = validateImageFile({ type: 'image/svg+xml', size: 1024 });
    expect(result.valid).toBe(false);
  });

  it('should reject files larger than 5MB', () => {
    const result = validateImageFile({ type: 'image/png', size: 6 * 1024 * 1024 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('5MB');
  });

  it('should accept files exactly 5MB', () => {
    const result = validateImageFile({ type: 'image/png', size: 5 * 1024 * 1024 });
    expect(result.valid).toBe(true);
  });

  it('should reject files just over 5MB', () => {
    const result = validateImageFile({ type: 'image/png', size: 5 * 1024 * 1024 + 1 });
    expect(result.valid).toBe(false);
  });
});
