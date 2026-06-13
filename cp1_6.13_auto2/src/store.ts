import { create } from 'zustand';
import { Song, Playlist } from './types';

let nextId = 1;
const genId = () => String(nextId++);

const DEFAULT_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
];

const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: genId(),
    name: '运动',
    gradientColor: DEFAULT_GRADIENTS[0],
    songs: [
      { id: genId(), name: 'Stronger', artist: 'Kanye West', duration: 312 },
      { id: genId(), name: 'Eye of the Tiger', artist: 'Survivor', duration: 245 },
      { id: genId(), name: 'Lose Yourself', artist: 'Eminem', duration: 326 },
    ],
  },
  {
    id: genId(),
    name: '学习',
    gradientColor: DEFAULT_GRADIENTS[2],
    songs: [
      { id: genId(), name: 'Clair de Lune', artist: 'Debussy', duration: 312 },
      { id: genId(), name: 'Gymnopédie No.1', artist: 'Erik Satie', duration: 198 },
      { id: genId(), name: 'River Flows in You', artist: 'Yiruma', duration: 183 },
    ],
  },
  {
    id: genId(),
    name: '睡前',
    gradientColor: DEFAULT_GRADIENTS[5],
    songs: [
      { id: genId(), name: 'Weightless', artist: 'Marconi Union', duration: 480 },
      { id: genId(), name: 'Nocturne Op.9 No.2', artist: 'Chopin', duration: 276 },
    ],
  },
];

interface MusicStore {
  playlists: Playlist[];
  mainList: Song[];
  currentSong: Song | null;
  isPlaying: boolean;

  addPlaylist: (name: string) => void;
  removePlaylist: (id: string) => void;
  updatePlaylistColor: (id: string, color: string) => void;
  addSong: (playlistId: string, song: Omit<Song, 'id'>) => void;
  removeSong: (playlistId: string, songId: string) => void;
  reorderSongs: (playlistId: string, fromIndex: number, toIndex: number) => void;
  addToMainList: (song: Song) => void;
  removeFromMainList: (index: number) => void;
  clearMainList: () => void;
  playSong: (song: Song) => void;
  togglePlay: () => void;
  stopPlaying: () => void;
}

export const useMusicStore = create<MusicStore>((set) => ({
  playlists: DEFAULT_PLAYLISTS,
  mainList: [],
  currentSong: null,
  isPlaying: false,

  addPlaylist: (name) =>
    set((state) => ({
      playlists: [
        ...state.playlists,
        {
          id: genId(),
          name,
          songs: [],
          gradientColor:
            DEFAULT_GRADIENTS[state.playlists.length % DEFAULT_GRADIENTS.length],
        },
      ],
    })),

  removePlaylist: (id) =>
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== id),
    })),

  updatePlaylistColor: (id, color) =>
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === id ? { ...p, gradientColor: color } : p
      ),
    })),

  addSong: (playlistId, song) =>
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === playlistId
          ? { ...p, songs: [...p.songs, { ...song, id: genId() }] }
          : p
      ),
    })),

  removeSong: (playlistId, songId) =>
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === playlistId
          ? { ...p, songs: p.songs.filter((s) => s.id !== songId) }
          : p
      ),
    })),

  reorderSongs: (playlistId, fromIndex, toIndex) =>
    set((state) => ({
      playlists: state.playlists.map((p) => {
        if (p.id !== playlistId) return p;
        const newSongs = [...p.songs];
        const [moved] = newSongs.splice(fromIndex, 1);
        newSongs.splice(toIndex, 0, moved);
        return { ...p, songs: newSongs };
      }),
    })),

  addToMainList: (song) =>
    set((state) => ({
      mainList: [...state.mainList, { ...song, id: genId() }],
    })),

  removeFromMainList: (index) =>
    set((state) => ({
      mainList: state.mainList.filter((_, i) => i !== index),
    })),

  clearMainList: () => set({ mainList: [] }),

  playSong: (song) =>
    set({ currentSong: song, isPlaying: true }),

  togglePlay: () =>
    set((state) => ({ isPlaying: !state.isPlaying })),

  stopPlaying: () =>
    set({ isPlaying: false, currentSong: null }),
}));
