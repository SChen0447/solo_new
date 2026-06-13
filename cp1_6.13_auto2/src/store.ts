import { create } from 'zustand';
import type { StoreState, Song, Playlist } from './types';
import { generateId } from './types';

const createMockSong = (name: string, artist: string, duration: number): Song => ({
  id: generateId(),
  name,
  artist,
  duration,
});

const defaultGradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
];

const createInitialPlaylists = (): Playlist[] => {
  const playlists: Playlist[] = [
    {
      id: generateId(),
      name: '🎧 专注学习',
      songs: [
        createMockSong('River Flows in You', 'Yiruma', 205),
        createMockSong('Experience', 'Ludovico Einaudi', 308),
        createMockSong('Nuvole Bianche', 'Ludovico Einaudi', 356),
        createMockSong('Canon in D', 'Pachelbel', 312),
        createMockSong('Time', 'Hans Zimmer', 280),
      ],
      gradientColor: defaultGradients[0],
    },
    {
      id: generateId(),
      name: '🏃 活力运动',
      songs: [
        createMockSong('Eye of the Tiger', 'Survivor', 258),
        createMockSong('Stronger', 'Kanye West', 236),
        createMockSong('Lose Yourself', 'Eminem', 326),
        createMockSong('Till I Collapse', 'Eminem', 356),
        createMockSong('Remember the Name', 'Fort Minor', 250),
      ],
      gradientColor: defaultGradients[1],
    },
    {
      id: generateId(),
      name: '🌙 助眠放松',
      songs: [
        createMockSong('Weightless', 'Marconi Union', 486),
        createMockSong('Clair de Lune', 'Debussy', 302),
        createMockSong('Gymnopédie No.1', 'Erik Satie', 234),
        createMockSong('Spiegel im Spiegel', 'Arvo Pärt', 540),
        createMockSong('Una Mattina', 'Ludovico Einaudi', 256),
      ],
      gradientColor: defaultGradients[2],
    },
    {
      id: generateId(),
      name: '☕ 午后小憩',
      songs: [
        createMockSong('Lemon Tree', 'Fools Garden', 198),
        createMockSong('Fly Me to the Moon', 'Frank Sinatra', 148),
        createMockSong('Dream a Little Dream', 'The Mamas & Papas', 152),
        createMockSong('What a Wonderful World', 'Louis Armstrong', 142),
        createMockSong('La Vie En Rose', 'Edith Piaf', 188),
      ],
      gradientColor: defaultGradients[3],
    },
  ];
  return playlists;
};

export const useStore = create<StoreState>((set, get) => ({
  playlists: createInitialPlaylists(),
  mainList: [],
  currentSong: null,
  isPlaying: false,
  playProgress: 0,

  addPlaylist: (name, gradientColor) =>
    set((state) => ({
      playlists: [
        ...state.playlists,
        {
          id: generateId(),
          name,
          songs: [],
          gradientColor: gradientColor || defaultGradients[state.playlists.length % defaultGradients.length],
        },
      ],
    })),

  removePlaylist: (id) =>
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== id),
    })),

  updatePlaylistColor: (id, color) =>
    set((state) => ({
      playlists: state.playlists.map((p) => (p.id === id ? { ...p, gradientColor: color } : p)),
    })),

  addSong: (playlistId, song) =>
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === playlistId ? { ...p, songs: [...p.songs, song] } : p
      ),
    })),

  removeSong: (playlistId, songId) =>
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === playlistId ? { ...p, songs: p.songs.filter((s) => s.id !== songId) } : p
      ),
    })),

  reorderSongs: (playlistId, fromIndex, toIndex) =>
    set((state) => ({
      playlists: state.playlists.map((p) => {
        if (p.id !== playlistId) return p;
        const newSongs = [...p.songs];
        const [removed] = newSongs.splice(fromIndex, 1);
        newSongs.splice(toIndex, 0, removed);
        return { ...p, songs: newSongs };
      }),
    })),

  addToMainList: (song) =>
    set((state) => {
      const exists = state.mainList.some((s) => s.id === song.id);
      if (exists) return state;
      return { mainList: [...state.mainList, song] };
    }),

  clearMainList: () => set({ mainList: [] }),

  removeFromMainList: (songId) =>
    set((state) => ({
      mainList: state.mainList.filter((s) => s.id !== songId),
    })),

  reorderMainList: (fromIndex, toIndex) =>
    set((state) => {
      const newList = [...state.mainList];
      const [removed] = newList.splice(fromIndex, 1);
      newList.splice(toIndex, 0, removed);
      return { mainList: newList };
    }),

  setCurrentSong: (song) => set({ currentSong: song, playProgress: 0, isPlaying: song !== null }),

  togglePlay: () =>
    set((state) => ({
      isPlaying: state.currentSong ? !state.isPlaying : false,
    })),

  setPlayProgress: (progress) => set({ playProgress: progress }),
}));
