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

const PREFIX_RULES: Array<{
  patterns: RegExp[];
  display: string;
  info: RootInfo;
  minAfter: number;
}> = [
  { patterns: [/^un(?![aeiou])/], display: 'un', info: { root: 'un', meaning: '不，非，相反', origin: 'OE un- (not)', originLanguage: 'Old English' }, minAfter: 2 },
  { patterns: [/^re(?![aeiou])/, /^re(?=e)/], display: 're', info: { root: 're', meaning: '再次，返回', origin: 'L re- (again)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^pre(?![aeiou])/, /^pre(?=e)/], display: 'pre', info: { root: 'pre', meaning: '在...之前', origin: 'L prae (before)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^dis(?![aeiou])/, /^dif(?=f)/], display: 'dis', info: { root: 'dis', meaning: '分离，不', origin: 'L dis- (apart)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^mis(?![aeiou])/], display: 'mis', info: { root: 'mis', meaning: '错误的', origin: 'OE mis- (wrong)', originLanguage: 'Old English' }, minAfter: 2 },
  { patterns: [/^sub(?![aeiou])/, /^suc(?=c)/, /^suf(?=f)/, /^sup(?=p)/], display: 'sub', info: { root: 'sub', meaning: '在下，次于', origin: 'L sub (under)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^super(?![aeiou])/], display: 'super', info: { root: 'super', meaning: '在上，超级', origin: 'L super (above)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^inter(?![aeiou])/], display: 'inter', info: { root: 'inter', meaning: '在...之间', origin: 'L inter (between)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^trans(?![aeiou])/], display: 'trans', info: { root: 'trans', meaning: '穿过，转变', origin: 'L trans (across)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^anti(?![aeiou])/, /^ant(?=i)/], display: 'anti', info: { root: 'anti', meaning: '反对', origin: 'Gk anti (against)', originLanguage: 'Greek' }, minAfter: 2 },
  { patterns: [/^auto(?![aeiou])/], display: 'auto', info: { root: 'auto', meaning: '自己，自动', origin: 'Gk autos (self)', originLanguage: 'Greek' }, minAfter: 2 },
  { patterns: [/^tele(?![aeiou])/], display: 'tele', info: { root: 'tele', meaning: '远', origin: 'Gk tele (far)', originLanguage: 'Greek' }, minAfter: 2 },
  { patterns: [/^ex(?![aeiou])/, /^ef(?=f)/], display: 'ex', info: { root: 'ex', meaning: '出，外', origin: 'L ex- (out)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^de(?![aeiou])/], display: 'de', info: { root: 'de', meaning: '向下，去除', origin: 'L de- (down)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^over(?![aeiou])/], display: 'over', info: { root: 'over', meaning: '过度，在上', origin: 'OE ofer', originLanguage: 'Old English' }, minAfter: 2 },
  { patterns: [/^under(?![aeiou])/], display: 'under', info: { root: 'under', meaning: '在下，不足', origin: 'OE under', originLanguage: 'Old English' }, minAfter: 2 },
  { patterns: [/^out(?![aeiou])/], display: 'out', info: { root: 'out', meaning: '出，超过', origin: 'OE ut', originLanguage: 'Old English' }, minAfter: 2 },
  { patterns: [/^bi(?![aeiou])/], display: 'bi', info: { root: 'bi', meaning: '二，双', origin: 'L bis (twice)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^tri(?![aeiou])/], display: 'tri', info: { root: 'tri', meaning: '三', origin: 'L/Gk treis', originLanguage: 'Latin/Greek' }, minAfter: 2 },
  { patterns: [/^multi(?![aeiou])/], display: 'multi', info: { root: 'multi', meaning: '多', origin: 'L multus (many)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^semi(?![aeiou])/], display: 'semi', info: { root: 'semi', meaning: '半', origin: 'L semi (half)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^micro(?![aeiou])/], display: 'micro', info: { root: 'micro', meaning: '微小', origin: 'Gk mikros', originLanguage: 'Greek' }, minAfter: 2 },
  { patterns: [/^macro(?![aeiou])/], display: 'macro', info: { root: 'macro', meaning: '大，宏观', origin: 'Gk makros', originLanguage: 'Greek' }, minAfter: 2 },
  { patterns: [/^poly(?![aeiou])/], display: 'poly', info: { root: 'poly', meaning: '多', origin: 'Gk polys', originLanguage: 'Greek' }, minAfter: 2 },
  { patterns: [/^mono(?![aeiou])/, /^mon(?=a)/], display: 'mono', info: { root: 'mono', meaning: '单一', origin: 'Gk monos', originLanguage: 'Greek' }, minAfter: 2 },
  { patterns: [/^im(?=[pbm])/], display: 'im', info: { root: 'in', meaning: '不/进入', origin: 'L in- (not/in)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^il(?=[l])/], display: 'il', info: { root: 'in', meaning: '不', origin: 'L in- (not)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^ir(?=[r])/], display: 'ir', info: { root: 'in', meaning: '不', origin: 'L in- (not)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^in(?![aeiou])/], display: 'in', info: { root: 'in', meaning: '不/进入', origin: 'L in- (not/in)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^con(?![aeiou])/, /^cog(?=n)/], display: 'con', info: { root: 'con', meaning: '共同，一起', origin: 'L cum (with)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^com(?=[pbm])/], display: 'com', info: { root: 'con', meaning: '共同，一起', origin: 'L cum (with)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^pro(?![aeiou])/], display: 'pro', info: { root: 'pro', meaning: '向前，支持', origin: 'L pro (for)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^per(?![aeiou])/], display: 'per', info: { root: 'per', meaning: '通过，完全', origin: 'L per (through)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^counter(?![aeiou])/, /^contra(?![aeiou])/], display: 'counter', info: { root: 'counter', meaning: '相反，对抗', origin: 'L contra (against)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^non(?![aeiou])/], display: 'non', info: { root: 'non', meaning: '不，非', origin: 'L non (not)', originLanguage: 'Latin' }, minAfter: 2 },
  { patterns: [/^co(?=[aeiou])/], display: 'co', info: { root: 'co', meaning: '共同', origin: 'L co- (with)', originLanguage: 'Latin' }, minAfter: 2 },
];

const SUFFIX_RULES: Array<{
  patterns: RegExp[];
  display: string;
  info: RootInfo;
  minBefore: number;
  stripVowel?: boolean;
}> = [
  { patterns: [/ization$/], display: 'ization', info: { root: 'ization', meaning: '...化的过程', origin: '-izare + -tio', originLanguage: 'Greek/Latin' }, minBefore: 1 },
  { patterns: [/ification$/], display: 'ification', info: { root: 'ification', meaning: '使成为...', origin: '-ficare + -tio', originLanguage: 'Latin' }, minBefore: 1 },
  { patterns: [/ableness$/], display: 'ableness', info: { root: 'able+ness', meaning: '可...性', origin: '-abilis + -nes', originLanguage: 'Latin/Old English' }, minBefore: 1 },
  { patterns: [/ibility$/], display: 'ibility', info: { root: 'ible+ness', meaning: '可...性', origin: '-ibilis + -itas', originLanguage: 'Latin' }, minBefore: 1 },
  { patterns: [/ational$/], display: 'ational', info: { root: 'ate+al', meaning: '具有...性质的', origin: '-atus + -alis', originLanguage: 'Latin' }, minBefore: 1 },
  { patterns: [/tional$/], display: 'tional', info: { root: 'tion+al', meaning: '与...相关的', origin: '-tio + -alis', originLanguage: 'Latin' }, minBefore: 1 },
  { patterns: [/sional$/], display: 'sional', info: { root: 'sion+al', meaning: '与...相关的', origin: '-sio + -alis', originLanguage: 'Latin' }, minBefore: 1 },
  { patterns: [/ginal$/], display: 'ginal', info: { root: 'gin+al', meaning: '起源的', origin: '-gen + -alis', originLanguage: 'Latin' }, minBefore: 1 },
  { patterns: [/fulness$/], display: 'fulness', info: { root: 'ful+ness', meaning: '充满...的状态', origin: '-full + -nes', originLanguage: 'Old English' }, minBefore: 1 },
  { patterns: [/lessness$/], display: 'lessness', info: { root: 'less+ness', meaning: '缺乏...的状态', origin: '-leas + -nes', originLanguage: 'Old English' }, minBefore: 1 },
  { patterns: [/ousness$/], display: 'ousness', info: { root: 'ous+ness', meaning: '...的状态', origin: '-osus + -nes', originLanguage: 'Latin/Old English' }, minBefore: 1 },
  { patterns: [/ivity$/], display: 'ivity', info: { root: 'ive+ity', meaning: '...的性质', origin: '-ivus + -itas', originLanguage: 'Latin' }, minBefore: 1 },
  { patterns: [/ality$/], display: 'ality', info: { root: 'al+ity', meaning: '...的性质', origin: '-alis + -itas', originLanguage: 'Latin' }, minBefore: 1 },
  { patterns: [/ically$/], display: 'ically', info: { root: 'ic+al+ly', meaning: '以...方式', origin: '-ikos + -alis + -lice', originLanguage: 'Greek/Latin/OE' }, minBefore: 2 },
  { patterns: [/tion$/], display: 'tion', info: { root: 'tion', meaning: '动作/状态', origin: 'L -tio', originLanguage: 'Latin' }, minBefore: 2 },
  { patterns: [/sion$/], display: 'sion', info: { root: 'sion', meaning: '动作/状态', origin: 'L -sio', originLanguage: 'Latin' }, minBefore: 2 },
  { patterns: [/ment$/], display: 'ment', info: { root: 'ment', meaning: '结果/状态', origin: 'L -mentum', originLanguage: 'Latin' }, minBefore: 2 },
  { patterns: [/ness$/], display: 'ness', info: { root: 'ness', meaning: '性质/状态', origin: 'OE -nes', originLanguage: 'Old English' }, minBefore: 2 },
  { patterns: [/ship$/], display: 'ship', info: { root: 'ship', meaning: '身份/状态', origin: 'OE -scipe', originLanguage: 'Old English' }, minBefore: 2 },
  { patterns: [/hood$/], display: 'hood', info: { root: 'hood', meaning: '身份/状态', origin: 'OE -had', originLanguage: 'Old English' }, minBefore: 2 },
  { patterns: [/dom$/], display: 'dom', info: { root: 'dom', meaning: '领域/状态', origin: 'OE -dom', originLanguage: 'Old English' }, minBefore: 2 },
  { patterns: [/able$/], display: 'able', info: { root: 'able', meaning: '能够的', origin: 'L -abilis', originLanguage: 'Latin' }, minBefore: 2 },
  { patterns: [/ible$/], display: 'ible', info: { root: 'ible', meaning: '能够的', origin: 'L -ibilis', originLanguage: 'Latin' }, minBefore: 2 },
  { patterns: [/ful$/], display: 'ful', info: { root: 'ful', meaning: '充满的', origin: 'OE -full', originLanguage: 'Old English' }, minBefore: 2 },
  { patterns: [/less$/], display: 'less', info: { root: 'less', meaning: '没有的', origin: 'OE -leas', originLanguage: 'Old English' }, minBefore: 2 },
  { patterns: [/ous$/], display: 'ous', info: { root: 'ous', meaning: '具有...的', origin: 'L -osus', originLanguage: 'Latin' }, minBefore: 2, stripVowel: true },
  { patterns: [/ive$/], display: 'ive', info: { root: 'ive', meaning: '倾向于', origin: 'L -ivus', originLanguage: 'Latin' }, minBefore: 2 },
  { patterns: [/ical$/], display: 'ical', info: { root: 'ical', meaning: '与...相关的', origin: '-ikos + -alis', originLanguage: 'Greek/Latin' }, minBefore: 2 },
  { patterns: [/al$/], display: 'al', info: { root: 'al', meaning: '关于...的', origin: 'L -alis', originLanguage: 'Latin' }, minBefore: 3 },
  { patterns: [/ly$/], display: 'ly', info: { root: 'ly', meaning: '以...方式', origin: 'OE -lice', originLanguage: 'Old English' }, minBefore: 3 },
  { patterns: [/er$/], display: 'er', info: { root: 'er', meaning: '做...的人/物', origin: 'OE -ere', originLanguage: 'Old English' }, minBefore: 3 },
  { patterns: [/or$/], display: 'or', info: { root: 'or', meaning: '做...的人/物', origin: 'L -or', originLanguage: 'Latin' }, minBefore: 3 },
  { patterns: [/ist$/], display: 'ist', info: { root: 'ist', meaning: '从事...的人', origin: 'Gk -istes', originLanguage: 'Greek' }, minBefore: 2 },
  { patterns: [/ism$/], display: 'ism', info: { root: 'ism', meaning: '主义/学说', origin: 'Gk -ismos', originLanguage: 'Greek' }, minBefore: 2 },
  { patterns: [/ity$/], display: 'ity', info: { root: 'ity', meaning: '性质/状态', origin: 'L -itas', originLanguage: 'Latin' }, minBefore: 3, stripVowel: true },
  { patterns: [/ology$/], display: 'ology', info: { root: 'ology', meaning: '...学', origin: 'Gk -logos', originLanguage: 'Greek' }, minBefore: 2 },
  { patterns: [/onomy$/], display: 'onomy', info: { root: 'onomy', meaning: '法则/学科', origin: 'Gk -nomos', originLanguage: 'Greek' }, minBefore: 2 },
  { patterns: [/graphy$/], display: 'graphy', info: { root: 'graphy', meaning: '记录/描述', origin: 'Gk -graphia', originLanguage: 'Greek' }, minBefore: 2 },
  { patterns: [/logue$/], display: 'logue', info: { root: 'logue', meaning: '说话/论述', origin: 'Gk -logos', originLanguage: 'Greek' }, minBefore: 2 },
  { patterns: [/scope$/], display: 'scope', info: { root: 'scope', meaning: '观察仪器', origin: 'Gk -skopion', originLanguage: 'Greek' }, minBefore: 2 },
  { patterns: [/ize$/], display: 'ize', info: { root: 'ize', meaning: '使成为', origin: 'Gk -izein', originLanguage: 'Greek' }, minBefore: 2 },
  { patterns: [/ify$/], display: 'ify', info: { root: 'ify', meaning: '使...化', origin: 'L -ficare', originLanguage: 'Latin' }, minBefore: 2 },
  { patterns: [/ate$/], display: 'ate', info: { root: 'ate', meaning: '使成为', origin: 'L -atus', originLanguage: 'Latin' }, minBefore: 3 },
  { patterns: [/en$/], display: 'en', info: { root: 'en', meaning: '使成为', origin: 'OE -jan', originLanguage: 'Old English' }, minBefore: 3 },
  { patterns: [/ic$/], display: 'ic', info: { root: 'ic', meaning: '具有...性质', origin: 'Gk -ikos', originLanguage: 'Greek' }, minBefore: 3 },
  { patterns: [/ary$/], display: 'ary', info: { root: 'ary', meaning: '与...相关', origin: 'L -arius', originLanguage: 'Latin' }, minBefore: 2 },
  { patterns: [/ory$/], display: 'ory', info: { root: 'ory', meaning: '与...相关', origin: 'L -orius', originLanguage: 'Latin' }, minBefore: 2 },
  { patterns: [/ward$/], display: 'ward', info: { root: 'ward', meaning: '向...方向', origin: 'OE -weard', originLanguage: 'Old English' }, minBefore: 2 },
  { patterns: [/ical$/], display: 'ical', info: { root: 'ical', meaning: '与...相关的', origin: '-ikos + -alis', originLanguage: 'Greek/Latin' }, minBefore: 2 },
];

const ROOT_RULES: Array<{
  patterns: RegExp[];
  display: string;
  info: RootInfo;
}> = [
  { patterns: [/aud/], display: 'aud', info: { root: 'aud', meaning: '听，声音', origin: 'L audire', originLanguage: 'Latin' } },
  { patterns: [/spect/], display: 'spect', info: { root: 'spect', meaning: '看，观察', origin: 'L spectare', originLanguage: 'Latin' } },
  { patterns: [/spec(?=[ti])/], display: 'spec', info: { root: 'spect', meaning: '看', origin: 'L specere', originLanguage: 'Latin' } },
  { patterns: [/dict/], display: 'dict', info: { root: 'dict', meaning: '说，言', origin: 'L dicere', originLanguage: 'Latin' } },
  { patterns: [/scrib/], display: 'scrib', info: { root: 'scrib', meaning: '写', origin: 'L scribere', originLanguage: 'Latin' } },
  { patterns: [/script/], display: 'script', info: { root: 'script', meaning: '写', origin: 'L scriptus', originLanguage: 'Latin' } },
  { patterns: [/port/], display: 'port', info: { root: 'port', meaning: '携带', origin: 'L portare', originLanguage: 'Latin' } },
  { patterns: [/duct/], display: 'duct', info: { root: 'duct', meaning: '引导', origin: 'L ducere', originLanguage: 'Latin' } },
  { patterns: [/duc(?=[ae])/], display: 'duc', info: { root: 'duc', meaning: '引导', origin: 'L ducere', originLanguage: 'Latin' } },
  { patterns: [/struct/], display: 'struct', info: { root: 'struct', meaning: '建造', origin: 'L struere', originLanguage: 'Latin' } },
  { patterns: [/tract/], display: 'tract', info: { root: 'tract', meaning: '拉，拖', origin: 'L trahere', originLanguage: 'Latin' } },
  { patterns: [/ject/], display: 'ject', info: { root: 'ject', meaning: '投，掷', origin: 'L jacere', originLanguage: 'Latin' } },
  { patterns: [/miss/], display: 'miss', info: { root: 'miss', meaning: '发送', origin: 'L mittere', originLanguage: 'Latin' } },
  { patterns: [/mit(?=[st])/], display: 'mit', info: { root: 'mit', meaning: '发送', origin: 'L mittere', originLanguage: 'Latin' } },
  { patterns: [/vis(?![a])/], display: 'vis', info: { root: 'vis', meaning: '看', origin: 'L videre', originLanguage: 'Latin' } },
  { patterns: [/vid/], display: 'vid', info: { root: 'vid', meaning: '看', origin: 'L videre', originLanguage: 'Latin' } },
  { patterns: [/cept/], display: 'cept', info: { root: 'cept', meaning: '拿，取', origin: 'L capere', originLanguage: 'Latin' } },
  { patterns: [/ceiv/], display: 'ceiv', info: { root: 'ceiv', meaning: '拿，取', origin: 'L capere', originLanguage: 'Latin' } },
  { patterns: [/pos(?=[eit])/], display: 'pos', info: { root: 'pos', meaning: '放置', origin: 'L ponere', originLanguage: 'Latin' } },
  { patterns: [/pon/], display: 'pon', info: { root: 'pon', meaning: '放置', origin: 'L ponere', originLanguage: 'Latin' } },
  { patterns: [/fer(?=[^e])/], display: 'fer', info: { root: 'fer', meaning: '带来，承载', origin: 'L ferre', originLanguage: 'Latin' } },
  { patterns: [/tend/], display: 'tend', info: { root: 'tend', meaning: '伸展', origin: 'L tendere', originLanguage: 'Latin' } },
  { patterns: [/tens/], display: 'tens', info: { root: 'tens', meaning: '伸展', origin: 'L tendere', originLanguage: 'Latin' } },
  { patterns: [/vers/], display: 'vers', info: { root: 'vers', meaning: '转', origin: 'L vertere', originLanguage: 'Latin' } },
  { patterns: [/vert/], display: 'vert', info: { root: 'vert', meaning: '转', origin: 'L vertere', originLanguage: 'Latin' } },
  { patterns: [/graph/], display: 'graph', info: { root: 'graph', meaning: '写，画', origin: 'Gk graphein', originLanguage: 'Greek' } },
  { patterns: [/gram/], display: 'gram', info: { root: 'gram', meaning: '写，记录', origin: 'Gk gramma', originLanguage: 'Greek' } },
  { patterns: [/log(?=[yio])/], display: 'log', info: { root: 'log', meaning: '学科，言语', origin: 'Gk logos', originLanguage: 'Greek' } },
  { patterns: [/bio(?![n])/], display: 'bio', info: { root: 'bio', meaning: '生命', origin: 'Gk bios', originLanguage: 'Greek' } },
  { patterns: [/geo/], display: 'geo', info: { root: 'geo', meaning: '地球', origin: 'Gk ge', originLanguage: 'Greek' } },
  { patterns: [/phon(?=[yeoi])/], display: 'phon', info: { root: 'phon', meaning: '声音', origin: 'Gk phone', originLanguage: 'Greek' } },
  { patterns: [/phot(?=[o])/], display: 'phot', info: { root: 'phot', meaning: '光', origin: 'Gk phos', originLanguage: 'Greek' } },
  { patterns: [/photo/], display: 'photo', info: { root: 'photo', meaning: '光', origin: 'Gk phos', originLanguage: 'Greek' } },
  { patterns: [/chrono/], display: 'chrono', info: { root: 'chrono', meaning: '时间', origin: 'Gk chronos', originLanguage: 'Greek' } },
  { patterns: [/psych/], display: 'psych', info: { root: 'psych', meaning: '心灵', origin: 'Gk psyche', originLanguage: 'Greek' } },
  { patterns: [/morph/], display: 'morph', info: { root: 'morph', meaning: '形态', origin: 'Gk morphe', originLanguage: 'Greek' } },
  { patterns: [/path(?=[oyie])/], display: 'path', info: { root: 'path', meaning: '感情，疾病', origin: 'Gk pathos', originLanguage: 'Greek' } },
  { patterns: [/phil(?=[lio])/], display: 'phil', info: { root: 'phil', meaning: '爱', origin: 'Gk philos', originLanguage: 'Greek' } },
  { patterns: [/phob/], display: 'phob', info: { root: 'phob', meaning: '恐惧', origin: 'Gk phobos', originLanguage: 'Greek' } },
  { patterns: [/mem(?=[orbe])/], display: 'mem', info: { root: 'mem', meaning: '记忆', origin: 'L memor', originLanguage: 'Latin' } },
  { patterns: [/voc(?=[aike])/], display: 'voc', info: { root: 'voc', meaning: '叫，声音', origin: 'L vocare', originLanguage: 'Latin' } },
  { patterns: [/vok/], display: 'vok', info: { root: 'vok', meaning: '叫', origin: 'L vocare', originLanguage: 'Latin' } },
  { patterns: [/act/], display: 'act', info: { root: 'act', meaning: '做，行动', origin: 'L agere', originLanguage: 'Latin' } },
  { patterns: [/rupt/], display: 'rupt', info: { root: 'rupt', meaning: '破裂', origin: 'L rumpere', originLanguage: 'Latin' } },
  { patterns: [/fact/], display: 'fact', info: { root: 'fact', meaning: '做，制造', origin: 'L facere', originLanguage: 'Latin' } },
  { patterns: [/fect/], display: 'fect', info: { root: 'fect', meaning: '做，制造', origin: 'L facere', originLanguage: 'Latin' } },
  { patterns: [/fac(?=[eite])/], display: 'fac', info: { root: 'fac', meaning: '做', origin: 'L facere', originLanguage: 'Latin' } },
  { patterns: [/cide/], display: 'cide', info: { root: 'cide', meaning: '切，杀', origin: 'L caedere', originLanguage: 'Latin' } },
  { patterns: [/cis/], display: 'cis', info: { root: 'cis', meaning: '切', origin: 'L caedere', originLanguage: 'Latin' } },
  { patterns: [/mot/], display: 'mot', info: { root: 'mot', meaning: '移动', origin: 'L movere', originLanguage: 'Latin' } },
  { patterns: [/mov(?=e)/], display: 'mov', info: { root: 'mov', meaning: '移动', origin: 'L movere', originLanguage: 'Latin' } },
  { patterns: [/cred/], display: 'cred', info: { root: 'cred', meaning: '相信', origin: 'L credere', originLanguage: 'Latin' } },
  { patterns: [/cur(?=[rs])/], display: 'cur', info: { root: 'cur', meaning: '跑，流', origin: 'L currere', originLanguage: 'Latin' } },
  { patterns: [/curs/], display: 'curs', info: { root: 'curs', meaning: '跑，流', origin: 'L currere', originLanguage: 'Latin' } },
  { patterns: [/fin(?=[ide])/], display: 'fin', info: { root: 'fin', meaning: '结束，界限', origin: 'L finis', originLanguage: 'Latin' } },
  { patterns: [/flu(?=[xue])/], display: 'flu', info: { root: 'flu', meaning: '流', origin: 'L fluere', originLanguage: 'Latin' } },
  { patterns: [/form/], display: 'form', info: { root: 'form', meaning: '形状', origin: 'L forma', originLanguage: 'Latin' } },
  { patterns: [/grad/], display: 'grad', info: { root: 'grad', meaning: '步，走', origin: 'L gradus', originLanguage: 'Latin' } },
  { patterns: [/gress/], display: 'gress', info: { root: 'gress', meaning: '步，走', origin: 'L gradior', originLanguage: 'Latin' } },
  { patterns: [/jud/], display: 'jud', info: { root: 'jud', meaning: '判断', origin: 'L judex', originLanguage: 'Latin' } },
  { patterns: [/leg(?=[iae])/], display: 'leg', info: { root: 'leg', meaning: '法律，读', origin: 'L legere', originLanguage: 'Latin' } },
  { patterns: [/lig(?=[aei])/], display: 'lig', info: { root: 'lig', meaning: '选择', origin: 'L legere', originLanguage: 'Latin' } },
  { patterns: [/loc(?=[aio])/], display: 'loc', info: { root: 'loc', meaning: '地方', origin: 'L locus', originLanguage: 'Latin' } },
  { patterns: [/manu/], display: 'manu', info: { root: 'manu', meaning: '手', origin: 'L manus', originLanguage: 'Latin' } },
  { patterns: [/man(?=[u])/], display: 'man', info: { root: 'man', meaning: '手', origin: 'L manus', originLanguage: 'Latin' } },
  { patterns: [/nat(?=[iue])/], display: 'nat', info: { root: 'nat', meaning: '出生', origin: 'L natus', originLanguage: 'Latin' } },
  { patterns: [/ped(?=[iae])/], display: 'ped', info: { root: 'ped', meaning: '脚', origin: 'L pes', originLanguage: 'Latin' } },
  { patterns: [/sens/], display: 'sens', info: { root: 'sens', meaning: '感觉', origin: 'L sentire', originLanguage: 'Latin' } },
  { patterns: [/sent(?=[ient])/], display: 'sent', info: { root: 'sent', meaning: '感觉', origin: 'L sentire', originLanguage: 'Latin' } },
  { patterns: [/press/], display: 'press', info: { root: 'press', meaning: '压', origin: 'L pressare', originLanguage: 'Latin' } },
  { patterns: [/pend(?=[sen])/], display: 'pend', info: { root: 'pend', meaning: '悬挂', origin: 'L pendere', originLanguage: 'Latin' } },
  { patterns: [/pens/], display: 'pens', info: { root: 'pens', meaning: '悬挂，称重', origin: 'L pendere', originLanguage: 'Latin' } },
  { patterns: [/sign/], display: 'sign', info: { root: 'sign', meaning: '标记', origin: 'L signum', originLanguage: 'Latin' } },
  { patterns: [/stat/], display: 'stat', info: { root: 'stat', meaning: '站立', origin: 'L stare', originLanguage: 'Latin' } },
  { patterns: [/stant/], display: 'stant', info: { root: 'stant', meaning: '站立', origin: 'L stare', originLanguage: 'Latin' } },
  { patterns: [/st(?=[aio])/], display: 'st', info: { root: 'st', meaning: '站立', origin: 'L stare', originLanguage: 'Latin' } },
  { patterns: [/tain/], display: 'tain', info: { root: 'tain', meaning: '保持，拿住', origin: 'L tenere', originLanguage: 'Latin' } },
  { patterns: [/ten(?=[dnt])/], display: 'ten', info: { root: 'ten', meaning: '保持', origin: 'L tenere', originLanguage: 'Latin' } },
  { patterns: [/techn/], display: 'techn', info: { root: 'techn', meaning: '技术', origin: 'Gk techne', originLanguage: 'Greek' } },
  { patterns: [/therm/], display: 'therm', info: { root: 'therm', meaning: '热', origin: 'Gk therme', originLanguage: 'Greek' } },
  { patterns: [/scop/], display: 'scop', info: { root: 'scop', meaning: '看', origin: 'Gk skopein', originLanguage: 'Greek' } },
  { patterns: [/crit/], display: 'crit', meaning: '判断', info: { root: 'crit', meaning: '判断', origin: 'Gk krinein', originLanguage: 'Greek' } } as any,
  { patterns: [/cycl/], display: 'cycl', info: { root: 'cycl', meaning: '圆，环', origin: 'Gk kyklos', originLanguage: 'Greek' } },
  { patterns: [/dem(?=[oi])/], display: 'dem', info: { root: 'dem', meaning: '人民', origin: 'Gk demos', originLanguage: 'Greek' } },
  { patterns: [/gen(?=[eois])/], display: 'gen', info: { root: 'gen', meaning: '产生，种类', origin: 'Gk/L genos', originLanguage: 'Greek' } },
  { patterns: [/hydr(?=[o])/], display: 'hydr', info: { root: 'hydr', meaning: '水', origin: 'Gk hydor', originLanguage: 'Greek' } },
  { patterns: [/logy/], display: 'logy', info: { root: 'logy', meaning: '学科', origin: 'Gk -logia', originLanguage: 'Greek' } },
  { patterns: [/metr/], display: 'metr', info: { root: 'metr', meaning: '测量', origin: 'Gk metron', originLanguage: 'Greek' } },
  { patterns: [/onym/], display: 'onym', info: { root: 'onym', meaning: '名字', origin: 'Gk onoma', originLanguage: 'Greek' } },
  { patterns: [/polit(?=[ei])/], display: 'polit', info: { root: 'polit', meaning: '城市，政治', origin: 'Gk polis', originLanguage: 'Greek' } },
  { patterns: [/syn/], display: 'syn', info: { root: 'syn', meaning: '共同', origin: 'Gk syn', originLanguage: 'Greek' } },
  { patterns: [/sym(?=[pbm])/], display: 'sym', info: { root: 'sym', meaning: '共同', origin: 'Gk syn', originLanguage: 'Greek' } },
  { patterns: [/tax(?=[i])/], display: 'tax', info: { root: 'tax', meaning: '排列', origin: 'Gk taxis', originLanguage: 'Greek' } },
  { patterns: [/top(?=[io])/], display: 'top', info: { root: 'top', meaning: '地方', origin: 'Gk topos', originLanguage: 'Greek' } },
  { patterns: [/zoo/], display: 'zoo', info: { root: 'zoo', meaning: '动物', origin: 'Gk zoon', originLanguage: 'Greek' } },
];

const VOWELS = 'aeiou';

function matchPrefix(word: string): { consumed: number; part: WordPart } | null {
  for (const rule of PREFIX_RULES) {
    for (const pattern of rule.patterns) {
      const m = word.match(pattern);
      if (m && m.index === 0 && word.length - m[0].length >= rule.minAfter) {
        return {
          consumed: m[0].length,
          part: { text: rule.display, type: 'prefix', rootInfo: rule.info },
        };
      }
    }
  }
  return null;
}

function matchSuffix(word: string): { consumed: number; part: WordPart; needsStem: boolean } | null {
  for (const rule of SUFFIX_RULES) {
    for (const pattern of rule.patterns) {
      const m = word.match(pattern);
      if (m) {
        const stemLen = m.index!;
        if (stemLen >= rule.minBefore) {
          return {
            consumed: word.length - m.index!,
            part: { text: rule.display, type: 'suffix', rootInfo: rule.info },
            needsStem: !!rule.stripVowel,
          };
        }
      }
    }
  }
  return null;
}

function matchRoots(text: string): WordPart[] {
  const parts: WordPart[] = [];
  if (!text) return parts;

  const matches: Array<{ start: number; end: number; part: WordPart }> = [];
  for (const rule of ROOT_RULES) {
    for (const pattern of rule.patterns) {
      const re = new RegExp(pattern.source, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        matches.push({
          start: m.index,
          end: m.index + rule.display.length,
          part: { text: rule.display, type: 'root', rootInfo: rule.info },
        });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
  }

  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const selected: typeof matches = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      selected.push(m);
      lastEnd = m.end;
    }
  }

  let cursor = 0;
  for (const m of selected) {
    if (m.start > cursor) {
      const before = text.slice(cursor, m.start);
      if (before) parts.push({ text: before, type: before.length === 1 && VOWELS.includes(before) ? 'connector' : 'root' });
    }
    parts.push(m.part);
    cursor = m.end;
  }
  if (cursor < text.length) {
    const after = text.slice(cursor);
    if (after) parts.push({ text: after, type: after.length === 1 && VOWELS.includes(after) ? 'connector' : 'root' });
  }

  if (parts.length === 0) {
    parts.push({ text, type: 'root' });
  }
  return parts;
}

export function analyzeWord(input: string): WordBreakdown {
  const word = input.toLowerCase().trim();
  const allParts: WordPart[] = [];
  let working = word;

  let prefixGuard = 0;
  while (working.length > 3 && prefixGuard < 3) {
    const pf = matchPrefix(working);
    if (!pf) break;
    allParts.push(pf.part);
    working = working.slice(pf.consumed);
    prefixGuard++;
  }

  type SuffixEntry = { part: WordPart; consumed: number };
  const suffixStack: SuffixEntry[] = [];
  let suffixGuard = 0;
  let tempWorking = working;

  while (tempWorking.length > 3 && suffixGuard < 4) {
    const sf = matchSuffix(tempWorking);
    if (!sf) break;
    suffixStack.push({ part: sf.part, consumed: sf.consumed });
    tempWorking = tempWorking.slice(0, tempWorking.length - sf.consumed);
    if (sf.needsStem && VOWELS.includes(tempWorking[tempWorking.length - 1]) && tempWorking.length > 2) {
      tempWorking = tempWorking.slice(0, -1);
    }
    suffixGuard++;
  }

  working = tempWorking;

  const rootParts = matchRoots(working);
  allParts.push(...rootParts);

  for (let i = suffixStack.length - 1; i >= 0; i--) {
    allParts.push(suffixStack[i].part);
  }

  if (allParts.length === 0) {
    allParts.push({ text: word, type: 'root' });
  }

  const etymology = buildEtymology(word, allParts);
  return { parts: allParts, etymology };
}

function buildEtymology(word: string, parts: WordPart[]): string {
  if (parts.length === 0) return `单词 "${word}" 暂无词源信息。`;

  const meaningful = parts.filter(p => p.type !== 'connector');
  if (meaningful.length === 0) return `单词 "${word}" 暂无词源信息。`;

  const construction = meaningful
    .map(p => {
      const lang = p.rootInfo?.originLanguage ? `（${p.rootInfo.originLanguage}）` : '';
      return `${p.text}${lang}`;
    }).join(' + ');

  const desc = parts.map(p => {
    if (p.rootInfo && p.type !== 'connector') {
      const label = p.type === 'prefix' ? '前缀' : p.type === 'suffix' ? '后缀' : '词根';
      return `"${p.text}"（${label}：${p.rootInfo.meaning}）`;
    }
    return p.type === 'connector' ? `连接符"${p.text}"` : `"${p.text}"`;
  }).join('、');

  return `单词 "${word}" 由 ${construction} 构成。${desc}。`;
}

function generatePhonetic(word: string): string {
  const w = word.toLowerCase();
  let p = '';
  for (let i = 0; i < w.length; i++) {
    const c = w[i], prev = i > 0 ? w[i - 1] : '', next = i < w.length - 1 ? w[i + 1] : '';
    if (VOWELS.includes(c)) {
      if (c === 'a') p += next === 'e' ? 'eɪ' : next === 'l' ? 'ɔː' : 'æ';
      else if (c === 'e') p += (i === w.length - 1) ? '' : prev === 'i' || next === 'e' ? 'iː' : 'ɛ';
      else if (c === 'i') p += next === 'e' ? 'aɪ' : 'ɪ';
      else if (c === 'o') p += next === 'e' ? 'oʊ' : 'ɒ';
      else if (c === 'u') p += next === 'e' ? 'juː' : 'ʌ';
    } else if (c === 'c') p += (['e', 'i', 'y'].includes(next)) ? 's' : 'k';
    else if (c === 'g') p += (['e', 'i', 'y'].includes(next)) ? 'dʒ' : 'ɡ';
    else if (c === 's' && next === 'h') { p += 'ʃ'; i++; }
    else if (c === 'c' && next === 'h') { p += 'tʃ'; i++; }
    else if (c === 't' && next === 'h') { p += i === 0 ? 'θ' : 'ð'; i++; }
    else if (c === 'p' && next === 'h') { p += 'f'; i++; }
    else if (c === 'y') p += (i === 0 || VOWELS.includes(prev)) ? 'j' : (VOWELS.includes(next) ? 'aɪ' : 'i');
    else if (c === 'q') { p += 'kw'; if (next === 'u') i++; }
    else if (c === 'x') p += 'ks';
    else if (c === 'w') p += next && VOWELS.includes(next) ? 'w' : '';
    else p += c;
  }
  return `/${p}/`;
}

function guessPos(parts: WordPart[]): string {
  const last = [...parts].reverse().find(p => p.type !== 'connector');
  if (!last) return 'n.';
  if (last.type === 'suffix') {
    const t = last.text.toLowerCase();
    if (['tion', 'sion', 'ment', 'ness', 'ship', 'hood', 'dom', 'ity', 'ist', 'ism', 'ity', 'er', 'or', 'logy', 'graphy', 'ology', 'ization', 'ification'].some(s => t.includes(s))) return 'n.';
    if (['able', 'ible', 'ful', 'less', 'ous', 'ive', 'al', 'ic', 'ary', 'ory', 'ical'].some(s => t.includes(s))) return 'adj.';
    if (['ly', 'ward'].some(s => t.includes(s))) return 'adv.';
    if (['ize', 'ify', 'ate', 'en'].some(s => t.includes(s))) return 'v.';
  }
  return 'n./v.';
}

function guessMeaning(parts: WordPart[]): string {
  const m = parts.filter(p => p.rootInfo && p.type !== 'connector');
  if (m.length === 0) return '请查阅词典获取准确释义';
  return `根据词根推断：${m.map(p => p.rootInfo!.meaning).join(' + ')}`;
}

export function queryWord(word: string): WordData {
  const trimmed = word.trim();
  const breakdown = analyzeWord(trimmed);
  return {
    word: trimmed,
    phonetic: generatePhonetic(trimmed),
    partOfSpeech: guessPos(breakdown.parts),
    meaning: guessMeaning(breakdown.parts),
    breakdown,
  };
}

export const rootsDatabase: RootInfo[] = [
  ...ROOT_RULES.map(r => r.info),
  ...PREFIX_RULES.map(r => r.info),
  ...SUFFIX_RULES.map(r => r.info),
];
