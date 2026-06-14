import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const DATA_DIR = path.join(__dirname, '..', 'data');
const ALBUMS_FILE = path.join(DATA_DIR, 'albums.json');
const PLAYLISTS_FILE = path.join(DATA_DIR, 'playlists.json');

const GENRES = ['流行', '摇滚', '电子', '古典', '爵士', 'R&B', '民谣', '嘻哈'];
const MOODS = ['快乐', '忧伤', '放松', '激情', '专注', '浪漫', '神秘', '怀旧'];

app.use(cors());
app.use(express.json({ limit: '10mb' }));

function readJSON(file) {
  const raw = fs.readFileSync(file, 'utf-8');
  return JSON.parse(raw);
}

function writeJSON(file, data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

app.get('/api/albums', (req, res) => {
  try {
    const albums = readJSON(ALBUMS_FILE);
    res.json(albums);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load albums' });
  }
});

app.get('/api/albums/:id', (req, res) => {
  try {
    const albums = readJSON(ALBUMS_FILE);
    const album = albums.find(a => a.id === req.params.id);
    if (!album) return res.status(404).json({ error: 'Album not found' });
    res.json(album);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load album' });
  }
});

app.post('/api/albums', (req, res) => {
  try {
    const { name, artist, coverUrl, year, genre, moods, tracks } = req.body;

    if (!name || !artist || !coverUrl || !year || !genre || !moods || !tracks || tracks.length < 2) {
      return res.status(400).json({ error: 'Invalid album data' });
    }

    if (year < 1900 || year > 2024) {
      return res.status(400).json({ error: 'Year must be between 1900 and 2024' });
    }

    if (!GENRES.includes(genre)) {
      return res.status(400).json({ error: 'Invalid genre' });
    }

    for (const mood of moods) {
      if (!MOODS.includes(mood)) {
        return res.status(400).json({ error: 'Invalid mood' });
      }
    }

    const newAlbum = {
      id: uuidv4(),
      name,
      artist,
      coverUrl,
      year,
      genre,
      moods,
      tracks: tracks.map(t => ({ id: uuidv4(), name: t.name, duration: t.duration })),
      createdAt: new Date().toISOString()
    };

    const albums = readJSON(ALBUMS_FILE);
    albums.unshift(newAlbum);
    writeJSON(ALBUMS_FILE, albums);
    res.status(201).json(newAlbum);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create album' });
  }
});

app.put('/api/albums/:id', (req, res) => {
  try {
    const albums = readJSON(ALBUMS_FILE);
    const idx = albums.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Album not found' });

    const { tracks, ...rest } = req.body;
    albums[idx] = {
      ...albums[idx],
      ...rest,
      tracks: tracks ? tracks.map(t => ({ id: t.id || uuidv4(), name: t.name, duration: t.duration })) : albums[idx].tracks
    };

    writeJSON(ALBUMS_FILE, albums);
    res.json(albums[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update album' });
  }
});

app.delete('/api/albums/:id', (req, res) => {
  try {
    const albums = readJSON(ALBUMS_FILE);
    const filtered = albums.filter(a => a.id !== req.params.id);
    if (filtered.length === albums.length) {
      return res.status(404).json({ error: 'Album not found' });
    }
    writeJSON(ALBUMS_FILE, filtered);

    const playlists = readJSON(PLAYLISTS_FILE);
    const updatedPlaylists = playlists.map(p => ({
      ...p,
      tracks: p.tracks.filter(t => t.albumId !== req.params.id),
      updatedAt: new Date().toISOString()
    }));
    writeJSON(PLAYLISTS_FILE, updatedPlaylists);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete album' });
  }
});

app.get('/api/playlists', (req, res) => {
  try {
    const playlists = readJSON(PLAYLISTS_FILE);
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load playlists' });
  }
});

app.get('/api/playlists/:id', (req, res) => {
  try {
    const playlists = readJSON(PLAYLISTS_FILE);
    const playlist = playlists.find(p => p.id === req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load playlist' });
  }
});

app.post('/api/playlists', (req, res) => {
  try {
    const { name, description = '', coverUrl = '', tracks = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    if (description.length > 100) {
      return res.status(400).json({ error: 'Description too long' });
    }

    const now = new Date().toISOString();
    const newPlaylist = {
      id: uuidv4(),
      name,
      description,
      coverUrl,
      tracks,
      createdAt: now,
      updatedAt: now
    };

    const playlists = readJSON(PLAYLISTS_FILE);
    playlists.unshift(newPlaylist);
    writeJSON(PLAYLISTS_FILE, playlists);
    res.status(201).json(newPlaylist);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

app.put('/api/playlists/:id', (req, res) => {
  try {
    const playlists = readJSON(PLAYLISTS_FILE);
    const idx = playlists.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Playlist not found' });

    const { description, ...rest } = req.body;
    if (description && description.length > 100) {
      return res.status(400).json({ error: 'Description too long' });
    }

    playlists[idx] = {
      ...playlists[idx],
      ...rest,
      description: description ?? playlists[idx].description,
      updatedAt: new Date().toISOString()
    };

    writeJSON(PLAYLISTS_FILE, playlists);
    res.json(playlists[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

app.delete('/api/playlists/:id', (req, res) => {
  try {
    const playlists = readJSON(PLAYLISTS_FILE);
    const filtered = playlists.filter(p => p.id !== req.params.id);
    if (filtered.length === playlists.length) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    writeJSON(PLAYLISTS_FILE, filtered);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

app.get('/api/recommend', (req, res) => {
  try {
    const albums = readJSON(ALBUMS_FILE);
    if (albums.length === 0) {
      return res.json({
        date: new Date().toISOString().split('T')[0],
        title: '每日推荐',
        topMoods: [],
        topGenres: [],
        tracks: []
      });
    }

    const moodCounts = {};
    const genreCounts = {};

    for (const album of albums) {
      for (const mood of album.moods) {
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      }
      genreCounts[album.genre] = (genreCounts[album.genre] || 0) + 1;
    }

    const topMoods = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([m]) => m);

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([g]) => g);

    const candidateAlbums = albums.filter(a =>
      a.moods.some(m => topMoods.includes(m)) || topGenres.includes(a.genre)
    );

    const allTracks = [];
    for (const album of candidateAlbums) {
      for (const track of album.tracks) {
        allTracks.push({
          ...track,
          albumId: album.id,
          albumName: album.name,
          artist: album.artist,
          coverUrl: album.coverUrl
        });
      }
    }

    const shuffled = allTracks.sort(() => Math.random() - 0.5);
    const numTracks = Math.min(shuffled.length, Math.floor(Math.random() * 3) + 8);
    const selectedTracks = shuffled.slice(0, numTracks);

    res.json({
      date: new Date().toISOString().split('T')[0],
      title: '每日推荐',
      topMoods,
      topGenres,
      tracks: selectedTracks
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const albums = readJSON(ALBUMS_FILE);
    const playlists = readJSON(PLAYLISTS_FILE);

    let totalTracks = 0;
    const genreDistribution = {};
    const moodDistribution = {};
    const artistCounts = {};

    for (const g of GENRES) genreDistribution[g] = 0;
    for (const m of MOODS) moodDistribution[m] = 0;

    for (const album of albums) {
      totalTracks += album.tracks.length;
      genreDistribution[album.genre] = (genreDistribution[album.genre] || 0) + 1;
      for (const mood of album.moods) {
        moodDistribution[mood] = (moodDistribution[mood] || 0) + 1;
      }
      artistCounts[album.artist] = (artistCounts[album.artist] || 0) + 1;
    }

    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    res.json({
      totalAlbums: albums.length,
      totalTracks,
      totalPlaylists: playlists.length,
      genreDistribution,
      moodDistribution,
      topArtists
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
