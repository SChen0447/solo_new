import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const rooms = new Map();

const questionBank = [
  { id: 'q1', category: 'science', text: '水的化学式是什么？', options: ['H2O', 'CO2', 'O2', 'NaCl'], correctAnswer: 0 },
  { id: 'q2', category: 'science', text: '光速大约是多少公里每秒？', options: ['30万', '15万', '50万', '10万'], correctAnswer: 0 },
  { id: 'q3', category: 'science', text: '人体最大的器官是？', options: ['皮肤', '肝脏', '心脏', '肺'], correctAnswer: 0 },
  { id: 'q4', category: 'science', text: '地球绕太阳一周需要多长时间？', options: ['一年', '一个月', '一周', '一天'], correctAnswer: 0 },
  { id: 'q5', category: 'science', text: 'DNA的中文名称是？', options: ['脱氧核糖核酸', '核糖核酸', '蛋白质', '氨基酸'], correctAnswer: 0 },
  { id: 'q6', category: 'science', text: '世界上最大的哺乳动物是？', options: ['蓝鲸', '大象', '长颈鹿', '河马'], correctAnswer: 0 },
  { id: 'q7', category: 'science', text: '月亮绕地球一周大约需要？', options: ['一个月', '一周', '一天', '一年'], correctAnswer: 0 },
  { id: 'q8', category: 'science', text: '常温下呈液态的金属是？', options: ['汞', '铁', '铜', '铝'], correctAnswer: 0 },
  { id: 'q9', category: 'science', text: '光合作用主要在植物的哪个部位进行？', options: ['叶片', '根部', '茎', '花'], correctAnswer: 0 },
  { id: 'q10', category: 'science', text: '声音在什么介质中传播速度最快？', options: ['固体', '液体', '气体', '真空'], correctAnswer: 0 },
  { id: 'q11', category: 'history', text: '中国的首都是？', options: ['北京', '上海', '广州', '深圳'], correctAnswer: 0 },
  { id: 'q12', category: 'history', text: '中华人民共和国成立于哪一年？', options: ['1949年', '1950年', '1945年', '1937年'], correctAnswer: 0 },
  { id: 'q13', category: 'history', text: '秦始皇统一中国是在公元前哪一年？', options: ['公元前221年', '公元前202年', '公元前256年', '公元前206年'], correctAnswer: 0 },
  { id: 'q14', category: 'history', text: '四大发明不包括以下哪项？', options: ['地动仪', '造纸术', '火药', '印刷术'], correctAnswer: 0 },
  { id: 'q15', category: 'history', text: '第一次世界大战爆发于哪一年？', options: ['1914年', '1918年', '1939年', '1904年'], correctAnswer: 0 },
  { id: 'q16', category: 'history', text: '唐朝的开国皇帝是？', options: ['李渊', '李世民', '李隆基', '李治'], correctAnswer: 0 },
  { id: 'q17', category: 'history', text: '美国第一任总统是？', options: ['华盛顿', '林肯', '罗斯福', '杰斐逊'], correctAnswer: 0 },
  { id: 'q18', category: 'history', text: '丝绸之路的开辟者是？', options: ['张骞', '班超', '郑和', '玄奘'], correctAnswer: 0 },
  { id: 'q19', category: 'history', text: '中国历史上第一个统一的封建王朝是？', options: ['秦朝', '汉朝', '周朝', '商朝'], correctAnswer: 0 },
  { id: 'q20', category: 'history', text: '法国大革命爆发于哪一年？', options: ['1789年', '1776年', '1848年', '1871年'], correctAnswer: 0 },
  { id: 'q21', category: 'literature', text: '《红楼梦》的作者是？', options: ['曹雪芹', '吴承恩', '罗贯中', '施耐庵'], correctAnswer: 0 },
  { id: 'q22', category: 'literature', text: '中国四大名著不包括以下哪部？', options: ['聊斋志异', '西游记', '水浒传', '三国演义'], correctAnswer: 0 },
  { id: 'q23', category: 'literature', text: '莎士比亚是哪个国家的作家？', options: ['英国', '法国', '德国', '意大利'], correctAnswer: 0 },
  { id: 'q24', category: 'literature', text: '《百年孤独》的作者是？', options: ['马尔克斯', '博尔赫斯', '聂鲁达', '略萨'], correctAnswer: 0 },
  { id: 'q25', category: 'literature', text: '鲁迅的原名是？', options: ['周树人', '周作人', '周建人', '周海婴'], correctAnswer: 0 },
  { id: 'q26', category: 'literature', text: '《诗经》是中国最早的诗歌总集，共收录多少篇诗歌？', options: ['305篇', '108篇', '500篇', '72篇'], correctAnswer: 0 },
  { id: 'q27', category: 'literature', text: '唐代诗人李白被称为？', options: ['诗仙', '诗圣', '诗鬼', '诗佛'], correctAnswer: 0 },
  { id: 'q28', category: 'literature', text: '《水浒传》中梁山好汉共有多少位？', options: ['108位', '72位', '36位', '100位'], correctAnswer: 0 },
  { id: 'q29', category: 'literature', text: '《西游记》中孙悟空的武器是？', options: ['金箍棒', '九齿钉耙', '降魔杵', '青龙偃月刀'], correctAnswer: 0 },
  { id: 'q30', category: 'literature', text: '《三国演义》的作者是？', options: ['罗贯中', '施耐庵', '吴承恩', '曹雪芹'], correctAnswer: 0 },
  { id: 'q31', category: 'geography', text: '世界上最高的山峰是？', options: ['珠穆朗玛峰', '乔戈里峰', '干城章嘉峰', '洛子峰'], correctAnswer: 0 },
  { id: 'q32', category: 'geography', text: '世界上最长的河流是？', options: ['尼罗河', '亚马逊河', '长江', '密西西比河'], correctAnswer: 0 },
  { id: 'q33', category: 'geography', text: '中国最大的沙漠是？', options: ['塔克拉玛干沙漠', '古尔班通古特沙漠', '巴丹吉林沙漠', '腾格里沙漠'], correctAnswer: 0 },
  { id: 'q34', category: 'geography', text: '世界上最大的海洋是？', options: ['太平洋', '大西洋', '印度洋', '北冰洋'], correctAnswer: 0 },
  { id: 'q35', category: 'geography', text: '地球的赤道周长约为多少公里？', options: ['4万公里', '2万公里', '8万公里', '1万公里'], correctAnswer: 0 },
  { id: 'q36', category: 'geography', text: '世界上面积最大的国家是？', options: ['俄罗斯', '中国', '美国', '加拿大'], correctAnswer: 0 },
  { id: 'q37', category: 'geography', text: '中国最大的淡水湖是？', options: ['鄱阳湖', '洞庭湖', '太湖', '洪泽湖'], correctAnswer: 0 },
  { id: 'q38', category: 'geography', text: '世界上最深的海沟是？', options: ['马里亚纳海沟', '汤加海沟', '菲律宾海沟', '克马德克海沟'], correctAnswer: 0 },
  { id: 'q39', category: 'geography', text: '中国的母亲河是指？', options: ['黄河', '长江', '珠江', '淮河'], correctAnswer: 0 },
  { id: 'q40', category: 'geography', text: '世界上最大的沙漠是？', options: ['撒哈拉沙漠', '阿拉伯沙漠', '戈壁沙漠', '卡拉哈里沙漠'], correctAnswer: 0 },
  { id: 'q41', category: 'entertainment', text: '奥斯卡金像奖是哪个国家颁发的电影奖项？', options: ['美国', '法国', '意大利', '英国'], correctAnswer: 0 },
  { id: 'q42', category: 'entertainment', text: 'NBA是哪个国家的职业篮球联赛？', options: ['美国', '中国', '欧洲', '澳大利亚'], correctAnswer: 0 },
  { id: 'q43', category: 'entertainment', text: '《哈利波特》系列电影共有几部？', options: ['8部', '7部', '9部', '10部'], correctAnswer: 0 },
  { id: 'q44', category: 'entertainment', text: '世界上最畅销的音乐专辑是？', options: ['Thriller', 'Back in Black', 'The Dark Side of the Moon', 'Whitney Houston'], correctAnswer: 0 },
  { id: 'q45', category: 'entertainment', text: '电影《阿凡达》的导演是？', options: ['詹姆斯·卡梅隆', '斯皮尔伯格', '诺兰', '卢卡斯'], correctAnswer: 0 },
  { id: 'q46', category: 'entertainment', text: '世界杯足球赛每几年举办一次？', options: ['4年', '2年', '3年', '5年'], correctAnswer: 0 },
  { id: 'q47', category: 'entertainment', text: '《猫和老鼠》中的老鼠叫什么名字？', options: ['杰瑞', '汤姆', '米奇', '唐老鸭'], correctAnswer: 0 },
  { id: 'q48', category: 'entertainment', text: '迈克尔·杰克逊被称为？', options: ['流行音乐之王', '摇滚之王', '爵士之王', '灵魂乐之王'], correctAnswer: 0 },
  { id: 'q49', category: 'entertainment', text: '奥林匹克运动会的五环标志不包括哪种颜色？', options: ['紫色', '蓝色', '红色', '绿色'], correctAnswer: 0 },
  { id: 'q50', category: 'entertainment', text: '中国的国粹是指？', options: ['京剧', '武术', '书法', '中医'], correctAnswer: 0 },
  { id: 'q51', category: 'science', text: '空气中含量最多的气体是？', options: ['氮气', '氧气', '二氧化碳', '氩气'], correctAnswer: 0 },
  { id: 'q52', category: 'science', text: '人体有多少对染色体？', options: ['23对', '22对', '24对', '21对'], correctAnswer: 0 },
  { id: 'q53', category: 'history', text: '二战结束于哪一年？', options: ['1945年', '1944年', '1946年', '1943年'], correctAnswer: 0 },
  { id: 'q54', category: 'literature', text: '《活着》的作者是？', options: ['余华', '莫言', '贾平凹', '苏童'], correctAnswer: 0 },
  { id: 'q55', category: 'geography', text: '中国面积最大的省级行政区是？', options: ['新疆', '西藏', '内蒙古', '青海'], correctAnswer: 0 },
];

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function shuffleQuestionOptions(question) {
  const originalCorrect = question.options[question.correctAnswer];
  const shuffledOptions = shuffleArray(question.options);
  const newCorrectIndex = shuffledOptions.indexOf(originalCorrect);
  return {
    ...question,
    options: shuffledOptions,
    correctAnswer: newCorrectIndex
  };
}

function getRandomQuestions(count) {
  const shuffled = shuffleArray(questionBank);
  return shuffled.slice(0, count).map(shuffleQuestionOptions);
}

function calculateScore(isCorrect, rank) {
  if (!isCorrect) return 0;
  let score = 10;
  if (rank === 1) score += 5;
  else if (rank === 2) score += 3;
  else if (rank === 3) score += 1;
  return score;
}

app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map(room => ({
    code: room.code,
    name: room.name,
    playerCount: room.players.length,
    status: room.status,
    creatorNickname: room.players.find(p => p.isCreator)?.nickname || '未知'
  }));
  res.json(roomList);
});

app.post('/api/rooms', (req, res) => {
  const { roomName, nickname, questionCount, timeLimit } = req.body;

  if (!roomName || !nickname) {
    return res.status(400).json({ error: '房间名称和昵称不能为空' });
  }
  if (questionCount < 5 || questionCount > 15) {
    return res.status(400).json({ error: '题目数量必须在5-15之间' });
  }
  if (timeLimit < 10 || timeLimit > 30) {
    return res.status(400).json({ error: '答题时限必须在10-30秒之间' });
  }

  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const playerId = uuidv4();
  const room = {
    code,
    name: roomName,
    creatorId: playerId,
    questionCount,
    timeLimit,
    status: 'waiting',
    currentQuestionIndex: 0,
    questions: [],
    players: [{
      id: playerId,
      nickname,
      score: 0,
      isCreator: true,
      answers: []
    }],
    createdAt: Date.now(),
    questionStartTime: null
  };

  rooms.set(code, room);
  res.json({ room, playerId });
});

app.post('/api/rooms/join', (req, res) => {
  const { roomCode, nickname } = req.body;

  if (!roomCode || !nickname) {
    return res.status(400).json({ error: '房间码和昵称不能为空' });
  }

  const room = rooms.get(roomCode.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  if (room.status !== 'waiting') {
    return res.status(400).json({ error: '游戏已开始，无法加入' });
  }
  if (room.players.some(p => p.nickname === nickname)) {
    return res.status(400).json({ error: '昵称已存在' });
  }

  const playerId = uuidv4();
  room.players.push({
    id: playerId,
    nickname,
    score: 0,
    isCreator: false,
    answers: []
  });

  res.json({ room, playerId });
});

app.post('/api/rooms/start', (req, res) => {
  const { roomCode, playerId } = req.body;

  const room = rooms.get(roomCode.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  if (room.creatorId !== playerId) {
    return res.status(403).json({ error: '只有房主可以开始游戏' });
  }
  if (room.status !== 'waiting') {
    return res.status(400).json({ error: '游戏已开始' });
  }
  if (room.players.length < 1) {
    return res.status(400).json({ error: '至少需要1名玩家' });
  }

  room.questions = getRandomQuestions(room.questionCount);
  room.status = 'playing';
  room.currentQuestionIndex = 0;
  room.questionStartTime = Date.now();
  room.players.forEach(p => {
    p.score = 0;
    p.answers = [];
  });

  res.json({ success: true });
});

app.post('/api/answer', (req, res) => {
  const { roomCode, playerId, questionId, selectedOption } = req.body;

  const room = rooms.get(roomCode.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  if (room.status !== 'playing') {
    return res.status(400).json({ error: '游戏未进行中' });
  }

  const currentQuestion = room.questions[room.currentQuestionIndex];
  if (!currentQuestion || currentQuestion.id !== questionId) {
    return res.status(400).json({ error: '题目已过期' });
  }

  const player = room.players.find(p => p.id === playerId);
  if (!player) {
    return res.status(404).json({ error: '玩家不存在' });
  }

  if (player.answers.some(a => a.questionId === questionId)) {
    return res.status(400).json({ error: '已提交过答案' });
  }

  const timeElapsed = Date.now() - room.questionStartTime;
  if (timeElapsed > room.timeLimit * 1000) {
    return res.status(400).json({ error: '已超时' });
  }

  const submittedAt = Date.now();
  const isCorrect = selectedOption === currentQuestion.correctAnswer;

  const correctAnswersSoFar = room.players
    .flatMap(p => p.answers)
    .filter(a => a.questionId === questionId && a.isCorrect)
    .length;
  const rank = isCorrect ? correctAnswersSoFar + 1 : 0;
  const scoreEarned = calculateScore(isCorrect, rank);

  player.answers.push({
    questionId,
    selectedOption,
    isCorrect,
    submittedAt,
    rank
  });
  player.score += scoreEarned;

  res.json({ success: true, scoreEarned, isCorrect, rank });
});

app.get('/api/rooms/:code', (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }

  let timeRemaining = 0;
  if (room.status === 'playing' && room.questionStartTime) {
    const elapsed = Date.now() - room.questionStartTime;
    timeRemaining = Math.max(0, room.timeLimit * 1000 - elapsed);

    if (timeRemaining === 0) {
      const allAnswered = room.players.every(p => 
        p.answers.some(a => a.questionId === room.questions[room.currentQuestionIndex]?.id)
      );

      if (room.currentQuestionIndex < room.questions.length - 1) {
        if (allAnswered || Date.now() - room.questionStartTime > room.timeLimit * 1000 + 1000) {
          room.currentQuestionIndex++;
          room.questionStartTime = Date.now();
        }
      } else {
        if (allAnswered || Date.now() - room.questionStartTime > room.timeLimit * 1000 + 1000) {
          room.status = 'finished';
        }
      }
    }
  }

  const roomCopy = JSON.parse(JSON.stringify(room));
  roomCopy.players.forEach(p => {
    p.answers.forEach(a => {
      delete a.selectedOption;
    });
  });

  res.json({ room: roomCopy, timeRemaining });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
