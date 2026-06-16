export interface Artwork {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
  createdAt: string;
  likes: number;
}

export interface Comment {
  id: string;
  artworkId: string;
  username: string;
  content: string;
  avatarColor: string;
  createdAt: string;
}

const imagePrompts = [
  "serene mountain landscape at golden hour, professional photography",
  "abstract digital art with vibrant neon colors, futuristic",
  "minimal UI design dashboard dark mode, clean interface",
  "urban street photography night city lights, moody",
  "watercolor painting of cherry blossoms, delicate",
  "geometric pattern design monochrome, modern art",
  "portrait photography dramatic lighting, black and white",
  "3D render of crystal formation, iridescent",
  "vintage film photography autumn forest, warm tones",
  "flat illustration of coffee shop interior, cozy",
  "macro photography of morning dew on petals, nature",
  "cyberpunk cityscape with rain reflections, neon",
  "oil painting of ocean waves crashing, dramatic",
  "infographic design data visualization, clean modern",
  "aerial photography of winding river, topography",
  "digital matte painting of ancient temple, fantasy",
  "product photography of luxury watch, studio lighting",
  "surrealist digital collage dreamlike, artistic",
  "architectural photography modern building glass, minimal",
  "botanical illustration vintage style, scientific",
  "concept art of spaceship interior, sci-fi",
  "fashion photography editorial style, high contrast",
  "pixel art retro game scene, nostalgic",
  "impasto painting of sunflower field, textured",
  "double exposure photography portrait nature, creative",
  "isometric illustration of tiny city, cute detailed",
  "astrophotography milky way night sky, stars",
  "typographic poster design bold, graphic design",
  "underwater photography coral reef, vibrant marine",
  "mixed media art collage textured, experimental",
  "low poly 3D landscape pastel colors, geometric",
  "street art graffiti urban wall, colorful",
  "documentary photography everyday life, candid",
  "art nouveau illustration flowing lines, ornamental",
  "drone photography of autumn vineyard, aerial"
];

function generateImageUrl(index: number): string {
  const prompt = encodeURIComponent(imagePrompts[index % imagePrompts.length]);
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${prompt}&image_size=landscape_16_9`;
}

const tagPool = ['摄影', '插画', 'UI设计', '3D渲染', '概念艺术', '平面设计', '数字艺术', '建筑', '时尚', '纪实'];

const titles = [
  '晨光山影', '霓虹幻境', '暗夜都市', '花语清韵', '几何秩序',
  '光影对话', '水晶折射', '秋叶私语', '咖啡时光', '微观世界',
  '赛博迷途', '海浪低吟', '数据之美', '苍穹俯瞰', '古寺晨钟',
  '奢品之韵', '梦境编织', '玻璃之城', '星辰大海', '文字力量',
  '海底花园', '纹理叠加', '像素回忆', '向日之约', '双重曝光',
  '微缩都市', '银河倒影', '街头涂鸦', '生活剪影', '流动之美',
  '低多边形', '葡萄园秋', '珊瑚秘境', '新艺术流', '极简之道',
  '未来之舱', '时装叙事', '黄昏漫步', '抽象构成', '彩虹彼岸'
];

const descriptions = [
  '在光影交织的瞬间捕捉自然的诗意，每一帧都是对美的永恒追寻。',
  '数字世界的无限可能，在像素与算法之间寻找灵魂的共鸣。',
  '城市是永不停歇的剧场，每个转角都藏着未被讲述的故事。',
  '传统技法与当代审美的碰撞，在画布上重新定义经典。',
  '极简不是减少，而是提炼——在留白中发现最纯粹的力量。',
  '色彩是情感的密码，每一抹色调都在诉说无声的语言。',
  '在微距镜头下，一滴水珠也能折射出整个宇宙的壮美。',
  '未来已来，只是尚未均匀分布——在设计中预演明天的模样。',
  '线条是最古老的叙事方式，一笔一画都是思想的痕迹。',
  '光与影的辩证法：没有暗就没有亮，没有虚就没有实。'
];

const usernames = ['创意猎手', '光影漫步', '像素诗人', '设计浪客', '色彩拾荒', '镜头拾光', '艺术潜水', '灵感捕手'];
const avatarColors = ['#ff6b81', '#70a1ff', '#ffc312', '#c4e538', '#a29bfe', '#fd79a8', '#00cec9', '#e17055'];

export const artworks: Artwork[] = Array.from({ length: 36 }, (_, i) => ({
  id: `artwork-${i + 1}`,
  title: titles[i % titles.length],
  description: descriptions[i % descriptions.length],
  imageUrl: generateImageUrl(i),
  tags: [tagPool[i % tagPool.length], tagPool[(i + 3) % tagPool.length]],
  createdAt: new Date(Date.now() - (36 - i) * 2 * 24 * 60 * 60 * 1000).toISOString(),
  likes: Math.floor(Math.random() * 200) + 10,
}));

export const initialComments: Record<string, Comment[]> = Object.fromEntries(
  artworks.slice(0, 12).map((art, idx) => [
    art.id,
    Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => ({
      id: `comment-${idx}-${j}`,
      artworkId: art.id,
      username: usernames[Math.floor(Math.random() * usernames.length)],
      content: ['太棒了！这个构图真的很美', '色彩搭配绝了，学到了', '请问这是什么风格？很喜欢！', '光影效果太赞了 👍', '这个角度选得真好'][j % 5],
      avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
      createdAt: new Date(Date.now() - (j + 1) * 3 * 60 * 60 * 1000).toISOString(),
    }))
  ])
);

export const allTags = tagPool;

export { avatarColors, usernames };
