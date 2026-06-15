export type PackageStatus =
  | '待揽收'
  | '已揽收'
  | '运输中'
  | '派送中'
  | '已签收'
  | '异常';

export type IssueType = '延误' | '破损' | '丢失' | '其他';

export type TicketStatus = '待处理' | '处理中' | '已解决';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TrackingPoint {
  id: string;
  stationName: string;
  timestamp: number;
  coordinates: Coordinates;
  ambassadorSignature: string;
  status: PackageStatus;
}

export interface PackageInfo {
  trackingNumber: string;
  senderName: string;
  senderAddress: string;
  receiverName: string;
  receiverAddress: string;
  currentStatus: PackageStatus;
  estimatedDelivery: number;
  weight: number;
  dimensions: string;
  items: string;
}

export interface RectangleAnnotation {
  id: string;
  imageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UploadedImage {
  id: string;
  file: File;
  dataUrl: string;
  thumbnailUrl: string;
  annotations: RectangleAnnotation[];
}

export interface TroubleTicket {
  id: string;
  trackingNumber: string;
  issueType: IssueType;
  description: string;
  images: UploadedImage[];
  status: TicketStatus;
  createdAt: number;
}

export interface StatusChangeEvent {
  id: string;
  trackingNumber: string;
  fromStatus: PackageStatus;
  toStatus: PackageStatus;
  timestamp: number;
  newTrackingPoint?: TrackingPoint;
}

export interface AppState {
  currentPackage: PackageInfo | null;
  trackingPoints: TrackingPoint[];
  statusChangeEvents: StatusChangeEvent[];
  troubleTickets: TroubleTicket[];
  isSearching: boolean;
  searchError: string | null;
  showReportPanel: boolean;
  notification: {
    message: string;
    visible: boolean;
  } | null;
  animationProgress: number;
  isPulsing: boolean;
}

export type AppAction =
  | { type: 'SEARCH_PACKAGE'; payload: string }
  | { type: 'SEARCH_SUCCESS'; payload: { pkg: PackageInfo; points: TrackingPoint[]; events: StatusChangeEvent[] } }
  | { type: 'SEARCH_FAIL'; payload: string }
  | { type: 'UPDATE_ANIMATION_PROGRESS'; payload: number }
  | { type: 'TOGGLE_REPORT_PANEL'; payload: boolean }
  | { type: 'SUBMIT_TICKET'; payload: TroubleTicket }
  | { type: 'SHOW_NOTIFICATION'; payload: string }
  | { type: 'HIDE_NOTIFICATION' }
  | { type: 'SIMULATE_STATUS_CHANGE'; payload: StatusChangeEvent }
  | { type: 'SET_PULSING'; payload: boolean }
  | { type: 'CLEAR_SEARCH' };
