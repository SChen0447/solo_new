export type StationCategory = 'music' | 'talk' | 'story' | 'education' | 'other';

export type LoopMode = 'none' | 'single' | 'list' | 'shuffle';

export interface Episode {
  id: string;
  title: string;
  description: string;
  duration: number;
  audioUrl: string;
  order: number;
}

export interface Season {
  id: string;
  name: string;
  description: string;
  episodes: Episode[];
}

export interface Station {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  category: StationCategory;
  createdAt: number;
  seasons: Season[];
}

export interface PlayHistory {
  id: string;
  episodeId: string;
  stationId: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface StatsData {
  totalPlayTime: number;
  episodePlayCounts: Record<string, number>;
  dailyPlayTime: Record<string, number>;
}

export interface CreateStationRequest {
  name: string;
  description: string;
  coverUrl: string;
  category: StationCategory;
}

export interface UpdateStationRequest extends CreateStationRequest {}

export interface CreateSeasonRequest {
  name: string;
  description: string;
}

export interface CreateEpisodeRequest {
  title: string;
  description: string;
  duration: number;
  audioUrl: string;
}

export interface ReorderEpisodesRequest {
  episodeIds: string[];
}

export interface CreatePlayHistoryRequest {
  episodeId: string;
  stationId: string;
  startTime: number;
  endTime: number;
  duration: number;
}
