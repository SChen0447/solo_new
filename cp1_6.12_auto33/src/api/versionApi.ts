import type { Version, VersionMeta, DiffResult } from '../types';

const API_BASE = '/api';

export const versionApi = {
  async createVersion(content: string, label?: string, comment?: string): Promise<Version> {
    const res = await fetch(`${API_BASE}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, label, comment }),
    });
    if (!res.ok) throw new Error('Failed to create version');
    return res.json();
  },

  async getVersions(): Promise<VersionMeta[]> {
    const res = await fetch(`${API_BASE}/versions`);
    if (!res.ok) throw new Error('Failed to fetch versions');
    return res.json();
  },

  async getVersion(id: string): Promise<Version> {
    const res = await fetch(`${API_BASE}/versions/${id}`);
    if (!res.ok) throw new Error('Failed to fetch version');
    return res.json();
  },

  async updateVersion(id: string, data: { label?: string; comment?: string }): Promise<Version> {
    const res = await fetch(`${API_BASE}/versions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update version');
    return res.json();
  },

  async getDiff(oldId: string, newId: string): Promise<DiffResult> {
    const res = await fetch(`${API_BASE}/diff?oldId=${oldId}&newId=${newId}`);
    if (!res.ok) throw new Error('Failed to fetch diff');
    return res.json();
  },
};
