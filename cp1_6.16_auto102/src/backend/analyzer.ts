export interface CommentIssue {
  line: number;
  type: 'redundant' | 'inaccurate' | 'missing' | 'offensive' | 'commented-out';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
  originalComment?: string;
}

export interface FileAnalysisResult {
  fileName: string;
  filePath: string;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  coverage: number;
  accuracyScore: number;
  issues: CommentIssue[];
  code: string;
  lines: string[];
}

export interface AnalysisResult {
  overall: {
    totalFiles: number;
    totalLines: number;
    totalCodeLines: number;
    totalCommentLines: number;
    overallCoverage: number;
    averageAccuracy: number;
  };
  files: FileAnalysisResult[];
}

const SELF_EXPLANATORY_PATTERNS = [
  /^(增加|减少|设置|获取|初始化|更新|计算|检查|判断|返回|遍历|循环|定义|创建|删除|清空|复制|移动|排序|过滤|查找|匹配|解析|转换|验证|加载|保存|读取|写入|发送|接收|处理|生成|构建)\s*([a-zA-Z_$][\w$]*|i|j|k|count|index|result|data|value|key|name|id|num|str|arr|obj|list|map|set|item|element|node|flag|status|type|mode|path|url|file|dir)\s*(变量)?[。.!！]?$/i,
  /^increment\s*[a-z_]+$/i,
  /^decrement\s*[a-z_]+$/i,
  /^set\s*[a-z_]+\s*(to)?\s*.*/i,
  /^get\s*[a-z_]+\s*(value)?$/i,
  /^(initialize|init)\s*[a-z_]+$/i,
  /^update\s*[a-z_]+$/i,
  /^calculate\s*[a-z_]+$/i,
  /^check\s*[a-z_]+$/i,
  /^return\s*[a-z_]+$/i,
  /^loop\s*(through|over)\s*[a-z_]+$/i,
  /^define\s*[a-z_]+$/i,
  /^create\s*[a-z_]+$/i,
  /^delete\s*[a-z_]+$/i,
  /^(clear|reset)\s*[a-z_]+$/i,
  /^copy\s*[a-z_]+$/i,
];

const OFFENSIVE_WORDS = [
  'fuck', 'shit', 'asshole', 'bitch', 'damn', 'crap', 'stupid', 'idiot',
  '垃圾', '傻逼', '智障', '操', '草', '日', '他妈', '白痴', '脑残', '废物',
];

function extractComments(code: string): { line: number; text: string; block: boolean }[] {
  const comments: { line: number; text: string; block: boolean }[] = [];
  const lines = code.split('\n');
  let inBlockComment = false;
  let blockStartLine = 0;
  let blockText = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (inBlockComment) {
      const endIndex = trimmedLine.indexOf('*/');
      if (endIndex !== -1) {
        blockText += '\n' + trimmedLine.substring(0, endIndex);
        comments.push({
          line: blockStartLine,
          text: blockText.replace(/^\s*[/*]+\s*/gm, '').trim(),
          block: true,
        });
        inBlockComment = false;
        blockText = '';
      } else {
        blockText += '\n' + trimmedLine;
      }
      continue;
    }

    const blockStartIndex = trimmedLine.indexOf('/*');
    if (blockStartIndex !== -1) {
      const blockEndIndex = trimmedLine.indexOf('*/', blockStartIndex + 2);
      if (blockEndIndex !== -1) {
        const commentText = trimmedLine.substring(blockStartIndex + 2, blockEndIndex).trim();
        comments.push({ line: i + 1, text: commentText, block: true });
      } else {
        inBlockComment = true;
        blockStartLine = i + 1;
        blockText = trimmedLine.substring(blockStartIndex + 2);
      }
      continue;
    }

    const singleLineIndex = findSingleLineCommentIndex(trimmedLine);
    if (singleLineIndex !== -1) {
      const commentText = trimmedLine.substring(singleLineIndex + 2).trim();
      comments.push({ line: i + 1, text: commentText, block: false });
    }
  }

  return comments;
}

function findSingleLineCommentIndex(line: string): number {
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (inString) {
      if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '/' && line[i + 1] === '/') {
      return i;
    }
  }

  return -1;
}

function getCodeLines(lines: string[]): number {
  let count = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
      count++;
    }
  }
  return count;
}

function getCommentLines(lines: string[]): number {
  let count = 0;
  let inBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (inBlock) {
      count++;
      if (trimmed.includes('*/')) {
        inBlock = false;
      }
      continue;
    }
    if (trimmed.startsWith('//')) {
      count++;
    } else if (trimmed.startsWith('/*')) {
      count++;
      if (!trimmed.includes('*/')) {
        inBlock = true;
      }
    } else if (trimmed.startsWith('*') && !trimmed.startsWith('*/')) {
      count++;
    }
  }
  return count;
}

function getBlankLines(lines: string[]): number {
  let count = 0;
  for (const line of lines) {
    if (line.trim().length === 0) {
      count++;
    }
  }
  return count;
}

function isSelfExplanatory(comment: string, codeLine: string): boolean {
  const cleanComment = comment.toLowerCase().trim().replace(/[。.!！,，;；:：]$/, '');

  for (const pattern of SELF_EXPLANATORY_PATTERNS) {
    if (pattern.test(cleanComment)) {
      return true;
    }
  }

  const varMatch = codeLine.match(/\b(?:const|let|var|function|class|interface|type|enum)\s+([a-zA-Z_$][\w$]*)/);
  if (varMatch) {
    const varName = varMatch[1].toLowerCase();
    const commentWords = cleanComment.split(/\s+/);
    const nameFromComment = commentWords[commentWords.length - 1];
    if (varName === nameFromComment || varName.includes(nameFromComment) || nameFromComment.includes(varName)) {
      return true;
    }
  }

  const simpleVarMatch = codeLine.match(/\b([a-zA-Z_$][\w$]*)\s*[+\-*/%]?=/);
  if (simpleVarMatch) {
    const varName = simpleVarMatch[1].toLowerCase();
    if (cleanComment.includes(varName) && cleanComment.length < 30) {
      const shortPatterns = ['增加', '减少', '设置', '获取', '更新', '初始化', 'increment', 'decrement', 'set', 'get', 'update', 'init'];
      for (const p of shortPatterns) {
        if (cleanComment.startsWith(p)) {
          return true;
        }
      }
    }
  }

  const incMatch = codeLine.match(/\b([a-zA-Z_$][\w$]*)\s*[+\-]{2}/);
  if (incMatch) {
    const varName = incMatch[1].toLowerCase();
    if (cleanComment.includes(varName) && (cleanComment.includes('增加') || cleanComment.includes('减少') || cleanComment.includes('自增') || cleanComment.includes('自减') || cleanComment.includes('increment') || cleanComment.includes('decrement'))) {
      return true;
    }
  }

  return false;
}

function containsOffensiveLanguage(text: string): boolean {
  const lowerText = text.toLowerCase();
  return OFFENSIVE_WORDS.some(word => lowerText.includes(word.toLowerCase()));
}

function isCommentedOutCode(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('//')) {
    return false;
  }

  const codePart = trimmed.substring(2).trim();
  if (codePart.length === 0) {
    return false;
  }

  const codePatterns = [
    /^(const|let|var|function|return|if|else|for|while|switch|case|break|continue|throw|try|catch|new|class|extends|import|export|default|interface|type|enum|public|private|protected|async|await|yield)\s+/,
    /^[a-zA-Z_$][\w$]*\s*\(/,
    /^[a-zA-Z_$][\w$]*\s*[+\-*/%]?=/,
    /^[a-zA-Z_$][\w$]*\s*\.\s*[a-zA-Z_$][\w$]*\s*\(/,
    /^[{}();\[\]]/,
    /^console\.(log|warn|error|info|debug)/,
  ];

  return codePatterns.some(pattern => pattern.test(codePart));
}

function detectCommentedOutBlocks(lines: string[]): { startLine: number; endLine: number }[] {
  const blocks: { startLine: number; endLine: number }[] = [];
  let inBlock = false;
  let blockStart = 0;
  let commentedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isCommentedCode = isCommentedOutCode(line);

    if (isCommentedCode) {
      if (!inBlock) {
        inBlock = true;
        blockStart = i + 1;
      }
      commentedCount++;
    } else {
      if (inBlock && commentedCount >= 3) {
        blocks.push({ startLine: blockStart, endLine: i });
      }
      inBlock = false;
      commentedCount = 0;
    }
  }

  if (inBlock && commentedCount >= 3) {
    blocks.push({ startLine: blockStart, endLine: lines.length });
  }

  return blocks;
}

function hasFunctionDefinition(code: string, lineNumber: number): boolean {
  const lines = code.split('\n');
  for (let i = Math.max(0, lineNumber - 5); i < lineNumber; i++) {
    if (i >= lines.length) break;
    const line = lines[i].trim();
    if (/^(export\s+)?(default\s+)?(async\s+)?(function|const|let|var)\s+/.test(line) && line.includes('=>') || line.includes('function')) {
      return true;
    }
  }
  return false;
}

function evaluateCommentAccuracy(comment: string, codeContext: string): { score: number; issues: string[] } {
  let score = 100;
  const issues: string[] = [];
  const cleanComment = comment.trim();

  if (cleanComment.length === 0) {
    return { score: 0, issues: ['空注释'] };
  }

  if (cleanComment.length < 5) {
    score -= 20;
    issues.push('注释过短，信息不足');
  }

  if (/^TODO|FIXME|HACK|XXX|NOTE/i.test(cleanComment)) {
    score -= 10;
    if (!cleanComment.includes(':') && !cleanComment.includes('：')) {
      score -= 10;
      issues.push('TODO类注释缺少具体说明');
    }
  }

  const hasDescription = cleanComment.length > 10;
  if (!hasDescription) {
    score -= 15;
    issues.push('注释描述过于简单');
  }

  if (isSelfExplanatory(cleanComment, codeContext)) {
    score -= 30;
    issues.push('注释冗余，变量名或代码已自解释');
  }

  if (containsOffensiveLanguage(cleanComment)) {
    score -= 50;
    issues.push('注释包含不适当或冒犯性语言');
  }

  return { score: Math.max(0, score), issues };
}

function generateImprovementSuggestion(issue: CommentIssue, codeLine: string): string {
  switch (issue.type) {
    case 'redundant':
      return '建议删除此冗余注释，代码本身已经清晰表达了意图。';
    case 'inaccurate':
      return '建议完善注释内容，确保准确描述代码的功能、参数和返回值。';
    case 'missing':
      return '建议添加注释，说明此代码块的用途和逻辑。';
    case 'offensive':
      return '请使用专业、文明的语言编写注释。';
    case 'commented-out':
      return '建议删除或说明被注释掉的代码块。如果是临时禁用，请添加原因说明。';
    default:
      return '建议优化注释质量。';
  }
}

export function analyzeFile(fileName: string, filePath: string, code: string): FileAnalysisResult {
  const lines = code.split('\n');
  const totalLines = lines.length;
  const codeLines = getCodeLines(lines);
  const commentLines = getCommentLines(lines);
  const blankLines = getBlankLines(lines);
  const coverage = codeLines > 0 ? (commentLines / codeLines) * 100 : 0;

  const comments = extractComments(code);
  const issues: CommentIssue[] = [];
  let totalAccuracyScore = 0;
  let accuracyCount = 0;

  for (const comment of comments) {
    const lineIdx = comment.line - 1;
    const codeLine = lines[lineIdx] || '';

    if (isSelfExplanatory(comment.text, codeLine)) {
      issues.push({
        line: comment.line,
        type: 'redundant',
        severity: 'low',
        message: '冗余注释：变量名或代码已自解释',
        originalComment: comment.text,
        suggestion: generateImprovementSuggestion({ type: 'redundant', line: 0, severity: 'low', message: '' }, codeLine),
      });
    }

    if (containsOffensiveLanguage(comment.text)) {
      issues.push({
        line: comment.line,
        type: 'offensive',
        severity: 'high',
        message: '注释包含不适当语言',
        originalComment: comment.text,
        suggestion: generateImprovementSuggestion({ type: 'offensive', line: 0, severity: 'high', message: '' }, codeLine),
      });
    }

    const accuracyResult = evaluateCommentAccuracy(comment.text, codeLine);
    totalAccuracyScore += accuracyResult.score;
    accuracyCount++;

    if (accuracyResult.score < 60 && accuracyResult.issues.length > 0) {
      const existingIssue = issues.find(i => i.line === comment.line);
      if (!existingIssue) {
        issues.push({
          line: comment.line,
          type: 'inaccurate',
          severity: accuracyResult.score < 40 ? 'high' : 'medium',
          message: accuracyResult.issues[0],
          originalComment: comment.text,
          suggestion: generateImprovementSuggestion({ type: 'inaccurate', line: 0, severity: 'medium', message: '' }, codeLine),
        });
      }
    }
  }

  const commentedBlocks = detectCommentedOutBlocks(lines);
  for (const block of commentedBlocks) {
    issues.push({
      line: block.startLine,
      type: 'commented-out',
      severity: 'medium',
      message: `被注释掉的代码块 (${block.startLine}-${block.endLine}行)`,
      suggestion: generateImprovementSuggestion({ type: 'commented-out', line: 0, severity: 'medium', message: '' }, ''),
    });
  }

  const avgAccuracy = accuracyCount > 0 ? totalAccuracyScore / accuracyCount : 80;

  return {
    fileName,
    filePath,
    totalLines,
    codeLines,
    commentLines,
    blankLines,
    coverage: Math.round(coverage * 100) / 100,
    accuracyScore: Math.round(avgAccuracy),
    issues,
    code,
    lines,
  };
}

export function analyzeProject(files: { name: string; path: string; content: string }[]): AnalysisResult {
  const fileResults: FileAnalysisResult[] = [];

  for (const file of files) {
    const result = analyzeFile(file.name, file.path, file.content);
    fileResults.push(result);
  }

  const totalFiles = fileResults.length;
  const totalLines = fileResults.reduce((sum, f) => sum + f.totalLines, 0);
  const totalCodeLines = fileResults.reduce((sum, f) => sum + f.codeLines, 0);
  const totalCommentLines = fileResults.reduce((sum, f) => sum + f.commentLines, 0);
  const overallCoverage = totalCodeLines > 0 ? (totalCommentLines / totalCodeLines) * 100 : 0;
  const averageAccuracy = totalFiles > 0 ? fileResults.reduce((sum, f) => sum + f.accuracyScore, 0) / totalFiles : 0;

  return {
    overall: {
      totalFiles,
      totalLines,
      totalCodeLines,
      totalCommentLines,
      overallCoverage: Math.round(overallCoverage * 100) / 100,
      averageAccuracy: Math.round(averageAccuracy),
    },
    files: fileResults.sort((a, b) => b.accuracyScore - a.accuracyScore),
  };
}
