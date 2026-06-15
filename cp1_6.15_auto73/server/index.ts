import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  MoodType, SceneType, Playlist, Song,
  songs, playlists, users, initDefaultUser, initSeedPlaylists,
  generateRecommendations, findPlaylistById, addPlaylist, updatePlaylistSongs,
  toggleLikePlaylist, isPlaylistLiked, addComment, incrementShare,
  getBrowsePlaylists, addToHistory, getHistory,
  addFavorite, removeFavorite, removeFavoriteByTarget, getFavorites, isFavorited,
  findPlaylistById,
} from './models';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

initDefaultUser();
initSeedPlaylists();

function getUserIdFromQuery(req: express.Request): string {
  const userId = (req.query.userId as string) || (req.body.userId as string) || 'user-default';
  return userId;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/songs', (req, res) => {
  const mood = req.query.mood as MoodType | undefined;
  const scene = req.query.scene as SceneType | undefined;
  const search = (req.query.q as string)?.toLowerCase();
  
  let result = [...songs];
  
  if (mood) {
    result = result.filter(s => s.mood.includes(mood));
  }
  
  if (scene) {
    const ranges: Record<SceneType, [number, number]> = {
      workout: [120, 140], study: [60, 80], party: [110, 130], sleep: [50, 70],
    };
    const [min, max] = ranges[scene];
    result = result.filter(s => s.bpm >= min && s.bpm <= max);
  }
  
  if (search) {
    result = result.filter(s => 
      s.title.toLowerCase().includes(search) ||
      s.artist.toLowerCase().includes(search)
    );
  }
  
  res.json(result);
});

app.get('/api/playlists', (req, res) => {
  const mood = req.query.mood as MoodType | undefined;
  const scene = req.query.scene as SceneType | undefined;
  const limit = parseInt((req.query.limit as string) || '12', 10);
  
  const existing = mood || scene 
    ? playlists.filter(p => 
        (!mood || p.mood === mood) && 
        (!scene || p.scene === scene)
      ).slice(0, limit)
    : [];
  
  if (existing.length >= Math.min(limit, 4)) {
    res.json(existing);
    return;
  }
  
  const generated = generateRecommendations(mood, scene, limit);
  generated.forEach(p => {
    if (!playlists.find(pl => pl.id === p.id)) {
      playlists.push(p);
    }
  });
  
  res.json(generated);
});

app.get('/api/playlists/:id', (req, res) => {
  const playlist = findPlaylistById(req.params.id);
  if (!playlist) {
    res.status(404).json({ error: '歌单不存在' });
    return;
  }
  const userId = getUserIdFromQuery(req);
  res.json({
    ...playlist,
    isLiked: isPlaylistLiked(playlist.id, userId),
    isFavorited: isFavorited(userId, 'playlist', playlist.id),
  });
});

app.post('/api/playlists', (req, res) => {
  const { name, mood, scene, cover, songIds, isPublic = true, creatorId = 'user-default' } = req.body;
  
  if (!name || !mood) {
    res.status(400).json({ error: '歌单名称和心情为必填项' });
    return;
  }
  
  const playlistSongs: Song[] = (songIds || [])
    .map((id: string) => songs.find(s => s.id === id))
    .filter((s: Song | undefined): s is Song => !!s);
  
  const playlist: Playlist = {
    id: uuidv4(),
    name,
    mood,
    scene,
    cover: cover || songs[0]?.cover || '',
    songs: playlistSongs.length >= 10 ? playlistSongs : playlistSongs,
    likes: 0,
    comments: [],
    shares: 0,
    createdAt: Date.now(),
    isPublic,
    creatorId,
  };
  
  addPlaylist(playlist);
  res.status(201).json(playlist);
});

app.put('/api/playlists/:id', (req, res) => {
  const { songs: newSongs, songIds } = req.body;
  
  let songsToUse: Song[] = newSongs;
  if (songIds) {
    songsToUse = songIds
      .map((id: string) => songs.find(s => s.id === id))
      .filter((s: Song | undefined): s is Song => !!s);
  }
  
  const updated = updatePlaylistSongs(req.params.id, songsToUse);
  if (!updated) {
    res.status(404).json({ error: '歌单不存在' });
    return;
  }
  res.json(updated);
});

app.post('/api/playlists/:id/like', (req, res) => {
  const userId = getUserIdFromQuery(req);
  const result = toggleLikePlaylist(req.params.id, userId);
  res.json(result);
});

app.post('/api/playlists/:id/comments', (req, res) => {
  const { content, userId, userName } = req.body;
  if (!content) {
    res.status(400).json({ error: '评论内容不能为空' });
    return;
  }
  const comment = addComment(req.params.id, userId || 'user-default', userName || '音乐爱好者', content);
  if (!comment) {
    res.status(404).json({ error: '歌单不存在' });
    return;
  }
  res.status(201).json(comment);
});

app.post('/api/playlists/:id/share', (req, res) => {
  const shareId = incrementShare(req.params.id);
  if (!shareId) {
    res.status(404).json({ error: '歌单不存在' });
    return;
  }
  res.json({ shareId });
});

app.get('/api/browse', (req, res) => {
  const sort = (req.query.sort as 'hot' | 'latest') || 'hot';
  const userId = getUserIdFromQuery(req);
  
  const list = getBrowsePlaylists(sort).map(p => ({
    ...p,
    isLiked: isPlaylistLiked(p.id, userId),
    isFavorited: isFavorited(userId, 'playlist', p.id),
  }));
  
  res.json(list);
});

app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  res.json(user);
});

app.get('/api/users/:id/history', (req, res) => {
  const historyList = getHistory(req.params.id);
  res.json(historyList);
});

app.post('/api/users/:id/history', (req, res) => {
  const { songId } = req.body;
  if (!songId) {
    res.status(400).json({ error: 'songId 为必填项' });
    return;
  }
  const song = addToHistory(req.params.id, songId);
  if (!song) {
    res.status(404).json({ error: '歌曲不存在' });
    return;
  }
  res.json(song);
});

app.get('/api/favorites/:userId', (req, res) => {
  const type = req.query.type as 'playlist' | 'song' | undefined;
  const userId = req.params.userId;
  const favs = getFavorites(userId, type);
  
  const enriched = favs.map(f => {
    if (f.type === 'playlist') {
      const playlist = findPlaylistById(f.targetId);
      return { ...f, target: playlist || null };
    } else {
      const song = songs.find(s => s.id === f.targetId);
      return { ...f, target: song || null };
    }
  }).filter(f => f.target !== null);
  
  res.json(enriched);
});

app.post('/api/favorites', (req, res) => {
  const { userId, type, targetId } = req.body;
  if (!userId || !type || !targetId) {
    res.status(400).json({ error: 'userId, type, targetId 为必填项' });
    return;
  }
  
  if (type === 'playlist' && !findPlaylistById(targetId)) {
    res.status(404).json({ error: '歌单不存在' });
    return;
  }
  if (type === 'song' && !songs.find(s => s.id === targetId)) {
    res.status(404).json({ error: '歌曲不存在' });
    return;
  }
  
  const existing = isFavorited(userId, type, targetId);
  if (existing) {
    removeFavoriteByTarget(userId, type, targetId);
    res.json({ added: false, message: '已取消收藏' });
    return;
  }
  
  const fav = addFavorite(userId, type, targetId);
  if (!fav) {
    res.status(400).json({ error: '收藏失败' });
    return;
  }
  res.status(201).json({ added: true, favorite: fav, message: '收藏成功' });
});

app.delete('/api/favorites/:id', (req, res) => {
  const success = removeFavorite(req.params.id);
  if (!success) {
    res.status(404).json({ error: '收藏不存在' });
    return;
  }
  res.json({ success: true });
});

app.get('/api/favorites/check/:userId/:type/:targetId', (req, res) => {
  const { userId, type, targetId } = req.params;
  const favorited = isFavorited(userId, type as 'playlist' | 'song', targetId);
  res.json({ favorited });
});

app.listen(PORT, () => {
  console.log(`🎵 MoodMix API Server running at http://localhost:${PORT}`);
  console.log(`   已初始化 ${songs.length} 首歌曲，${playlists.length} 个推荐歌单`);
});
