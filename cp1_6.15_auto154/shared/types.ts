export interface Coordinate {
  lat: number;
  lon: number;
  time?: string;
  ele?: number;
}

export interface Track {
  id: string;
  memberName: string;
  memberColor: string;
  coordinates: Coordinate[];
  startTime: string;
  endTime: string;
  distance: number;
}

export type AnnotationType = 'text' | 'voice';

export interface Annotation {
  id: string;
  trackId: string;
  memberName: string;
  coordinateIndex: number;
  type: AnnotationType;
  content: string;
  voiceData?: string;
  createdAt: string;
}

export interface PathMark {
  id: string;
  memberName: string;
  color: string;
  points: { x: number; y: number; lat: number; lon: number }[];
  hasArrow: boolean;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  color: string;
  joinedAt: string;
}

export interface Activity {
  id: string;
  name: string;
  organizerId: string;
  organizerName: string;
  createdAt: string;
  tracks: Track[];
  annotations: Annotation[];
  pathMarks: PathMark[];
  members: Member[];
}

export interface GpxParseResult {
  coordinates: Coordinate[];
  metadata: {
    name?: string;
    startTime?: string;
    endTime?: string;
    distance?: number;
  };
}

export interface WebSocketMessage {
  type: 'join' | 'annotation' | 'path-mark' | 'track-added' | 'member-joined' | 'annotation-added' | 'path-mark-added' | 'activity-update';
  activityId: string;
  data?: any;
  memberName?: string;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning';
  message: string;
}

export interface Viewport {
  centerX: number;
  centerY: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}
