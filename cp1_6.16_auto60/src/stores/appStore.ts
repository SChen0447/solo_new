import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LineDiff, DiffRegion, DiffResult } from '../core/DiffEngine';
import type { RenderStatus } from '../core/RenderSandbox';

const SAMPLE_LEFT = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial; padding: 40px; background: #f5f5f5; }
    .card { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 400px; }
    .title { color: #333; font-size: 20px; margin-bottom: 12px; }
    .desc { color: #666; line-height: 1.6; }
    .btn { background: #1976d2; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h2 class="title">欢迎使用</h2>
    <p class="desc">这是左侧示例代码，您可以修改它来对比差异。</p>
    <button class="btn">点击这里</button>
  </div>
</body>
</html>`;

const SAMPLE_RIGHT = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', sans-serif; padding: 40px; background: linear-gradient(135deg, #667eea, #764ba2); }
    .card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); max-width: 420px; }
    .title { color: #1976d2; font-size: 24px; margin-bottom: 16px; font-weight: 700; }
    .desc { color: #444; line-height: 1.8; font-size: 15px; }
    .btn { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 12px 28px; border-radius: 8px; margin-top: 20px; font-weight: 600; }
    .badge { display: inline-block; background: #4caf50; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">NEW</span>
    <h2 class="title">欢迎使用新版</h2>
    <p class="desc">这是右侧示例代码，展示了更新后的设计风格。您可以点击顶部"检测差异"查看视觉区别。</p>
    <button class="btn">立即体验</button>
  </div>
</body>
</html>`;

export interface HistoryItem {
  id: string;
  timestamp: number;
  leftCode: string;
  rightCode: string;
  diffResult: DiffResult;
}

export interface VisualDiffData {
  regions: DiffRegion[];
  leftImage: string;
  rightImage: string;
  scaleX: number;
  scaleY: number;
}

export interface UIState {
  isDetecting: boolean;
  leftRenderStatus: RenderStatus;
  rightRenderStatus: RenderStatus;
  activeHistoryId: string | null;
  showVisualDiff: boolean;
}

export interface AppState {
  leftCode: string;
  rightCode: string;
  lineDiffs: LineDiff[];
  visualDiff: VisualDiffData | null;
  diffCounts: { addedCount: number; removedCount: number; modifiedCount: number };
  historyList: HistoryItem[];
  ui: UIState;

  setLeftCode: (code: string) => void;
  setRightCode: (code: string) => void;
  setLineDiffs: (diffs: LineDiff[]) => void;
  setVisualDiff: (data: VisualDiffData | null) => void;
  setDiffCounts: (counts: { addedCount: number; removedCount: number; modifiedCount: number }) => void;
  setIsDetecting: (val: boolean) => void;
  setRenderStatus: (side: 'left' | 'right', status: RenderStatus) => void;
  saveSnapshot: () => void;
  restoreHistory: (id: string) => void;
  clearHistory: () => void;
  setActiveHistoryId: (id: string | null) => void;
  setShowVisualDiff: (val: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      leftCode: SAMPLE_LEFT,
      rightCode: SAMPLE_RIGHT,
      lineDiffs: [],
      visualDiff: null,
      diffCounts: { addedCount: 0, removedCount: 0, modifiedCount: 0 },
      historyList: [],
      ui: {
        isDetecting: false,
        leftRenderStatus: 'idle',
        rightRenderStatus: 'idle',
        activeHistoryId: null,
        showVisualDiff: false,
      },

      setLeftCode: (code) => {
        set({ leftCode: code, activeHistoryId: null });
      },
      setRightCode: (code) => {
        set({ rightCode: code, activeHistoryId: null });
      },
      setLineDiffs: (diffs) => set({ lineDiffs: diffs }),
      setVisualDiff: (data) => set({ visualDiff: data, ui: { ...get().ui, showVisualDiff: !!data } }),
      setDiffCounts: (counts) => set({ diffCounts: counts }),
      setIsDetecting: (val) => set({ ui: { ...get().ui, isDetecting: val } }),
      setRenderStatus: (side, status) => {
        const key = side === 'left' ? 'leftRenderStatus' : 'rightRenderStatus';
        set({ ui: { ...get().ui, [key]: status } });
      },
      saveSnapshot: () => {
        const state = get();
        const newItem: HistoryItem = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          timestamp: Date.now(),
          leftCode: state.leftCode,
          rightCode: state.rightCode,
          diffResult: {
            lineDiffs: state.lineDiffs,
            visualDiffs: state.visualDiff?.regions || [],
            totalVisualDiffs: state.visualDiff?.regions.length || 0,
            addedCount: state.diffCounts.addedCount,
            removedCount: state.diffCounts.removedCount,
            modifiedCount: state.diffCounts.modifiedCount,
          },
        };

        const historyList = [newItem, ...state.historyList].slice(0, 10);
        set({ historyList, ui: { ...state.ui, activeHistoryId: newItem.id } });
      },
      restoreHistory: (id) => {
        const item = get().historyList.find((h) => h.id === id);
        if (!item) return;

        set({
          leftCode: item.leftCode,
          rightCode: item.rightCode,
          lineDiffs: item.diffResult.lineDiffs,
          diffCounts: {
            addedCount: item.diffResult.addedCount,
            removedCount: item.diffResult.removedCount,
            modifiedCount: item.diffResult.modifiedCount,
          },
          ui: { ...get().ui, activeHistoryId: id, showVisualDiff: false },
          visualDiff: null,
        });
      },
      clearHistory: () => set({ historyList: [], ui: { ...get().ui, activeHistoryId: null } }),
      setActiveHistoryId: (id) => set({ ui: { ...get().ui, activeHistoryId: id } }),
      setShowVisualDiff: (val) => set({ ui: { ...get().ui, showVisualDiff: val } }),
    }),
    {
      name: 'code-diff-store',
      partialize: (state) => ({
        historyList: state.historyList,
      }),
    }
  )
);
