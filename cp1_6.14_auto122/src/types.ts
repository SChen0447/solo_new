export interface Actor {
  id: string;
  name: string;
  avatarColor: string;
  role: string;
}

export type PerformanceType = 'rehearsal' | 'show';
export type PerformanceStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface Performance {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  type: PerformanceType;
  status: PerformanceStatus;
  actorIds: string[];
  color: string;
  createdAt: string;
}

export interface CheckInRecord {
  actorId: string;
  performanceId: string;
  checkInTime: string;
}

export interface Feedback {
  id: string;
  performanceId: string;
  actorId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ConflictInfo {
  performanceId: string;
  performanceName: string;
  conflictingWith: {
    id: string;
    name: string;
    time: string;
  }[];
}

export interface QualityReport {
  performanceId: string;
  performanceName: string;
  date: string;
  averageRating: number;
  totalFeedbacks: number;
  actorParticipation: { actorId: string; count: number }[];
}

export interface ScheduleState {
  performances: Performance[];
  actors: Actor[];
  feedbacks: Feedback[];
  checkIns: CheckInRecord[];
  currentMonth: Date;
  selectedDate: string | null;
  selectedPerformanceId: string | null;
  selectedActorId: string | null;
  isActorPanelOpen: boolean;
  isFeedbackPanelOpen: boolean;
  isCreateModalOpen: boolean;
  editingPerformance: Performance | null;
}
