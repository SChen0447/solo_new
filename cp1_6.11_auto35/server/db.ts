import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Database, Recipe, User, Ingredient } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile<Database>(file);
const defaultData: Database = { recipes: [], users: [] };
const db = new Low<Database>(adapter, defaultData);

const sampleIngredients = [
  '鸡胸肉', '鸡蛋', '番茄', '土豆', '青椒', '洋葱', '大蒜', '生姜',
  '生抽', '老抽', '料酒', '盐', '糖', '醋', '食用油', '米饭',
  '面条', '豆腐', '白菜', '胡萝卜', '猪肉', '牛肉', '虾仁', '葱花'
];

const sampleRecipes: Recipe[] = [
  {
    id: uuidv4(),
    name: '番茄炒蛋',
    ingredients: [
      { name: '番茄', quantity: '2', unit: '个' },
      { name: '鸡蛋', quantity: '3', unit: '个' },
      { name: '盐', quantity: '1', unit: '茶匙' },
      { name: '糖', quantity: '0.5', unit: '茶匙' },
      { name: '食用油', quantity: '2', unit: '汤匙' }
    ],
    steps: [
      { order: 1, description: '番茄洗净切块，鸡蛋打散备用。' },
      { order: 2, description: '热锅倒油，倒入蛋液炒至结块盛出。' },
      { order: 3, description: '锅中再加少许油，放入番茄翻炒出汁。' },
      { order: 4, description: '加入盐和糖调味，倒入炒好的鸡蛋翻炒均匀即可。' }
    ],
    cookingTime: 15,
    difficulty: 'easy',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tomato%20scrambled%20eggs%20chinese%20dish&image_size=square_hd',
    favorites: 128,
    isFavorite: false,
    userId: 'sample',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: '酸辣土豆丝',
    ingredients: [
      { name: '土豆', quantity: '2', unit: '个' },
      { name: '青椒', quantity: '1', unit: '个' },
      { name: '大蒜', quantity: '3', unit: '瓣' },
      { name: '醋', quantity: '2', unit: '汤匙' },
      { name: '盐', quantity: '1', unit: '茶匙' },
      { name: '食用油', quantity: '2', unit: '汤匙' }
    ],
    steps: [
      { order: 1, description: '土豆去皮切丝，用清水浸泡去淀粉。' },
      { order: 2, description: '青椒切丝，大蒜切末备用。' },
      { order: 3, description: '热锅倒油，爆香蒜末。' },
      { order: 4, description: '放入土豆丝大火快炒，加入醋和盐。' },
      { order: 5, description: '最后加入青椒丝翻炒均匀即可出锅。' }
    ],
    cookingTime: 20,
    difficulty: 'easy',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=spicy%20sour%20shredded%20potato%20chinese%20dish&image_size=square_hd',
    favorites: 95,
    isFavorite: false,
    userId: 'sample',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: '宫保鸡丁',
    ingredients: [
      { name: '鸡胸肉', quantity: '300', unit: '克' },
      { name: '花生', quantity: '50', unit: '克' },
      { name: '干辣椒', quantity: '5', unit: '个' },
      { name: '青椒', quantity: '1', unit: '个' },
      { name: '大蒜', quantity: '3', unit: '瓣' },
      { name: '生抽', quantity: '2', unit: '汤匙' },
      { name: '醋', quantity: '1', unit: '汤匙' },
      { name: '糖', quantity: '1', unit: '茶匙' }
    ],
    steps: [
      { order: 1, description: '鸡胸肉切丁，用生抽、料酒腌制15分钟。' },
      { order: 2, description: '调制料汁：生抽、醋、糖、淀粉和水混合。' },
      { order: 3, description: '热锅倒油，放入干辣椒和蒜末爆香。' },
      { order: 4, description: '放入鸡丁翻炒至变色。' },
      { order: 5, description: '加入青椒丁翻炒，倒入料汁勾芡。' },
      { order: 6, description: '最后加入花生米翻炒均匀即可。' }
    ],
    cookingTime: 30,
    difficulty: 'medium',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=kung%20pao%20chicken%20chinese%20dish&image_size=square_hd',
    favorites: 210,
    isFavorite: false,
    userId: 'sample',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: '红烧肉',
    ingredients: [
      { name: '猪肉', quantity: '500', unit: '克' },
      { name: '冰糖', quantity: '30', unit: '克' },
      { name: '生抽', quantity: '3', unit: '汤匙' },
      { name: '老抽', quantity: '1', unit: '汤匙' },
      { name: '料酒', quantity: '2', unit: '汤匙' },
      { name: '生姜', quantity: '3', unit: '片' },
      { name: '大蒜', quantity: '5', unit: '瓣' }
    ],
    steps: [
      { order: 1, description: '猪肉切块，冷水下锅焯水去血沫。' },
      { order: 2, description: '锅中放少许油，加入冰糖小火炒糖色。' },
      { order: 3, description: '糖色变红棕色时，放入肉块翻炒上色。' },
      { order: 4, description: '加入生抽、老抽、料酒调味。' },
      { order: 5, description: '加入姜片、大蒜和适量热水，大火烧开后转小火炖1小时。' },
      { order: 6, description: '最后大火收汁即可出锅。' }
    ],
    cookingTime: 90,
    difficulty: 'hard',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=braised%20pork%20belly%20chinese%20dish&image_size=square_hd',
    favorites: 320,
    isFavorite: false,
    userId: 'sample',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: '麻婆豆腐',
    ingredients: [
      { name: '豆腐', quantity: '1', unit: '盒' },
      { name: '猪肉', quantity: '100', unit: '克' },
      { name: '豆瓣酱', quantity: '2', unit: '汤匙' },
      { name: '生抽', quantity: '1', unit: '汤匙' },
      { name: '花椒粉', quantity: '0.5', unit: '茶匙' },
      { name: '葱花', quantity: '1', unit: '把' }
    ],
    steps: [
      { order: