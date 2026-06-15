export interface ExtractedField {
  label: string;
  value: string;
  confidence: number;
}

export interface ParseResult {
  name: ExtractedField;
  email: ExtractedField;
  phone: ExtractedField;
  education: ExtractedField;
  experience: ExtractedField;
  skills: ExtractedField;
}

export interface RadarScore {
  dimension: string;
  score: number;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?86[-\s]?)?1[3-9]\d{9}|(?:0\d{2,3}[-\s]?)?\d{7,8}/g;
const SKILL_KEYWORDS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C\\+\\+', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
  'React', 'Vue', 'Angular', 'Node\\.js', 'Express', 'Next\\.js', 'Nuxt', 'Svelte',
  'HTML', 'CSS', 'Sass', 'Less', 'Tailwind', 'Bootstrap',
  'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Linux', 'Nginx',
  'Git', 'GitHub', 'GitLab', 'CI/CD', 'Jenkins',
  'REST', 'GraphQL', 'WebSocket', 'Microservice',
  'Machine Learning', 'Deep Learning', 'NLP', 'TensorFlow', 'PyTorch',
  'Figma', 'Photoshop', 'Illustrator', 'UI/UX',
  'Agile', 'Scrum', 'Jira', 'TDD',
  'Excel', 'Word', 'PowerPoint', 'SAP',
  '项目管理', '团队协作', '沟通能力', '领导力', '英语', '日语',
];

function extractEmails(text: string): { value: string; confidence: number } {
  const matches = text.match(EMAIL_REGEX);
  if (!matches || matches.length === 0) {
    return { value: '', confidence: 0 };
  }
  const email = matches[0];
  const hasValidDomain = email.includes('.') && email.split('@')[1].split('.').length >= 2;
  const confidence = hasValidDomain ? 95 : 70;
  return { value: email, confidence };
}

function extractPhones(text: string): { value: string; confidence: number } {
  const matches = text.match(PHONE_REGEX);
  if (!matches || matches.length === 0) {
    return { value: '', confidence: 0 };
  }
  const phone = matches[0];
  const isMobile = /^1[3-9]\d{9}$/.test(phone.replace(/[-\s]/g, ''));
  const confidence = isMobile ? 90 : 65;
  return { value: phone, confidence };
}

function extractName(text: string): { value: string; confidence: number } {
  const namePatterns = [
    /(?:姓名|名字|Name)[:\s]*([^\n\r,，]{2,8})/i,
    /^([^\n\r\d]{2,8}?)(?:\n|\r)/,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      const isReasonableLength = name.length >= 2 && name.length <= 8;
      const hasNoNumbers = !/\d/.test(name);
      const confidence = isReasonableLength && hasNoNumbers ? 85 : 50;
      return { value: name, confidence };
    }
  }

  const lines = text.split(/[\n\r]+/).filter(l => l.trim().length > 0);
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim();
    if (trimmed.length >= 2 && trimmed.length <= 8 && !/\d/.test(trimmed) && !/@/.test(trimmed)) {
      return { value: trimmed, confidence: 40 };
    }
  }

  return { value: '', confidence: 0 };
}

function extractEducation(text: string): { value: string; confidence: number } {
  const eduPatterns = [
    /(?:教育背景|教育经历|学历|Education|Academic)[:\s]*([\s\S]*?)(?=(?:工作经历|工作经验|Work|Experience|技能|Skill|项目|Project|$))/i,
  ];

  for (const pattern of eduPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const content = match[1].trim().slice(0, 500);
      const hasEduKeywords = /大学|学院|本科|硕士|博士|研究生|学士|University|Bachelor|Master|PhD|School/i.test(content);
      const confidence = hasEduKeywords ? 88 : 55;
      return { value: content, confidence };
    }
  }

  const eduKeywords = /[\u4e00-\u9fa5]*(?:大学|学院|学校)[\u4e00-\u9fa5]*/g;
  const schoolMatches = text.match(eduKeywords);
  if (schoolMatches && schoolMatches.length > 0) {
    return { value: schoolMatches.slice(0, 3).join('；'), confidence: 50 };
  }

  return { value: '', confidence: 0 };
}

function extractExperience(text: string): { value: string; confidence: number } {
  const expPatterns = [
    /(?:工作经历|工作经验|Work Experience|Experience|职业经历)[:\s]*([\s\S]*?)(?=(?:教育|技能|Skill|Education|项目|Project|自我评价|$))/i,
  ];

  for (const pattern of expPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const content = match[1].trim().slice(0, 800);
      const hasDatePatterns = /\d{4}[-/年]/.test(content);
      const hasCompanyKeywords = /公司|集团|有限|Inc|Corp|Ltd|Company|Tech/i.test(content);
      let confidence = 60;
      if (hasDatePatterns) confidence += 15;
      if (hasCompanyKeywords) confidence += 15;
      return { value: content, confidence: Math.min(confidence, 95) };
    }
  }

  return { value: '', confidence: 0 };
}

function extractSkills(text: string): { value: string; confidence: number } {
  const skillSectionPatterns = [
    /(?:技能|技术|专长|Skills|Technologies|Tech Stack)[:\s]*([\s\S]*?)(?=(?:工作|教育|项目|自我评价|Work|Education|Project|$))/i,
  ];

  let skillText = '';
  for (const pattern of skillSectionPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      skillText = match[1];
      break;
    }
  }

  if (!skillText) {
    skillText = text;
  }

  const foundSkills: string[] = [];
  for (const keyword of SKILL_KEYWORDS) {
    const regex = new RegExp(keyword, 'gi');
    if (regex.test(skillText)) {
      foundSkills.push(keyword.replace(/\\\+/g, '+').replace(/\\\./g, '.'));
    }
  }

  if (foundSkills.length === 0) {
    return { value: '', confidence: 0 };
  }

  const uniqueSkills = [...new Set(foundSkills)];
  const confidence = Math.min(40 + uniqueSkills.length * 8, 95);
  return { value: uniqueSkills.join('、'), confidence };
}

export function parseResumeText(text: string): ParseResult {
  const nameResult = extractName(text);
  const emailResult = extractEmails(text);
  const phoneResult = extractPhones(text);
  const educationResult = extractEducation(text);
  const experienceResult = extractExperience(text);
  const skillsResult = extractSkills(text);

  return {
    name: { label: '姓名', value: nameResult.value, confidence: nameResult.confidence },
    email: { label: '邮箱', value: emailResult.value, confidence: emailResult.confidence },
    phone: { label: '电话', value: phoneResult.value, confidence: phoneResult.confidence },
    education: { label: '教育背景', value: educationResult.value, confidence: educationResult.confidence },
    experience: { label: '工作经历', value: experienceResult.value, confidence: experienceResult.confidence },
    skills: { label: '技能标签', value: skillsResult.value, confidence: skillsResult.confidence },
  };
}

export function calculateRadarScores(result: ParseResult): RadarScore[] {
  const fields: ExtractedField[] = [
    result.name,
    result.email,
    result.phone,
    result.education,
    result.experience,
    result.skills,
  ];

  const nameScore = result.name.confidence > 0
    ? Math.min(result.name.confidence * 0.9 + (result.name.value.length >= 2 ? 10 : 0), 100)
    : 0;

  const contactScore = ((result.email.confidence > 0 ? 50 : 0) + (result.phone.confidence > 0 ? 50 : 0));

  const eduLength = result.education.value.length;
  const eduScore = result.education.confidence > 0
    ? Math.min(result.education.confidence * 0.7 + Math.min(eduLength / 3, 30), 100)
    : 0;

  const expLength = result.experience.value.length;
  const expScore = result.experience.confidence > 0
    ? Math.min(result.experience.confidence * 0.6 + Math.min(expLength / 5, 40), 100)
    : 0;

  const skillCount = result.skills.value ? result.skills.value.split('、').length : 0;
  const skillScore = skillCount > 0
    ? Math.min(30 + skillCount * 7, 100)
    : 0;

  const filledCount = fields.filter(f => f.confidence > 0).length;
  const completenessScore = Math.round((filledCount / 6) * 100);

  return [
    { dimension: '基本信息', score: Math.round(nameScore) },
    { dimension: '联系方式', score: Math.round(contactScore) },
    { dimension: '教育背景', score: Math.round(eduScore) },
    { dimension: '工作经历', score: Math.round(expScore) },
    { dimension: '专业技能', score: Math.round(skillScore) },
    { dimension: '完整度', score: completenessScore },
  ];
}

export function generateSummary(result: ParseResult, scores: RadarScore[]): string {
  const parts: string[] = [];

  const name = result.name.value || '未知';
  parts.push(`候选人：${name}`);

  const avgScore = Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length);
  let level = '待评估';
  if (avgScore >= 80) level = '优秀';
  else if (avgScore >= 60) level = '良好';
  else if (avgScore >= 40) level = '一般';
  else if (avgScore > 0) level = '较低';
  parts.push(`综合评级：${level}（平均分 ${avgScore} 分）`);

  if (result.email.value) parts.push(`邮箱：${result.email.value}`);
  if (result.phone.value) parts.push(`电话：${result.phone.value}`);

  if (result.education.value) {
    const shortEdu = result.education.value.slice(0, 100);
    parts.push(`教育背景：${shortEdu}${result.education.value.length > 100 ? '...' : ''}`);
  }

  if (result.experience.value) {
    const shortExp = result.experience.value.slice(0, 100);
    parts.push(`工作经历：${shortExp}${result.experience.value.length > 100 ? '...' : ''}`);
  }

  if (result.skills.value) {
    parts.push(`技能标签：${result.skills.value}`);
  }

  const weakDimensions = scores.filter(s => s.score < 50).map(s => s.dimension);
  if (weakDimensions.length > 0) {
    parts.push(`待完善项：${weakDimensions.join('、')}`);
  }

  return parts.join('\n');
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (file.type === 'application/pdf') {
      reader.onload = async () => {
        try {
          const text = await extractPdfText(file);
          resolve(text);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    }
  });
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let text = '';

  for (let i = 0; i < uint8Array.length; i++) {
    if (uint8Array[i] >= 0x20 && uint8Array[i] <= 0x7e) {
      text += String.fromCharCode(uint8Array[i]);
    } else if (uint8Array[i] >= 0xc0 && i + 1 < uint8Array.length) {
      let code = 0;
      let byteCount = 0;
      const b = uint8Array[i];
      if (b >= 0xc0 && b <= 0xdf) { code = b & 0x1f; byteCount = 1; }
      else if (b >= 0xe0 && b <= 0xef) { code = b & 0x0f; byteCount = 2; }
      else if (b >= 0xf0 && b <= 0xf7) { code = b & 0x07; byteCount = 3; }

      let valid = true;
      for (let j = 0; j < byteCount && i + 1 + j < uint8Array.length; j++) {
        if ((uint8Array[i + 1 + j] & 0xc0) !== 0x80) { valid = false; break; }
        code = (code << 6) | (uint8Array[i + 1 + j] & 0x3f);
      }
      if (valid && code > 0) {
        text += String.fromCharCode(code);
        i += byteCount;
      }
    }
  }

  const streamContentMatch = text.match(/stream[\s\S]*?endstream/g);
  if (streamContentMatch) {
    text = streamContentMatch.join(' ');
  }

  const pdfTextPatterns = [
    /\(([^)]+)\)/g,
    /\/([A-Za-z\u4e00-\u9fa5]{2,})/g,
  ];

  let extractedParts: string[] = [];
  for (const pattern of pdfTextPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].trim().length > 1) {
        extractedParts.push(match[1].trim());
      }
    }
  }

  if (extractedParts.length > 0) {
    text = extractedParts.join('\n');
  }

  const chinesePattern = /[\u4e00-\u9fa5]{2,}/g;
  const chineseMatches = text.match(chinesePattern);
  if (chineseMatches && chineseMatches.length > 5) {
    return chineseMatches.join(' ');
  }

  return text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9@.\-+\/\s:,;，。；：、（）()\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
