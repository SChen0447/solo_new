export interface RootInfo {
  root: string;
  meaning: string;
  origin: string;
  originLanguage: 'Latin' | 'Greek' | 'Old English' | 'French' | 'Germanic' | 'Latin/Greek';
}

export type PartType = 'prefix' | 'root' | 'suffix' | 'connector';

export interface WordPart {
  text: string;
  type: PartType;
  rootInfo?: RootInfo;
}

export interface WordBreakdown {
  parts: WordPart[];
  etymology: string;
}

export interface WordData {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaning: string;
  breakdown: WordBreakdown;
}

const COMMON_PREFIXES: Array<{ pattern: RegExp; text: string; info: RootInfo; minLenAfter: number }> = [
  { pattern: /^un/, text: 'un', info: { root: 'un', meaning: '不，非，相反', origin: 'un- (not, opposite)', originLanguage: 'Old English' }, minLenAfter: 2 },
  { pattern: /^re/, text: 're', info: { root: 're', meaning: '再次，返回，向后', origin: 're- (again, back)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^pre/, text: 'pre', info: { root: 'pre', meaning: '在...之前，预先', origin: 'prae (before)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^dis/, text: 'dis', info: { root: 'dis', meaning: '分离，不，相反', origin: 'dis- (apart, not)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^mis/, text: 'mis', info: { root: 'mis', meaning: '错误的，坏的', origin: 'mis- (wrong, bad)', originLanguage: 'Old English' }, minLenAfter: 2 },
  { pattern: /^sub/, text: 'sub', info: { root: 'sub', meaning: '在...下面，次于', origin: 'sub (under)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^super/, text: 'super', info: { root: 'super', meaning: '超级，在...之上', origin: 'super (above)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^inter/, text: 'inter', info: { root: 'inter', meaning: '在...之间，相互', origin: 'inter (between)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^trans/, text: 'trans', info: { root: 'trans', meaning: '穿过，跨越，转变', origin: 'trans (across)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^anti/, text: 'anti', info: { root: 'anti', meaning: '反对，对抗', origin: 'anti (against)', originLanguage: 'Greek' }, minLenAfter: 2 },
  { pattern: /^auto/, text: 'auto', info: { root: 'auto', meaning: '自己，自动', origin: 'autos (self)', originLanguage: 'Greek' }, minLenAfter: 2 },
  { pattern: /^tele/, text: 'tele', info: { root: 'tele', meaning: '远，远距离', origin: 'tele (far off)', originLanguage: 'Greek' }, minLenAfter: 2 },
  { pattern: /^ex/, text: 'ex', info: { root: 'ex', meaning: '出，外，前任', origin: 'ex- (out of)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^de/, text: 'de', info: { root: 'de', meaning: '向下，去除，完全', origin: 'de- (down, off)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^over/, text: 'over', info: { root: 'over', meaning: '过度，在...上', origin: 'ofer (over)', originLanguage: 'Old English' }, minLenAfter: 2 },
  { pattern: /^under/, text: 'under', info: { root: 'under', meaning: '在下，不足', origin: 'under (under)', originLanguage: 'Old English' }, minLenAfter: 2 },
  { pattern: /^out/, text: 'out', info: { root: 'out', meaning: '出，超过', origin: 'ut (out)', originLanguage: 'Old English' }, minLenAfter: 2 },
  { pattern: /^bi/, text: 'bi', info: { root: 'bi', meaning: '二，双', origin: 'bis (twice)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^tri/, text: 'tri', info: { root: 'tri', meaning: '三', origin: 'treis (three)', originLanguage: 'Latin/Greek' }, minLenAfter: 2 },
  { pattern: /^multi/, text: 'multi', info: { root: 'multi', meaning: '多', origin: 'multus (many)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^semi/, text: 'semi', info: { root: 'semi', meaning: '半，部分', origin: 'semi (half)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^micro/, text: 'micro', info: { root: 'micro', meaning: '微小', origin: 'mikros (small)', originLanguage: 'Greek' }, minLenAfter: 2 },
  { pattern: /^macro/, text: 'macro', info: { root: 'macro', meaning: '大，宏观', origin: 'makros (large)', originLanguage: 'Greek' }, minLenAfter: 2 },
  { pattern: /^poly/, text: 'poly', info: { root: 'poly', meaning: '多', origin: 'polys (many)', originLanguage: 'Greek' }, minLenAfter: 2 },
  { pattern: /^mono/, text: 'mono', info: { root: 'mono', meaning: '单一', origin: 'monos (single)', originLanguage: 'Greek' }, minLenAfter: 2 },
  { pattern: /^im(?=[pbm])/, text: 'im', info: { root: 'in/im', meaning: '不，无/进入', origin: 'in- (in, not)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^il(?=[l])/, text: 'il', info: { root: 'in/im', meaning: '不，无', origin: 'in- (in, not)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^ir(?=[r])/, text: 'ir', info: { root: 'in/im', meaning: '不，无', origin: 'in- (in, not)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^in/, text: 'in', info: { root: 'in/im', meaning: '不，无/进入', origin: 'in- (in, not)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^con/, text: 'con', info: { root: 'con/com', meaning: '共同，一起', origin: 'cum (with)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^com(?=[pbm])/, text: 'com', info: { root: 'con/com', meaning: '共同，一起', origin: 'cum (with)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^pro/, text: 'pro', info: { root: 'pro', meaning: '向前，支持', origin: 'pro (forward, for)', originLanguage: 'Latin' }, minLenAfter: 2 },
  { pattern: /^per/, text: 'per', info: { root: 'per', meaning: '通过，完全', origin: 'per (through)', originLanguage: 'Latin' }, minLenAfter: 2 },
];

const COMMON_ROOTS: Array<{ pattern: RegExp; text: string; info: RootInfo }> = [
  { pattern: /aud/, text: 'aud', info: { root: 'aud', meaning: '听，声音', origin: 'audire (to hear)', originLanguage: 'Latin' } },
  { pattern: /spect/, text: 'spect', info: { root: 'spect', meaning: '看，观察', origin: 'spectare (to look at)', originLanguage: 'Latin' } },
  { pattern: /dict/, text: 'dict', info: { root: 'dict', meaning: '说，言', origin: 'dicere (to say)', originLanguage: 'Latin' } },
  { pattern: /scrib/, text: 'scrib', info: { root: 'scrib/script', meaning: '写', origin: 'scribere (to write)', originLanguage: 'Latin' } },
  { pattern: /script/, text: 'script', info: { root: 'scrib/script', meaning: '写', origin: 'scribere (to write)', originLanguage: 'Latin' } },
  { pattern: /port/, text: 'port', info: { root: 'port', meaning: '携带，运送', origin: 'portare (to carry)', originLanguage: 'Latin' } },
  { pattern: /duct/, text: 'duct', info: { root: 'duct', meaning: '引导，带领', origin: 'ducere (to lead)', originLanguage: 'Latin' } },
  { pattern: /duc(?=e|t|i)/, text: 'duc', info: { root: 'duct', meaning: '引导，带领', origin: 'ducere (to lead)', originLanguage: 'Latin' } },
  { pattern: /struct/, text: 'struct', info: { root: 'struct', meaning: '建造，构造', origin: 'struere (to build)', originLanguage: 'Latin' } },
  { pattern: /tract/, text: 'tract', info: { root: 'tract', meaning: '拉，拖', origin: 'trahere (to pull)', originLanguage: 'Latin' } },
  { pattern: /ject/, text: 'ject', info: { root: 'ject', meaning: '投，掷', origin: 'jacere (to throw)', originLanguage: 'Latin' } },
  { pattern: /miss/, text: 'miss', info: { root: 'mit/miss', meaning: '发送，放', origin: 'mittere (to send)', originLanguage: 'Latin' } },
  { pattern: /mit(?=t)/, text: 'mit', info: { root: 'mit/miss', meaning: '发送，放', origin: 'mittere (to send)', originLanguage: 'Latin' } },
  { pattern: /vis(?![a])/, text: 'vis', info: { root: 'vis/vid', meaning: '看', origin: 'videre (to see)', originLanguage: 'Latin' } },
  { pattern: /vid/, text: 'vid', info: { root: 'vis/vid', meaning: '看', origin: 'videre (to see)', originLanguage: 'Latin' } },
  { pattern: /cept/, text: 'cept', info: { root: 'cept/ceiv', meaning: '拿，取', origin: 'capere (to take)', originLanguage: 'Latin' } },
  { pattern: /ceiv/, text: 'ceiv', info: { root: 'cept/ceiv', meaning: '拿，取', origin: 'capere (to take)', originLanguage: 'Latin' } },
  { pattern: /pos(?=e|i|i)/, text: 'pos', info: { root: 'pos/pon', meaning: '放置', origin: 'ponere (to put)', originLanguage: 'Latin' } },
  { pattern: /pon/, text: 'pon', info: { root: 'pos/pon', meaning: '放置', origin: 'ponere (to put)', originLanguage: 'Latin' } },
  { pattern: /fer(?=[^e])/, text: 'fer', info: { root: 'fer', meaning: '带来，承载', origin: 'ferre (to bring)', originLanguage: 'Latin' } },
  { pattern: /tend/, text: 'tend', info: { root: 'tend/tens', meaning: '伸展，趋向', origin: 'tendere (to stretch)', originLanguage: 'Latin' } },
  { pattern: /tens/, text: 'tens', info: { root: 'tend/tens', meaning: '伸展，趋向', origin: 'tendere (to stretch)', originLanguage: 'Latin' } },
  { pattern: /vers/, text: 'vers', info: { root: 'vert/vers', meaning: '转', origin: 'vertere (to turn)', originLanguage: 'Latin' } },
  { pattern: /vert/, text: 'vert', info: { root: 'vert/vers', meaning: '转', origin: 'vertere (to turn)', originLanguage: 'Latin' } },
  { pattern: /graph/, text: 'graph', info: { root: 'graph', meaning: '写，画，记录', origin: 'graphein (to write)', originLanguage: 'Greek' } },
  { pattern: /gram/, text: 'gram', info: { root: 'graph', meaning: '写，画，记录', origin: 'graphein (to write)', originLanguage: 'Greek' } },
  { pattern: /log(?=y|ic|o)/, text: 'log', info: { root: 'log/logy', meaning: '学科，言语', origin: 'logos (word, study)', originLanguage: 'Greek' } },
  { pattern: /logy/, text: 'logy', info: { root: 'log/logy', meaning: '学科，言语', origin: 'logos (word, study)', originLanguage: 'Greek' } },
  { pattern: /bio(?![n])/, text: 'bio', info: { root: 'bio', meaning: '生命', origin: 'bios (life)', originLanguage: 'Greek' } },
  { pattern: /geo/, text: 'geo', info: { root: 'geo', meaning: '地球，土地', origin: 'ge (earth)', originLanguage: 'Greek' } },
  { pattern: /phon(?![e])/, text: 'phon', info: { root: 'phon', meaning: '声音', origin: 'phone (sound)', originLanguage: 'Greek' } },
  { pattern: /phone/, text: 'phone', info: { root: 'phon', meaning: '声音', origin: 'phone (sound)', originLanguage: 'Greek' } },
  { pattern: /phot(?![o])/, text: 'phot', info: { root: 'photo', meaning: '光', origin: 'phos (light)', originLanguage: 'Greek' } },
  { pattern: /photo/, text: 'photo', info: { root: 'photo', meaning: '光', origin: 'phos (light)', originLanguage: 'Greek' } },
  { pattern: /chrono/, text: 'chrono', info: { root: 'chrono', meaning: '时间', origin: 'chronos (time)', originLanguage: 'Greek' } },
  { pattern: /psych/, text: 'psych', info: { root: 'psych', meaning: '心灵，精神', origin: 'psyche (soul)', originLanguage: 'Greek' } },
  { pattern: /morph/, text: 'morph', info: { root: 'morph', meaning: '形态', origin: 'morphe (form)', originLanguage: 'Greek' } },
  { pattern: /path(?![e])/, text: 'path', info: { root: 'path', meaning: '感情，疾病', origin: 'pathos (suffering)', originLanguage: 'Greek' } },
  { pattern: /phil(?![l])/, text: 'phil', info: { root: 'phil', meaning: '爱', origin: 'philos (loving)', originLanguage: 'Greek' } },
  { pattern: /phob/, text: 'phob', info: { root: 'phob', meaning: '恐惧', origin: 'phobos (fear)', originLanguage: 'Greek' } },
  { pattern: /mem(?![o])/, text: 'mem', info: { root: 'mem', meaning: '记忆', origin: 'memor (mindful)', originLanguage: 'Latin' } },
  { pattern: /voc(?=[aie])/, text: 'voc', info: { root: 'voc/vok', meaning: '叫，声音', origin: 'vocare (to call)', originLanguage: 'Latin' } },
  { pattern: /vok/, text: 'vok', info: { root: 'voc/vok', meaning: '叫，声音', origin: 'vocare (to call)', originLanguage: 'Latin' } },
  { pattern: /act/, text: 'act', info: { root: 'act', meaning: '做，行动', origin: 'agere (to do)', originLanguage: 'Latin' } },
  { pattern: /rupt/, text: 'rupt', info: { root: 'rupt', meaning: '破裂', origin: 'rumpere (to break)', originLanguage: 'Latin' } },
  { pattern: /fact/, text: 'fact', info: { root: 'fac/fect', meaning: '做，制造', origin: 'facere (to make)', originLanguage: 'Latin' } },
  { pattern: /fect/, text: 'fect', info: { root: 'fac/fect', meaning: '做，制造', origin: 'facere (to make)', originLanguage: 'Latin' } },
  { pattern: /fac(?=e|t)/, text: 'fac', info: { root: 'fac/fect', meaning: '做，制造', origin: 'facere (to make)', originLanguage: 'Latin' } },
  { pattern: /cide/, text: 'cide', info: { root: 'cide/cis', meaning: '切，杀', origin: 'caedere (to cut)', originLanguage: 'Latin' } },
  { pattern: /cis/, text: 'cis', info: { root: 'cide/cis', meaning: '切，杀', origin: 'caedere (to cut)', originLanguage: 'Latin' } },
  { pattern: /mot/, text: 'mot', info: { root: 'mov/mot', meaning: '移动', origin: 'movere (to move)', originLanguage: 'Latin' } },
  { pattern: /mov(?=e)/, text: 'mov', info: { root: 'mov/mot', meaning: '移动', origin: 'movere (to move)', originLanguage: 'Latin' } },
  { pattern: /cred/, text: 'cred', info: { root: 'cred', meaning: '相信', origin: 'credere (to believe)', originLanguage: 'Latin' } },
  { pattern: /cur(?=[rs])/, text: 'cur', info: { root: 'cur/curs', meaning: '跑，流', origin: 'currere (to run)', originLanguage: 'Latin' } },
  { pattern: /curs/, text: 'curs', info: { root: 'cur/curs', meaning: '跑，流', origin: 'currere (to run)', originLanguage: 'Latin' } },
  { pattern: /fin/, text: 'fin', info: { root: 'fin', meaning: '结束，界限', origin: 'finis (end)', originLanguage: 'Latin' } },
  { pattern: /flu(?=[xeu])/, text: 'flu', info: { root: 'flu', meaning: '流', origin: 'fluere (to flow)', originLanguage: 'Latin' } },
  { pattern: /flux/, text: 'flux', info: { root: 'flu', meaning: '流', origin: 'fluere (to flow)', originLanguage: 'Latin' } },
  { pattern: /form/, text: 'form', info: { root: 'form', meaning: '形状，形式', origin: 'forma (shape)', originLanguage: 'Latin' } },
  { pattern: /grad/, text: 'grad', info: { root: 'grad/gress', meaning: '步，走', origin: 'gradus (step)', originLanguage: 'Latin' } },
  { pattern: /gress/, text: 'gress', info: { root: 'grad/gress', meaning: '步，走', origin: 'gradus (step)', originLanguage: 'Latin' } },
  { pattern: /jud/, text: 'jud', info: { root: 'jud', meaning: '判断', origin: 'judex (judge)', originLanguage: 'Latin' } },
  { pattern: /leg(?=[iaes])/, text: 'leg', info: { root: 'leg/lig', meaning: '法律，选择，读', origin: 'legere (to read, choose)', originLanguage: 'Latin' } },
  { pattern: /lig(?=[aie])/, text: 'lig', info: { root: 'leg/lig', meaning: '法律，选择，读', origin: 'legere (to read, choose)', originLanguage: 'Latin' } },
  { pattern: /loc(?=[aio])/, text: 'loc', info: { root: 'loc', meaning: '地方', origin: 'locus (place)', originLanguage: 'Latin' } },
  { pattern: /man(?=[u])/, text: 'man', info: { root: 'man/manu', meaning: '手', origin: 'manus (hand)', originLanguage: 'Latin' } },
  { pattern: /manu/, text: 'manu', info: { root: 'man/manu', meaning: '手', origin: 'manus (hand)', originLanguage: 'Latin' } },
  { pattern: /nat(?=[iue])/, text: 'nat', info: { root: 'nat', meaning: '出生，天生', origin: 'natus (born)', originLanguage: 'Latin' } },
  { pattern: /ped(?=[aie])/, text: 'ped', info: { root: 'ped', meaning: '脚，儿童', origin: 'pes/pais (foot/child)', originLanguage: 'Latin/Greek' } },
  { pattern: /sens/, text: 'sens', info: { root: 'sent/sens', meaning: '感觉', origin: 'sentire (to feel)', originLanguage: 'Latin' } },
  { pattern: /sent(?=[ie])/, text: 'sent', info: { root: 'sent/sens', meaning: '感觉', origin: 'sentire (to feel)', originLanguage: 'Latin' } },
  { pattern: /press/, text: 'press', info: { root: 'press', meaning: '压', origin: 'pressare (to press)', originLanguage: 'Latin' } },
  { pattern: /pend(?=[se])/, text: 'pend', info: { root: 'pend/pens', meaning: '悬挂，称重', origin: 'pendere (to hang, weigh)', originLanguage: 'Latin' } },
  { pattern: /pens/, text: 'pens', info: { root: 'pend/pens', meaning: '悬挂，称重', origin: 'pendere (to hang, weigh)', originLanguage: 'Latin' } },
  { pattern: /cap(?=[tai])/, text: 'cap', info: { root: 'cap/capt', meaning: '头，拿取', origin: 'caput (head)', originLanguage: 'Latin' } },
  { pattern: /capt/, text: 'capt', info: { root: 'cap/capt', meaning: '头，拿取', origin: 'capere (to take)', originLanguage: 'Latin' } },
  { pattern: /sect/, text: 'sect', info: { root: 'sect/sec', meaning: '切', origin: 'secare (to cut)', originLanguage: 'Latin' } },
  { pattern: /sec(?=[t])/, text: 'sec', info: { root: 'sect/sec', meaning: '切', origin: 'secare (to cut)', originLanguage: 'Latin' } },
  { pattern: /quest/, text: 'quest', info: { root: 'quest/quir', meaning: '寻求，询问', origin: 'quaerere (to seek)', originLanguage: 'Latin' } },
  { pattern: /quir/, text: 'quir', info: { root: 'quest/quir', meaning: '寻求，询问', origin: 'quaerere (to seek)', originLanguage: 'Latin' } },
  { pattern: /quis/, text: 'quis', info: { root: 'quest/quir', meaning: '寻求，询问', origin: 'quaerere (to seek)', originLanguage: 'Latin' } },
  { pattern: /sign/, text: 'sign', info: { root: 'sign', meaning: '标记，信号', origin: 'signum (mark)', originLanguage: 'Latin' } },
  { pattern: /simil/, text: 'simil', info: { root: 'simil', meaning: '相似', origin: 'similis (like)', originLanguage: 'Latin' } },
  { pattern: /sol(?=[uv])/, text: 'sol', info: { root: 'sol', meaning: '太阳，单独', origin: 'sol/solus (sun/alone)', originLanguage: 'Latin' } },
  { pattern: /spec(?=[i])/, text: 'spec', info: { root: 'spect', meaning: '看，观察', origin: 'specere (to look)', originLanguage: 'Latin' } },
  { pattern: /stat/, text: 'stat', info: { root: 'stat/st', meaning: '站立，状态', origin: 'stare (to stand)', originLanguage: 'Latin' } },
  { pattern: /st(?=[aieo])/, text: 'st', info: { root: 'stat/st', meaning: '站立，状态', origin: 'stare (to stand)', originLanguage: 'Latin' } },
  { pattern: /tain/, text: 'tain', info: { root: 'tain/tin', meaning: '保持，拿住', origin: 'tenere (to hold)', originLanguage: 'Latin' } },
  { pattern: /ten(?=[de])/, text: 'ten', info: { root: 'tain/tin', meaning: '保持，拿住', origin: 'tenere (to hold)', originLanguage: 'Latin' } },
  { pattern: /tin(?=[ue])/, text: 'tin', info: { root: 'tain/tin', meaning: '保持，拿住', origin: 'tenere (to hold)', originLanguage: 'Latin' } },
  { pattern: /techn/, text: 'techn', info: { root: 'techn', meaning: '技术，工艺', origin: 'techne (art)', originLanguage: 'Greek' } },
  { pattern: /therm/, text: 'therm', info: { root: 'therm', meaning: '热', origin: 'therme (heat)', originLanguage: 'Greek' } },
  { pattern: /trop/, text: 'trop', info: { root: 'trop', meaning: '转，变化', origin: 'tropos (turn)', originLanguage: 'Greek' } },
  { pattern: /scop/, text: 'scop', info: { root: 'scop', meaning: '看，观察', origin: 'skopein (to look)', originLanguage: 'Greek' } },
  { pattern: /crit/, text: 'crit', info: { root: 'crit', meaning: '判断，分离', origin: 'krinein (to judge)', originLanguage: 'Greek' } },
  { pattern: /cycl/, text: 'cycl', info: { root: 'cycl', meaning: '圆，环', origin: 'kyklos (circle)', originLanguage: 'Greek' } },
  { pattern: /dem(?=[oi])/, text: 'dem', info: { root: 'dem', meaning: '人民', origin: 'demos (people)', originLanguage: 'Greek' } },
  { pattern: /gen(?=[eois])/, text: 'gen', info: { root: 'gen', meaning: '产生，种类', origin: 'genos (race, kind)', originLanguage: 'Greek' } },
  { pattern: /hydr(?=[o])/, text: 'hydr', info: { root: 'hydr', meaning: '水', origin: 'hydor (water)', originLanguage: 'Greek' } },
  { pattern: /lith/, text: 'lith', info: { root: 'lith', meaning: '石头', origin: 'lithos (stone)', originLanguage: 'Greek' } },
  { pattern: /metr/, text: 'metr', info: { root: 'metr', meaning: '测量', origin: 'metron (measure)', originLanguage: 'Greek' } },
  { pattern: /morph/, text: 'morph', info: { root: 'morph', meaning: '形态', origin: 'morphe (form)', originLanguage: 'Greek' } },
  { pattern: /onym/, text: 'onym', info: { root: 'onym', meaning: '名字', origin: 'onoma (name)', originLanguage: 'Greek' } },
  { pattern: /path(?=[oi])/, text: 'path', info: { root: 'path', meaning: '感情，疾病', origin: 'pathos (suffering)', originLanguage: 'Greek' } },
  { pattern: /petr/, text: 'petr', info: { root: 'petr', meaning: '岩石', origin: 'petra (rock)', originLanguage: 'Greek' } },
  { pattern: /phon(?=[eo])/, text: 'phon', info: { root: 'phon', meaning: '声音', origin: 'phone (sound)', originLanguage: 'Greek' } },
  { pattern: /phys(?=[ic])/, text: 'phys', info: { root: 'phys', meaning: '自然，身体', origin: 'physis (nature)', originLanguage: 'Greek' } },
  { pattern: /polit(?=[ei])/, text: 'polit', info: { root: 'polit', meaning: '城市，政治', origin: 'polis (city)', originLanguage: 'Greek' } },
  { pattern: /syn/, text: 'syn', info: { root: 'syn/sym', meaning: '共同，一起', origin: 'syn (with)', originLanguage: 'Greek' } },
  { pattern: /sym(?=[pbm])/, text: 'sym', info: { root: 'syn/sym', meaning: '共同，一起', origin: 'syn (with)', originLanguage: 'Greek' } },
  { pattern: /tax(?=[i])/, text: 'tax', info: { root: 'tax', meaning: '排列，顺序', origin: 'taxis (arrangement)', originLanguage: 'Greek' } },
  { pattern: /top(?=[i])/, text: 'top', info: { root: 'top', meaning: '地方', origin: 'topos (place)', originLanguage: 'Greek' } },
  { pattern: /zoo/, text: 'zoo', info: { root: 'zoo', meaning: '动物', origin: 'zoon (animal)', originLanguage: 'Greek' } },
];

const COMMON_SUFFIXES: Array<{ pattern: RegExp; text: string; info: RootInfo; minLenBefore: number }> = [
  { pattern: /ization$/, text: 'ization', info: { root: 'ization', meaning: '名词：...化过程', origin: '-izare + -tio', originLanguage: 'Greek/Latin' }, minLenBefore: 1 },
  { pattern: /ification$/, text: 'ification', info: { root: 'ification', meaning: '名词：使成为...', origin: '-ficare + -tio', originLanguage: 'Latin' }, minLenBefore: 1 },
  { pattern: /ability$/, text: 'ability', info: { root: 'able/ible', meaning: '名词：可...性', origin: '-abilitas', originLanguage: 'Latin' }, minLenBefore: 1 },
  { pattern: /ibility$/, text: 'ibility', info: { root: 'able/ible', meaning: '名词：可...性', origin: '-ibilitas', originLanguage: 'Latin' }, minLenBefore: 1 },
  { pattern: /ousness$/, text: 'ousness', info: { root: 'ous+ness', meaning: '名词：...的状态', origin: '-osus + -nes', originLanguage: 'Latin/Old English' }, minLenBefore: 1 },
  { pattern: /tional$/, text: 'tional', info: { root: 'tion+al', meaning: '形容词：与...相关的', origin: '-tio + -alis', originLanguage: 'Latin' }, minLenBefore: 1 },
  { pattern: /sional$/, text: 'sional', info: { root: 'sion+al', meaning: '形容词：与...相关的', origin: '-sio + -alis', originLanguage: 'Latin' }, minLenBefore: 1 },
  { pattern: /ational$/, text: 'ational', info: { root: 'ate+al', meaning: '形容词：具有...性质', origin: '-atus + -alis', originLanguage: 'Latin' }, minLenBefore: 1 },
  { pattern: /tion$/, text: 'tion', info: { root: 'tion/sion', meaning: '名词：动作或状态', origin: '-tio', originLanguage: 'Latin' }, minLenBefore: 2 },
  { pattern: /sion$/, text: 'sion', info: { root: 'tion/sion', meaning: '名词：动作或状态', origin: '-sio', originLanguage: 'Latin' }, minLenBefore: 2 },
  { pattern: /ment$/, text: 'ment', info: { root: 'ment', meaning: '名词：结果或状态', origin: '-mentum', originLanguage: 'Latin' }, minLenBefore: 2 },
  { pattern: /ness$/, text: 'ness', info: { root: 'ness', meaning: '名词：性质或状态', origin: '-nes', originLanguage: 'Old English' }, minLenBefore: 2 },
  { pattern: /ship$/, text: 'ship', info: { root: 'ship', meaning: '名词：身份或状态', origin: '-scipe', originLanguage: 'Old English' }, minLenBefore: 2 },
  { pattern: /hood$/, text: 'hood', info: { root: 'hood', meaning: '名词：身份或状态', origin: '-had', originLanguage: 'Old English' }, minLenBefore: 2 },
  { pattern: /dom$/, text: 'dom', info: { root: 'dom', meaning: '名词：领域或状态', origin: '-dom', originLanguage: 'Old English' }, minLenBefore: 2 },
  { pattern: /able$/, text: 'able', info: { root: 'able/ible', meaning: '形容词：能够的', origin: '-abilis', originLanguage: 'Latin' }, minLenBefore: 2 },
  { pattern: /ible$/, text: 'ible', info: { root: 'able/ible', meaning: '形容词：能够的', origin: '-ibilis', originLanguage: 'Latin' }, minLenBefore: 2 },
  { pattern: /ful$/, text: 'ful', info: { root: 'ful', meaning: '形容词：充满的', origin: '-full', originLanguage: 'Old English' }, minLenBefore: 2 },
  { pattern: /less$/, text: 'less', info: { root: 'less', meaning: '形容词：没有的', origin: '-leas', originLanguage: 'Old English' }, minLenBefore: 2 },
  { pattern: /ous$/, text: 'ous', info: { root: 'ous', meaning: '形容词：具有...的', origin: '-osus', originLanguage: 'Latin' }, minLenBefore: 2 },
  { pattern: /ive$/, text: 'ive', info: { root: 'ive', meaning: '形容词：倾向于', origin: '-ivus', originLanguage: 'Latin' }, minLenBefore: 2 },
  { pattern: /ical$/, text: 'ical', info: { root: 'ic+al', meaning: '形容词：与...相关的', origin: '-ikos + -alis', originLanguage: 'Greek/Latin' }, minLenBefore: 2 },
  { pattern: /al$/, text: 'al', info: { root: 'al', meaning: '形容词：关于...的', origin: '-alis', originLanguage: 'Latin' }, minLenBefore: 3 },
  { pattern: /ly$/, text: 'ly', info: { root: 'ly', meaning: '副词：以...方式', origin: '-lice', originLanguage: 'Old English' }, minLenBefore: 3 },
  { pattern: /er$/, text: 'er', info: { root: 'er/or', meaning: '名词：做...的人/物', origin: '-ere', originLanguage: 'Old English' }, minLenBefore: 3 },
  { pattern: /or$/, text: 'or', info: { root: 'er/or', meaning: '名词：做...的人/物', origin: '-or', originLanguage: 'Latin' }, minLenBefore: 3 },
  { pattern: /ist$/, text: 'ist', info: { root: 'ist', meaning: '名词：从事...的人', origin: '-istes', originLanguage: 'Greek' }, minLenBefore: 2 },
  { pattern: /ism$/, text: 'ism', info: { root: 'ism', meaning: '名词：主义或学说', origin: '-ismos', originLanguage: 'Greek' }, minLenBefore: 2 },
  { pattern: /ity$/, text: 'ity', info: { root: 'ity', meaning: '名词：性质或状态', origin: '-itas', originLanguage: 'Latin' }, minLenBefore: 3 },
  { pattern: /ology$/, text: 'ology', info: { root: 'log/logy', meaning: '名词：...学科', origin: '-logos', originLanguage: 'Greek' }, minLenBefore: 2 },
  { pattern: /graphy$/, text: 'graphy', info: { root: 'graph', meaning: '名词：记录或描述', origin: '-graphia', originLanguage: 'Greek' }, minLenBefore: 2 },
  { pattern: /ize$/, text: 'ize', info: { root: 'ize', meaning: '动词：使成为', origin: '-izein', originLanguage: 'Greek' }, minLenBefore: 2 },
  { pattern: /ify$/, text: 'ify', info: { root: 'ify', meaning: '动词：使...化', origin: '-ficare', originLanguage: 'Latin' }, minLenBefore: 2 },
  { pattern: /ate$/, text: 'ate', info: { root: 'ate', meaning: '动词：使成为', origin: '-atus', originLanguage: 'Latin' }, minLenBefore: 3 },
  { pattern: /en$/, text: 'en', info: { root: 'en', meaning: '动词：使成为', origin: '-jan', originLanguage: 'Old English' }, minLenBefore: 3 },
  { pattern: /ic$/, text: 'ic', info: { root: 'ic', meaning: '形容词：具有...性质', origin: '-ikos', originLanguage: 'Greek' }, minLenBefore: 3 },
  { pattern: /ary$/, text: 'ary', info: { root: 'ary', meaning: '形容词/名词：与...相关', origin: '-arius', originLanguage: 'Latin' }, minLenBefore: 2 },
  { pattern: /ory$/, text: 'ory', info: { root: 'ory', meaning: '形容词/名词：与...相关', origin: '-orius', originLanguage: 'Latin' }, minLenBefore: 2 },
  { pattern: /ward$/, text: 'ward', info: { root: 'ward', meaning: '副词：向...方向', origin: '-weard', originLanguage: 'Old English' }, minLenBefore: 2 },
];

const VOWELS = 'aeiou';

function generatePhonetic(word: string): string {
  const w = word.toLowerCase();
  let phonetic = '';
  for (let i = 0; i < w.length; i++) {
    const char = w[i];
    const prev = i > 0 ? w[i - 1] : '';
    const next = i < w.length - 1 ? w[i + 1] : '';
    if (VOWELS.includes(char)) {
      if (char === 'a') phonetic += (i === w.length - 1 && next === '') ? 'ə' : next === 'e' ? 'eɪ' : 'æ';
      else if (char === 'e') phonetic += (i === w.length - 1) ? '' : prev === 'i' || next === 'e' ? 'iː' : 'ɛ';
      else if (char === 'i') phonetic += next === 'e' ? 'aɪ' : 'ɪ';
      else if (char === 'o') phonetic += next === 'e' ? 'oʊ' : 'ɒ';
      else if (char === 'u') phonetic += 'ʌ';
    } else if (char === 'c') {
      phonetic += (['e', 'i', 'y'].includes(next)) ? 's' : 'k';
    } else if (char === 'g') {
      phonetic += (['e', 'i', 'y'].includes(next)) ? 'dʒ' : 'ɡ';
    } else if (char === 's' && next === 'h') {
      phonetic += 'ʃ';
      i++;
    } else if (char === 'c' && next === 'h') {
      phonetic += 'tʃ';
      i++;
    } else if (char === 't' && next === 'h') {
      phonetic += 'θ';
      i++;
    } else if (char === 'p' && next === 'h') {
      phonetic += 'f';
      i++;
    } else if (char === 'y') {
      phonetic += (i === 0 || VOWELS.includes(prev)) ? 'j' : 'i';
    } else if (char === 'q') {
      phonetic += 'kw';
      if (next === 'u') i++;
    } else if (char === 'x') {
      phonetic += 'ks';
    } else {
      phonetic += char;
    }
  }
  return `/${phonetic}/`;
}

function guessPartOfSpeech(word: string, breakdown: WordBreakdown): string {
  const last = breakdown.parts[breakdown.parts.length - 1];
  if (!last) return 'v.';
  if (last.type === 'suffix') {
    const t = last.text;
    if (['tion', 'sion', 'ment', 'ness', 'ship', 'hood', 'dom', 'ity', 'ist', 'ism', 'ology', 'graphy'].includes(t)) return 'n.';
    if (['able', 'ible', 'ful', 'less', 'ous', 'ive', 'al', 'ic', 'ary', 'ory', 'ical'].includes(t)) return 'adj.';
    if (['ly', 'ward'].includes(t)) return 'adv.';
    if (['ize', 'ify', 'ate', 'en'].includes(t)) return 'v.';
  }
  const w = word.toLowerCase();
  if (w.endsWith('e') || w.endsWith('t') || w.endsWith('d') || w.endsWith('ct')) return 'v.';
  return 'n./v.';
}

function guessMeaning(breakdown: WordBreakdown): string {
  const meaningful = breakdown.parts.filter(p => p.rootInfo && p.type !== 'connector');
  if (meaningful.length === 0) return '请查阅词典获取准确释义';
  const meanings = meaningful.map(p => p.rootInfo!.meaning).join(' + ');
  return `根据词根推断：${meanings}`;
}

function generateEtymology(word: string, breakdown: WordBreakdown): string {
  const parts = breakdown.parts;
  if (parts.length === 0) return `单词 "${word}" 的词源信息暂无记录。`;

  const partsDesc = parts.map(p => {
    if (p.rootInfo) {
      const typeLabel = p.type === 'prefix' ? '前缀' : p.type === 'suffix' ? '后缀' : p.type === 'root' ? '词根' : '连接成分';
      return `"${p.text}"（${typeLabel}：${p.rootInfo.meaning}，源自${p.rootInfo.originLanguage}的${p.rootInfo.origin}）`;
    }
    return `"${p.text}"`;
  }).join('、');

  const construction = parts
    .filter(p => p.type !== 'connector')
    .map(p => {
      const lang = p.rootInfo?.originLanguage ? `（${p.rootInfo.originLanguage}）` : '';
      return `${p.text}${lang}`;
    }).join(' + ');

  return `单词 "${word}" 由 ${construction} 构成。拆解分析：${partsDesc}。`;
}

export function analyzeWord(wordInput: string): WordBreakdown {
  const word = wordInput.toLowerCase().trim();
  const parts: WordPart[] = [];
  let remaining = word;
  let startIdx = 0;

  for (const prefix of COMMON_PREFIXES) {
    const match = remaining.match(prefix.pattern);
    if (match && remaining.length - match[0].length >= prefix.minLenAfter) {
      if (match[0].length > startIdx) {
        const before = remaining.slice(0, match.index || 0);
        if (before) {
          parts.push({ text: before, type: 'root' });
        }
      }
      parts.push({ text: match[0], type: 'prefix', rootInfo: prefix.info });
      remaining = remaining.slice((match.index || 0) + match[0].length);
      startIdx = 0;
      break;
    }
  }

  let foundSuffix: typeof COMMON_SUFFIXES[0] | null = null;
  let suffixMatch: RegExpMatchArray | null = null;
  for (const suffix of COMMON_SUFFIXES) {
    const match = remaining.match(suffix.pattern);
    if (match) {
      const matchIdx = match.index!;
      if (matchIdx >= suffix.minLenBefore) {
        if (!foundSuffix || (suffixMatch && matchIdx < (suffixMatch.index || 0))) {
          foundSuffix = suffix;
          suffixMatch = match;
        }
      }
    }
  }

  let rootPart = remaining;
  if (foundSuffix && suffixMatch) {
    rootPart = remaining.slice(0, suffixMatch.index);
  }

  const rootMatches: Array<{ start: number; end: number; entry: typeof COMMON_ROOTS[0] }> = [];
  for (const root of COMMON_ROOTS) {
    const regex = new RegExp(root.pattern.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = regex.exec(rootPart)) !== null) {
      rootMatches.push({ start: m.index, end: m.index + m[0].length, entry: root });
      if (m.index === regex.lastIndex) regex.lastIndex++;
    }
  }

  rootMatches.sort((a, b) => a.start - b.start || b.end - a.end - (b.end - a.end));
  const selected: typeof rootMatches = [];
  let lastEnd = -1;
  for (const m of rootMatches) {
    if (m.start >= lastEnd) {
      selected.push(m);
      lastEnd = m.end;
    }
  }

  if (selected.length === 0) {
    if (rootPart) {
      parts.push({ text: rootPart, type: 'root' });
    }
  } else {
    let cursor = 0;
    for (const m of selected) {
      if (m.start > cursor) {
        const before = rootPart.slice(cursor, m.start);
        if (before) parts.push({ text: before, type: 'connector' });
      }
      parts.push({ text: m.entry.text, type: 'root', rootInfo: m.entry.info });
      cursor = m.end;
    }
    if (cursor < rootPart.length) {
      const after = rootPart.slice(cursor);
      if (after) parts.push({ text: after, type: 'connector' });
    }
  }

  if (foundSuffix && suffixMatch && foundSuffix) {
    parts.push({ text: suffixMatch[0], type: 'suffix', rootInfo: foundSuffix.info });
  }

  if (parts.length === 0) {
    parts.push({ text: word, type: 'root' });
  }

  return { parts, etymology: generateEtymology(word, { parts, etymology: '' }) };
}

export function queryWord(word: string): WordData {
  const trimmed = word.trim();
  const breakdown = analyzeWord(trimmed);
  return {
    word: trimmed,
    phonetic: generatePhonetic(trimmed),
    partOfSpeech: guessPartOfSpeech(trimmed, breakdown),
    meaning: guessMeaning(breakdown),
    breakdown,
  };
}

export const rootsDatabase: RootInfo[] = [
  ...COMMON_ROOTS.map(r => r.info),
  ...COMMON_PREFIXES.map(p => p.info),
  ...COMMON_SUFFIXES.map(s => s.info),
];
