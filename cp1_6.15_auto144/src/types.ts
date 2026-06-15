export interface Episode {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  duration: number;
  audioUrl: string;
  audioType: string;
  cover: string;
  link: string;
  guid: string;
}

export interface Podcast {
  id: string;
  rssUrl: string;
  title: string;
  description: string;
  cover: string;
  link: string;
  language: string;
  categories: string[];
  episodes: Episode[];
  lastBuildDate: string;
  subscribedAt: number;
}

export interface ListeningRecord {
  id: string;
  episodeId: string;
  podcastId: string;
  podcastTitle: string;
  episodeTitle: string;
  categories: string[];
  listenedSeconds: number;
  totalDuration: number;
  completed: boolean;
  listenedAt: number;
  weekKey: string;
}

export interface Note {
  id: string;
  episodeId: string;
  podcastId: string;
  timestamp: number;
  content: string;
  createdAt: number;
}

export interface PodcastState {
  listenedEpisodes: Record<string, boolean>;
  starredEpisodes: Record<string, boolean>;
  listeningProgress: Record<string, number>;
}

export interface WeeklyStats {
  weekKey: string;
  totalMinutes: number;
  completedEpisodes: number;
  categoryMinutes: Record<string, number>;
  podcastMinutes: Record<string, number>;
  dailyMinutes: Record<number, number>;
}

export interface ParsedRSS {
  title: string;
  description: string;
  cover: string;
  link: string;
  language: string;
  categories: string[];
  episodes: Episode[];
  lastBuildDate: string;
  rssUrl?: string;
}

export interface CurrentPlaying {
  podcast: Podcast | null;
  episode: Episode | null;
}
