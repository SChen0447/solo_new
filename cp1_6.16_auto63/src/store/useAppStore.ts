import { create } from 'zustand'
import type { ViewConfig, AppState } from '../parser/types'

const generateViewId = (): string => `view-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: Arial, sans-serif;
      background: #f5f5f5;
    }
    .header {
      background: #3498db;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .container {
      display: flex;
      gap: 20px;
      margin-top: 20px;
    }
    .sidebar {
      width: 200px;
      background: #2c3e50;
      color: white;
      padding: 15px;
      position: absolute;
      top: 100px;
      left: 20px;
    }
    .sidebar ul {
      list-style: none;
      padding: 0;
    }
    .sidebar li {
      padding: 8px 0;
      cursor: pointer;
    }
    .content {
      margin-left: 240px;
      flex: 1;
      background: white;
      padding: 20px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .card {
      padding: 15px;
      margin-bottom: 15px;
      background: #ecf0f1;
      border-left: 4px solid #3498db;
      float: left;
      width: 200px;
      margin-right: 10px;
    }
    .card h3 {
      margin: 0 0 10px 0;
      color: #2c3e50;
    }
    .table-wrapper {
      clear: both;
      margin-top: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    th {
      background: #3498db;
      color: white;
    }
    .deep-nested {
      padding: 10px;
    }
    .deep-nested > div {
      padding: 8px;
    }
    .deep-nested > div > div {
      padding: 6px;
    }
    .deep-nested > div > div > div {
      padding: 4px;
    }
    .deep-nested > div > div > div > div {
      padding: 2px;
    }
    .btn {
      padding: 8px 16px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.3s;
    }
    .btn:hover {
      background: #2980b9;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>CSS Layout Performance Demo</h1>
  </div>
  <div class="container">
    <div class="sidebar">
      <ul>
        <li>Dashboard</li>
        <li>Profile</li>
        <li>Settings</li>
        <li>Reports</li>
        <li>Analytics</li>
      </ul>
      <button class="btn">Click Me</button>
    </div>
    <div class="content">
      <h2>Welcome</h2>
      <p>This is a sample page to demonstrate CSS layout performance issues.</p>
      <div class="card">
        <h3>Card 1</h3>
        <p>Using float layout</p>
      </div>
      <div class="card">
        <h3>Card 2</h3>
        <p>Performance test</p>
      </div>
      <div class="card">
        <h3>Card 3</h3>
        <p>Optimization tips</p>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Item A</td><td>100</td><td>Active</td></tr>
            <tr><td>Item B</td><td>200</td><td>Pending</td></tr>
            <tr><td>Item C</td><td>150</td><td>Active</td></tr>
          </tbody>
        </table>
      </div>
      <div class="deep-nested">
        <div>
          <div>
            <div>
              <div>Deeply nested content</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`

interface StoreState extends AppState {
  setViews: (views: ViewConfig[]) => void
  addView: (view?: Partial<ViewConfig>) => void
  removeView: (id: string) => void
  setActiveView: (id: string) => void
  updateView: (id: string, updates: Partial<ViewConfig>) => void
  setSelectedNodeId: (id: string | null) => void
  setHighlightedNodeId: (id: string | null) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setLeftPanelCollapsed: (collapsed: boolean) => void
  setSyncViews: (sync: boolean) => void
  setGlobalZoom: (zoom: number) => void
  reorderViews: (fromIndex: number, toIndex: number) => void
}

const createInitialView = (index: number): ViewConfig => ({
  id: generateViewId(),
  name: `视图 ${index + 1}`,
  html: DEFAULT_HTML,
  css: '',
  zoom: 100,
  scrollTop: 0,
  scrollLeft: 0,
  heatmapEnabled: true,
})

export const useAppStore = create<StoreState>((set, get) => ({
  views: [createInitialView(0)],
  activeViewId: '',
  selectedNodeId: null,
  highlightedNodeId: null,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  syncViews: true,
  globalZoom: 100,

  setViews: (views) => set({ views }),

  addView: (view) =>
    set((state) => {
      if (state.views.length >= 3) return state
      const newView: ViewConfig = {
        ...createInitialView(state.views.length),
        ...view,
        id: generateViewId(),
      }
      return {
        views: [...state.views, newView],
        activeViewId: newView.id,
      }
    }),

  removeView: (id) =>
    set((state) => {
      if (state.views.length <= 1) return state
      const newViews = state.views.filter((v) => v.id !== id)
      const newActiveId = state.activeViewId === id ? newViews[0].id : state.activeViewId
      return {
        views: newViews,
        activeViewId: newActiveId,
      }
    }),

  setActiveView: (id) => set({ activeViewId: id }),

  updateView: (id, updates) =>
    set((state) => ({
      views: state.views.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    })),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setHighlightedNodeId: (id) => set({ highlightedNodeId: id }),

  toggleLeftPanel: () =>
    set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),

  toggleRightPanel: () =>
    set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed })),

  setLeftPanelCollapsed: (collapsed) => set({ leftPanelCollapsed: collapsed }),

  setSyncViews: (sync) => set({ syncViews: sync }),

  setGlobalZoom: (zoom) => set({ globalZoom: zoom }),

  reorderViews: (fromIndex, toIndex) =>
    set((state) => {
      const newViews = [...state.views]
      const [removed] = newViews.splice(fromIndex, 1)
      newViews.splice(toIndex, 0, removed)
      return { views: newViews }
    }),
}))

export function initializeStore() {
  const state = useAppStore.getState()
  if (state.views.length > 0 && !state.activeViewId) {
    useAppStore.setState({ activeViewId: state.views[0].id })
  }
}

export default useAppStore
