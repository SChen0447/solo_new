import type { Requirement } from '../types';

export function exportToMarkdown(requirements: Requirement[]): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const highList = requirements.filter(r => r.priority === '高');
  const midList = requirements.filter(r => r.priority === '中');
  const lowList = requirements.filter(r => r.priority === '低');

  const idToNumber = new Map(requirements.map(r => [r.id, r.number]));

  const formatDeps = (deps: string[]): string => {
    if (!deps || deps.length === 0) return '无';
    return deps.map(d => {
      const num = idToNumber.get(d);
      return num ? `[REQ-${num}](#req-${num})` : '未知';
    }).join(', ');
  };

  const priorityIcon = (p: string) => {
    switch (p) {
      case '高': return '🔴';
      case '中': return '🟡';
      case '低': return '🟢';
      default: return '⚪';
    }
  };

  const renderItem = (r: Requirement) => {
    return `### REQ-${r.number} ${r.title}

- **类型**：${r.type}
- **优先级**：${priorityIcon(r.priority)} ${r.priority}
- **依赖**：${formatDeps(r.dependencies)}

${r.description}
`;
  };

  let md = `# 需求规格说明书

> 生成时间：${dateStr}
> 条目总数：${requirements.length}（高优先级 ${highList.length} | 中优先级 ${midList.length} | 低优先级 ${lowList.length}）

## 目录

- [1. 高优先级需求](#1-高优先级需求)
`;

  highList.forEach(r => {
    md += `  - [REQ-${r.number} ${r.title}](#req-${r.number})\n`;
  });

  md += `- [2. 中优先级需求](#2-中优先级需求)\n`;
  midList.forEach(r => {
    md += `  - [REQ-${r.number} ${r.title}](#req-${r.number})\n`;
  });

  md += `- [3. 低优先级需求](#3-低优先级需求)\n`;
  lowList.forEach(r => {
    md += `  - [REQ-${r.number} ${r.title}](#req-${r.number})\n`;
  });

  md += `
---

## 1. 高优先级需求

${highList.length === 0 ? '_暂无_\n' : highList.map(renderItem).join('\n')}

## 2. 中优先级需求

${midList.length === 0 ? '_暂无_\n' : midList.map(renderItem).join('\n')}

## 3. 低优先级需求

${lowList.length === 0 ? '_暂无_\n' : lowList.map(renderItem).join('\n')}

---

*本文档由智能需求文档生成器自动生成*
`;

  return md;
}

export function downloadMarkdown(requirements: Requirement[]) {
  const content = exportToMarkdown(requirements);
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = `requirements_${ts}.md`;

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
