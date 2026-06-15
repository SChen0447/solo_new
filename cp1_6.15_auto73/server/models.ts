import { v4 as uuidv4 } from 'uuid';

export type MoodType = 'happy' | 'sad' | 'energetic' | 'relaxed' | 'romantic' | 'focused';
export type SceneType = 'workout' | 'study' | 'party' | 'sleep';
export type PlayMode = 'loop' | 'shuffle';

export interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  duration: number;
  bpm: number;
  genre: string;
  mood: MoodType[];
  scene: SceneType[];
}

export interface Playlist {
  id: string;
  name: string;
  cover: string;
  mood: MoodType;
  scene?: SceneType;
  songs: Song[];
  likes: number;
  comments: Comment[];
  shares: number;
  createdAt: number;
  isPublic: boolean;
  creatorId: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  playlistId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

export interface Favorite {
  id: string;
  userId: string;
  type: 'playlist' | 'song';
  targetId: string;
  createdAt: number;
}

export interface HistoryItem {
  userId: string;
  songId: string;
  playedAt: number;
}

const covers = [
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=music%20album%20cover%20colorful%20abstract&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sunset%20mountain%20landscape%20warm%20colors&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ocean%20waves%20night%20moonlight%20blue&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=city%20neon%20lights%20night%20urban&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=forest%20misty%20morning%20green%20nature&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=galaxy%20space%20stars%20cosmic%20purple&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20vinyl%20record%20retro%20music&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=coffee%20book%20rainy%20window%20cozy&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dance%20floor%20disco%20lights%20party&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=piano%20keys%20elegant%20classical%20music&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=guitar%20campfire%20stars%20acoustic&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=headphones%20gradient%20purple%20blue&image_size=square',
];

const pickCover = (i: number) => covers[i % covers.length];

const songTemplates: Array<{
  title: string; artist: string; genre: string;
  mood: MoodType[]; scene: SceneType[]; bpm: number; duration: number;
}> = [
  { title: '阳光灿烂的日子', artist: '晨曦乐队', genre: 'Pop', mood: ['happy'], scene: ['study', 'party'], bpm: 118, duration: 215 },
  { title: '午夜回响', artist: '月光独奏', genre: 'Indie Pop', mood: ['relaxed', 'romantic'], scene: ['sleep', 'study'], bpm: 72, duration: 248 },
  { title: '奔跑的力量', artist: '风暴之心', genre: 'Rock', mood: ['energetic'], scene: ['workout'], bpm: 135, duration: 198 },
  { title: '雨中漫步', artist: '蓝调诗人', genre: 'Blues', mood: ['sad', 'relaxed'], scene: ['study'], bpm: 68, duration: 276 },
  { title: '电子脉冲', artist: 'Neon Wave', genre: 'EDM', mood: ['energetic', 'happy'], scene: ['workout', 'party'], bpm: 128, duration: 223 },
  { title: '星空下的约定', artist: '银河合唱团', genre: 'Ballad', mood: ['romantic', 'sad'], scene: ['sleep'], bpm: 58, duration: 291 },
  { title: '咖啡因早晨', artist: '爵士四重奏', genre: 'Jazz', mood: ['focused', 'relaxed'], scene: ['study'], bpm: 78, duration: 263 },
  { title: '少年的夏天', artist: '海岸乐队', genre: 'Pop', mood: ['happy', 'energetic'], scene: ['party'], bpm: 122, duration: 207 },
  { title: '深夜独白', artist: '林小雨', genre: 'R&B', mood: ['sad', 'romantic'], scene: ['sleep'], bpm: 65, duration: 254 },
  { title: '无尽的旅程', artist: '公路诗人', genre: 'Folk', mood: ['relaxed', 'focused'], scene: ['study', 'sleep'], bpm: 74, duration: 312 },
  { title: '派对启动', artist: 'DJ Thunder', genre: 'Dance', mood: ['happy', 'energetic'], scene: ['party', 'workout'], bpm: 132, duration: 189 },
  { title: '落叶归根', artist: '秋风吟', genre: 'Acoustic', mood: ['sad', 'relaxed'], scene: ['study'], bpm: 62, duration: 287 },
  { title: '燃烧吧青春', artist: '火焰乐团', genre: 'Punk', mood: ['energetic'], scene: ['workout', 'party'], bpm: 138, duration: 176 },
  { title: '月光奏鸣曲', artist: '古典时光', genre: 'Classical', mood: ['focused', 'relaxed'], scene: ['study', 'sleep'], bpm: 66, duration: 334 },
  { title: '甜蜜陷阱', artist: '蜜糖组合', genre: 'R&B', mood: ['romantic', 'happy'], scene: ['party'], bpm: 96, duration: 229 },
  { title: '深夜电台', artist: 'Lo-Fi 先生', genre: 'Lo-Fi', mood: ['relaxed', 'focused'], scene: ['study', 'sleep'], bpm: 70, duration: 241 },
  { title: '海浪的声音', artist: '自然之声', genre: 'Ambient', mood: ['relaxed', 'sleep'], scene: ['sleep', 'study'], bpm: 55, duration: 356 },
  { title: '嘻哈帝国', artist: '节奏之王', genre: 'Hip-Hop', mood: ['energetic', 'happy'], scene: ['workout', 'party'], bpm: 125, duration: 218 },
  { title: '爱的告白', artist: '心动时刻', genre: 'Soul', mood: ['romantic', 'happy'], scene: ['party'], bpm: 88, duration: 245 },
  { title: '巴莎诺瓦午后', artist: '里约阳光', genre: 'Bossanova', mood: ['relaxed', 'happy'], scene: ['study'], bpm: 76, duration: 278 },
  { title: '追梦赤子心', artist: '逐梦者', genre: 'Indie Pop', mood: ['energetic', 'happy'], scene: ['workout'], bpm: 120, duration: 234 },
  { title: '雨后彩虹', artist: '七色光', genre: 'Pop', mood: ['happy', 'relaxed'], scene: ['study', 'party'], bpm: 105, duration: 211 },
  { title: '孤独患者', artist: '暗夜行者', genre: 'Indie Rock', mood: ['sad'], scene: ['study'], bpm: 72, duration: 267 },
  { title: '未来科技', artist: '赛博朋克', genre: 'EDM', mood: ['energetic'], scene: ['workout', 'party'], bpm: 140, duration: 203 },
  { title: '温柔的夜', artist: '枕边诗', genre: 'Ballad', mood: ['romantic', 'relaxed'], scene: ['sleep'], bpm: 56, duration: 289 },
  { title: '嘻哈派对', artist: '街区男孩', genre: 'Hip-Hop', mood: ['happy', 'energetic'], scene: ['party', 'workout'], bpm: 115, duration: 198 },
  { title: '禅意花园', artist: '东方韵', genre: 'Instrumental', mood: ['focused', 'relaxed'], scene: ['study', 'sleep'], bpm: 60, duration: 321 },
  { title: '摇滚不死', artist: '钢铁之心', genre: 'Rock', mood: ['energetic'], scene: ['workout'], bpm: 132, duration: 243 },
  { title: '初恋的味道', artist: '草莓奶糖', genre: 'Pop', mood: ['happy', 'romantic'], scene: ['party'], bpm: 110, duration: 205 },
  { title: '迷幻爵士', artist: '午夜巴黎', genre: 'Jazz', mood: ['relaxed', 'romantic'], scene: ['study'], bpm: 82, duration: 298 },
  { title: '奔跑吧少年', artist: '跑道之光', genre: 'Dance', mood: ['energetic', 'happy'], scene: ['workout'], bpm: 126, duration: 212 },
  { title: '伤心太平洋', artist: '泪海', genre: 'Ballad', mood: ['sad'], scene: ['sleep'], bpm: 63, duration: 275 },
  { title: '森林低语', artist: '自然精灵', genre: 'Folk', mood: ['relaxed', 'focused'], scene: ['study', 'sleep'], bpm: 68, duration: 302 },
  { title: '迪斯科之夜', artist: '复古风潮', genre: 'Dance', mood: ['happy', 'energetic'], scene: ['party'], bpm: 118, duration: 221 },
  { title: '心灵驿站', artist: '治愈系', genre: 'Lo-Fi', mood: ['relaxed', 'focused'], scene: ['study'], bpm: 70, duration: 256 },
  { title: '夏日海滩', artist: '椰风海韵', genre: 'Pop', mood: ['happy', 'relaxed'], scene: ['party'], bpm: 112, duration: 208 },
  { title: '命运交响曲', artist: '维也纳爱乐', genre: 'Classical', mood: ['focused'], scene: ['study'], bpm: 78, duration: 345 },
  { title: '黑暗中起舞', artist: '暗夜玫瑰', genre: 'Indie Pop', mood: ['sad', 'energetic'], scene: ['party'], bpm: 116, duration: 233 },
  { title: '爱情故事', artist: '时光乐队', genre: 'Soul', mood: ['romantic'], scene: ['sleep'], bpm: 72, duration: 267 },
  { title: '健身房燃脂', artist: '健身达人', genre: 'EDM', mood: ['energetic'], scene: ['workout'], bpm: 136, duration: 195 },
  { title: '晨光熹微', artist: '日出东方', genre: 'Ambient', mood: ['relaxed', 'happy'], scene: ['sleep', 'study'], bpm: 58, duration: 312 },
  { title: '民谣在路上', artist: '背包客', genre: 'Folk', mood: ['relaxed', 'sad'], scene: ['study'], bpm: 75, duration: 287 },
  { title: '闪亮登场', artist: '舞台之王', genre: 'Pop', mood: ['happy', 'energetic'], scene: ['party', 'workout'], bpm: 124, duration: 207 },
  { title: '破碎的心', artist: '玻璃泪', genre: 'R&B', mood: ['sad', 'romantic'], scene: ['sleep'], bpm: 66, duration: 253 },
  { title: '思维殿堂', artist: '脑波音乐', genre: 'Instrumental', mood: ['focused'], scene: ['study'], bpm: 72, duration: 334 },
  { title: '热带风暴', artist: '岛屿节奏', genre: 'Dance', mood: ['happy', 'energetic'], scene: ['party', 'workout'], bpm: 122, duration: 216 },
  { title: '月光下的吉他', artist: '民谣老张', genre: 'Acoustic', mood: ['relaxed', 'romantic'], scene: ['sleep'], bpm: 64, duration: 278 },
  { title: '重金属风暴', artist: '雷神', genre: 'Rock', mood: ['energetic'], scene: ['workout'], bpm: 138, duration: 241 },
  { title: '粉色泡泡', artist: '少女时代', genre: 'Pop', mood: ['happy', 'romantic'], scene: ['party'], bpm: 108, duration: 197 },
  { title: '蓝调咖啡馆', artist: '午后时光', genre: 'Jazz', mood: ['relaxed', 'sad'], scene: ['study'], bpm: 74, duration: 289 },
  { title: '跑酷人生', artist: '街头飞人', genre: 'Hip-Hop', mood: ['energetic', 'happy'], scene: ['workout'], bpm: 130, duration: 209 },
  { title: '星河入梦', artist: '梦境旅人', genre: 'Ambient', mood: ['relaxed', 'focused'], scene: ['sleep'], bpm: 52, duration: 367 },
  { title: '青春纪念册', artist: '旧时光', genre: 'Pop', mood: ['happy', 'sad'], scene: ['study'], bpm: 92, duration: 244 },
  { title: '火辣身材', artist: '燃脂教练', genre: 'EDM', mood: ['energetic'], scene: ['workout'], bpm: 134, duration: 192 },
  { title: '雨中巴黎', artist: '香颂女王', genre: 'Bossanova', mood: ['romantic', 'relaxed'], scene: ['study'], bpm: 78, duration: 266 },
  { title: '地下说唱', artist: '街头诗人', genre: 'Hip-Hop', mood: ['energetic', 'sad'], scene: ['party'], bpm: 112, duration: 223 },
  { title: '童话王国', artist: '梦境乐团', genre: 'Classical', mood: ['focused', 'happy'], scene: ['study', 'sleep'], bpm: 70, duration: 298 },
  { title: '不眠之夜', artist: '摇滚青年', genre: 'Rock', mood: ['energetic', 'sad'], scene: ['party'], bpm: 128, duration: 251 },
  { title: '初恋粉色系', artist: '甜甜圈', genre: 'Pop', mood: ['happy', 'romantic'], scene: ['party', 'study'], bpm: 102, duration: 214 },
  { title: '冥想空间', artist: '禅修大师', genre: 'Ambient', mood: ['focused', 'relaxed'], scene: ['sleep', 'study'], bpm: 56, duration: 389 },
  { title: '兄弟干杯', artist: '老友情', genre: 'Pop', mood: ['happy', 'energetic'], scene: ['party'], bpm: 114, duration: 228 },
  { title: '离别的车站', artist: '旅人之歌', genre: 'Ballad', mood: ['sad'], scene: ['study', 'sleep'], bpm: 62, duration: 283 },
  { title: '蹦迪时刻', artist: '夜店之王', genre: 'EDM', mood: ['energetic', 'happy'], scene: ['party', 'workout'], bpm: 130, duration: 198 },
  { title: '秋日私语', artist: '钢琴诗人', genre: 'Classical', mood: ['relaxed', 'romantic'], scene: ['study'], bpm: 66, duration: 325 },
  { title: '街头狂飙', artist: '速度激情', genre: 'Hip-Hop', mood: ['energetic'], scene: ['workout', 'party'], bpm: 124, duration: 211 },
  { title: '想念的季节', artist: '四季风', genre: 'Folk', mood: ['sad', 'romantic'], scene: ['sleep'], bpm: 68, duration: 271 },
  { title: '糖果工厂', artist: '甜梦组合', genre: 'Pop', mood: ['happy'], scene: ['party'], bpm: 116, duration: 202 },
  { title: '夜色温柔', artist: '萨克斯风', genre: 'Jazz', mood: ['romantic', 'relaxed'], scene: ['sleep', 'study'], bpm: 70, duration: 294 },
  { title: '勇士之歌', artist: '战歌乐团', genre: 'Rock', mood: ['energetic', 'focused'], scene: ['workout'], bpm: 132, duration: 238 },
  { title: '等待的人', artist: '月光女神', genre: 'Ballad', mood: ['sad', 'romantic'], scene: ['sleep'], bpm: 60, duration: 279 },
  { title: '嘻哈学院', artist: '新生报到', genre: 'Hip-Hop', mood: ['happy', 'energetic'], scene: ['party', 'workout'], bpm: 118, duration: 216 },
  { title: '海边的卡夫卡', artist: '村上春树', genre: 'Lo-Fi', mood: ['focused', 'relaxed'], scene: ['study'], bpm: 72, duration: 261 },
  { title: '花火大会', artist: '夏日祭', genre: 'J-Pop', mood: ['happy', 'romantic'], scene: ['party'], bpm: 120, duration: 233 },
  { title: '深夜书店', artist: '阅读时光', genre: 'Instrumental', mood: ['focused', 'relaxed'], scene: ['study'], bpm: 64, duration: 312 },
  { title: '运动无止境', artist: '健身狂魔', genre: 'Dance', mood: ['energetic'], scene: ['workout'], bpm: 136, duration: 195 },
  { title: '分手快乐', artist: '独立女性', genre: 'Pop', mood: ['sad', 'happy'], scene: ['party', 'study'], bpm: 106, duration: 225 },
  { title: '宇宙漫游', artist: '太空人', genre: 'Ambient', mood: ['relaxed', 'focused'], scene: ['sleep'], bpm: 54, duration: 356 },
  { title: '街舞对决', artist: 'B-Boy', genre: 'Hip-Hop', mood: ['energetic', 'happy'], scene: ['workout', 'party'], bpm: 128, duration: 207 },
  { title: '风中有朵雨做的云', artist: '经典回响', genre: 'Ballad', mood: ['sad', 'relaxed'], scene: ['study', 'sleep'], bpm: 66, duration: 268 },
  { title: '电子游乐场', artist: '像素男孩', genre: 'EDM', mood: ['happy', 'energetic'], scene: ['party'], bpm: 130, duration: 204 },
  { title: '想念你', artist: '情歌王子', genre: 'R&B', mood: ['romantic', 'sad'], scene: ['sleep'], bpm: 68, duration: 252 },
  { title: '专注力MAX', artist: '学霸模式', genre: 'Lo-Fi', mood: ['focused'], scene: ['study'], bpm: 72, duration: 278 },
  { title: '阳光宅男', artist: '快乐先生', genre: 'Pop', mood: ['happy'], scene: ['study', 'party'], bpm: 110, duration: 217 },
  { title: '瑜伽时光', artist: '身心合一', genre: 'Ambient', mood: ['relaxed', 'focused'], scene: ['sleep'], bpm: 58, duration: 342 },
  { title: '篮球火', artist: '灌篮高手', genre: 'Hip-Hop', mood: ['energetic', 'happy'], scene: ['workout', 'party'], bpm: 122, duration: 214 },
  { title: '好久不见', artist: '老朋友', genre: 'Pop', mood: ['sad', 'happy'], scene: ['study'], bpm: 88, duration: 247 },
  { title: '深度睡眠', artist: '睡眠博士', genre: 'Ambient', mood: ['relaxed'], scene: ['sleep'], bpm: 50, duration: 420 },
  { title: '毕业季', artist: '青春纪念', genre: 'Folk', mood: ['happy', 'sad'], scene: ['study', 'party'], bpm: 94, duration: 256 },
  { title: '夏日恋歌', artist: '海风乐队', genre: 'Pop', mood: ['happy', 'romantic'], scene: ['party'], bpm: 112, duration: 209 },
  { title: '思念是一种病', artist: '老情歌', genre: 'R&B', mood: ['sad', 'romantic'], scene: ['sleep', 'study'], bpm: 72, duration: 263 },
  { title: '派对动物', artist: 'Party Crew', genre: 'Dance', mood: ['happy', 'energetic'], scene: ['party'], bpm: 126, duration: 198 },
  { title: '一个人的精彩', artist: '独立灵魂', genre: 'Pop', mood: ['happy', 'sad'], scene: ['study'], bpm: 104, duration: 228 },
  { title: '马拉松之歌', artist: '跑者', genre: 'Rock', mood: ['energetic'], scene: ['workout'], bpm: 130, duration: 244 },
  { title: '亲密爱人', artist: '经典对唱', genre: 'Soul', mood: ['romantic', 'relaxed'], scene: ['sleep'], bpm: 70, duration: 278 },
  { title: '夜店狂热', artist: 'DJ Max', genre: 'EDM', mood: ['energetic', 'happy'], scene: ['party', 'workout'], bpm: 132, duration: 196 },
  { title: '岁月神偷', artist: '金玟岐', genre: 'Ballad', mood: ['sad', 'relaxed'], scene: ['study', 'sleep'], bpm: 62, duration: 287 },
  { title: '我要夏天', artist: '阳光乐团', genre: 'Pop', mood: ['happy', 'energetic'], scene: ['party', 'workout'], bpm: 120, duration: 212 },
  { title: '学习使我快乐', artist: '学霸BGM', genre: 'Classical', mood: ['focused'], scene: ['study'], bpm: 76, duration: 315 },
  { title: '晚安喵', artist: '罗小黑', genre: 'Ballad', mood: ['relaxed', 'romantic'], scene: ['sleep'], bpm: 56, duration: 245 },
];

export const songs: Song[] = songTemplates.map((t, i) => ({
  id: `song-${i + 1}`,
  title: t.title,
  artist: t.artist,
  cover: pickCover(i),
  duration: t.duration,
  bpm: t.bpm,
  genre: t.genre,
  mood: t.mood,
  scene: t.scene,
}));

export let playlists: Playlist[] = [];
export let users: User[] = [];
export let comments: Comment[] = [];
export let favorites: Favorite[] = [];
export let history: HistoryItem[] = [];
export let likedPlaylists: Record<string, string[]> = {};

export function initDefaultUser(): User {
  const existing = users.find(u => u.name === '音乐爱好者');
  if (existing) return existing;
  const user: User = {
    id: 'user-default',
    name: '音乐爱好者',
    avatar: covers[0],
    createdAt: Date.now(),
  };
  users.push(user);
  return user;
}

const moodPlaylistNames: Record<MoodType, string[]> = {
  happy: ['快乐能量站', '阳光午后', '开心每一天', '欢乐派对', '笑容协奏曲'],
  sad: ['深夜疗伤馆', '泪的独白', '雨季心情', '独自等待', '温柔告别'],
  energetic: ['燃脂训练营', '极限挑战', '肾上腺素', '热血沸腾', '力量觉醒'],
  relaxed: ['慵懒下午茶', '慢时光', '心灵SPA', '日落黄昏', '避风港'],
  romantic: ['二人世界', '心动时刻', '爱意浓浓', '月下漫步', '甜蜜日记'],
  focused: ['深度工作流', '知识海洋', '学霸模式', '心流时间', '思维殿堂'],
};

const sceneBPMRanges: Record<SceneType, [number, number]> = {
  workout: [120, 140],
  study: [60, 80],
  party: [110, 130],
  sleep: [50, 70],
};

const sceneSortStrategies: Record<SceneType, (a: Song, b: Song) => number> = {
  workout: (a, b) => a.bpm - b.bpm,
  study: (a, b) => Math.abs(a.bpm - 70) - Math.abs(b.bpm - 70),
  party: () => Math.random() - 0.5,
  sleep: (a, b) => b.bpm - a.bpm,
};

export function filterSongsByMood(mood: MoodType): Song[] {
  return songs.filter(s => s.mood.includes(mood));
}

export function filterSongsByScene(songList: Song[], scene: SceneType): Song[] {
  const [min, max] = sceneBPMRanges[scene];
  const filtered = songList.filter(s => s.bpm >= min && s.bpm <= max);
  return filtered.sort(sceneSortStrategies[scene]);
}

export function generateRecommendations(mood?: MoodType, scene?: SceneType, limit: number = 8): Playlist[] {
  const result: Playlist[] = [];
  const moods: MoodType[] = mood ? [mood] : ['happy', 'sad', 'energetic', 'relaxed', 'romantic', 'focused'];
  
  moods.forEach(m => {
    let songPool = filterSongsByMood(m);
    if (scene) {
      const sceneFiltered = filterSongsByScene(songPool, scene);
      songPool = sceneFiltered.length >= 10 ? sceneFiltered : songPool;
    }
    
    if (songPool.length < 10) return;
    
    const playlistCount = mood ? Math.ceil(limit / 1) : Math.ceil(limit / moods.length);
    
    for (let i = 0; i < playlistCount && result.length < limit; i++) {
      const shuffled = [...songPool].sort(() => Math.random() - 0.5);
      const playlistSongs = shuffled.slice(0, 15 + Math.floor(Math.random() * 10));
      
      const names = moodPlaylistNames[m];
      const name = scene 
        ? `${names[i % names.length]} · ${getSceneLabel(scene)}`
        : names[i % names.length];
      
      const coverIdx = (moods.indexOf(m) * 3 + i) % covers.length;
      
      result.push({
        id: `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        cover: covers[coverIdx],
        mood: m,
        scene,
        songs: playlistSongs,
        likes: Math.floor(Math.random() * 500),
        comments: [],
        shares: Math.floor(Math.random() * 50),
        createdAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
        isPublic: true,
        creatorId: 'user-default',
      });
    }
  });
  
  return result.sort(() => Math.random() - 0.5).slice(0, limit);
}

function getSceneLabel(scene: SceneType): string {
  const labels: Record<SceneType, string> = {
    workout: '运动专属',
    study: '学习模式',
    party: '派对时光',
    sleep: '睡前助眠',
  };
  return labels[scene];
}

export function initSeedPlaylists(): void {
  const seeded = generateRecommendations(undefined, undefined, 15);
  seeded.forEach(p => {
    p.isPublic = true;
  });
  playlists.push(...seeded);
}

export function findPlaylistById(id: string): Playlist | undefined {
  return playlists.find(p => p.id === id);
}

export function addPlaylist(playlist: Playlist): Playlist {
  playlists.push(playlist);
  return playlist;
}

export function updatePlaylistSongs(id: string, newSongs: Song[]): Playlist | null {
  const p = findPlaylistById(id);
  if (!p) return null;
  p.songs = newSongs;
  return p;
}

export function toggleLikePlaylist(playlistId: string, userId: string): { liked: boolean; likes: number } {
  if (!likedPlaylists[playlistId]) likedPlaylists[playlistId] = [];
  const idx = likedPlaylists[playlistId].indexOf(userId);
  const playlist = findPlaylistById(playlistId);
  if (!playlist) return { liked: false, likes: 0 };
  
  if (idx === -1) {
    likedPlaylists[playlistId].push(userId);
    playlist.likes += 1;
    return { liked: true, likes: playlist.likes };
  } else {
    likedPlaylists[playlistId].splice(idx, 1);
    playlist.likes = Math.max(0, playlist.likes - 1);
    return { liked: false, likes: playlist.likes };
  }
}

export function isPlaylistLiked(playlistId: string, userId: string): boolean {
  return likedPlaylists[playlistId]?.includes(userId) || false;
}

export function addComment(playlistId: string, userId: string, userName: string, content: string): Comment | null {
  const playlist = findPlaylistById(playlistId);
  if (!playlist) return null;
  const comment: Comment = {
    id: uuidv4(),
    playlistId,
    userId,
    userName,
    content,
    createdAt: Date.now(),
  };
  playlist.comments.push(comment);
  comments.push(comment);
  return comment;
}

export function incrementShare(playlistId: string): string | null {
  const playlist = findPlaylistById(playlistId);
  if (!playlist) return null;
  playlist.shares += 1;
  return uuidv4();
}

export function getBrowsePlaylists(sort: 'hot' | 'latest' = 'hot'): Playlist[] {
  const publicPlaylists = playlists.filter(p => p.isPublic);
  if (sort === 'hot') {
    return [...publicPlaylists].sort((a, b) => (b.likes * 3 + b.shares * 2 + b.comments.length) - (a.likes * 3 + a.shares * 2 + a.comments.length));
  }
  return [...publicPlaylists].sort((a, b) => b.createdAt - a.createdAt);
}

export function addToHistory(userId: string, songId: string): Song | null {
  const song = songs.find(s => s.id === songId);
  if (!song) return null;
  
  history = history.filter(h => !(h.userId === userId && h.songId === songId));
  history.push({ userId, songId, playedAt: Date.now() });
  
  const userHistory = history.filter(h => h.userId === userId).sort((a, b) => b.playedAt - a.playedAt);
  if (userHistory.length > 10) {
    const toRemove = userHistory.slice(10);
    history = history.filter(h => !toRemove.includes(h));
  }
  
  return song;
}

export function getHistory(userId: string): Song[] {
  return history
    .filter(h => h.userId === userId)
    .sort((a, b) => b.playedAt - a.playedAt)
    .map(h => songs.find(s => s.id === h.songId))
    .filter((s): s is Song => !!s);
}

export function addFavorite(userId: string, type: 'playlist' | 'song', targetId: string): Favorite | null {
  const existing = favorites.find(f => f.userId === userId && f.type === type && f.targetId === targetId);
  if (existing) return null;
  
  const fav: Favorite = {
    id: uuidv4(),
    userId,
    type,
    targetId,
    createdAt: Date.now(),
  };
  favorites.push(fav);
  return fav;
}

export function removeFavorite(id: string): boolean {
  const idx = favorites.findIndex(f => f.id === id);
  if (idx === -1) return false;
  favorites.splice(idx, 1);
  return true;
}

export function removeFavoriteByTarget(userId: string, type: 'playlist' | 'song', targetId: string): boolean {
  const idx = favorites.findIndex(f => f.userId === userId && f.type === type && f.targetId === targetId);
  if (idx === -1) return false;
  favorites.splice(idx, 1);
  return true;
}

export function getFavorites(userId: string, type?: 'playlist' | 'song'): Favorite[] {
  let result = favorites.filter(f => f.userId === userId);
  if (type) result = result.filter(f => f.type === type);
  return result.sort((a, b) => b.createdAt - a.createdAt);
}

export function isFavorited(userId: string, type: 'playlist' | 'song', targetId: string): boolean {
  return favorites.some(f => f.userId === userId && f.type === type && f.targetId === targetId);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
