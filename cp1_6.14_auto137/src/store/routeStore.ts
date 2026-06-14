import { create } from 'zustand';
import axios from 'axios';
import type {
  Route,
  Activity,
  Report,
  Achievement,
  UserProfile,
  Waypoint,
  RouteMarker
} from '../types';

interface RouteStore {
  routes: Route[];
  currentRoute: Route | null;
  activities: Activity[];
  currentActivity: Activity | null;
  reports: Report[];
  currentReport: Report | null;
  achievements: Achievement[];
  profile: UserProfile | null;
  sidebarOpen: boolean;
  loading: boolean;

  setSidebarOpen: (open: boolean) => void;
  setCurrentRoute: (route: Route | null) => void;
  setCurrentActivity: (activity: Activity | null) => void;
  setCurrentReport: (report: Report | null) => void;

  fetchRoutes: () => Promise<void>;
  createRoute: (data: Omit<Route, 'id' | 'createdAt'>) => Promise<void>;
  updateRoute: (id: string, data: Partial<Route>) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;

  fetchActivities: () => Promise<void>;
  createActivity: (data: Omit<Activity, 'id'>) => Promise<void>;
  updateActivity: (id: string, data: Partial<Activity>) => Promise<void>;
  updateMemberStamina: (activityId: string, memberId: string, stamina: number) => void;

  fetchReports: () => Promise<void>;
  createReport: (data: Omit<Report, 'id'>) => Promise<void>;

  fetchProfile: (id?: string) => Promise<void>;
  fetchAchievements: () => Promise<void>;

  calculateRouteMetrics: (waypoints: Waypoint[]) => { distance: number; duration: number; elevation: number; difficulty: number };
}

const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const useRouteStore = create<RouteStore>((set, get) => ({
  routes: [],
  currentRoute: null,
  activities: [],
  currentActivity: null,
  reports: [],
  currentReport: null,
  achievements: [],
  profile: null,
  sidebarOpen: false,
  loading: false,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentRoute: (route) => set({ currentRoute: route }),
  setCurrentActivity: (activity) => set({ currentActivity: activity }),
  setCurrentReport: (report) => set({ currentReport: report }),

  fetchRoutes: async () => {
    set({ loading: true });
    try {
      const res = await axios.get<Route[]>('/api/routes');
      set({ routes: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createRoute: async (data) => {
    try {
      const res = await axios.post<Route>('/api/routes', data);
      set((state) => ({ routes: [...state.routes, res.data] }));
    } catch {}
  },

  updateRoute: async (id, data) => {
    try {
      const res = await axios.put<Route>(`/api/routes/${id}`, data);
      set((state) => ({
        routes: state.routes.map((r) => (r.id === id ? res.data : r)),
        currentRoute: state.currentRoute?.id === id ? res.data : state.currentRoute
      }));
    } catch {}
  },

  deleteRoute: async (id) => {
    try {
      await axios.delete(`/api/routes/${id}`);
      set((state) => ({
        routes: state.routes.filter((r) => r.id !== id),
        currentRoute: state.currentRoute?.id === id ? null : state.currentRoute
      }));
    } catch {}
  },

  fetchActivities: async () => {
    set({ loading: true });
    try {
      const res = await axios.get<Activity[]>('/api/activities');
      set({ activities: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createActivity: async (data) => {
    try {
      const res = await axios.post<Activity>('/api/activities', data);
      set((state) => ({ activities: [...state.activities, res.data] }));
    } catch {}
  },

  updateActivity: async (id, data) => {
    try {
      const res = await axios.put<Activity>(`/api/activities/${id}`, data);
      set((state) => ({
        activities: state.activities.map((a) => (a.id === id ? res.data : a)),
        currentActivity: state.currentActivity?.id === id ? res.data : state.currentActivity
      }));
    } catch {}
  },

  updateMemberStamina: (activityId, memberId, stamina) => {
    set((state) => ({
      activities: state.activities.map((a) =>
        a.id === activityId
          ? { ...a, members: a.members.map((m) => (m.id === memberId ? { ...m, stamina } : m)) }
          : a
      ),
      currentActivity:
        state.currentActivity?.id === activityId
          ? {
              ...state.currentActivity,
              members: state.currentActivity.members.map((m) =>
                m.id === memberId ? { ...m, stamina } : m
              )
            }
          : state.currentActivity
    }));
  },

  fetchReports: async () => {
    set({ loading: true });
    try {
      const res = await axios.get<Report[]>('/api/reports');
      set({ reports: res.data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createReport: async (data) => {
    try {
      const res = await axios.post<Report>('/api/reports', data);
      set((state) => ({ reports: [res.data, ...state.reports] }));
    } catch {}
  },

  fetchProfile: async (id = 'u1') => {
    try {
      const res = await axios.get<UserProfile>(`/api/profiles/${id}`);
      set({ profile: res.data });
    } catch {}
  },

  fetchAchievements: async () => {
    try {
      const res = await axios.get<Achievement[]>('/api/achievements');
      set({ achievements: res.data });
    } catch {}
  },

  calculateRouteMetrics: (waypoints) => {
    let distance = 0;
    let elevation = 0;
    let maxSlope = 0;

    for (let i = 1; i < waypoints.length; i++) {
      const segDist = haversine(waypoints[i - 1].lat, waypoints[i - 1].lng, waypoints[i].lat, waypoints[i].lng);
      distance += segDist;

      const elevDiff = waypoints[i].elevation - waypoints[i - 1].elevation;
      if (elevDiff > 0) elevation += elevDiff;

      if (segDist > 0) {
        const slope = Math.abs(elevDiff) / (segDist * 1000) * 100;
        if (slope > maxSlope) maxSlope = slope;
      }
    }

    const avgSpeedKmh = 15;
    const elevationBonus = elevation >= 300 ? 1.5 : elevation >= 150 ? 1.2 : 1;
    const duration = Math.round((distance / avgSpeedKmh) * 60 * elevationBonus);

    let difficulty = 1;
    if (distance >= 20 || elevation >= 500) difficulty = 5;
    else if (distance >= 15 || elevation >= 300) difficulty = 4;
    else if (distance >= 10 || elevation >= 150) difficulty = 3;
    else if (distance >= 6 || elevation >= 60) difficulty = 2;
    else difficulty = 1;

    return { distance: Math.round(distance * 10) / 10, duration, elevation: Math.round(elevation), difficulty };
  }
}));
