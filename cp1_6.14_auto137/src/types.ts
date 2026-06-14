export interface Waypoint {
  lat: number;
  lng: number;
  elevation: number;
  type?: 'start' | 'end' | 'normal';
}

export interface RouteMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'water' | 'photo';
  name: string;
}

export interface Route {
  id: string;
  name: string;
  waypoints: Waypoint[];
  markers: RouteMarker[];
  distance: number;
  duration: number;
  elevation: number;
  difficulty: number;
  createdAt: string;
}

export type SpeedLevel = 'leisure' | 'standard' | 'competitive';

export interface Member {
  id: string;
  nickname: string;
  speedLevel: SpeedLevel;
  stamina: number;
  avatar: string;
}

export interface Weather {
  temp: number;
  wind: number;
  rain: number;
  icon: string;
}

export interface Activity {
  id: string;
  name: string;
  routeId: string;
  routeName: string;
  startTime: string;
  meetingPoint: string;
  members: Member[];
  leaderId: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  weather: Weather;
}

export interface ReportPhoto {
  id: string;
  url: string;
  location: string;
  timeOffset: number;
  lat: number;
  lng: number;
}

export interface RadarData {
  endurance: number;
  speed: number;
  climb: number;
  descent: number;
  stability: number;
}

export interface Report {
  id: string;
  activityId: string | null;
  routeId: string;
  routeName: string;
  date: string;
  distance: number;
  duration: number;
  avgSpeed: number;
  elevation: number;
  maxSpeed: number;
  avgHeartRate: number;
  radar: RadarData;
  photos: ReportPhoto[];
  difficulty: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  date: string | null;
}

export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  totalDistance: number;
  totalDays: number;
  bestDistance: number;
  bestTime: number;
  monthlyStats: number[];
  level: number;
  unlockedAchievements: string[];
  createdAt: string;
}

export const LEVEL_NAMES = ['新手', '行者', '骑士', '先锋', '传奇'];
export const LEVEL_ICONS = ['🌱', '🚴', '⚔️', '🛡️', '👑'];
export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000];
