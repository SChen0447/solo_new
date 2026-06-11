export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  avatar: string;
}

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: 'attraction' | 'restaurant' | 'hotel';
  address: string;
}

export interface TripPoint {
  id: string;
  placeId: string;
  place: Place;
  date: string;
  time: string;
  notes: string;
  order: number;
  lat: number;
  lng: number;
}

export interface Trip {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  coverImage: string;
  points: TripPoint[];
  collaborators: string[];
  createdAt: string;
}

export interface Invitation {
  id: string;
  tripId: string;
  tripName: string;
  inviterEmail: string;
  inviteeEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface SearchResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  category: 'attraction' | 'restaurant' | 'hotel';
}

export interface Collaborator {
  userId: string;
  email: string;
  name: string;
  avatar: string;
  socketId?: string;
}

export type SyncAction = 
  | { type: 'ADD_POINT'; tripId: string; point: TripPoint }
  | { type: 'UPDATE_POINT'; tripId: string; point: TripPoint }
  | { type: 'DELETE_POINT'; tripId: string; pointId: string }
  | { type: 'REORDER_POINTS'; tripId: string; points: TripPoint[] };
