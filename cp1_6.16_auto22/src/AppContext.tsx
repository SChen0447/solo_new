import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { AppState, AppAction, TroubleTicket, StatusChangeEvent, PackageInfo, TrackingPoint } from './types';
import { searchPackage, simulateNextStatusChange } from './dataProcessor';

const initialState: AppState = {
  currentPackage: null,
  trackingPoints: [],
  statusChangeEvents: [],
  troubleTickets: [],
  isSearching: false,
  searchError: null,
  showReportPanel: false,
  notification: null,
  animationProgress: 0,
  isPulsing: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SEARCH_PACKAGE':
      return {
        ...state,
        isSearching: true,
        searchError: null,
        animationProgress: 0,
      };

    case 'SEARCH_SUCCESS':
      return {
        ...state,
        isSearching: false,
        currentPackage: action.payload.pkg,
        trackingPoints: action.payload.points,
        statusChangeEvents: action.payload.events,
        animationProgress: 0,
        searchError: null,
      };

    case 'SEARCH_FAIL':
      return {
        ...state,
        isSearching: false,
        currentPackage: null,
        trackingPoints: [],
        statusChangeEvents: [],
        searchError: action.payload,
        animationProgress: 0,
      };

    case 'UPDATE_ANIMATION_PROGRESS':
      return {
        ...state,
        animationProgress: action.payload,
      };

    case 'TOGGLE_REPORT_PANEL':
      return {
        ...state,
        showReportPanel: action.payload,
      };

    case 'SUBMIT_TICKET':
      return {
        ...state,
        troubleTickets: [action.payload, ...state.troubleTickets],
        showReportPanel: false,
      };

    case 'SHOW_NOTIFICATION':
      return {
        ...state,
        notification: {
          message: action.payload,
          visible: true,
        },
      };

    case 'HIDE_NOTIFICATION':
      return {
        ...state,
        notification: state.notification
          ? { ...state.notification, visible: false }
          : null,
      };

    case 'SIMULATE_STATUS_CHANGE': {
      const event = action.payload;
      const newPoints = event.newTrackingPoint
        ? [...state.trackingPoints, event.newTrackingPoint]
        : state.trackingPoints;

      let updatedPkg = state.currentPackage;
      if (updatedPkg) {
        updatedPkg = {
          ...updatedPkg,
          currentStatus: event.toStatus,
        };
      }

      return {
        ...state,
        currentPackage: updatedPkg,
        trackingPoints: newPoints,
        statusChangeEvents: [...state.statusChangeEvents, event],
      };
    }

    case 'SET_PULSING':
      return {
        ...state,
        isPulsing: action.payload,
      };

    case 'CLEAR_SEARCH':
      return {
        ...state,
        currentPackage: null,
        trackingPoints: [],
        statusChangeEvents: [],
        searchError: null,
        animationProgress: 0,
      };

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  handleSearch: (trackingNumber: string) => void;
  submitTicket: (ticket: TroubleTicket) => void;
  toggleReportPanel: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const notificationTimerRef = useRef<number | null>(null);
  const pulsingTimerRef = useRef<number | null>(null);
  const simulationIntervalRef = useRef<number | null>(null);

  const showNotification = useCallback((message: string) => {
    dispatch({ type: 'SHOW_NOTIFICATION', payload: message });

    if (notificationTimerRef.current) {
      window.clearTimeout(notificationTimerRef.current);
    }

    notificationTimerRef.current = window.setTimeout(() => {
      dispatch({ type: 'HIDE_NOTIFICATION' });
    }, 5000);
  }, []);

  const triggerPulse = useCallback(() => {
    dispatch({ type: 'SET_PULSING', payload: true });

    if (pulsingTimerRef.current) {
      window.clearTimeout(pulsingTimerRef.current);
    }

    pulsingTimerRef.current = window.setTimeout(() => {
      dispatch({ type: 'SET_PULSING', payload: false });
    }, 5000);
  }, []);

  const handleSearch = useCallback((trackingNumber: string) => {
    dispatch({ type: 'SEARCH_PACKAGE', payload: trackingNumber });

    setTimeout(() => {
      const result = searchPackage(trackingNumber);
      if (result) {
        dispatch({
          type: 'SEARCH_SUCCESS',
          payload: result,
        });

        const points = result.points;
        const totalSegments = Math.max(points.length - 1, 1);
        const segmentDuration = 500;
        let currentSegment = 0;

        const animate = () => {
          currentSegment++;
          const progress = Math.min(currentSegment / totalSegments, 1);
          dispatch({ type: 'UPDATE_ANIMATION_PROGRESS', payload: progress });

          if (currentSegment < totalSegments) {
            setTimeout(animate, segmentDuration);
          }
        };
        setTimeout(animate, segmentDuration);
      } else {
        dispatch({
          type: 'SEARCH_FAIL',
          payload: '未找到该运单号的包裹信息，请检查运单号是否正确。',
        });
      }
    }, 500);
  }, []);

  const submitTicket = useCallback((ticket: TroubleTicket) => {
    dispatch({ type: 'SUBMIT_TICKET', payload: ticket });
    showNotification('问题工单已提交，我们将尽快处理！');
  }, [showNotification]);

  const toggleReportPanel = useCallback((show: boolean) => {
    dispatch({ type: 'TOGGLE_REPORT_PANEL', payload: show });
  }, []);

  useEffect(() => {
    if (!state.currentPackage) {
      if (simulationIntervalRef.current) {
        window.clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      return;
    }

    simulationIntervalRef.current = window.setInterval(() => {
      const result = simulateNextStatusChange(
        state.currentPackage as PackageInfo,
        state.trackingPoints as TrackingPoint[]
      );

      if (result) {
        const event: StatusChangeEvent = result.event;
        dispatch({ type: 'SIMULATE_STATUS_CHANGE', payload: event });
        showNotification(`包裹状态更新：${event.fromStatus} → ${event.toStatus}`);
        triggerPulse();

        dispatch({ type: 'UPDATE_ANIMATION_PROGRESS', payload: 1 });
      }
    }, 30000);

    return () => {
      if (simulationIntervalRef.current) {
        window.clearInterval(simulationIntervalRef.current);
      }
    };
  }, [state.currentPackage, state.trackingPoints, showNotification, triggerPulse]);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) window.clearTimeout(notificationTimerRef.current);
      if (pulsingTimerRef.current) window.clearTimeout(pulsingTimerRef.current);
      if (simulationIntervalRef.current) window.clearInterval(simulationIntervalRef.current);
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        handleSearch,
        submitTicket,
        toggleReportPanel,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
