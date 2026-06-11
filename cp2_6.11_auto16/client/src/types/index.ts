export type VoteStatus = 'available' | 'hesitant' | 'unavailable';

export interface CandidateTime {
  id: string;
  startTime: string;
  endTime: string;
}

export interface Vote {
  id: string;
  eventId: string;
  candidateTimeId: string;
  participantName: string;
  status: VoteStatus;
  timestamp: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  tags: string[];
  candidateTimes: CandidateTime[];
  createdAt: string;
}

export interface TimeSlotStats {
  candidateTimeId: string;
  startTime: string;
  available: number;
  hesitant: number;
  unavailable: number;
}

export interface StatsResponse {
  event: Event;
  timeSlotStats: TimeSlotStats[];
  totalParticipants: number;
  statusDistribution: {
    available: number;
    hesitant: number;
    unavailable: number;
  };
}

export interface CreateEventRequest {
  title: string;
  description: string;
  tags: string[];
  candidateTimes: { startTime: string; endTime: string }[];
}

export interface VoteRequest {
  eventId: string;
  candidateTimeId: string;
  participantName: string;
  status: VoteStatus;
}
