import React, { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { api, Activity, Iteration, AppState } from './api';
import { extractEmojiFromDescription } from './utils/emoji';
import { scheduleUpdate, perfStart, perfEnd } from './utils/perf';
import StoryMap from './components/StoryMap';
import IterationPlan from './components/IterationPlan';

interface StoreState {
  activities: Activity[];
  iterations: Iteration[];
  loading: boolean;
  iterationPanelOpen: boolean;
  selectedActivityId: string | null;
  setActivities: (activities: Activity[]) => void;
  setIterations: (iterations: Iteration[]) => void;
  addActivity: (activity: Activity) => void;
  updateActivity: (id: string, data: Partial<Activity>) => void;
  removeActivity: (id: string) => void;
  addIteration: (iteration: Iteration) => void;
  updateIteration: (id: string, data: Partial<Iteration>) => void;
  removeIteration: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setIterationPanelOpen: (open: boolean) => void;
  setSelectedActivityId: (id: string | null) => void;
}

const useStore = create<StoreState>((set) => ({
  activities: [],
  iterations: [],
  loading: true,
  iterationPanelOpen: false,
  selectedActivityId: null,
  setActivities: (activities) => set({ activities }),
  setIterations: (iterations) => set({ iterations }),
  addActivity: (activity) =>
    set((state) => ({ activities: [...state.activities, activity] })),
  updateActivity: (id, data) =>
    set((state) => ({
      activities: state.activities.map((a) =>
        a.id === id ? { ...a, ...data } : a
      ),
    })),
  removeActivity: (id) =>
    set((state) => ({
      activities: state.activities.filter((a) => a.id !== id),
      iterations: state.iterations.map((iter) => ({
        ...iter,
        activityIds: iter.activityIds.filter((aid) => aid !== id),
      })),
    })),
  addIteration: (iteration) =>
    set((state) => ({ iterations: [...state.iterations, iteration] })),
  updateIteration: (id, data) =>
    set((state) => ({
      iterations: state.iterations.map((i) =>
        i.id === id ? { ...i, ...data } : i
      ),
    })),
  removeIteration: (id) =>
    set((state) => ({
      iterations: state.iterations.filter((i) => i.id !== id),
    })),
  setLoading: (loading) => set({ loading }),
  setIterationPanelOpen: (open) => set({ iterationPanelOpen: open }),
  setSelectedActivityId: (id) => set({ selectedActivityId: id }),
}));

const ROLES = [
  { key: 'visitor' as const, label: '访客', icon: '👁️' },
  { key: 'registered' as const, label: '注册用户', icon: '👤' },
  { key: 'admin' as const, label: '管理员', icon: '🛡️' },
];

const CARD_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f43f5e',
  '#3b82f6', '#a855f7', '#06b6d4', '#d946ef',
];

function NewActivityDialog({
  onClose,
  onSubmit,
  position,
}: {
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; role: Activity['role'] }) => void;
  position: { x: number; y: number };
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState<Activity['role']>('visitor');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), role });
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-content"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'dialogFadeIn 0.3s ease-out' }}
      >
        <h3 style={{ margin: '0 0 16px', color: '#f7d794' }}>新建活动</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>
              活动名称
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入活动名称..."
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.08)',
                color: '#f1f5f9',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入活动描述..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.08)',
                color: '#f1f5f9',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>
              关联角色
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Activity['role'])}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(30,41,59,0.9)',
                color: '#f1f5f9',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              {ROLES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.icon} {r.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReportModal({
  onClose,
  iterations,
  activities,
}: {
  onClose: () => void;
  iterations: Iteration[];
  activities: Activity[];
}) {
  const generateReport = () => {
    let report = '=== 迭代规划报告 ===\n\n';
    iterations.forEach((iter) => {
      report += `【${iter.name}】\n`;
      report += `  日期范围: ${iter.startDate || '未设置'} ~ ${iter.endDate || '未设置'}\n`;
      report += `  活动数量: ${iter.activityIds.length}\n`;
      iter.activityIds.forEach((aid, idx) => {
        const act = activities.find((a) => a.id === aid);
        if (act) {
          report += `  ${idx + 1}. ${act.emoji} ${act.name} - ${act.description}\n`;
        }
      });
      report += '\n';
    });
    report += `---\n总计: ${iterations.length} 个迭代, ${activities.length} 个活动\n`;
    return report;
  };

  const reportText = generateReport();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = reportText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="report-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', color: '#f7d794' }}>迭代规划报告</h3>
        <pre
          style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '16px',
            color: '#e2e8f0',
            fontSize: '13px',
            lineHeight: 1.6,
            maxHeight: '400px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {reportText}
        </pre>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            onClick={handleCopy}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            📋 复制到剪贴板
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const store = useStore();
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    position: { x: number; y: number };
  }>({ open: false, position: { x: 0, y: 0 } });
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    perfStart('initialLoad');
    api.getState().then((data) => {
      store.setActivities(data.activities);
      store.setIterations(data.iterations);
      store.setLoading(false);
      perfEnd('initialLoad');
    });
  }, []);

  const handleCreateActivity = useCallback(
    async (data: { name: string; description: string; role: Activity['role'] }) => {
      const emoji = extractEmojiFromDescription(data.description, data.name);
      const color = CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
      const activity = await api.createActivity({
        ...data,
        emoji,
        color,
        position: dialogState.position,
      });
      scheduleUpdate(() => store.addActivity(activity), 'addActivity');
      setDialogState({ open: false, position: { x: 0, y: 0 } });
    },
    [dialogState.position]
  );

  const handlePlanToIteration = useCallback(
    async (activityId: string, iterationId: string) => {
      const iteration = store.iterations.find((i) => i.id === iterationId);
      if (!iteration) return;
      const newIds = [...iteration.activityIds, activityId];
      await api.updateIteration(iterationId, { activityIds: newIds });
      scheduleUpdate(
        () => store.updateIteration(iterationId, { activityIds: newIds }),
        'planToIteration'
      );
    },
    [store.iterations]
  );

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.activity-card') || target.closest('.card-pool')) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDialogState({
        open: true,
        position: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      });
    },
    []
  );

  if (store.loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1e293b',
          color: '#f7d794',
          fontSize: '18px',
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="nav-logo">🗺️</span>
          <span className="nav-title">故事地图</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="nav-btn"
            onClick={() => store.setIterationPanelOpen(!store.iterationPanelOpen)}
          >
            📅 迭代规划
          </button>
          <div className="nav-avatar">👤</div>
        </div>
      </nav>

      <div className="main-content">
        <StoryMap
          activities={store.activities}
          iterations={store.iterations}
          selectedActivityId={store.selectedActivityId}
          onSelectActivity={store.setSelectedActivityId}
          onPlanToIteration={handlePlanToIteration}
          onDoubleClick={handleCanvasDoubleClick}
          onUpdateActivity={async (id, data) => {
            await api.updateActivity(id, data);
            scheduleUpdate(() => store.updateActivity(id, data), 'updateActivity');
          }}
          onReorderActivities={async (ids, role) => {
            await api.reorderActivities(ids, role);
          }}
        />

        <IterationPlan
          open={store.iterationPanelOpen}
          iterations={store.iterations}
          activities={store.activities}
          onClose={() => store.setIterationPanelOpen(false)}
          onUpdateIteration={async (id, data) => {
            await api.updateIteration(id, data);
            scheduleUpdate(() => store.updateIteration(id, data), 'updateIteration');
          }}
          onReorderIteration={async (iterationId, activityIds) => {
            await api.reorderIteration(iterationId, activityIds);
            scheduleUpdate(
              () => store.updateIteration(iterationId, { activityIds }),
              'reorderIteration'
            );
          }}
          onAddIteration={async () => {
            const iter = await api.createIteration({
              name: `周期${store.iterations.length + 1}`,
            });
            store.addIteration(iter);
          }}
          onDeleteIteration={async (id) => {
            await api.deleteIteration(id);
            store.removeIteration(id);
          }}
          onGenerateReport={() => setReportOpen(true)}
        />
      </div>

      {dialogState.open && (
        <NewActivityDialog
          onClose={() => setDialogState({ open: false, position: { x: 0, y: 0 } })}
          onSubmit={handleCreateActivity}
          position={dialogState.position}
        />
      )}

      {reportOpen && (
        <ReportModal
          onClose={() => setReportOpen(false)}
          iterations={store.iterations}
          activities={store.activities}
        />
      )}
    </div>
  );
}
