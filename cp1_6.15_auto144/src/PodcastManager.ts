import { Podcast, Episode, ListeningRecord, Note, PodcastState, WeeklyStats } from './types';
import { v4 as uuidv4 } from 'uuid';

const PODCASTS_KEY = 'podcast_manager_subscriptions';
const STATE_KEY = 'podcast_manager_state';
const RECORDS_KEY = 'podcast_manager_listening_records';
const NOTES_KEY = 'podcast_manager_notes';
const STATS_KEY = 'podcast_manager_weekly_stats';

function safeParse<T>(data: string | null, fallback: T): T {
  if (!data) return fallback;
  try {
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

function getWeekKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayNum}`;
}

export const PodcastManager = {
  getPodcasts(): Podcast[] {
    return safeParse<Podcast[]>(localStorage.getItem(PODCASTS_KEY), []);
  },

  savePodcasts(podcasts: Podcast[]): void {
    localStorage.setItem(PODCASTS_KEY, JSON.stringify(podcasts));
  },

  addPodcast(data: Omit<Podcast, 'id' | 'subscribedAt'>): Podcast {
    const podcasts = this.getPodcasts();
    if (podcasts.some(p => p.rssUrl === data.rssUrl)) {
      const existing = podcasts.find(p => p.rssUrl === data.rssUrl)!;
      return existing;
    }
    const newPodcast: Podcast = {
      ...data,
      id: uuidv4(),
      subscribedAt: Date.now(),
    };
    podcasts.unshift(newPodcast);
    this.savePodcasts(podcasts);
    return newPodcast;
  },

  removePodcast(id: string): void {
    const podcasts = this.getPodcasts().filter(p => p.id !== id);
    this.savePodcasts(podcasts);
  },

  getState(): PodcastState {
    return safeParse<PodcastState>(localStorage.getItem(STATE_KEY), {
      listenedEpisodes: {},
      starredEpisodes: {},
      listeningProgress: {},
    });
  },

  saveState(state: PodcastState): void {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  },

  markAsListened(episodeId: string, listened: boolean = true): void {
    const state = this.getState();
    state.listenedEpisodes[episodeId] = listened;
    this.saveState(state);
  },

  toggleStarred(episodeId: string): boolean {
    const state = this.getState();
    const next = !state.starredEpisodes[episodeId];
    state.starredEpisodes[episodeId] = next;
    this.saveState(state);
    return next;
  },

  isListened(episodeId: string): boolean {
    return !!this.getState().listenedEpisodes[episodeId];
  },

  isStarred(episodeId: string): boolean {
    return !!this.getState().starredEpisodes[episodeId];
  },

  saveProgress(episodeId: string, seconds: number): void {
    const state = this.getState();
    state.listeningProgress[episodeId] = seconds;
    this.saveState(state);
  },

  getProgress(episodeId: string): number {
    return this.getState().listeningProgress[episodeId] || 0;
  },

  getStarredEpisodes(): { podcast: Podcast; episode: Episode }[] {
    const state = this.getState();
    const podcasts = this.getPodcasts();
    const result: { podcast: Podcast; episode: Episode }[] = [];
    for (const podcast of podcasts) {
      for (const ep of podcast.episodes) {
        if (state.starredEpisodes[ep.id]) {
          result.push({ podcast, episode: ep });
        }
      }
    }
    return result;
  },

  getListeningRecords(): ListeningRecord[] {
    return safeParse<ListeningRecord[]>(localStorage.getItem(RECORDS_KEY), []);
  },

  saveListeningRecord(
    podcast: Podcast,
    episode: Episode,
    listenedSeconds: number,
    completed: boolean
  ): void {
    const records = this.getListeningRecords();
    const weekKey = getWeekKey();
    const existingIndex = records.findIndex(
      r => r.episodeId === episode.id && r.weekKey === weekKey
    );
    const totalDuration = episode.duration || Math.max(listenedSeconds, 1);
    if (existingIndex >= 0) {
      const existing = records[existingIndex];
      existing.listenedSeconds = Math.min(
        Math.max(existing.listenedSeconds, listenedSeconds),
        totalDuration
      );
      existing.completed = existing.completed || completed;
      existing.listenedAt = Date.now();
    } else {
      records.push({
        id: uuidv4(),
        episodeId: episode.id,
        podcastId: podcast.id,
        podcastTitle: podcast.title,
        episodeTitle: episode.title,
        categories: podcast.categories,
        listenedSeconds: Math.min(listenedSeconds, totalDuration),
        totalDuration,
        completed,
        listenedAt: Date.now(),
        weekKey,
      });
    }
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  },

  getNotes(): Note[] {
    return safeParse<Note[]>(localStorage.getItem(NOTES_KEY), []);
  },

  addNote(
    podcastId: string,
    episodeId: string,
    timestamp: number,
    content: string
  ): Note {
    const notes = this.getNotes();
    const note: Note = {
      id: uuidv4(),
      podcastId,
      episodeId,
      timestamp,
      content,
      createdAt: Date.now(),
    };
    notes.push(note);
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return note;
  },

  getNotesForEpisode(episodeId: string): Note[] {
    return this.getNotes()
      .filter(n => n.episodeId === episodeId)
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  deleteNote(noteId: string): void {
    const notes = this.getNotes().filter(n => n.id !== noteId);
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  },

  getWeeklyStats(weekKey?: string): WeeklyStats {
    const targetWeek = weekKey || getWeekKey();
    const records = this.getListeningRecords().filter(r => r.weekKey === targetWeek);
    const categoryMinutes: Record<string, number> = {};
    const podcastMinutes: Record<string, number> = {};
    const dailyMinutes: Record<number, number> = {};
    let totalSeconds = 0;
    let completedCount = 0;

    for (const r of records) {
      const minutes = r.listenedSeconds / 60;
      totalSeconds += r.listenedSeconds;
      if (r.completed) completedCount++;
      const pMin = podcastMinutes[r.podcastTitle] || 0;
      podcastMinutes[r.podcastTitle] = pMin + minutes;
      for (const cat of r.categories) {
        if (cat) {
          const cMin = categoryMinutes[cat] || 0;
          categoryMinutes[cat] = cMin + minutes;
        }
      }
      const date = new Date(r.listenedAt);
      const dayIdx = (date.getDay() + 6) % 7;
      dailyMinutes[dayIdx] = (dailyMinutes[dayIdx] || 0) + minutes;
    }

    return {
      weekKey: targetWeek,
      totalMinutes: Math.round(totalSeconds / 60),
      completedEpisodes: completedCount,
      categoryMinutes,
      podcastMinutes,
      dailyMinutes,
    };
  },

  getAllWeeklyStats(): Record<string, WeeklyStats> {
    const all = safeParse<Record<string, WeeklyStats>>(
      localStorage.getItem(STATS_KEY),
      {}
    );
    const currentWeek = getWeekKey();
    all[currentWeek] = this.getWeeklyStats(currentWeek);
    return all;
  },

  getCurrentWeekKey(): string {
    return getWeekKey();
  },
};
