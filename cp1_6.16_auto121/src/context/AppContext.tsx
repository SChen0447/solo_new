import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Track, AudioClip, Collaborator, ProjectState, ActionType, CollaborationAction } from '@/types';
import { createInitialTracks, createMockCollaborators } from '@/utils/mockData';

interface AppContextValue extends ProjectState {
  dispatch: React.Dispatch<ActionType>;
  addTrack: (name?: string) => void;
  addClip: (trackId: string, clip: Omit<AudioClip, 'id'>) => void;
  updateClipPosition: (trackId: string, clipId: string, startTime: number) => void;
  updateClipTrim: (trackId: string, clipId: string, trimStart: number, trimEnd: number) => void;
  updateTrackVolume: (trackId: string, volume: number) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  toggleTrackFilter: (trackId: string) => void;
  updateFilterFrequency: (trackId: string, frequency: number) => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  sendCollaborationAction: (action: Omit<CollaborationAction, 'userId' | 'timestamp'>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const initialState: ProjectState = {
  projectName: '夏日海滩混音项目',
  tracks: createInitialTracks(),
  currentTime: 0,
  isPlaying: false,
  masterVolume: 80,
  totalDuration: 180,
  selectedClipId: null,
  collaborators: createMockCollaborators(),
  currentUserId: 'user-1'
};

function reducer(state: ProjectState, action: ActionType): ProjectState {
  switch (action.type) {
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.payload };

    case 'ADD_TRACK':
      return { ...state, tracks: [...state.tracks, action.payload] };

    case 'REMOVE_TRACK':
      return { ...state, tracks: state.tracks.filter(t => t.id !== action.payload) };

    case 'UPDATE_TRACK':
      return {
        ...state,
        tracks: state.tracks.map(t =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        )
      };

    case 'ADD_CLIP':
      return {
        ...state,
        tracks: state.tracks.map(t =>
          t.id === action.payload.trackId
            ? { ...t, clips: [...t.clips, action.payload.clip] }
            : t
        )
      };

    case 'REMOVE_CLIP':
      return {
        ...state,
        tracks: state.tracks.map(t =>
          t.id === action.payload.trackId
            ? { ...t, clips: t.clips.filter(c => c.id !== action.payload.clipId) }
            : t
        )
      };

    case 'UPDATE_CLIP':
      return {
        ...state,
        tracks: state.tracks.map(t =>
          t.id === action.payload.trackId
            ? {
                ...t,
                clips: t.clips.map(c =>
                  c.id === action.payload.clipId ? { ...c, ...action.payload.updates } : c
                )
              }
            : t
        )
      };

    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: Math.min(Math.max(0, action.payload), state.totalDuration) };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'SET_MASTER_VOLUME':
      return { ...state, masterVolume: Math.min(Math.max(0, action.payload), 120) };

    case 'SET_SELECTED_CLIP':
      return { ...state, selectedClipId: action.payload };

    case 'SET_COLLABORATORS':
      return { ...state, collaborators: action.payload };

    case 'APPLY_COLLAB_ACTION': {
      const collabAction = action.payload;
      let newState = state;

      switch (collabAction.type) {
        case 'volume_change':
          newState = reducer(state, {
            type: 'UPDATE_TRACK',
            payload: { id: collabAction.payload.trackId, updates: { volume: collabAction.payload.volume, isSyncing: true } }
          });
          break;
        case 'mute_toggle':
          newState = reducer(state, {
            type: 'UPDATE_TRACK',
            payload: { id: collabAction.payload.trackId, updates: { muted: collabAction.payload.muted, isSyncing: true } }
          });
          break;
        case 'solo_toggle':
          newState = reducer(state, {
            type: 'UPDATE_TRACK',
            payload: { id: collabAction.payload.trackId, updates: { solo: collabAction.payload.solo, isSyncing: true } }
          });
          break;
        case 'filter_toggle':
          newState = reducer(state, {
            type: 'UPDATE_TRACK',
            payload: { id: collabAction.payload.trackId, updates: { filterEnabled: collabAction.payload.filterEnabled, isSyncing: true } }
          });
          break;
        case 'clip_move':
          newState = reducer(state, {
            type: 'UPDATE_CLIP',
            payload: {
              trackId: collabAction.payload.trackId,
              clipId: collabAction.payload.clipId,
              updates: { startTime: collabAction.payload.startTime }
            }
          });
          newState = reducer(newState, {
            type: 'SET_TRACK_SYNCING',
            payload: { trackId: collabAction.payload.trackId, syncing: true }
          });
          break;
        case 'clip_trim':
          newState = reducer(state, {
            type: 'UPDATE_CLIP',
            payload: {
              trackId: collabAction.payload.trackId,
              clipId: collabAction.payload.clipId,
              updates: { trimStart: collabAction.payload.trimStart, trimEnd: collabAction.payload.trimEnd }
            }
          });
          newState = reducer(newState, {
            type: 'SET_TRACK_SYNCING',
            payload: { trackId: collabAction.payload.trackId, syncing: true }
          });
          break;
      }

      return newState;
    }

    case 'SET_TRACK_SYNCING':
      return {
        ...state,
        tracks: state.tracks.map(t =>
          t.id === action.payload.trackId ? { ...t, isSyncing: action.payload.syncing } : t
        )
      };

    default:
      return state;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const syncTimeoutRefs = useRef<Record<string, number>>({});

  const clearSyncHighlight = useCallback((trackId: string) => {
    const existingTimeout = syncTimeoutRefs.current[trackId];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
    }
    syncTimeoutRefs.current[trackId] = window.setTimeout(() => {
      dispatch({ type: 'SET_TRACK_SYNCING', payload: { trackId, syncing: false } });
    }, 600);
  }, []);

  const addTrack = useCallback((name?: string) => {
    const colors = ['#42A5F5', '#66BB6A', '#EF5350', '#FFA726', '#AB47BC', '#26C6DA'];
    const colorIndex = state.tracks.length % colors.length;
    const newTrack: Track = {
      id: uuidv4(),
      name: name || `音轨 ${state.tracks.length + 1}`,
      color: colors[colorIndex],
      volume: 80,
      muted: false,
      solo: false,
      clips: [],
      filterEnabled: false,
      filterFrequency: 20000
    };
    dispatch({ type: 'ADD_TRACK', payload: newTrack });
  }, [state.tracks.length]);

  const addClip = useCallback((trackId: string, clip: Omit<AudioClip, 'id'>) => {
    const newClip: AudioClip = { ...clip, id: uuidv4() };
    dispatch({ type: 'ADD_CLIP', payload: { trackId, clip: newClip } });
  }, []);

  const updateClipPosition = useCallback((trackId: string, clipId: string, startTime: number) => {
    dispatch({
      type: 'UPDATE_CLIP',
      payload: { trackId, clipId, updates: { startTime } }
    });
  }, []);

  const updateClipTrim = useCallback((trackId: string, clipId: string, trimStart: number, trimEnd: number) => {
    dispatch({
      type: 'UPDATE_CLIP',
      payload: { trackId, clipId, updates: { trimStart, trimEnd } }
    });
  }, []);

  const updateTrackVolume = useCallback((trackId: string, volume: number) => {
    dispatch({ type: 'UPDATE_TRACK', payload: { id: trackId, updates: { volume } } });
  }, []);

  const toggleTrackMute = useCallback((trackId: string) => {
    const track = state.tracks.find(t => t.id === trackId);
    if (track) {
      dispatch({ type: 'UPDATE_TRACK', payload: { id: trackId, updates: { muted: !track.muted } } });
    }
  }, [state.tracks]);

  const toggleTrackSolo = useCallback((trackId: string) => {
    const track = state.tracks.find(t => t.id === trackId);
    if (track) {
      dispatch({ type: 'UPDATE_TRACK', payload: { id: trackId, updates: { solo: !track.solo } } });
    }
  }, [state.tracks]);

  const toggleTrackFilter = useCallback((trackId: string) => {
    const track = state.tracks.find(t => t.id === trackId);
    if (track) {
      dispatch({ type: 'UPDATE_TRACK', payload: { id: trackId, updates: { filterEnabled: !track.filterEnabled } } });
    }
  }, [state.tracks]);

  const updateFilterFrequency = useCallback((trackId: string, frequency: number) => {
    dispatch({ type: 'UPDATE_TRACK', payload: { id: trackId, updates: { filterFrequency: frequency } } });
  }, []);

  const play = useCallback(() => dispatch({ type: 'SET_PLAYING', payload: true }), []);
  const pause = useCallback(() => dispatch({ type: 'SET_PLAYING', payload: false }), []);
  const seek = useCallback((time: number) => dispatch({ type: 'SET_CURRENT_TIME', payload: time }), []);

  const sendCollaborationAction = useCallback(
    (action: Omit<CollaborationAction, 'userId' | 'timestamp'>) => {
      const fullAction: CollaborationAction = {
        ...action,
        userId: state.currentUserId,
        timestamp: Date.now()
      };
      console.log('[Collab] Sending action:', fullAction);
    },
    [state.currentUserId]
  );

  useEffect(() => {
    state.tracks.forEach(track => {
      if (track.isSyncing) {
        clearSyncHighlight(track.id);
      }
    });
  }, [state.tracks, clearSyncHighlight]);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * state.collaborators.length);
      const collab = state.collaborators[randomIndex];
      if (collab && collab.id !== state.currentUserId && state.tracks.length > 0 && Math.random() < 0.3) {
        const trackId = state.tracks[Math.floor(Math.random() * state.tracks.length)].id;
        const actions = [
          {
            type: 'volume_change' as const,
            payload: { trackId, volume: Math.floor(Math.random() * 120) }
          },
          {
            type: 'mute_toggle' as const,
            payload: { trackId, muted: Math.random() > 0.5 }
          }
        ];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        setTimeout(() => {
          dispatch({
            type: 'APPLY_COLLAB_ACTION',
            payload: {
              ...randomAction,
              userId: collab.id,
              timestamp: Date.now()
            }
          });
        }, Math.random() * 2000);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [state.collaborators, state.currentUserId, state.tracks]);

  const value: AppContextValue = {
    ...state,
    dispatch,
    addTrack,
    addClip,
    updateClipPosition,
    updateClipTrim,
    updateTrackVolume,
    toggleTrackMute,
    toggleTrackSolo,
    toggleTrackFilter,
    updateFilterFrequency,
    play,
    pause,
    seek,
    sendCollaborationAction
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
