export type Priority = 'high' | 'medium' | 'low';

export interface MindMapNode {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  x: number;
  y: number;
  parentId: string | null;
  color: string;
  children: string[];
  collapsed: boolean;
}

export interface MindMapState {
  nodes: Record<string, MindMapNode>;
  rootId: string | null;
  selectedId: string | null;
}

const STORAGE_KEY = 'mindmap-inspiration-data';

const SOFT_COLORS = [
  '#A8D8EA', '#AA96DA', '#FCBAD3', '#FFFFD2',
  '#B5EAD7', '#C7CEEA', '#FFDAC1', '#FFB7B2',
  '#E2F0CB', '#F8BBD0', '#D1C4E9', '#B3E5FC',
  '#C8E6C9', '#FFE0B2', '#F0F4C3', '#DCEDC8'
];

let listeners: Set<() => void> = new Set();
let state: MindMapState = {
  nodes: {},
  rootId: null,
  selectedId: null
};
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function generateId(): string {
  return 'node_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

function getRandomColor(): string {
  return SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)];
}

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveToStorage();
  }, 5000);
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save mind map:', e);
  }
}

function loadFromStorage(): MindMapState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MindMapState;
  } catch (e) {
    console.error('Failed to load mind map:', e);
    return null;
  }
}

export function initStore() {
  const saved = loadFromStorage();
  if (saved && saved.rootId && saved.nodes[saved.rootId]) {
    state = saved;
    notifyListeners();
    return true;
  }
  return false;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): MindMapState {
  return state;
}

export function createRootNode(title: string) {
  const id = generateId();
  state.nodes[id] = {
    id,
    title,
    description: '',
    priority: 'medium',
    x: window.innerWidth / 2 - 80,
    y: window.innerHeight / 2 - 30,
    parentId: null,
    color: '#4A6FA5',
    children: [],
    collapsed: false
  };
  state.rootId = id;
  state.selectedId = null;
  notifyListeners();
  scheduleSave();
}

export function addChildNode(parentId: string) {
  const parent = state.nodes[parentId];
  if (!parent) return;

  const id = generateId();
  const childX = parent.x + 200;
  const childY = parent.y + (parent.children.length * 70);

  state.nodes[id] = {
    id,
    title: '新想法',
    description: '',
    priority: 'medium',
    x: childX,
    y: childY,
    parentId,
    color: getRandomColor(),
    children: [],
    collapsed: false
  };

  parent.children.push(id);
  parent.collapsed = false;
  state.selectedId = id;
  notifyListeners();
  scheduleSave();
}

export function updateNode(id: string, updates: Partial<MindMapNode>) {
  const node = state.nodes[id];
  if (!node) return;
  state.nodes[id] = { ...node, ...updates };
  notifyListeners();
  scheduleSave();
}

export function deleteNode(id: string) {
  const node = state.nodes[id];
  if (!node) return;

  const childrenToDelete: string[] = [];
  const collectChildren = (nid: string) => {
    childrenToDelete.push(nid);
    state.nodes[nid]?.children.forEach(collectChildren);
  };
  collectChildren(id);

  if (node.parentId) {
    const parent = state.nodes[node.parentId];
    if (parent) {
      parent.children = parent.children.filter((c) => c !== id);
    }
  }

  childrenToDelete.forEach((cid) => {
    delete state.nodes[cid];
  });

  if (state.selectedId === id) {
    state.selectedId = null;
  }

  if (state.rootId === id) {
    state.rootId = null;
  }

  notifyListeners();
  scheduleSave();
}

export function selectNode(id: string | null) {
  state.selectedId = id;
  notifyListeners();
}

export function moveNode(id: string, x: number, y: number) {
  const node = state.nodes[id];
  if (!node) return;
  const dx = x - node.x;
  const dy = y - node.y;
  node.x = x;
  node.y = y;

  const moveChildren = (nid: string) => {
    state.nodes[nid]?.children.forEach((cid) => {
      const child = state.nodes[cid];
      if (child) {
        child.x += dx;
        child.y += dy;
        moveChildren(cid);
      }
    });
  };
  moveChildren(id);

  notifyListeners();
  scheduleSave();
}

export function forceSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveToStorage();
}

export function toggleCollapse(id: string) {
  const node = state.nodes[id];
  if (!node) return;
  node.collapsed = !node.collapsed;
  notifyListeners();
  scheduleSave();
}
