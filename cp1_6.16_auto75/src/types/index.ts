export interface FrameData {
  id: number;
  timestamp: number;
  fps: number;
  duration: number;
  hasLongTask: boolean;
  longTaskDuration: number;
  reflowElements: string[];
  styleSnapshot: StyleSnapshot[];
}

export interface StyleSnapshot {
  elementPath: string;
  styles: Record<string, string>;
}

export interface JankData {
  id: number;
  timestamp: number;
  duration: number;
  functionName: string;
  stackTrace: string;
}

export interface ReflowStats {
  elementPath: string;
  count: number;
  totalDuration: number;
  element: HTMLElement;
}

export interface AppState {
  isRecording: boolean;
  frames: FrameData[];
  selectedFrameIndex: number;
  heatmapEnabled: boolean;
  jankList: JankData[];
  reflowStats: Map<string, ReflowStats>;
  currentFps: number;
  panelCollapsed: boolean;
}

export type AppAction =
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'ADD_FRAME'; payload: FrameData }
  | { type: 'ADD_JANK'; payload: JankData }
  | { type: 'SELECT_FRAME'; payload: number }
  | { type: 'TOGGLE_HEATMAP' }
  | { type: 'SET_CURRENT_FPS'; payload: number }
  | { type: 'TOGGLE_PANEL' }
  | { type: 'UPDATE_REFLOW_STATS'; payload: Map<string, ReflowStats> }
  | { type: 'CLEAR_DATA' };

export const initialState: AppState = {
  isRecording: false,
  frames: [],
  selectedFrameIndex: -1,
  heatmapEnabled: false,
  jankList: [],
  reflowStats: new Map(),
  currentFps: 60,
  panelCollapsed: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'START_RECORDING':
      return {
        ...state,
        isRecording: true,
        frames: [],
        jankList: [],
        selectedFrameIndex: -1,
        reflowStats: new Map(),
      };
    case 'STOP_RECORDING':
      return {
        ...state,
        isRecording: false,
      };
    case 'ADD_FRAME':
      return {
        ...state,
        frames: [...state.frames, action.payload],
      };
    case 'ADD_JANK':
      return {
        ...state,
        jankList: [...state.jankList, action.payload],
      };
    case 'SELECT_FRAME':
      return {
        ...state,
        selectedFrameIndex: action.payload,
      };
    case 'TOGGLE_HEATMAP':
      return {
        ...state,
        heatmapEnabled: !state.heatmapEnabled,
      };
    case 'SET_CURRENT_FPS':
      return {
        ...state,
        currentFps: action.payload,
      };
    case 'TOGGLE_PANEL':
      return {
        ...state,
        panelCollapsed: !state.panelCollapsed,
      };
    case 'UPDATE_REFLOW_STATS':
      return {
        ...state,
        reflowStats: action.payload,
      };
    case 'CLEAR_DATA':
      return {
        ...state,
        frames: [],
        jankList: [],
        selectedFrameIndex: -1,
        reflowStats: new Map(),
      };
    default:
      return state;
  }
}
