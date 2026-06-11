import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Requirement, Priority, RequirementType, ParseResult } from '../types';

const HIGH_PRIORITY_KEYWORDS = [
  '必须', '核心', '关键', '首要', '紧急', '优先', '重要', '基础',
  '一定要', '高优', '重点', '不可或缺', '首要任务'
];

const MEDIUM_PRIORITY_KEYWORDS = [
  '应当', '需要', '建议', '常规', '一般', '中等', '普通', '标准',
  '通常', '推荐', '应该'
];

const LOW_PRIORITY_KEYWORDS = [
  '可选', '未来', '后续', '次要', '低优', '可以考虑', '也许', '如果有时间',
  '优化', '增强', '锦上添花', '扩展'
];

const FUNCTIONAL_KEYWORDS = [
  '功能', '支持', '实现', '提供', '允许', '可以', '能够', '操作',
  '按钮', '页面', '模块', '接口', '导出', '导入', '展示', '显示',
  '编辑', '删除', '新增', '添加', '修改', '保存', '搜索', '过滤',
  '排序', '上传', '下载', '发送', '接收', '登录', '注册', '验证'
];

const NON_FUNCTIONAL_KEYWORDS = [
  '性能', '响应', '速度', '稳定', '安全', '兼容', '体验', '易用',
  '界面', '设计', '美观', '流畅', '延迟', '并发', '可扩展', '可维护',
  '适配', '响应式', '移动端', '可用性', '可靠性', '效率'
];

const DEPENDENCY_KEYWORDS = [
  '依赖', '基于', '在...之后', '需要先', '必须先', '前提', '先决条件',
  '完成后', '之后', '前序', '先完成'
];

function inferPriority(text: string): Priority {
  const lower = text.toLowerCase();
  for (const kw of HIGH_PRIORITY_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return '高';
  }
  for (const kw of LOW_PRIORITY_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return '低';
  }
  for (const kw of MEDIUM_PRIORITY_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return '中';
  }
  return '中';
}

function inferType(text: string): RequirementType {
  let funcScore = 0;
  let nonFuncScore = 0;
  const lower = text.toLowerCase();
  for (const kw of FUNCTIONAL_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) funcScore++;
  }
  for (const kw of NON_FUNCTIONAL_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) nonFuncScore++;
  }
  return funcScore >= nonFuncScore ? '功能' : '非功能';
}

function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  const sentences: string[] = [];
  let current = '';
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    current += char;
    if (['。', '！', '？', '；', '\n', '.', '!', '?', ';'].includes(char)) {
      const trimmed = current.trim();
      if (trimmed.length >= 5) {
        sentences.push(trimmed);
      }
      current = '';
    }
  }
  if (current.trim().length >= 5) {
    sentences.push(current.trim());
  }
  if (sentences.length === 0 && cleaned.length >= 5) {
    sentences.push(cleaned);
  }
  return sentences;
}

function extractTitle(sentence: string): string {
  const cleaned = sentence
    .replace(/^[，。！？；、,\.!\?;:\s]+/, '')
    .replace(/[，。！？；,\.!\?;]+$/, '')
    .trim();
  if (cleaned.length <= 20) return cleaned;
  let title = cleaned.substring(0, 18);
  const punctIndex = title.search(/[，。！？；,\.!\?;]/);
  if (punctIndex > 5) {
    title = title.substring(0, punctIndex);
  }
  return title + '…';
}

function buildDependencies(requirements: Requirement[], sentences: string[]): Requirement[] {
  return requirements.map((req, idx) => {
    const sentence = sentences[idx] || '';
    const hasDependencyKeyword = DEPENDENCY_KEYWORDS.some(kw =>
      sentence.toLowerCase().includes(kw.toLowerCase())
    );
    if (hasDependencyKeyword && idx > 0) {
      const prevId = requirements[idx - 1]?.id;
      if (prevId && !req.dependencies.includes(prevId)) {
        return { ...req, dependencies: [...req.dependencies, prevId] };
      }
    }
    return req;
  });
}

export function parseTextToRequirements(text: string): ParseResult {
  const sentences = splitSentences(text);
  const requirements: Requirement[] = sentences.map((sentence, idx) => ({
    id: uuidv4(),
    number: idx + 1,
    title: extractTitle(sentence),
    description: sentence.replace(/[。！？；.!?;]+$/, '').trim(),
    priority: inferPriority(sentence),
    type: inferType(sentence),
    dependencies: []
  }));
  const withDeps = buildDependencies(requirements, sentences);
  return {
    requirements: withDeps,
    sourceText: text,
    timestamp: Date.now(),
    id: uuidv4()
  };
}

export function detectCircularDependencies(requirements: Requirement[]): Set<string> {
  const idToReq = new Map(requirements.map(r => [r.id, r]));
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const circularIds = new Set<string>();
  const invalidDeps = new Set<string>();

  function dfs(id: string): boolean {
    if (!idToReq.has(id)) {
      invalidDeps.add(id);
      return false;
    }
    visited.add(id);
    recursionStack.add(id);
    const req = idToReq.get(id);
    if (!req) return false;

    let hasCycle = false;
    for (const depId of req.dependencies) {
      if (!idToReq.has(depId)) {
        invalidDeps.add(depId);
        continue;
      }
      if (!visited.has(depId)) {
        if (dfs(depId)) {
          circularIds.add(id);
          hasCycle = true;
        }
      } else if (recursionStack.has(depId)) {
        circularIds.add(id);
        circularIds.add(depId);
        hasCycle = true;
      }
    }
    recursionStack.delete(id);
    return hasCycle;
  }

  for (const req of requirements) {
    if (!visited.has(req.id)) {
      dfs(req.id);
    }
  }
  return circularIds;
}

export function getInvalidDependencies(requirements: Requirement[]): string[] {
  const validIds = new Set(requirements.map(r => r.id));
  const invalid = new Set<string>();
  for (const req of requirements) {
    for (const depId of req.dependencies) {
      if (!validIds.has(depId)) {
        invalid.add(depId);
      }
    }
  }
  return Array.from(invalid);
}

export function renumberRequirements(requirements: Requirement[]): Requirement[] {
  return requirements.map((r, idx) => ({ ...r, number: idx + 1 }));
}

export function useParseEngine() {
  const parse = useCallback((text: string): ParseResult => {
    return parseTextToRequirements(text);
  }, []);

  return { parse };
}
