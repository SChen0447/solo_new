import axios from 'axios';
import { Sheet, SheetBlock } from '../store';

const API_BASE = '/api';

export const fetchSheets = async (): Promise<Sheet[]> => {
  const res = await axios.get(`${API_BASE}/sheets`);
  return res.data;
};

export const fetchSheet = async (id: string): Promise<Sheet> => {
  const res = await axios.get(`${API_BASE}/sheets/${id}`);
  return res.data;
};

export const createSheet = async (sheet: Omit<Sheet, 'id' | 'blocks'>): Promise<Sheet> => {
  const res = await axios.post(`${API_BASE}/sheets`, sheet);
  return res.data;
};

export const updateSheet = async (id: string, sheet: Partial<Sheet>): Promise<Sheet> => {
  const res = await axios.put(`${API_BASE}/sheets/${id}`, sheet);
  return res.data;
};

export const createBlock = async (sheetId: string, block: Omit<SheetBlock, 'id'>): Promise<SheetBlock> => {
  const res = await axios.post(`${API_BASE}/sheets/${sheetId}/blocks`, block);
  return res.data;
};

export const updateBlock = async (sheetId: string, blockId: string, block: Partial<SheetBlock>): Promise<SheetBlock> => {
  const res = await axios.put(`${API_BASE}/sheets/${sheetId}/blocks/${blockId}`, block);
  return res.data;
};

export const deleteBlock = async (sheetId: string, blockId: string): Promise<void> => {
  await axios.delete(`${API_BASE}/sheets/${sheetId}/blocks/${blockId}`);
};

export const reorderBlocks = async (sheetId: string, blocks: SheetBlock[]): Promise<Sheet> => {
  const res = await axios.put(`${API_BASE}/sheets/${sheetId}/reorder`, { blocks });
  return res.data;
};
