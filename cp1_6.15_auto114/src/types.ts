export interface Bell {
  id: string;
  note: string;
  frequency: number;
  diameter: number;
  row: number;
  col: number;
  key: string;
  colorStart: string;
  colorEnd: string;
}

export interface PlayEvent {
  bellId: string;
  timestamp: number;
  velocity: number;
}

export interface Recording {
  id: string;
  events: PlayEvent[];
  duration: number;
  createdAt: number;
}

export interface WaveRipple {
  id: number;
  x: number;
  y: number;
  startTime: number;
  duration: number;
  amplitude: number;
  frequency: number;
}

export type PlaybackSpeed = 0.5 | 1 | 2;

export interface AppState {
  bells: Bell[];
  activeBellIds: Set<string>;
  isRecording: boolean;
  isPlaying: boolean;
  currentRecording: Recording | null;
  savedRecording: Recording | null;
  playbackSpeed: PlaybackSpeed;
  recordingStartTime: number;
  recordingEvents: PlayEvent[];
}
