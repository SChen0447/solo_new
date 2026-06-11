import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app, {
  imagesStore,
  annotationsStore,
  sharesStore,
  shortIdToShareId,
  AnnotationData,
} from '../server/server';

const TEST_DATA_DIR = path.join(__dirname, '..', 'data');
const TEST_STORE_FILE = path.join(TEST_DATA_DIR, 'store.json');

function createMockPngBuffer(): Buffer {
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  return png;
}

describe('Image API Tests', () => {
  beforeEach(() => {
    imagesStore.clear();
    annotationsStore.clear();
    sharesStore.clear();
    shortIdToShareId.clear();
    if (fs.existsSync(TEST_STORE_FILE)) {
      try { fs.unlinkSync(TEST_STORE_FILE); } catch {}
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_STORE_FILE)) {
      try { fs.unlinkSync(TEST_STORE_FILE); } catch {}
    }
  });

  describe('POST /api/images', () => {
    it('should upload a valid PNG image', async () => {
      const res = await request(app)
        .post('/api/images')
        .attach('image', createMockPngBuffer(), { filename: 'test.png', contentType: 'image/png' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('url');
      expect(res.body.originalName).toBe('test.png');
      expect(res.body.filename.endsWith('.png')).toBe(true);
      expect(imagesStore.has(res.body.id)).toBe(true);
      expect(annotationsStore.has(res.body.id)).toBe(true);
      expect(annotationsStore.get(res.body.id)).toEqual([]);
    });

    it('should return 400 if no file attached', async () => {
      const res = await request(app).post('/api/images');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('未上传图片');
    });

    it('should reject invalid file type', async () => {
      const res = await request(app)
        .post('/api/images')
        .attach('image', Buffer.from('not an image'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        });
      expect(res.status).not.toBe(200);
    });

    it('should accept JPEG images', async () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      const res = await request(app)
        .post('/api/images')
        .attach('image', jpeg, { filename: 'test.jpg', contentType: 'image/jpeg' });
      expect(res.status).toBe(200);
      expect(res.body.originalName).toBe('test.jpg');
    });
  });

  describe('GET /api/images', () => {
    it('should return empty list initially', async () => {
      const res = await request(app).get('/api/images');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return sorted images by createdAt desc', async () => {
      const upload1 = await request(app)
        .post('/api/images')
        .attach('image', createMockPngBuffer(), { filename: 'a.png', contentType: 'image/png' });
      const upload2 = await request(app)
        .post('/api/images')
        .attach('image', createMockPngBuffer(), { filename: 'b.png', contentType: 'image/png' });

      const res = await request(app).get('/api/images');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].id).toBe(upload2.body.id);
      expect(res.body[1].id).toBe(upload1.body.id);
    });
  });

  describe('GET /api/images/:id', () => {
    it('should return 404 for non-existent image', async () => {
      const res = await request(app).get('/api/images/nonexistent');
      expect(res.status).toBe(404);
    });

    it('should return image data for existing id', async () => {
      const upload = await request(app)
        .post('/api/images')
        .attach('image', createMockPngBuffer(), { filename: 'x.png', contentType: 'image/png' });

      const res = await request(app).get(`/api/images/${upload.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(upload.body.id);
      expect(res.body.originalName).toBe('x.png');
    });
  });
});

describe('Annotations API Tests', () => {
  let imageId: string;

  beforeEach(async () => {
    imagesStore.clear();
    annotationsStore.clear();
    sharesStore.clear();
    shortIdToShareId.clear();

    const upload = await request(app)
      .post('/api/images')
      .attach('image', createMockPngBuffer(), { filename: 'test.png', contentType: 'image/png' });
    imageId = upload.body.id;
  });

  describe('GET /api/images/:id/annotations', () => {
    it('should return empty annotations for new image', async () => {
      const res = await request(app).get(`/api/images/${imageId}/annotations`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('PUT /api/images/:id/annotations', () => {
    it('should return 404 for non-existent image', async () => {
      const res = await request(app)
        .put('/api/images/fakeid/annotations')
        .send({ annotations: [] });
      expect(res.status).toBe(404);
    });

    it('should save and return annotations successfully', async () => {
      const annotations: AnnotationData[] = [
        {
          id: 'ann-1',
          type: 'rectangle',
          x: 10,
          y: 20,
          width: 100,
          height: 80,
          color: '#e74c3c',
          strokeWidth: 3,
          note: '这里有问题',
        },
        {
          id: 'ann-2',
          type: 'arrow',
          x: 50,
          y: 50,
          width: 200,
          height: -100,
          color: '#4a90d9',
          strokeWidth: 2,
        },
        {
          id: 'ann-3',
          type: 'brush',
          x: 10,
          y: 10,
          width: 100,
          height: 100,
          points: [
            { x: 10, y: 10 },
            { x: 50, y: 50 },
            { x: 110, y: 110 },
          ],
          color: '#2ecc71',
          strokeWidth: 4,
        },
      ];

      const putRes = await request(app)
        .put(`/api/images/${imageId}/annotations`)
        .send({ annotations });
      expect(putRes.status).toBe(200);
      expect(putRes.body.success).toBe(true);

      const getRes = await request(app).get(`/api/images/${imageId}/annotations`);
      expect(getRes.status).toBe(200);
      expect(getRes.body).toHaveLength(3);
      expect(getRes.body[0].note).toBe('这里有问题');
      expect(getRes.body[0].color).toBe('#e74c3c');
      expect(getRes.body[1].type).toBe('arrow');
      expect(getRes.body[2].points).toHaveLength(3);
      expect(getRes.body[2].strokeWidth).toBe(4);
    });

    it('should overwrite existing annotations', async () => {
      const first: AnnotationData[] = [
        { id: 'a1', type: 'circle', x: 0, y: 0, width: 50, height: 50, color: '#000', strokeWidth: 1 },
      ];
      await request(app)
        .put(`/api/images/${imageId}/annotations`)
        .send({ annotations: first });

      const second: AnnotationData[] = [
        { id: 'b1', type: 'rectangle', x: 10, y: 10, width: 30, height: 30, color: '#fff', strokeWidth: 2 },
        { id: 'b2', type: 'arrow', x: 0, y: 0, width: 10, height: 10, color: '#f00', strokeWidth: 1, note: 'x' },
      ];
      await request(app)
        .put(`/api/images/${imageId}/annotations`)
        .send({ annotations: second });

      const res = await request(app).get(`/api/images/${imageId}/annotations`);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].id).toBe('b1');
      expect(res.body[1].note).toBe('x');
    });
  });
});

describe('Share API Tests', () => {
  let imageId: string;
  const sampleAnnotations: AnnotationData[] = [
    {
      id: 'ann-share-1',
      type: 'rectangle',
      x: 10,
      y: 10,
      width: 100,
      height: 100,
      color: '#e74c3c',
      strokeWidth: 2,
      note: '测试备注',
    },
  ];

  beforeEach(async () => {
    imagesStore.clear();
    annotationsStore.clear();
    sharesStore.clear();
    shortIdToShareId.clear();

    const upload = await request(app)
      .post('/api/images')
      .attach('image', createMockPngBuffer(), { filename: 'share.png', contentType: 'image/png' });
    imageId = upload.body.id;
  });

  describe('POST /api/share', () => {
    it('should return 400 for invalid imageId', async () => {
      const res = await request(app)
        .post('/api/share')
        .send({ imageId: 'fake-id', annotations: [] });
      expect(res.status).toBe(400);
    });

    it('should create share with shortId and shareUrl', async () => {
      const res = await request(app)
        .post('/api/share')
        .send({ imageId, annotations: sampleAnnotations });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('shareId');
      expect(res.body).toHaveProperty('shortId');
      expect(res.body.shortId).toHaveLength(7);
      expect(res.body.shareUrl).toBe(`/s/${res.body.shortId}`);
      expect(sharesStore.has(res.body.shareId)).toBe(true);
      expect(shortIdToShareId.get(res.body.shortId)).toBe(res.body.shareId);

      const saved = sharesStore.get(res.body.shareId)!;
      expect(saved.imageId).toBe(imageId);
      expect(saved.annotations).toEqual(sampleAnnotations);
      expect(saved.shortId).toBe(res.body.shortId);
    });

    it('should generate unique shortIds for multiple shares', async () => {
      const r1 = await request(app)
        .post('/api/share')
        .send({ imageId, annotations: sampleAnnotations });
      const r2 = await request(app)
        .post('/api/share')
        .send({ imageId, annotations: [] });
      expect(r1.body.shortId).not.toBe(r2.body.shortId);
    });
  });

  describe('GET /api/share/:id', () => {
    it('should return 404 for non-existent share', async () => {
      const res = await request(app).get('/api/share/nonexistent123');
      expect(res.status).toBe(404);
    });

    it('should retrieve by full shareId', async () => {
      const create = await request(app)
        .post('/api/share')
        .send({ imageId, annotations: sampleAnnotations });

      const res = await request(app).get(`/api/share/${create.body.shareId}`);
      expect(res.status).toBe(200);
      expect(res.body.image.id).toBe(imageId);
      expect(res.body.annotations).toHaveLength(1);
      expect(res.body.annotations[0].note).toBe('测试备注');
    });

    it('should retrieve by shortId', async () => {
      const create = await request(app)
        .post('/api/share')
        .send({ imageId, annotations: sampleAnnotations });

      const res = await request(app).get(`/api/share/${create.body.shortId}`);
      expect(res.status).toBe(200);
      expect(res.body.image.id).toBe(imageId);
      expect(res.body.annotations[0].type).toBe('rectangle');
      expect(res.body.annotations[0].color).toBe('#e74c3c');
    });
  });
});

describe('Compression / Decompression Helper Tests', () => {
  it('should round-trip annotations correctly', async () => {
    // Dynamically import to avoid TS resolution issues
    const mod = await import('../server/server');
    const { compressAnnotations, decompressAnnotations } = mod;

    const anns: AnnotationData[] = [
      {
        id: 'c1',
        type: 'rectangle',
        x: 12.345,
        y: 67.891,
        width: 100,
        height: -50.5,
        color: '#4a90d9',
        strokeWidth: 5,
        note: '重要',
      },
      {
        id: 'c2',
        type: 'brush',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        points: [
          { x: 0.123, y: 0.456 },
          { x: 9.999, y: 10.001 },
        ],
        color: '#fff',
        strokeWidth: 1,
      },
    ];

    const compressed = compressAnnotations(anns);
    expect(compressed.length).toBe(2);
    expect(compressed[0]._t).toBe('r');
    expect(compressed[1]._t).toBe('b');
    expect(compressed[0]._n).toBe('重要');
    expect(Array.isArray(compressed[1]._p)).toBe(true);

    const restored = decompressAnnotations(compressed);
    expect(restored).toHaveLength(2);
    expect(restored[0].id).toBe('c1');
    expect(restored[0].type).toBe('rectangle');
    expect(restored[0].color).toBe('#4a90d9');
    expect(restored[0].strokeWidth).toBe(5);
    expect(restored[0].note).toBe('重要');
    expect(restored[1].points).toHaveLength(2);
    expect(restored[1].type).toBe('brush');
  });
});
