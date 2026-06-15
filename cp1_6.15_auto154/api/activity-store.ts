import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Activity, Track, Annotation, PathMark, Member } from '../shared/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');

class ActivityStore {
  private activities: Map<string, Activity> = new Map();

  constructor() {
    this.ensureDataDir();
    this.loadActivities();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadActivities(): void {
    try {
      if (fs.existsSync(ACTIVITIES_FILE)) {
        const data = fs.readFileSync(ACTIVITIES_FILE, 'utf-8');
        const activitiesArray: Activity[] = JSON.parse(data);
        this.activities.clear();
        activitiesArray.forEach((activity) => {
          this.activities.set(activity.id, activity);
        });
      }
    } catch (e) {
      console.error('Failed to load activities:', e);
      this.activities.clear();
    }
  }

  private saveActivities(): void {
    try {
      const activitiesArray = Array.from(this.activities.values());
      fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify(activitiesArray, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save activities:', e);
    }
  }

  public createActivity(name: string, organizerName: string): Activity {
    const id = uuidv4();
    const activity: Activity = {
      id,
      name,
      organizerId: uuidv4(),
      organizerName,
      createdAt: new Date().toISOString(),
      tracks: [],
      annotations: [],
      pathMarks: [],
      members: [],
    };

    this.activities.set(id, activity);
    this.saveActivities();

    return activity;
  }

  public getActivity(id: string): Activity | null {
    return this.activities.get(id) || null;
  }

  public getAllActivities(): Activity[] {
    return Array.from(this.activities.values());
  }

  public setActivity(id: string, activity: Activity): boolean {
    if (!this.activities.has(id)) {
      return false;
    }
    this.activities.set(id, activity);
    this.saveActivities();
    return true;
  }

  public addTrack(activityId: string, track: Track): boolean {
    const activity = this.activities.get(activityId);
    if (!activity) {
      return false;
    }

    activity.tracks.push(track);
    this.saveActivities();
    return true;
  }

  public addAnnotation(activityId: string, annotation: Annotation): boolean {
    const activity = this.activities.get(activityId);
    if (!activity) {
      return false;
    }

    const existingIndex = activity.annotations.findIndex((a) => a.id === annotation.id);
    if (existingIndex === -1) {
      activity.annotations.push(annotation);
      this.saveActivities();
    }
    return true;
  }

  public addPathMark(activityId: string, pathMark: PathMark): boolean {
    const activity = this.activities.get(activityId);
    if (!activity) {
      return false;
    }

    activity.pathMarks.push(pathMark);
    this.saveActivities();
    return true;
  }

  public addMember(activityId: string, member: Member): boolean {
    const activity = this.activities.get(activityId);
    if (!activity) {
      return false;
    }

    const existingMember = activity.members.find((m) => m.name === member.name);
    if (!existingMember) {
      activity.members.push(member);
      this.saveActivities();
      return true;
    }
    return false;
  }

  public updateActivity(activityId: string, updates: Partial<Activity>): Activity | null {
    const activity = this.activities.get(activityId);
    if (!activity) {
      return null;
    }

    const updatedActivity = { ...activity, ...updates };
    this.activities.set(activityId, updatedActivity);
    this.saveActivities();
    return updatedActivity;
  }

  public deleteActivity(id: string): boolean {
    const deleted = this.activities.delete(id);
    if (deleted) {
      this.saveActivities();
    }
    return deleted;
  }

  public saveGpxFile(activityId: string, trackId: string, gpxContent: string): string {
    const gpxDir = path.join(DATA_DIR, activityId);
    if (!fs.existsSync(gpxDir)) {
      fs.mkdirSync(gpxDir, { recursive: true });
    }

    const filePath = path.join(gpxDir, `${trackId}.gpx`);
    fs.writeFileSync(filePath, gpxContent, 'utf-8');
    return filePath;
  }

  public getGpxFile(activityId: string, trackId: string): string | null {
    const filePath = path.join(DATA_DIR, activityId, `${trackId}.gpx`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return null;
  }
}

export const activityStore = new ActivityStore();
export default ActivityStore;
