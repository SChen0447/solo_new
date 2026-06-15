import type { Heading } from '@/types';

export function parseHeadings(markdown: string): Heading[] {
  const lines = markdown.split('\n');
  const headings: Heading[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);

    if (match) {
      headings.push({
        id: `heading-${headings.length}`,
        text: match[2].trim(),
        level: match[1].length,
        line: i + 1,
      });
    }
  }

  return headings;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function extractCodeBlocks(markdown: string): Array<{
  id: string;
  language: string;
  filename: string;
  code: string;
  startLine: number;
  endLine: number;
}> {
  const blocks: Array<{
    id: string;
    language: string;
    filename: string;
    code: string;
    startLine: number;
    endLine: number;
  }> = [];

  const lines = markdown.split('\n');
  let inBlock = false;
  let blockStart = 0;
  let blockLanguage = '';
  let blockFilename = '';
  let blockCode: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inBlock) {
        inBlock = true;
        blockStart = i;
        const header = line.slice(3).trim();
        const parts = header.split(/\s+/);
        blockLanguage = parts[0] || '';
        const filenameMatch = header.match(/filename:([^\s]+)/);
        blockFilename = filenameMatch ? filenameMatch[1] : `code-${blocks.length + 1}.${blockLanguage || 'txt'}`;
        blockCode = [];
      } else {
        blocks.push({
          id: generateId(),
          language: blockLanguage,
          filename: blockFilename,
          code: blockCode.join('\n'),
          startLine: blockStart,
          endLine: i,
        });
        inBlock = false;
        blockLanguage = '';
        blockFilename = '';
        blockCode = [];
      }
    } else if (inBlock) {
      blockCode.push(line);
    }
  }

  return blocks;
}

export function insertCodeBlock(
  markdown: string,
  language: 'javascript' | 'typescript' | 'python',
  position: number
): { content: string; blockId: string } {
  const blockId = generateId();
  const filename = `example-${blockId.slice(0, 8)}.${language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : 'py'}`;

  const defaultCode: Record<string, string> = {
    javascript: '// 在这里编写 JavaScript 代码\nconsole.log("Hello, World!");\n',
    typescript: '// 在这里编写 TypeScript 代码\nconst message: string = "Hello, World!";\nconsole.log(message);\n',
    python: '# 在这里编写 Python 代码\nprint("Hello, World!")\n',
  };

  const codeBlock = `\n\`\`\`${language} filename:${filename}\n${defaultCode[language]}\n\`\`\`\n`;

  const lines = markdown.split('\n');
  const before = lines.slice(0, position).join('\n');
  const after = lines.slice(position).join('\n');

  return {
    content: `${before}${codeBlock}${after}`,
    blockId,
  };
}

export function generateApiMarkdown(endpoints: Array<{
  method: string;
  path: string;
  summary: string;
  description?: string;
  parameters: Array<{
    name: string;
    in: string;
    required?: boolean;
    type?: string;
    description?: string;
  }>;
  responses: Record<string, {
    description: string;
    content?: Record<string, { example?: unknown }>;
  }>;
}>): string {
  let markdown = '\n\n## API 参考\n\n';

  for (const endpoint of endpoints) {
    markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
    markdown += `${endpoint.summary}\n\n`;

    if (endpoint.description) {
      markdown += `${endpoint.description}\n\n`;
    }

    if (endpoint.parameters.length > 0) {
      markdown += '**请求参数**\n\n';
      markdown += '| 名称 | 位置 | 类型 | 必填 | 说明 |\n';
      markdown += '|------|------|------|------|------|\n';

      for (const param of endpoint.parameters) {
        markdown += `| ${param.name} | ${param.in} | ${param.type || '-'} | ${param.required ? '是' : '否'} | ${param.description || '-'} |\n`;
      }

      markdown += '\n';
    }

    const responseEntries = Object.entries(endpoint.responses);
    if (responseEntries.length > 0) {
      markdown += '**响应示例**\n\n';

      for (const [statusCode, response] of responseEntries) {
        markdown += `**${statusCode}**: ${response.description}\n\n`;

        if (response.content?.['application/json']?.example) {
          markdown += '```json\n';
          markdown += JSON.stringify(response.content['application/json'].example, null, 2);
          markdown += '\n```\n\n';
        }
      }
    }

    markdown += '---\n\n';
  }

  return markdown;
}
