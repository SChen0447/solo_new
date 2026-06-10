/**
 * 数据持久化存储模块
 * 
 * 数据流向：
 * 1. 服务器启动时 → loadFromDisk() 从 data/data.json 读取数据到内存
 * 2. 任何增删改操作 → 先更新内存 → 再调用 saveToDisk() 同步写入文件
 * 3. 文件格式：JSON，结构为 PersistedData { exhibitions, bubbles }
 * 
 * 优势：重启不丢数据，操作简单，无需数据库依赖
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Exhibition, Bubble, PersistedData } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

/**
 * 内存中的数据存储
 * 所有API操作都先读写这里，然后同步到磁盘
 */
let memoryStore: PersistedData = {
  exhibitions: [],
  bubbles: {},
};

/**
 * 确保 data 目录存在
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * 从磁盘加载数据到内存
 * 服务器启动时调用一次
 */
export function loadFromDisk(): void {
  ensureDataDir();
  
  if (!fs.existsSync(DATA_FILE)) {
    // 文件不存在，用空数据初始化
    memoryStore = { exhibitions: [], bubbles: {} };
    saveToDisk();
    console.log('[Store] 数据文件不存在，已初始化空数据');
    return;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as PersistedData;
    memoryStore = parsed;
    console.log(`[Store] 已加载 ${memoryStore.exhibitions.length} 个展览, ${Object.keys(memoryStore.bubbles).length} 个展览的气泡`);
  } catch (err) {
    console.error('[Store] 读取数据文件失败，使用空数据:', err);
    memoryStore = { exhibitions: [], bubbles: {} };
  }
}

/**
 * 将内存数据写入磁盘
 * 每次修改数据后调用
 * 使用同步写入保证数据完整性（写入频率低，性能可接受）
 */
export function saveToDisk(): void {
  ensureDataDir();
  
  try {
    const json = JSON.stringify(memoryStore, null, 2);
    fs.writeFileSync(DATA_FILE, json, 'utf-8');
  } catch (err) {
    console.error('[Store] 写入数据文件失败:', err);
    throw err;
  }
}

// ============== 展览 CRUD ==============

export function getAllExhibitions(): Exhibition[] {
  return [...memoryStore.exhibitions];
}

export function getExhibitionById(id: string): Exhibition | undefined {
  return memoryStore.exhibitions.find(e => e.id === id);
}

export function addExhibition(exhibition: Exhibition): void {
  memoryStore.exhibitions.push(exhibition);
  saveToDisk();
}

// ============== 气泡 CRUD ==============

export function getBubblesByExhibitionId(exhibitionId: string): Bubble[] {
  return memoryStore.bubbles[exhibitionId] ? [...memoryStore.bubbles[exhibitionId]] : [];
}

export function addBubble(bubble: Bubble): void {
  if (!memoryStore.bubbles[bubble.exhibitionId]) {
    memoryStore.bubbles[bubble.exhibitionId] = [];
  }
  memoryStore.bubbles[bubble.exhibitionId].push(bubble);
  saveToDisk();
}

/**
 * 获取指定展览的气泡数量（用于列表页显示）
 */
export function getBubbleCountForExhibition(exhibitionId: string): number {
  return memoryStore.bubbles[exhibitionId]?.length ?? 0;
}
