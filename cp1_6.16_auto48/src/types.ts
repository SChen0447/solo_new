export interface DataPoint {
  lat: number;
  lng: number;
  alt: number;
  time: number;
  value: number;
}

export interface DatasetSummary {
  totalPoints: number;
  timeRange: [number, number];
  valueRange: [number, number];
  altRange: [number, number];
}

export type EventType =
  | 'datasetReady'
  | 'sceneBuilt'
  | 'timeUpdate'
  | 'playStateChange'
  | 'speedChange'
  | 'loadingStart'
  | 'loadingEnd';

export interface EventPayloadMap {
  datasetReady: { data: DataPoint[]; summary: DatasetSummary };
  sceneBuilt: { pointCount: number };
  timeUpdate: { timeIndex: number };
  playStateChange: { isPlaying: boolean };
  speedChange: { speed: number };
  loadingStart: void;
  loadingEnd: void;
}
