import type { FilmCardData, FilterCriteria } from './types';

const FILMS: FilmCardData[] = [
  {
    id: 'film-001',
    title: '公民凯恩',
    titleEn: 'Citizen Kane',
    year: 1941,
    director: '奥逊·威尔斯',
    rating: 9.1,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20film%20poster%20Citizen%20Kane%201941%20vintage%20style%20black%20and%20white%20cinematic&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=citizen%20kane%20rosebud%20sleigh%20snow%20globe%20cinematic%20black%20and%20white%20movie%20scene&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=citizen%20kane%20mansion%20xanadu%20grand%20hall%20dramatic%20lighting%20vintage%20film%20still&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=orson%20welles%20as%20charles%20foster%20kane%20speech%20scene%20cinematic%201940s%20newspaper&image_size=landscape_16_9'
    ],
    synopsis: '一位报业大亨在豪华庄园孤独离世，临终前只留下一句"玫瑰花蕾"。一位记者为揭开这神秘遗言的真相，走访了凯恩生前的亲友与事业伙伴，逐渐拼凑出这位传奇人物波澜壮阔又充满悲剧的一生：从被银行家收养的贫穷孤儿，到掌控全国舆论的报业大王，再到政治梦碎、众叛亲离的晚年。影片以多重叙事结构与创新的电影语言，探讨了权力、财富与爱的本质。',
    cast: ['奥逊·威尔斯', '约瑟夫·科顿', '多萝西·康明戈尔', '阿格妮丝·摩尔海德'],
    genres: ['剧情', '悬疑', '经典']
  },
  {
    id: 'film-002',
    title: '卡萨布兰卡',
    titleEn: 'Casablanca',
    year: 1942,
    director: '迈克尔·柯蒂兹',
    rating: 9.5,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Casablanca%201942%20classic%20movie%20poster%20humphrey%20bogart%20ingrid%20bergman%20vintage%20romance%20film%20noir&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=casablanca%20movie%20bar%20scene%20rick%20cafe%201940s%20morocco%20atmospheric%20smoky%20interior&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=casablanca%20airport%20scene%20foggy%20night%20classic%20farewell%20cinematic%20romantic%20airplane&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=casablanca%20piano%20player%20sam%20play%20it%20again%20vintage%20bar%20scene%20cigarette%20smoke&image_size=landscape_16_9'
    ],
    synopsis: '二战期间，法属摩洛哥城市卡萨布兰卡成为欧洲难民逃往美国的中转站。美国人里克在此经营一家咖啡馆，他意外与昔日恋人伊尔莎重逢。伊尔莎的丈夫是捷克反纳粹领袖拉兹洛，正被盖世太保追捕。面对旧爱重燃与道义抉择，里克必须在个人幸福与自由事业之间做出选择。在动荡的时代背景下，一曲《时光流转》唱尽乱世中被命运捉弄的爱情。',
    cast: ['亨弗莱·鲍嘉', '英格丽·褒曼', '保罗·亨雷德', '克劳德·雷恩斯'],
    genres: ['剧情', '爱情', '战争']
  },
  {
    id: 'film-003',
    title: '罗生门',
    titleEn: 'Rashomon',
    year: 1950,
    director: '黑泽明',
    rating: 9.0,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Rashomon%201950%20Akira%20Kurosawa%20Japanese%20movie%20poster%20samurai%20temple%20gate%20classic%20cinema%20rain&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Rashomon%20temple%20gate%20heavy%20rain%20feudal%20Japan%20cinematic%20black%20and%20white%20wooden%20gate&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=samurai%20duel%20forest%20scene%20dappled%20sunlight%20through%20trees%20kurosawa%20style%20bamboo&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woodcutter%20walking%20through%20bamboo%20forest%20dramatic%20shadows%20japanese%20cinema%20mysterious&image_size=landscape_16_9'
    ],
    synopsis: '十二世纪的日本，一名武士在森林中遇害，围绕这桩案件，樵夫、强盗多襄丸、武士之妻真砂、以及借巫女之口还魂的武士本人，分别给出了四种截然不同的证词。每个人都在叙述中修饰美化自己，真相究竟为何？影片以多重角度探讨人性之复杂性与"客观真相"是否存在，开创了非线性叙事与主观视角的电影先河。',
    cast: ['三船敏郎', '京町子', '森雅之', '志村乔'],
    genres: ['剧情', '悬疑', '犯罪']
  },
  {
    id: 'film-004',
    title: '日落大道',
    titleEn: 'Sunset Boulevard',
    year: 1950,
    director: '比利·怀尔德',
    rating: 9.1,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Sunset%20Boulevard%201950%20Billy%20Wilder%20movie%20poster%20film%20noir%20old%20Hollywood%20mansion%20vintage%20star&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=sunset%20boulevard%20mansion%20pool%20dead%20body%20swimming%20pool%20film%20noir%20scene%20policemen&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=silent%20movie%20star%20Norma%20Desmond%20old%20Hollywood%20mansion%20grand%20staircase%20dramatic%20chandelier&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=All%20right%20Mr%20DeMille%20I%27m%20ready%20for%20my%20close-up%20iconic%20movie%20scene%20cameras%20film%20set&image_size=landscape_16_9'
    ],
    synopsis: '一位穷困潦倒的好莱坞编剧在躲避债主时，偶然闯入了日落大道上一栋阴森的豪宅。宅邸的主人是诺玛·戴斯蒙德——一位早已被观众遗忘的默片时代巨星。她盛邀编剧为她打磨自己创作的剧本，梦想借此重返银幕。在这栋与世隔绝的宅邸中，一段扭曲而致命的关系悄然展开。本片以黑色电影的锐利笔触，描绘了好莱坞造梦工业背后的残酷与虚妄。',
    cast: ['威廉·霍尔登', '格洛丽亚·斯旺森', '埃里克·冯·施特罗海姆', '南希·奥尔森'],
    genres: ['剧情', '黑色电影', '惊悚']
  },
  {
    id: 'film-005',
    title: '东京物语',
    titleEn: 'Tokyo Story',
    year: 1953,
    director: '小津安二郎',
    rating: 9.3,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Tokyo%20Story%201953%20Yasujiro%20Ozu%20Japanese%20movie%20poster%20minimalist%20family%20tale%20serene%20tatami&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=elderly%20japanese%20couple%20sitting%20on%20train%20looking%20out%20window%20nostalgic%201950s%20japan&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=japanese%20family%20dinner%20tatami%20room%20ozu%20style%20low%20angle%20quiet%20intimate%20warm%20light&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Tokyo%20skyline%20Atami%20hot%20springs%20view%201950s%20japan%20peaceful%20afternoon%20ocean%20view&image_size=landscape_16_9'
    ],
    synopsis: '居住在尾道小镇的周吉与富子老夫妇，踏上了前往东京探望已成家立业的子女们的旅途。原以为会是温馨团圆的相聚，却在东京的都市生活节奏与各家的现实压力中，渐渐显露出代际之间无形的隔阂。子女们各有各的忙碌，老人们成为了客气而疏远的"客人"。小津安二郎以克制低徊的镜头，娓娓讲述着每一个家庭都会面对的、关于爱与亏欠的永恒命题。',
    cast: ['笠智众', '原节子', '杉村春子', '东山千荣子'],
    genres: ['剧情', '家庭', '经典']
  },
  {
    id: 'film-006',
    title: '七武士',
    titleEn: 'Seven Samurai',
    year: 1954,
    director: '黑泽明',
    rating: 9.4,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Seven%20Samurai%201954%20Akira%20Kurosawa%20movie%20poster%20epic%20samurai%20warriors%20village%20japan%20battle&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=seven%20samurai%20standing%20in%20rain%20mud%20epic%20battle%20scene%20kurosawa%20cinematic%20black%20white&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=japanese%20village%20rice%20fields%20mountains%20feudal%20japan%20peaceful%20landscape%20morning%20fog&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=samurai%20sword%20duel%20training%20scene%20dramatic%20lighting%20wooden%20swords%20dojo%20practice&image_size=landscape_16_9'
    ],
    synopsis: '战国时代的日本，一群山贼威胁要在秋收后劫掠一个贫困的小山村。村民们走投无路，决定聘请武士保护家园。经过一番艰难寻访，七位性格各异、出身不同的浪人武士集结于此，他们带领村民修筑工事、训练作战，在暴雨泥泞的田野间与数十倍于己方的山贼展开了震撼人心的殊死之战。本片定义了"组队打怪"的叙事模板，是影史最伟大的动作史诗之一。',
    cast: ['三船敏郎', '志村乔', '稻叶义男', '宫口精二', '千秋实'],
    genres: ['动作', '冒险', '剧情']
  },
  {
    id: 'film-007',
    title: '迷魂记',
    titleEn: 'Vertigo',
    year: 1958,
    director: '阿尔弗雷德·希区柯克',
    rating: 9.0,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Vertigo%201958%20Alfred%20Hitchcock%20movie%20poster%20spiral%20staircase%20San%20Francisco%20thriller%20golden%20gate&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vertigo%20spiral%20staircase%20looking%20down%20dizzying%20vertigo%20effect%20dreamlike%20swirl&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=james%20stewart%20kim%20novak%20Golden%20Gate%20Bridge%20San%20Francisco%20bay%20foggy%20romantic%20pier&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mission%20bell%20tower%20california%20mission%20dramatic%20terrace%20scene%20hitchcock%20suspense&image_size=landscape_16_9'
    ],
    synopsis: '患有恐高症的私家侦探斯科蒂受老友之托，跟踪其行为异常的妻子玛德琳。在追踪过程中，斯科蒂被这个神秘女子深深吸引，然而一场高塔坠亡事故却让一切戛然而止。多年后，一位容貌酷似玛德琳的女子朱迪出现在斯科蒂的生活中，他偏执地想将朱迪改造为玛德琳的模样，却在这过程中逐步揭开了令人心碎的真相。',
    cast: ['詹姆斯·斯图尔特', '金·诺瓦克', '芭芭拉·贝尔·戈迪斯', '汤姆·赫尔莫'],
    genres: ['悬疑', '惊悚', '爱情']
  },
  {
    id: 'film-008',
    title: '八部半',
    titleEn: '8½',
    year: 1963,
    director: '费德里科·费里尼',
    rating: 8.9,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=8%20Half%201963%20Fellini%20movie%20poster%20surreal%20director%20film%20set%20circus%20italian%20cinema%20dream&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=fellini%20surreal%20dream%20sequence%20floating%20man%20tied%20with%20ropes%20sky%20surrealism%20clouds&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=film%20set%20movie%20production%20director%20calling%20shots%20vintage%201960s%20cinematic%20cameras&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=spa%20resort%20italy%20steam%20room%20eccentric%20characters%20fellini%20style%20atmospheric%20baths&image_size=landscape_16_9'
    ],
    synopsis: '著名导演圭多正筹备他的第九部电影，却在创作瓶颈与情感危机的双重挤压下陷入了精神混乱。他的新片即将在温泉疗养胜地开机，可他连剧本都未完成；妻子、情妇、旧日缪斯同时出现在疗养地，现实、回忆、梦境与幻想的边界在他脑中逐渐消融。费里尼以意识流的影像诗，讲述了创作者关于自我、艺术与人生的终极困惑。',
    cast: ['马塞洛·马斯楚安尼', '克劳迪娅·卡汀娜', '阿努克·艾梅', '桑德拉·米洛'],
    genres: ['剧情', '奇幻', '经典']
  },
  {
    id: 'film-009',
    title: '奇爱博士',
    titleEn: 'Dr. Strangelove',
    year: 1964,
    director: '斯坦利·库布里克',
    rating: 9.0,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Dr%20Strangelove%201964%20Kubrick%20movie%20poster%20cold%20war%20bomb%20slim%20pickens%20riding%20nuclear%20bomb%20satire&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=war%20room%20round%20table%20big%20board%20map%20military%20generals%20cold%20war%20kubrick%20strategic&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cowboy%20pilot%20riding%20nuclear%20bomb%20falling%20iconic%20dr%20strangelove%20scene%20explosion&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=air%20force%20bomber%20cockpit%20pilots%201950s%20cold%20war%20stylized%20airplane%20interior&image_size=landscape_16_9'
    ],
    synopsis: '冷战最紧张的时刻，一位偏执的美国空军将军擅自下令对苏联发动核打击。白宫作战室中，总统、将领、和奇怪的轮椅核战略家"奇爱博士"紧急磋商对策；而轰炸机编队正穿越苏联领空一步步接近目标。一场由疯子引发的核末日危机，在库布里克的黑色幽默镜头下变得既荒诞又真实，笑声中带着刺骨的寒意。',
    cast: ['彼得·塞勒斯', '乔治·C·斯科特', '斯特林·海登', '斯利姆·皮肯斯'],
    genres: ['喜剧', '战争', '剧情']
  },
  {
    id: 'film-010',
    title: '2001太空漫游',
    titleEn: '2001: A Space Odyssey',
    year: 1968,
    director: '斯坦利·库布里克',
    rating: 9.1,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=2001%20A%20Space%20Odyssey%201968%20Kubrick%20movie%20poster%20monolith%20space%20station%20epic%20sci%20fi%20jupiter&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=black%20monolith%20moon%20surface%20craters%20astronauts%20standing%20before%20it%20mysterious%20lunar&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=space%20station%20v%20orbiting%20earth%20pan%20am%20space%20clipper%20docking%20rotation%20cinematic%20orbit&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=discovery%20spacecraft%20jupiter%20mission%20hal%209000%20red%20eye%20astronaut%20spacesuit%20pod&image_size=landscape_16_9'
    ],
    synopsis: '四百万年前，一块神秘的黑色石板出现在非洲大草原上，启发了猿人学会使用工具。2001年，同样的石板在月球被发现，并向木星发出了神秘信号。人类派遣"发现号"飞船前往木星一探究竟，飞船上只有两名清醒的宇航员和一台拥有自我意识的超级计算机HAL 9000。在冰冷浩瀚的宇宙中，人类与自己创造的人工智能展开了关于生存与进化的终极博弈。',
    cast: ['凯尔·杜拉', '加里·洛克伍德', '威廉姆·西尔维斯特', '道格拉斯·雷恩（配音）'],
    genres: ['科幻', '冒险', '剧情']
  },
  {
    id: 'film-011',
    title: '教父',
    titleEn: 'The Godfather',
    year: 1972,
    director: '弗朗西斯·福特·科波拉',
    rating: 9.5,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=The%20Godfather%201972%20Coppola%20movie%20poster%20don%20vito%20corleone%20cat%20marriage%20scene%20mafia%20dark&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=don%20vito%20corleone%20office%20desk%20dim%20light%20cat%20on%20lap%201940s%20mafia%20boss%20study&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=corleone%20family%20wedding%20reception%20garden%20party%201940s%20italian%20american%20celebration%20dress&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=restaurant%20murder%20scene%20michael%20corleone%20gun%20hidden%20behind%20toilet%20tension%20dark&image_size=landscape_16_9'
    ],
    synopsis: '1945年夏，纽约黑手党柯里昂家族教父维托·柯里昂在女儿的婚礼上听取请求。拒绝合作贩毒生意后，维托遭仇家暗算身受重伤，家族陷入危机。原本对家族事务毫无兴趣的小儿子迈克尔，为保护家人一步步走向暴力与权力的深渊。影片以史诗般的格局，讲述了一个关于家族、忠诚与权力腐蚀人性的黑暗传奇。',
    cast: ['马龙·白兰度', '阿尔·帕西诺', '詹姆斯·肯恩', '罗伯特·杜瓦尔'],
    genres: ['剧情', '犯罪', '经典']
  },
  {
    id: 'film-012',
    title: '出租车司机',
    titleEn: 'Taxi Driver',
    year: 1976,
    director: '马丁·斯科塞斯',
    rating: 8.8,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Taxi%20Driver%201976%20Scorsese%20movie%20poster%20robert%20de%20niro%20yellow%20cab%20neon%20streets%20new%20york%20gritty&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=yellow%20taxi%20cab%20neon%20streets%201970s%20new%20york%20city%20rain%20reflections%20gritty%20night&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=travis%20bickle%20mirror%20scene%20You%20talkin%20to%20me%20gun%20pistol%20dark%20apartment%20tension&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=campaign%20rally%20candidate%20appearance%201970s%20new%20york%20palantine%20tension%20crowd&image_size=landscape_16_9'
    ],
    synopsis: '越战后的纽约，退伍军人特拉维斯·比克尔成为了一名夜班出租车司机。他在这个城市的霓虹与污秽中穿行，孤独、失眠、对周遭的堕落深感厌恶。他迷恋上了一位漂亮的竞选助手贝茜，却因自己的格格不入遭到拒绝；又偶遇了未成年妓女艾瑞斯，产生了要将她拯救出火坑的执念。在逐渐失控的精神世界里，一场血腥的"清洗"正在酝酿。',
    cast: ['罗伯特·德尼罗', '朱迪·福斯特', '斯碧尔·谢波德', '哈维·凯特尔'],
    genres: ['剧情', '犯罪', '惊悚']
  },
  {
    id: 'film-013',
    title: '星球大战',
    titleEn: 'Star Wars',
    year: 1977,
    director: '乔治·卢卡斯',
    rating: 8.8,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Star%20Wars%201977%20George%20Lucas%20movie%20poster%20millennium%20falcon%20death%20star%20lightsaber%20space%20opera&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=death%20star%20trench%20run%20x%20wing%20fighters%20space%20battle%20star%20wars%20epic%20laser%20fire&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mos%20eisley%20cantina%20bar%20scene%20alien%20creatures%20band%20playing%20tatooine%20hutt%20spaceport&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=millennium%20falcon%20cockpit%20han%20solo%20chewbacca%20princess%20leia%20luke%20skywalker%20space&image_size=landscape_16_9'
    ],
    synopsis: '很久很久以前，在一个遥远的星系……邪恶的银河帝国建造了足以摧毁整个星球的终极武器"死星"。反抗军在莱娅公主的带领下窃取了死星蓝图，却在逃亡途中被帝国截获。农场少年卢克·天行者意外卷入这场风暴，在绝地武士欧比旺、走私船长汉·索罗和伍基族战士楚巴卡的帮助下，踏上了营救公主、拯救银河系的冒险旅程。',
    cast: ['马克·哈米尔', '哈里森·福特', '凯丽·费雪', '亚利克·基尼斯'],
    genres: ['科幻', '动作', '冒险']
  },
  {
    id: 'film-014',
    title: '闪灵',
    titleEn: 'The Shining',
    year: 1980,
    director: '斯坦利·库布里克',
    rating: 8.9,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=The%20Shining%201980%20Kubrick%20movie%20poster%20overlook%20hotel%20jack%20nicholson%20horror%20twins%20axe&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=overlook%20hotel%20lobby%20grand%20empty%20ballroom%201920s%20ghost%20bartender%20haunted%20red&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=blood%20elevator%20scene%20flood%20of%20red%20liquid%20hallway%20twins%20dress%20horror%20creepy&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hedge%20maze%20snow%20winter%20overlook%20hotel%20night%20chase%20scene%20terrifying%20moonlight&image_size=landscape_16_9'
    ],
    synopsis: '作家杰克·托伦斯带着妻儿来到科罗拉多州深山中的眺望酒店担任冬季管理员。整座酒店在暴风雪中与世隔绝，杰克的儿子丹尼拥有一种名为"闪灵"的灵异能力，他不断看到酒店中发生的恐怖幻象。杰克本人也在孤独与酒店黑暗历史的侵蚀下逐渐精神崩溃，从一个慈父变成了举着斧头追砍妻儿的疯狂恶魔。',
    cast: ['杰克·尼科尔森', '谢莉·杜瓦尔', '丹尼·劳埃德', '斯加特曼·克罗索斯'],
    genres: ['恐怖', '悬疑', '惊悚']
  },
  {
    id: 'film-015',
    title: '银翼杀手',
    titleEn: 'Blade Runner',
    year: 1982,
    director: '雷德利·斯科特',
    rating: 8.7,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Blade%20Runner%201982%20Ridley%20Scott%20movie%20poster%20neon%20cyberpunk%20los%20angeles%202019%20replicant%20rain&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=los%20angeles%202019%20cyberpunk%20neon%20skyline%20flying%20cars%20spinners%20billboards%20rain%20night&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tyrell%20corp%20pyramid%20building%20futuristic%20dark%20monumental%20corporate%20headquarters%20night&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tears%20in%20rain%20monologue%20rooftop%20scene%20rainy%20night%20dove%20replicant%20dying%20dramatic&image_size=landscape_16_9'
    ],
    synopsis: '2019年的洛杉矶，阴雨连绵，霓虹闪烁。泰瑞尔公司生产的复制人在殖民地发动叛乱，四名非法返回地球的复制人正被追杀。退休警探里克·德卡德被召回重操旧业，成为一名"银翼杀手"去"退役"这些复制人。在追查过程中，他遇见了美丽的复制人瑞秋，并逐渐爱上了她，也开始质疑人类与复制人之间究竟是否存在本质的区别。',
    cast: ['哈里森·福特', '鲁特格尔·哈尔', '肖恩·杨', '达丽尔·汉纳'],
    genres: ['科幻', '剧情', '惊悚']
  },
  {
    id: 'film-016',
    title: '霸王别姬',
    titleEn: 'Farewell My Concubine',
    year: 1993,
    director: '陈凯歌',
    rating: 9.6,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Farewell%20My%20Concubine%201993%20Chen%20Kaige%20movie%20poster%20peking%20opera%20leslie%20cheung%20opera%20makeup%20red&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=peking%20opera%20backstage%20makeup%20room%20opera%20costumes%20red%20gold%20atmospheric%20backstage%20mirrors&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=opera%20stage%20performance%20overlord%20and%20concubine%20sword%20scene%20dramatic%20lighting%20curtains&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beijing%20hutong%20street%20opera%20school%201920s%20traditional%20china%20training%20kids%20practice&image_size=landscape_16_9'
    ],
    synopsis: '1924年冬天，北京的关家戏班收留了妓女艳红送来的儿子小豆子。小豆子与大师兄小石头在严苛的戏班训练中相互扶持，一个唱旦角一个唱生角，一出《霸王别姬》唱红了整个北京城——小石头更名段小楼，小豆子更名程蝶衣。然而在动荡的半个世纪里，从民国到抗战、从解放到文革，两人与菊仙之间的情感纠葛与身份认同，在"戏如人生、人生如戏"的舞台上，终于在"从一而终"的信念中走向凄美的结局。',
    cast: ['张国荣', '张丰毅', '巩俐', '葛优', '英达'],
    genres: ['剧情', '爱情', '历史']
  },
  {
    id: 'film-017',
    title: '肖申克的救赎',
    titleEn: 'The Shawshank Redemption',
    year: 1994,
    director: '弗兰克·德拉邦特',
    rating: 9.7,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Shawshank%20Redemption%201994%20Darabont%20movie%20poster%20prison%20escape%20rain%20arms%20outstretched%20hope%20freedom&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=shawshank%20prison%20yard%20exercise%20inmates%20walking%20stone%20walls%20guard%20towers%20sunny%20day&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=prison%20escape%20rain%20storm%20arms%20outstretched%20freedom%20and%20redemption%20dramatic%20lightning&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=prison%20library%20roof%20tar%20scene%20inmates%20drinking%20beer%20sunset%20hope%20friendship&image_size=landscape_16_9'
    ],
    synopsis: '青年银行家安迪因被指控枪杀妻子及其情夫而入狱，在肖申克监狱中被判终身监禁。在这座充满暴力与腐败的监狱里，安迪结识了黑人囚犯瑞德，两人结下深厚的友谊。安迪利用自己的金融知识为监狱长洗钱，同时用一把小小的石锤，在二十年的漫长岁月里，默默挖掘着一条通往自由的隧道。"希望是个好东西，也许是最好的东西，好东西永远不会消逝。"',
    cast: ['蒂姆·罗宾斯', '摩根·弗里曼', '鲍勃·冈顿', '威廉·赛德勒'],
    genres: ['剧情', '犯罪', '经典']
  },
  {
    id: 'film-018',
    title: '低俗小说',
    titleEn: 'Pulp Fiction',
    year: 1994,
    director: '昆汀·塔伦蒂诺',
    rating: 9.0,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Pulp%20Fiction%201994%20Tarantino%20movie%20poster%20uma%20thurman%20travolta%20jackson%20retro%20pulp%20magazine&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=twist%20dance%20scene%20jackrabbit%20slims%20restaurant%20vincent%20vega%20mia%20wallace%20iconic%20dance%20floor&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=diner%20hold%20up%20scene%20honey%20bunny%20pumpkin%20robbery%20pulp%20fiction%20tension%20gun&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=briefcase%20golden%20glow%20mysterious%20combo%20666%20hitmen%20looking%20inside%20suit%20tie&image_size=landscape_16_9'
    ],
    synopsis: '三个相互纠缠的故事在洛杉矶的黑色幽默中展开：杀手文森特和朱尔斯奉命取回一个神秘的手提箱；文森特陪老大的妻子米娅共度一夜差点惹出大祸；拳击手布奇收了钱要打假拳却反水跑路，最终却与追杀他的文森特一同被困在一家最变态的小店里……昆汀以环形叙事结构、密集的话痨对白和突如其来的暴力，重新定义了90年代独立电影的美学。',
    cast: ['约翰·特拉沃尔塔', '塞缪尔·L·杰克逊', '乌玛·瑟曼', '布鲁斯·威利斯'],
    genres: ['剧情', '犯罪', '喜剧']
  },
  {
    id: 'film-019',
    title: '阿甘正传',
    titleEn: 'Forrest Gump',
    year: 1994,
    director: '罗伯特·泽米吉斯',
    rating: 9.5,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Forrest%20Gump%201994%20Zemeckis%20movie%20poster%20feather%20bench%20tom%20hanks%20running%20america%20chocolates&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=greenbow%20alabama%20bus%20stop%20bench%20white%20feather%20floating%20suitcase%20chocolates%20sunset&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vietnam%20war%20jungle%20napalm%20sky%20bubba%20gump%20military%20helmet%20dramatic%20explosion&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=run%20forrest%20run%20country%20road%20alabama%20sunset%20inspirational%20iconic%20running%20legs&image_size=landscape_16_9'
    ],
    synopsis: '"人生就像一盒巧克力，你永远不知道下一颗是什么味道。"智商只有75的阿甘，从小腿上戴着矫正支架，却在母亲"傻人有傻福"的教诲下，用自己简单纯粹的方式穿越了美国战后几十年的历史：他跑进了大学橄榄球队，在越南战场上立功，在乒乓球外交中代表美国访问中国，因捕虾成为百万富翁，甚至横穿美国跑了三年。而他心中最牵挂的，始终是青梅竹马的珍妮。',
    cast: ['汤姆·汉克斯', '罗宾·怀特', '加里·西尼斯', '萨莉·菲尔德'],
    genres: ['剧情', '爱情', '经典']
  },
  {
    id: 'film-020',
    title: '悲情城市',
    titleEn: 'A City of Sadness',
    year: 1989,
    director: '侯孝贤',
    rating: 8.9,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=City%20of%20Sadness%201989%20Hou%20Hsiao%20hsien%20Taiwanese%20movie%20poster%201940s%20Keelung%20harbor%20mountain%20village&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Taiwan%201940s%20Keelung%20harbor%20steam%20train%20mountain%20village%20misty%20hou%20hsiao%20hsien%20style&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Taiwanese%20family%20dinner%20traditional%20house%20wooden%20interior%20warm%20light%20gathering%20lanterns&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mountain%20village%20tea%20plantation%20mist%20morning%20light%20Taiwan%20countryside%20serene%20fog&image_size=landscape_16_9'
    ],
    synopsis: '1945年日本投降，台湾脱离五十年殖民统治回归祖国，然而迎接台湾人民的并非想象中的光明。基隆林家四兄弟，老大文雄经营酒楼，老二文禄在战争中失踪，老三文良从南洋归来却精神失常，老四文清是聋哑人，在九份山区经营照相馆。在政权更迭的动荡年代里，一个平凡家庭的命运被裹挟在二二八事件、白色恐怖的历史洪流中，悲欢离合令人唏嘘。',
    cast: ['梁朝伟', '陈松勇', '李天禄', '高捷', '蔡振南'],
    genres: ['剧情', '历史', '家庭']
  },
  {
    id: 'film-021',
    title: '泰坦尼克号',
    titleEn: 'Titanic',
    year: 1997,
    director: '詹姆斯·卡梅隆',
    rating: 9.4,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Titanic%201997%20James%20Cameron%20movie%20poster%20ship%20ocean%20leonardo%20dicaprio%20kate%20winslet%20romantic%20sunset&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=titanic%20ship%20bow%20scene%20im%20king%20of%20the%20world%20sunset%20ocean%20romantic%20jack%20rose&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=grand%20staircase%20titanic%20interior%20luxurious%20first%20class%20chandelier%20elegant%20vintage&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=titanic%20sinking%20iceberg%20night%20ocean%20lifeboats%20dramatic%20disaster%20cold%20water&image_size=landscape_16_9'
    ],
    synopsis: '1912年，号称"永不沉没"的豪华邮轮泰坦尼克号从英国南安普顿启程驶往美国纽约。在上流社会的订婚宴上倍感窒息的贵族少女露丝，在船尾偶遇了不羁的流浪画家杰克，两人在短短几天的航程中跨越阶级鸿沟深深相爱。然而当邮轮撞上冰山开始沉没，在生与死的考验面前，杰克用生命践行了对露丝的爱与承诺。一段在冰冷大西洋上永存的爱情传奇。',
    cast: ['莱昂纳多·迪卡普里奥', '凯特·温斯莱特', '比利·赞恩', '凯西·贝茨'],
    genres: ['爱情', '剧情', '灾难']
  },
  {
    id: 'film-022',
    title: '千与千寻',
    titleEn: 'Spirited Away',
    year: 2001,
    director: '宫崎骏',
    rating: 9.4,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Spirited%20Away%202001%20Studio%20Ghibli%20movie%20poster%20chihiro%20no%20face%20bathhouse%20spirits%20magical%20fantasy%20anime&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=spirited%20away%20bathhouse%20night%20scene%20lanterns%20spirits%20no%20face%20magical%20japanese%20onsen&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chihiro%20train%20ride%20water%20ocean%20sea%20railway%20sunset%20studio%20ghibli%20dreamlike%20peaceful&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=haku%20dragon%20flying%20sky%20clouds%20chihiro%20riding%20fantasy%20magical%20creature%20studio%20ghibli&image_size=landscape_16_9'
    ],
    synopsis: '10岁的千寻随父母搬家途中，误入了一个神秘的小镇。她的父母因贪吃变成了猪，而千寻则必须在掌管这座小镇的汤婆婆的澡堂里工作，才能寻找拯救父母、回到现实世界的方法。在这个充满奇异妖怪与魔法的世界里，千寻结识了神秘的白龙少年、善良的锅炉爷爷和无脸男，她在一次次冒险中学会了勇敢与坚强，也逐渐明白了"名字"与"自我"的真正意义。',
    cast: ['柊瑠美', '入野自由', '夏木真理', '菅原文太'],
    genres: ['动画', '奇幻', '冒险']
  },
  {
    id: 'film-023',
    title: '无间道',
    titleEn: 'Infernal Affairs',
    year: 2002,
    director: '刘伟强',
    rating: 9.3,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Infernal%20Affairs%202002%20Hong%20Kong%20movie%20poster%20undercover%20cop%20gangster%20thriller%20dark%20city%20night&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hong%20kong%20city%20night%20rooftop%20scene%20two%20men%20facing%20each%20other%20tension%20gun%20dark&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=undercover%20police%20station%20meeting%20briefing%20dark%20room%20files%20thriller%20mood%20flashlight&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=elevator%20scene%20shooting%20blood%20tension%20infernal%20affairs%20climax%20dark%20hallway&image_size=landscape_16_9'
    ],
    synopsis: '刘建明是黑社会老大韩琛安插在警队的卧底，陈永仁则是警方派入黑社会的卧底。两人在各自的阵营中步步为营，承受着身份错位的巨大精神压力。在一次毒品交易的抓捕行动中，双方都意识到了对方的存在，一场暗中角力的"清内鬼"博弈随即展开。"对不起，我是警察。""谁知道？"——在无间地狱中挣扎的两人，最终迎来了令人扼腕的宿命结局。',
    cast: ['梁朝伟', '刘德华', '黄秋生', '曾志伟', '陈慧琳'],
    genres: ['犯罪', '剧情', '惊悚']
  },
  {
    id: 'film-024',
    title: '老男孩',
    titleEn: 'Oldboy',
    year: 2003,
    director: '朴赞郁',
    rating: 8.6,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Oldboy%202003%20Park%20Chan%20wook%20Korean%20movie%20poster%20hammer%20revenge%20dark%20thriller%20prison%20room&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=oldboy%20hammer%20hallway%20fight%20scene%20one%20take%20long%20shot%20action%20thriller%20dark%20corridor&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=prison%20cell%20room%20tv%20dumplings%20man%20trapped%2015%20years%20solitary%20confinement%20dark&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dumpling%20restaurant%20sushi%20chef%20girl%20dark%20atmosphere%20korean%20thriller%20mysterious&image_size=landscape_16_9'
    ],
    synopsis: '吴大修在一个下雨的夜晚被人绑架，醒来发现自己被关在一间只有电视机和每日送来的煎饺的密室里。十五年的囚禁生涯将他逼至疯狂的边缘，他在墙上挖洞、练习拳击，只为有朝一日复仇。终于有一天他被神秘释放，并获得了五天的时间找出真相。在寿司店女孩美道的帮助下，他一步步接近真相，却不知道等待他的是一个比十五年囚禁更令人崩溃的残酷秘密。',
    cast: ['崔岷植', '刘智泰', '姜惠贞', '金秉玉'],
    genres: ['惊悚', '剧情', '动作']
  },
  {
    id: 'film-025',
    title: '盗梦空间',
    titleEn: 'Inception',
    year: 2010,
    director: '克里斯托弗·诺兰',
    rating: 9.3,
    posterUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Inception%202010%20Nolan%20movie%20poster%20folding%20city%20dreams%20leonardo%20dicaprio%20sci%20fi%20thriller%20top&image_size=portrait_4_3',
    stills: [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=paris%20street%20folding%20city%20bending%20reality%20dream%20world%20inception%20gravity%20defying%20architecture&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zero%20gravity%20hotel%20hallway%20fight%20scene%20rotating%20room%20action%20thriller%20dramatic&image_size=landscape_16_9',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=spinning%20top%20totem%20table%20close%20up%20inception%20ending%20ambiguous%20dream%20or%20reality&image_size=landscape_16_9'
    ],
    synopsis: '道姆·柯布是一位经验老道的"盗梦者"，能够潜入他人梦境窃取机密。为了回到自己的孩子身边，他接受了一项几乎不可能的任务——不是盗取，而是"植入意念"。柯布组建了一支精英团队，在目标人物的四层梦境中层层深入，然而他内心深处对亡妻茉儿的执念却成为了行动最大的隐患。当梦境与现实的边界逐渐模糊，柯布能否完成任务并找到回家的路？',
    cast: ['莱昂纳多·迪卡普里奥', '约瑟夫·高登-莱维特', '艾伦·佩吉', '汤姆·哈迪', '渡边谦'],
    genres: ['科幻', '动作', '悬疑']
  }
];

export class FilmDataProvider {
  private films: FilmCardData[] = FILMS;

  getAllFilms(): FilmCardData[] {
    return [...this.films];
  }

  getFilmById(id: string): FilmCardData | undefined {
    return this.films.find(f => f.id === id);
  }

  getDirectors(): string[] {
    const directors = new Set(this.films.map(f => f.director));
    return Array.from(directors).sort();
  }

  getGenres(): string[] {
    const genres = new Set<string>();
    this.films.forEach(f => f.genres.forEach(g => genres.add(g)));
    return Array.from(genres).sort();
  }

  getRatingRange(): { min: number; max: number } {
    const ratings = this.films.map(f => f.rating);
    return {
      min: Math.floor(Math.min(...ratings)),
      max: Math.ceil(Math.max(...ratings))
    };
  }

  filterBy(criteria: FilterCriteria): FilmCardData[] {
    return this.films.filter(film => {
      if (criteria.director && film.director !== criteria.director) {
        return false;
      }
      if (criteria.genres && criteria.genres.length > 0) {
        const hasGenre = criteria.genres.some(g => film.genres.includes(g));
        if (!hasGenre) return false;
      }
      if (film.rating < criteria.ratingMin || film.rating > criteria.ratingMax) {
        return false;
      }
      return true;
    }).sort((a, b) => a.year - b.year);
  }
}

export const filmDataProvider = new FilmDataProvider();
