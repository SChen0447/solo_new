export interface AudioClip {
  id: string;
  trackId: string;
  name: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  buffer: AudioBuffer | null;
  url?: string;
  isRecording?: boolean;
}

export interface Track {
  id: string;
  name: string;
  color: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  clips: AudioClip[];
  filterEnabled: boolean;
  filterFrequency: number;
  waveformData?: number[];
  isSyncing?: boolean;
  lastModifiedBy?: string;
}

export interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  color: string;
}

export interface CollaborationAction {
  type: 'clip_move' | 'clip_trim' | 'volume_change' | 'mute_toggle' | 'solo_toggle' | 'filter_toggle' | 'clip_add' | 'clip_remove';
  payload: any;
  userId: string;
  timestamp: number;
}

export interface ProjectState {
  projectName: string;
  tracks: Track[];
  currentTime: number;
  isPlaying: boolean;
  masterVolume: number;
  totalDuration: number;
  selectedClipId: string | null;
  collaborators: Collaborator[];
  currentUserId: string;
}

export type ActionType =
  | { type: 'SET_PROJECT_NAME'; payload: string }
  | { type: 'ADD_TRACK'; payload: Track }
  | { type: 'REMOVE_TRACK'; payload: string }
  | { type: 'UPDATE_TRACK'; payload: { id: string; updates: Partial<Track> } }
  | { type: 'ADD_CLIP'; payload: { trackId: string; clip: AudioClip } }
  | { type: 'REMOVE_CLIP'; payload: { trackId: string; clipId: string } }
  | { type: 'UPDATE_CLIP'; payload: { trackId: string; clipId: string; updates: Partial<AudioClip> } }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_MASTER_VOLUME'; payload: number }
  | { type: 'SET_SELECTED_CLIP'; payload: string | null }
  | { type: 'SET_COLLABORATORS'; payload: Collaborator[] }
  | { type: 'APPLY_COLLAB_ACTION'; payload: CollaborationAction }
  | { type: 'SET_TRACK_SYNCING'; payload: { trackId: string; syncing: boolean } };
