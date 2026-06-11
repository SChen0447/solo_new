import { Annotation, ImageItem } from './types';

const BASE = '/api';

export async function uploadImage(file: File): Promise<ImageItem> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${BASE}/images`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '上传失败');
  }
  return res.json();
}

export async function getImages(): Promise<ImageItem[]> {
  const res = await fetch(`${BASE}/images`);
  return res.json();
}

export async function getImage(id: string): Promise<ImageItem> {
  const res = await fetch(`${BASE}/images/${id}`);
  if (!res.ok) throw new Error('图片不存在');
  return res.json();
}

export async function getAnnotations(imageId: string): Promise<Annotation[]> {
  const res = await fetch(`${BASE}/images/${imageId}/annotations`);
  return res.json();
}

export async function saveAnnotations(imageId: string, annotations: Annotation[]): Promise<void> {
  const res = await fetch(`${BASE}/images/${imageId}/annotations`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ annotations }),
  });
  if (!res.ok) throw new Error('保存失败');
}

export async function createShare(imageId: string, annotations: Annotation[]): Promise<{ shareId: string; shareUrl: string }> {
  const res = await fetch(`${BASE}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageId, annotations }),
  });
  if (!res.ok) throw new Error('生成分享链接失败');
  return res.json();
}

export async function getShare(shareId: string): Promise<{ image: ImageItem; annotations: Annotation[] }> {
  const res = await fetch(`${BASE}/share/${shareId}`);
  if (!res.ok) throw new Error('分享链接不存在或已过期');
  return res.json();
}
