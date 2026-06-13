export interface RootInfo {
  root: string;
  meaning: string;
  origin: string;
  originLanguage: 'Latin' | 'Greek' | 'Old English' | 'French' | 'Germanic';
}

export interface WordBreakdown {
  parts: {
    text: string;
    type: 'prefix' | 'root' | 'suffix' | 'connector';
    rootInfo?: RootInfo;
  }[];
  etymology: string;
}

export interface WordData {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaning: string;
  breakdown: WordBreakdown;
}

export const rootsDatabase: RootInfo[] = [
  { root: 'aud', meaning: '听，声音', origin: 'audire (to hear)', originLanguage: 'Latin' },
  { root: 'spect', meaning: '看，观察', origin: 'spectare (to look at)', originLanguage: 'Latin' },
  { root: 'dict', meaning: '说，言', origin: 'dicere (to say)', originLanguage: 'Latin' },
  { root: 'scrib/script', meaning: '写', origin: 'scribere (to write)', originLanguage: 'Latin' },
  { root: 'port', meaning: '携带，运送', origin: 'portare (to carry)', originLanguage: 'Latin' },
  { root: 'duct', meaning: '引导，带领', origin: 'ducere (to lead)', originLanguage: 'Latin' },
  { root: 'struct', meaning: '建造，构造', origin: 'struere (to build)', originLanguage: 'Latin' },
  { root: 'tract', meaning: '拉，拖', origin: 'trahere (to pull)', originLanguage: 'Latin' },
  { root: 'ject', meaning: '投，掷', origin: 'jacere (to throw)', originLanguage: 'Latin' },
  { root: 'mit/miss', meaning: '发送，放', origin: 'mittere (to send)', originLanguage: 'Latin' },
  { root: 'vis/vid', meaning: '看', origin: 'videre (to see)', originLanguage: 'Latin' },
  { root: 'cept/ceiv', meaning: '拿，取', origin: 'capere (to take)', originLanguage: 'Latin' },
  { root: 'pos/pon', meaning: '放置', origin: 'ponere (to put)', originLanguage: 'Latin' },
  { root: 'fer', meaning: '带来，承载', origin: 'ferre (to bring)', originLanguage: 'Latin' },
  { root: 'tend/tens', meaning: '伸展，趋向', origin: 'tendere (to stretch)', originLanguage: 'Latin' },
  { root: 'vert/vers', meaning: '转', origin: 'vertere (to turn)', originLanguage: 'Latin' },
  { root: 'graph', meaning: '写，画', origin: 'graphein (to write)', originLanguage: 'Greek' },
  { root: 'log/logy', meaning: '学科，言语', origin: 'logos (word, study)', originLanguage: 'Greek' },
  { root: 'bio', meaning: '生命', origin: 'bios (life)', originLanguage: 'Greek' },
  { root: 'geo', meaning: '地球，土地', origin: 'ge (earth)', originLanguage: 'Greek' },
  { root: 'phon', meaning: '声音', origin: 'phone (sound)', originLanguage: 'Greek' },
  { root: 'photo', meaning: '光', origin: 'phos (light)', originLanguage: 'Greek' },
  { root: 'tele', meaning: '远', origin: 'tele (far off)', originLanguage: 'Greek' },
  { root: 'auto', meaning: '自己', origin: 'autos (self)', originLanguage: 'Greek' },
  { root: 'chrono', meaning: '时间', origin: 'chronos (time)', originLanguage: 'Greek' },
  { root: 'psych', meaning: '心灵，精神', origin: 'psyche (soul)', originLanguage: 'Greek' },
  { root: 'morph', meaning: '形态', origin: 'morphe (form)', originLanguage: 'Greek' },
  { root: 'path', meaning: '感情，疾病', origin: 'pathos (suffering)', originLanguage: 'Greek' },
  { root: 'phil', meaning: '爱', origin: 'philos (loving)', originLanguage: 'Greek' },
  { root: 'phob', meaning: '恐惧', origin: 'phobos (fear)', originLanguage: 'Greek' },
  { root: 'mem', meaning: '记忆', origin: 'memor (mindful)', originLanguage: 'Latin' },
  { root: 'voc/vok', meaning: '叫，声音', origin: 'vocare (to call)', originLanguage: 'Latin' },
  { root: 'act', meaning: '做，行动', origin: 'agere (to do)', originLanguage: 'Latin' },
  { root: 'rupt', meaning: '破裂', origin: 'rumpere (to break)', originLanguage: 'Latin' },
  { root: 'fac/fect', meaning: '做，制造', origin: 'facere (to make)', originLanguage: 'Latin' },
  { root: 'cide/cis', meaning: '切，杀', origin: 'caedere (to cut)', originLanguage: 'Latin' },
  { root: 'mov/mot', meaning: '移动', origin: 'movere (to move)', originLanguage: 'Latin' },
  { root: 'cred', meaning: '相信', origin: 'credere (to believe)', originLanguage: 'Latin' },
  { root: 'cur/curs', meaning: '跑，流', origin: 'currere (to run)', originLanguage: 'Latin' },
  { root: 'fin', meaning: '结束，界限', origin: 'finis (end)', originLanguage: 'Latin' },
  { root: 'flu', meaning: '流', origin: 'fluere (to flow)', originLanguage: 'Latin' },
  { root: 'form', meaning: '形状，形式', origin: 'forma (shape)', originLanguage: 'Latin' },
  { root: 'grad/gress', meaning: '步，走', origin: 'gradus (step)', originLanguage: 'Latin' },
  { root: 'jud', meaning: '判断', origin: 'judex (judge)', originLanguage: 'Latin' },
  { root: 'leg/lig', meaning: '法律，选择，读', origin: 'legere (to read, choose)', originLanguage: 'Latin' },
  { root: 'loc', meaning: '地方', origin: 'locus (place)', originLanguage: 'Latin' },
  { root: 'man/manu', meaning: '手', origin: 'manus (hand)', originLanguage: 'Latin' },
  { root: 'nat', meaning: '出生，天生', origin: 'natus (born)', originLanguage: 'Latin' },
  { root: 'ped', meaning: '脚，儿童', origin: 'pes/pais (foot/child)', originLanguage: 'Latin/Greek' },
  { root: 'sent/sens', meaning: '感觉', origin: 'sentire (to feel)', originLanguage: 'Latin' },
];

export const prefixDatabase: Record<string, RootInfo> = {
  'pre': { root: 'pre', meaning: '在...之前', origin: 'prae (before)', originLanguage: 'Latin' },
  'un': { root: 'un', meaning: '不，非', origin: 'un- (not)', originLanguage: 'Old English' },
  're': { root: 're', meaning: '再次，返回', origin: 're- (again, back)', originLanguage: 'Latin' },
  'de': { root: 'de', meaning: '向下，去除', origin: 'de- (down, off)', originLanguage: 'Latin' },
  'dis': { root: 'dis', meaning: '分离，不', origin: 'dis- (apart, not)', originLanguage: 'Latin' },
  'in/im': { root: 'in/im', meaning: '在...内/不', origin: 'in- (in, not)', originLanguage: 'Latin' },
  'ex': { root: 'ex', meaning: '出，外', origin: 'ex- (out of)', originLanguage: 'Latin' },
  'trans': { root: 'trans', meaning: '穿过，跨越', origin: 'trans (across)', originLanguage: 'Latin' },
  'sub': { root: 'sub', meaning: '在...下', origin: 'sub (under)', originLanguage: 'Latin' },
  'super': { root: 'super', meaning: '超级，在上', origin: 'super (above)', originLanguage: 'Latin' },
  'inter': { root: 'inter', meaning: '在...之间', origin: 'inter (between)', originLanguage: 'Latin' },
  'anti': { root: 'anti', meaning: '反对', origin: 'anti (against)', originLanguage: 'Greek' },
  'mis': { root: 'mis', meaning: '错误的', origin: 'mis- (wrong)', originLanguage: 'Old English' },
  'over': { root: 'over', meaning: '过度，在上', origin: 'ofer (over)', originLanguage: 'Old English' },
  'under': { root: 'under', meaning: '在下，不足', origin: 'under (under)', originLanguage: 'Old English' },
};

export const suffixDatabase: Record<string, RootInfo> = {
  'tion/sion': { root: 'tion/sion', meaning: '名词：动作或状态', origin: '-tio/-sio', originLanguage: 'Latin' },
  'ment': { root: 'ment', meaning: '名词：结果或状态', origin: '-mentum', originLanguage: 'Latin' },
  'ness': { root: 'ness', meaning: '名词：性质或状态', origin: '-nes', originLanguage: 'Old English' },
  'able/ible': { root: 'able/ible', meaning: '形容词：能够的', origin: '-abilis', originLanguage: 'Latin' },
  'ful': { root: 'ful', meaning: '形容词：充满的', origin: '-full', originLanguage: 'Old English' },
  'less': { root: 'less', meaning: '形容词：没有的', origin: '-leas', originLanguage: 'Old English' },
  'ous': { root: 'ous', meaning: '形容词：具有...的', origin: '-osus', originLanguage: 'Latin' },
  'ive': { root: 'ive', meaning: '形容词：倾向于', origin: '-ivus', originLanguage: 'Latin' },
  'ly': { root: 'ly', meaning: '副词：以...方式', origin: '-lice', originLanguage: 'Old English' },
  'er/or': { root: 'er/or', meaning: '名词：做...的人', origin: '-er/-or', originLanguage: 'Latin/Old English' },
  'ist': { root: 'ist', meaning: '名词：从事...的人', origin: '-istes', originLanguage: 'Greek' },
  'ize': { root: 'ize', meaning: '动词：使成为', origin: '-izein', originLanguage: 'Greek' },
  'ify': { root: 'ify', meaning: '动词：使...化', origin: '-ficare', originLanguage: 'Latin' },
  'al': { root: 'al', meaning: '形容词：关于...的', origin: '-alis', originLanguage: 'Latin' },
  'ity': { root: 'ity', meaning: '名词：性质或状态', origin: '-itas', originLanguage: 'Latin' },
};

export const wordDatabase: Record<string, WordData> = {
  'incredible': {
    word: 'incredible',
    phonetic: '/ɪnˈkredəbl/',
    partOfSpeech: 'adj.',
    meaning: '难以置信的，不可思议的',
    breakdown: {
      parts: [
        { text: 'in', type: 'prefix', rootInfo: prefixDatabase['in/im'] },
        { text: 'cred', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'cred') },
        { text: 'ible', type: 'suffix', rootInfo: suffixDatabase['able/ible'] },
      ],
      etymology: '源自拉丁语 incredibilis，由 in-(不) + credere(相信) + -ibilis(能够) 构成，字面意思是"不能被相信的"。'
    }
  },
  'transport': {
    word: 'transport',
    phonetic: '/trænsˈpɔːrt/',
    partOfSpeech: 'v./n.',
    meaning: '运输，运送；交通工具',
    breakdown: {
      parts: [
        { text: 'trans', type: 'prefix', rootInfo: prefixDatabase['trans'] },
        { text: 'port', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'port') },
      ],
      etymology: '源自拉丁语 transportare，由 trans-(穿过) + portare(携带) 构成，表示"从一处携带到另一处"。'
    }
  },
  'spectator': {
    word: 'spectator',
    phonetic: '/spekˈteɪtər/',
    partOfSpeech: 'n.',
    meaning: '观众，旁观者',
    breakdown: {
      parts: [
        { text: 'spect', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'spect') },
        { text: 'at', type: 'connector' },
        { text: 'or', type: 'suffix', rootInfo: suffixDatabase['er/or'] },
      ],
      etymology: '源自拉丁语 spectator，由 spectare(观看) + -or(做...的人) 构成，指"观看的人"。'
    }
  },
  'dictionary': {
    word: 'dictionary',
    phonetic: '/ˈdɪkʃəneri/',
    partOfSpeech: 'n.',
    meaning: '字典，词典',
    breakdown: {
      parts: [
        { text: 'dict', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'dict') },
        { text: 'ion', type: 'suffix', rootInfo: suffixDatabase['tion/sion'] },
        { text: 'ary', type: 'connector' },
      ],
      etymology: '源自拉丁语 dictionarium，由 dicere(说) 的派生词 dictio 衍生而来，原意为"词语的汇编"。'
    }
  },
  'describe': {
    word: 'describe',
    phonetic: '/dɪˈskraɪb/',
    partOfSpeech: 'v.',
    meaning: '描述，描写',
    breakdown: {
      parts: [
        { text: 'de', type: 'prefix', rootInfo: prefixDatabase['de'] },
        { text: 'scrib', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'scrib/script') },
        { text: 'e', type: 'connector' },
      ],
      etymology: '源自拉丁语 describere，由 de-(向下，完全) + scribere(写) 构成，意为"详细地写下来"。'
    }
  },
  'construct': {
    word: 'construct',
    phonetic: '/kənˈstrʌkt/',
    partOfSpeech: 'v.',
    meaning: '建造，构造',
    breakdown: {
      parts: [
        { text: 'con', type: 'prefix' },
        { text: 'struct', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'struct') },
      ],
      etymology: '源自拉丁语 construere，由 con-(一起) + struere(堆积，建造) 构成，表示"堆放在一起建造"。'
    }
  },
  'project': {
    word: 'project',
    phonetic: '/ˈprɒdʒekt/',
    partOfSpeech: 'n./v.',
    meaning: '项目；投射，计划',
    breakdown: {
      parts: [
        { text: 'pro', type: 'prefix' },
        { text: 'ject', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'ject') },
      ],
      etymology: '源自拉丁语 projectum，由 pro-(向前) + jacere(投掷) 构成，原意为"向前投掷的东西"，引申为"计划，方案"。'
    }
  },
  'telephone': {
    word: 'telephone',
    phonetic: '/ˈtelɪfəʊn/',
    partOfSpeech: 'n./v.',
    meaning: '电话；打电话',
    breakdown: {
      parts: [
        { text: 'tele', type: 'prefix', rootInfo: prefixDatabase['tele'] },
        { text: 'phon', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'phon') },
        { text: 'e', type: 'connector' },
      ],
      etymology: '源自希腊语词根组合，tele(远) + phone(声音)，1876年由亚历山大·贝尔发明时创造的词。'
    }
  },
  'biology': {
    word: 'biology',
    phonetic: '/baɪˈɒlədʒi/',
    partOfSpeech: 'n.',
    meaning: '生物学',
    breakdown: {
      parts: [
        { text: 'bio', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'bio') },
        { text: 'logy', type: 'suffix', rootInfo: suffixDatabase['ist']?.root ? undefined : rootsDatabase.find(r => r.root === 'log/logy') },
      ],
      etymology: '源自希腊语词根组合，bios(生命) + logos(学说)，19世纪初创造，意为"研究生命的学科"。'
    }
  },
  'photograph': {
    word: 'photograph',
    phonetic: '/ˈfəʊtəɡrɑːf/',
    partOfSpeech: 'n./v.',
    meaning: '照片；拍照',
    breakdown: {
      parts: [
        { text: 'photo', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'photo') },
        { text: 'graph', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'graph') },
      ],
      etymology: '源自希腊语词根组合，photos(光) + graphein(写，画)，字面意思是"用光来绘画"。'
    }
  },
  'automatic': {
    word: 'automatic',
    phonetic: '/ˌɔːtəˈmætɪk/',
    partOfSpeech: 'adj.',
    meaning: '自动的，无意识的',
    breakdown: {
      parts: [
        { text: 'auto', type: 'prefix', rootInfo: prefixDatabase['auto'] },
        { text: 'mat', type: 'root' },
        { text: 'ic', type: 'suffix' },
      ],
      etymology: '源自希腊语 automatos，由 autos(自己) + matos(思考) 构成，意为"自己行动的"。'
    }
  },
  'invisible': {
    word: 'invisible',
    phonetic: '/ɪnˈvɪzəbl/',
    partOfSpeech: 'adj.',
    meaning: '看不见的，无形的',
    breakdown: {
      parts: [
        { text: 'in', type: 'prefix', rootInfo: prefixDatabase['in/im'] },
        { text: 'vis', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'vis/vid') },
        { text: 'ible', type: 'suffix', rootInfo: suffixDatabase['able/ible'] },
      ],
      etymology: '源自拉丁语 invisibilis，由 in-(不) + videre(看) + -ibilis(能够) 构成，意为"不能被看见的"。'
    }
  },
  'remember': {
    word: 'remember',
    phonetic: '/rɪˈmembər/',
    partOfSpeech: 'v.',
    meaning: '记住，回忆',
    breakdown: {
      parts: [
        { text: 're', type: 'prefix', rootInfo: prefixDatabase['re'] },
        { text: 'mem', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'mem') },
        { text: 'ber', type: 'connector' },
      ],
      etymology: '源自拉丁语 rememorari，由 re-(再次) + memor(铭记) 构成，意为"再次铭记在心"。'
    }
  },
  'interrupt': {
    word: 'interrupt',
    phonetic: '/ˌɪntəˈrʌpt/',
    partOfSpeech: 'v.',
    meaning: '打断，中断',
    breakdown: {
      parts: [
        { text: 'inter', type: 'prefix', rootInfo: prefixDatabase['inter'] },
        { text: 'rupt', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'rupt') },
      ],
      etymology: '源自拉丁语 interrumpere，由 inter-(之间) + rumpere(打破) 构成，意为"在中间打破"。'
    }
  },
  'manufacture': {
    word: 'manufacture',
    phonetic: '/ˌmænjuˈfæktʃər/',
    partOfSpeech: 'v./n.',
    meaning: '制造；制造业',
    breakdown: {
      parts: [
        { text: 'manu', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'man/manu') },
        { text: 'fact', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'fac/fect') },
        { text: 'ure', type: 'suffix' },
      ],
      etymology: '源自拉丁语 manu factum，由 manus(手) + facere(做) 构成，原意为"手工制作"，后引申为工业制造。'
    }
  },
  'psychology': {
    word: 'psychology',
    phonetic: '/saɪˈkɒlədʒi/',
    partOfSpeech: 'n.',
    meaning: '心理学',
    breakdown: {
      parts: [
        { text: 'psych', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'psych') },
        { text: 'ology', type: 'suffix', rootInfo: rootsDatabase.find(r => r.root === 'log/logy') },
      ],
      etymology: '源自希腊语 psyche(灵魂) + logos(学说)，17世纪创造，意为"研究心灵的学科"。'
    }
  },
  'geography': {
    word: 'geography',
    phonetic: '/dʒiˈɒɡrəfi/',
    partOfSpeech: 'n.',
    meaning: '地理学',
    breakdown: {
      parts: [
        { text: 'geo', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'geo') },
        { text: 'graphy', type: 'suffix', rootInfo: rootsDatabase.find(r => r.root === 'graph') },
      ],
      etymology: '源自希腊语 geographia，由 ge(地球) + graphein(描述) 构成，意为"描述地球的学科"。'
    }
  },
  'chronology': {
    word: 'chronology',
    phonetic: '/krəˈnɒlədʒi/',
    partOfSpeech: 'n.',
    meaning: '年代学，时间顺序',
    breakdown: {
      parts: [
        { text: 'chrono', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'chrono') },
        { text: 'logy', type: 'suffix', rootInfo: rootsDatabase.find(r => r.root === 'log/logy') },
      ],
      etymology: '源自希腊语 chronologia，由 chronos(时间) + logos(学说) 构成，意为"研究时间顺序的学科"。'
    }
  },
  'transform': {
    word: 'transform',
    phonetic: '/trænsˈfɔːm/',
    partOfSpeech: 'v.',
    meaning: '转变，变形',
    breakdown: {
      parts: [
        { text: 'trans', type: 'prefix', rootInfo: prefixDatabase['trans'] },
        { text: 'form', type: 'root', rootInfo: rootsDatabase.find(r => r.root === 'form') },
      ],
      etymology: '源自拉丁语 transformare，由 trans-(穿过，改变) + forma(形状) 构成，意为"改变形状"。'
    }
  },
  'impossible': {
    word: 'impossible',
    phonetic: '/ɪmˈpɒsəbl/',
    partOfSpeech: 'adj.',
    meaning: '不可能的',
    breakdown: {
      parts: [
        { text: 'im', type: 'prefix', rootInfo: prefixDatabase['in/im'] },
        { text: 'poss', type: 'root' },
        { text: 'ible', type: 'suffix', rootInfo: suffixDatabase['able/ible'] },
      ],
      etymology: '源自拉丁语 impossibilis，由 im-(不) + posse(能够) + -ibilis(能够) 构成，意为"做不到的"。'
    }
  },
};

export function queryWord(word: string): WordData | null {
  const lowerWord = word.toLowerCase().trim();
  if (wordDatabase[lowerWord]) {
    return wordDatabase[lowerWord];
  }
  return generateFallbackWord(lowerWord);
}

function generateFallbackWord(word: string): WordData {
  const len = word.length;
  const parts: WordBreakdown['parts'] = [];
  let remaining = word;

  for (const prefix of Object.keys(prefixDatabase).sort((a, b) => b.length - a.length)) {
    const prefixes = prefix.split('/');
    for (const p of prefixes) {
      if (remaining.startsWith(p) && remaining.length > p.length + 2) {
        parts.push({ text: p, type: 'prefix', rootInfo: prefixDatabase[prefix] });
        remaining = remaining.slice(p.length);
        break;
      }
    }
    if (parts.length > 0) break;
  }

  for (const suffix of Object.keys(suffixDatabase).sort((a, b) => b.length - a.length)) {
    const suffixes = suffix.split('/');
    for (const s of suffixes) {
      if (remaining.endsWith(s) && remaining.length > s.length + 2) {
        const rootPart = remaining.slice(0, remaining.length - s.length);
        const matchedRoot = rootsDatabase.find(r => {
          const variants = r.root.split('/');
          return variants.some(v => rootPart.includes(v) || v.includes(rootPart));
        });
        if (matchedRoot) {
          parts.push({ text: rootPart, type: 'root', rootInfo: matchedRoot });
        } else if (rootPart.length > 0) {
          parts.push({ text: rootPart, type: 'root' });
        }
        parts.push({ text: s, type: 'suffix', rootInfo: suffixDatabase[suffix] });
        remaining = '';
        break;
      }
    }
    if (remaining === '') break;
  }

  if (remaining.length > 0) {
    if (parts.length === 0 || parts[parts.length - 1].type === 'prefix') {
      const matchedRoot = rootsDatabase.find(r => {
        const variants = r.root.split('/');
        return variants.some(v => remaining.includes(v) || v.includes(remaining));
      });
      if (matchedRoot) {
        parts.push({ text: remaining, type: 'root', rootInfo: matchedRoot });
      } else {
        parts.push({ text: remaining, type: 'root' });
      }
    }
  }

  if (parts.length === 0) {
    parts.push({ text: word, type: 'root' });
  }

  return {
    word: word,
    phonetic: generatePhonetic(word),
    partOfSpeech: 'n.',
    meaning: '（自动生成）请查阅词典获取准确释义',
    breakdown: {
      parts,
      etymology: `单词 "${word}" 可拆解为 ${parts.map(p => p.text).join(' + ')}。${parts.filter(p => p.rootInfo).length > 0 ? '根据词根推断：' : ''}${parts.filter(p => p.rootInfo).map(p => `${p.text} (${p.rootInfo!.meaning})`).join('，')}。`
    }
  };
}

function generatePhonetic(word: string): string {
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  let phonetic = '';
  for (let i = 0; i < word.length; i++) {
    const char = word[i].toLowerCase();
    if (vowels.includes(char)) {
      phonetic += char === 'a' ? 'æ' : char === 'e' ? 'ɛ' : char === 'i' ? 'ɪ' : char === 'o' ? 'ɒ' : 'ʌ';
    } else {
      phonetic += char;
    }
  }
  return `/${phonetic}/`;
}
