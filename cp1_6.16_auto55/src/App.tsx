import { useState, useRef, useCallback, useEffect } from 'react';
import { EditorPanel } from './EditorPanel';
import { compareAndHighlight, applyHighlights, clearHighlights } from './DiffEngine';
import { DiffResult, PresetCase, RenderStatus } from './types';
import toast, { Toaster } from 'react-hot-toast';

const PRESET_CASES: PresetCase[] = [
  {
    id: 'responsive-card',
    name: '响应式卡片布局对比',
    left: {
      html: `<div class="card">
  <img src="https://picsum.photos/300/200" alt="示例图片">
  <div class="card-body">
    <h3>产品标题</h3>
    <p>这是一个产品描述，展示产品的基本信息和特点。</p>
    <button>立即购买</button>
  </div>
</div>`,
      css: `.card {
  width: 300px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  font-family: Arial, sans-serif;
}
.card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}
.card-body {
  padding: 16px;
}
.card-body h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
}
.card-body p {
  margin: 0 0 16px 0;
  color: #666;
  font-size: 14px;
}
.card-body button {
  padding: 8px 16px;
  background: #007ACC;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}`
    },
    right: {
      html: `<div class="card">
  <div class="card-image">
    <img src="https://picsum.photos/400/250" alt="示例图片">
    <span class="badge">新品</span>
  </div>
  <div class="card-body">
    <h2 class="card-title">高级产品标题</h2>
    <p class="card-description">这是一个产品描述，展示产品的基本信息和特点，以及更多详细内容。</p>
    <div class="card-actions">
      <button class="btn-primary">立即购买</button>
      <button class="btn-secondary">加入购物车</button>
    </div>
  </div>
</div>`,
      css: `.card {
  max-width: 400px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  font-family: 'Segoe UI', sans-serif;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
.card-image {
  position: relative;
}
.card-image img {
  width: 100%;
  height: 250px;
  object-fit: cover;
}
.badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #F44336;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}
.card-body {
  padding: 20px;
}
.card-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  color: #1a1a1a;
}
.card-description {
  margin: 0 0 20px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}
.card-actions {
  display: flex;
  gap: 12px;
}
.btn-primary, .btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}
.btn-primary {
  background: linear-gradient(135deg, #007ACC, #00A8FF);
  color: white;
}
.btn-primary:hover {
  background: linear-gradient(135deg, #0066A8, #0088CC);
}
.btn-secondary {
  background: white;
  color: #007ACC;
  border: 1px solid #007ACC !important;
}`
    }
  },
  {
    id: 'navbar',
    name: '导航栏两种样式对比',
    left: {
      html: `<nav class="navbar">
  <div class="logo">Logo</div>
  <ul class="nav-links">
    <li><a href="#">首页</a></li>
    <li><a href="#">产品</a></li>
    <li><a href="#">服务</a></li>
    <li><a href="#">关于我们</a></li>
    <li><a href="#">联系</a></li>
  </ul>
</nav>`,
      css: `.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  background-color: #333;
  font-family: Arial, sans-serif;
}
.logo {
  color: white;
  font-size: 20px;
  font-weight: bold;
}
.nav-links {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}
.nav-links li {
  margin-left: 30px;
}
.nav-links a {
  color: white;
  text-decoration: none;
  font-size: 14px;
}
.nav-links a:hover {
  color: #007ACC;
}`
    },
    right: {
      html: `<nav class="navbar">
  <div class="nav-container">
    <div class="logo">
      <span class="logo-icon">◆</span>
      <span class="logo-text">BrandName</span>
    </div>
    <ul class="nav-links">
      <li><a href="#" class="active">首页</a></li>
      <li><a href="#">产品</a></li>
      <li><a href="#">服务</a></li>
      <li><a href="#">关于我们</a></li>
      <li><a href="#">联系</a></li>
    </ul>
    <div class="nav-actions">
      <button class="login-btn">登录</button>
      <button class="signup-btn">注册</button>
    </div>
  </div>
</nav>`,
      css: `.navbar {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  box-shadow: 0 2px 20px rgba(0,0,0,0.3);
  position: sticky;
  top: 0;
  z-index: 100;
  font-family: 'Segoe UI', sans-serif;
}
.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  height: 70px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-icon {
  font-size: 24px;
  color: #00D4FF;
}
.logo-text {
  color: white;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.nav-links {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 8px;
}
.nav-links a {
  color: rgba(255,255,255,0.8);
  text-decoration: none;
  font-size: 15px;
  padding: 10px 18px;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: 500;
}
.nav-links a:hover,
.nav-links a.active {
  color: white;
  background: rgba(0,212,255,0.15);
}
.nav-actions {
  display: flex;
  gap: 12px;
}
.login-btn, .signup-btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}
.login-btn {
  background: transparent;
  color: white;
  border: 1px solid rgba(255,255,255,0.3) !important;
}
.login-btn:hover {
  background: rgba(255,255,255,0.1);
}
.signup-btn {
  background: linear-gradient(135deg, #00D4FF, #0099CC);
  color: white;
}
.signup-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,212,255,0.4);
}`
    }
  },
  {
    id: 'form-validation',
    name: '表单验证样式对比',
    left: {
      html: `<form class="form">
  <div class="form-group">
    <label>用户名</label>
    <input type="text" placeholder="请输入用户名">
  </div>
  <div class="form-group">
    <label>邮箱</label>
    <input type="email" placeholder="请输入邮箱">
  </div>
  <div class="form-group">
    <label>密码</label>
    <input type="password" placeholder="请输入密码">
  </div>
  <button type="submit">提交</button>
</form>`,
      css: `.form {
  width: 300px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: Arial, sans-serif;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  font-size: 14px;
}
.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 14px;
}
.form-group input:focus {
  outline: none;
  border-color: #007ACC;
}
button[type="submit"] {
  width: 100%;
  padding: 10px;
  background: #007ACC;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}`
    },
    right: {
      html: `<form class="form">
  <div class="form-header">
    <h2>创建账户</h2>
    <p>请填写以下信息完成注册</p>
  </div>
  
  <div class="form-group">
    <label for="username">用户名 <span class="required">*</span></label>
    <div class="input-wrapper">
      <span class="input-icon">👤</span>
      <input type="text" id="username" placeholder="请输入用户名" class="valid">
      <span class="status-icon success">✓</span>
    </div>
    <p class="help-text success">用户名可用</p>
  </div>
  
  <div class="form-group">
    <label for="email">邮箱地址 <span class="required">*</span></label>
    <div class="input-wrapper">
      <span class="input-icon">📧</span>
      <input type="email" id="email" placeholder="your@email.com" class="invalid">
      <span class="status-icon error">✕</span>
    </div>
    <p class="help-text error">请输入有效的邮箱地址</p>
  </div>
  
  <div class="form-group">
    <label for="password">密码 <span class="required">*</span></label>
    <div class="input-wrapper">
      <span class="input-icon">🔒</span>
      <input type="password" id="password" placeholder="至少8位字符">
      <button type="button" class="toggle-password">👁</button>
    </div>
    <div class="password-strength">
      <div class="strength-bar weak"></div>
      <span class="strength-label">弱</span>
    </div>
  </div>
  
  <div class="form-options">
    <label class="checkbox">
      <input type="checkbox">
      <span>我同意服务条款</span>
    </label>
  </div>
  
  <button type="submit" class="submit-btn">
    <span>创建账户</span>
    <span class="btn-arrow">→</span>
  </button>
</form>`,
      css: `.form {
  max-width: 420px;
  padding: 32px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
  font-family: 'Segoe UI', sans-serif;
}
.form-header {
  text-align: center;
  margin-bottom: 28px;
}
.form-header h2 {
  margin: 0 0 8px 0;
  color: #1a1a1a;
  font-size: 24px;
}
.form-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #333;
}
.required {
  color: #F44336;
}
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.input-icon {
  position: absolute;
  left: 14px;
  font-size: 16px;
}
.status-icon {
  position: absolute;
  right: 14px;
  font-size: 14px;
  font-weight: bold;
}
.status-icon.success {
  color: #4CAF50;
}
.status-icon.error {
  color: #F44336;
}
.form-group input {
  width: 100%;
  padding: 12px 40px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  box-sizing: border-box;
  font-size: 14px;
  transition: all 0.3s ease;
}
.form-group input:focus {
  outline: none;
  border-color: #007ACC;
  box-shadow: 0 0 0 3px rgba(0,122,204,0.1);
}
.form-group input.valid {
  border-color: #4CAF50;
}
.form-group input.invalid {
  border-color: #F44336;
  background: rgba(244,67,54,0.05);
}
.toggle-password {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
}
.help-text {
  margin: 6px 0 0 0;
  font-size: 12px;
}
.help-text.success {
  color: #4CAF50;
}
.help-text.error {
  color: #F44336;
}
.password-strength {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}
.strength-bar {
  flex: 1;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}
.strength-bar.weak::before {
  content: '';
  display: block;
  width: 33%;
  height: 100%;
  background: #F44336;
}
.strength-label {
  font-size: 12px;
  color: #F44336;
  min-width: 20px;
}
.form-options {
  margin-bottom: 24px;
}
.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}
.checkbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
.submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #007ACC, #00A8FF);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}
.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,122,204,0.3);
}
.btn-arrow {
  transition: transform 0.3s ease;
}
.submit-btn:hover .btn-arrow {
  transform: translateX(4px);
}`
    }
  }
];

function formatHtml(html: string): string {
  const start = performance.now();
  let result = '';
  let indent = 0;
  const indentSize = 2;
  let i = 0;

  html = html.trim();

  while (i < html.length) {
    if (html.slice(i, i + 4) === '<!--') {
      const endComment = html.indexOf('-->', i + 4);
      if (endComment === -1) {
        result += html.slice(i);
        break;
      }
      result += ' '.repeat(indent * indentSize) + html.slice(i, endComment + 3) + '\n';
      i = endComment + 3;
      continue;
    }

    if (html[i] === '<') {
      const isClosing = html[i + 1] === '/';
      const isSelfClosing = html.slice(i).match(/^<[^>]*\/>/) !== null;
      const tagEnd = html.indexOf('>', i);

      if (tagEnd === -1) {
        result += html.slice(i);
        break;
      }

      const tag = html.slice(i, tagEnd + 1);

      if (isClosing) {
        indent = Math.max(0, indent - 1);
        result += ' '.repeat(indent * indentSize) + tag + '\n';
      } else if (isSelfClosing) {
        result += ' '.repeat(indent * indentSize) + tag + '\n';
      } else {
        result += ' '.repeat(indent * indentSize) + tag;
        const afterTag = html.slice(tagEnd + 1);
        const nextTagStart = afterTag.indexOf('<');
        
        if (nextTagStart !== -1) {
          const textContent = afterTag.slice(0, nextTagStart).trim();
          if (textContent) {
            result += '\n' + ' '.repeat((indent + 1) * indentSize) + textContent + '\n';
          } else {
            result += '\n';
          }
        } else {
          const textContent = afterTag.trim();
          if (textContent) {
            result += '\n' + ' '.repeat((indent + 1) * indentSize) + textContent + '\n';
          } else {
            result += '\n';
          }
        }

        const tagNameMatch = tag.match(/^<([a-zA-Z][a-zA-Z0-9-]*)/);
        if (tagNameMatch && !['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tagNameMatch[1].toLowerCase())) {
          indent++;
        }
      }
      i = tagEnd + 1;
    } else {
      const nextTag = html.indexOf('<', i);
      if (nextTag === -1) {
        const text = html.slice(i).trim();
        if (text) {
          result += ' '.repeat(indent * indentSize) + text + '\n';
        }
        break;
      }
      const text = html.slice(i, nextTag).trim();
      if (text) {
        result += ' '.repeat(indent * indentSize) + text + '\n';
      }
      i = nextTag;
    }
  }

  const elapsed = performance.now() - start;
  console.log(`格式化耗时: ${elapsed.toFixed(2)}ms`);
  return result.trim();
}

function formatCss(css: string): string {
  const start = performance.now();
  let result = '';
  let indent = 0;
  const indentSize = 2;
  let i = 0;

  css = css.trim();

  while (i < css.length) {
    const char = css[i];

    if (char === '{') {
      result = result.trimEnd() + ' {\n';
      indent++;
      i++;
    } else if (char === '}') {
      indent = Math.max(0, indent - 1);
      result = result.trimEnd() + '\n' + ' '.repeat(indent * indentSize) + '}\n';
      i++;
    } else if (char === ';') {
      result += ';\n' + ' '.repeat(indent * indentSize);
      i++;
    } else if (char === ':') {
      result += ': ';
      i++;
    } else if (char === '\n' || char === '\r') {
      i++;
    } else if (char === ' ' || char === '\t') {
      if (result.length > 0 && !/\s$/.test(result)) {
        result += ' ';
      }
      i++;
    } else {
      if (result.endsWith('\n')) {
        result += ' '.repeat(indent * indentSize);
      }
      result += char;
      i++;
    }
  }

  result = result.split('\n').map(line => line.trimEnd()).join('\n');
  result = result.replace(/\n{3,}/g, '\n\n').trim();

  const elapsed = performance.now() - start;
  console.log(`格式化耗时: ${elapsed.toFixed(2)}ms`);
  return result;
}

function validateHtml(html: string): { valid: boolean; error?: string; line?: number } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      const errorText = parseError.textContent || '';
      const lineMatch = errorText.match(/line\s+(\d+)/i);
      return {
        valid: false,
        error: 'HTML 语法错误',
        line: lineMatch ? parseInt(lineMatch[1]) : undefined
      };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'HTML 解析失败' };
  }
}

function validateCss(css: string): { valid: boolean; error?: string; line?: number } {
  try {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    document.head.removeChild(style);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'CSS 语法错误' };
  }
}

export function App() {
  const [leftCode, setLeftCode] = useState<string>(PRESET_CASES[0].left.html + '\n\n<style>\n' + PRESET_CASES[0].left.css + '\n</style>');
  const [rightCode, setRightCode] = useState<string>(PRESET_CASES[0].right.html + '\n\n<style>\n' + PRESET_CASES[0].right.css + '\n</style>');
  
  const [leftStatus, setLeftStatus] = useState<RenderStatus>('idle');
  const [rightStatus, setRightStatus] = useState<RenderStatus>('idle');
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightError, setRightError] = useState<string | null>(null);
  const [leftErrorLine, setLeftErrorLine] = useState<number | undefined>(undefined);
  const [rightErrorLine, setRightErrorLine] = useState<number | undefined>(undefined);

  const [leftWidth, setLeftWidth] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [diffs, setDiffs] = useState<DiffResult[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const leftIframeRef = useRef<HTMLIFrameElement>(null);
  const rightIframeRef = useRef<HTMLIFrameElement>(null);
  const leftDocRef = useRef<Document | null>(null);
  const rightDocRef = useRef<Document | null>(null);

  const renderToIframe = useCallback((iframe: HTMLIFrameElement, code: string, side: 'left' | 'right') => {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        if (side === 'left') {
          setLeftStatus('error');
          setLeftError('无法访问 iframe 文档');
        } else {
          setRightStatus('error');
          setRightError('无法访问 iframe 文档');
        }
        return;
      }

      let htmlContent = code;
      let cssContent = '';

      const styleMatch = code.match(/<style>([\s\S]*?)<\/style>/i);
      if (styleMatch) {
        cssContent = styleMatch[1];
        htmlContent = code.replace(/<style>[\s\S]*?<\/style>/i, '');
      }

      const htmlValidation = validateHtml(htmlContent);
      if (!htmlValidation.valid) {
        if (side === 'left') {
          setLeftStatus('error');
          setLeftError(htmlValidation.error || 'HTML 语法错误');
          setLeftErrorLine(htmlValidation.line);
        } else {
          setRightStatus('error');
          setRightError(htmlValidation.error || 'HTML 语法错误');
          setRightErrorLine(htmlValidation.line);
        }
        return;
      }

      const cssValidation = validateCss(cssContent);
      if (!cssValidation.valid) {
        if (side === 'left') {
          setLeftStatus('error');
          setLeftError(cssValidation.error || 'CSS 语法错误');
        } else {
          setRightStatus('error');
          setRightError(cssValidation.error || 'CSS 语法错误');
        }
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { box-sizing: border-box; }
              body { 
                margin: 0; 
                padding: 16px; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: white;
                min-height: 100vh;
              }
              ${cssContent}
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `);
      doc.close();

      if (side === 'left') {
        leftDocRef.current = doc;
        setLeftStatus('success');
        setLeftError(null);
        setLeftErrorLine(undefined);
      } else {
        rightDocRef.current = doc;
        setRightStatus('success');
        setRightError(null);
        setRightErrorLine(undefined);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '渲染失败';
      if (side === 'left') {
        setLeftStatus('error');
        setLeftError(errorMessage);
      } else {
        setRightStatus('error');
        setRightError(errorMessage);
      }
    }
  }, []);

  const handlePreview = useCallback(() => {
    if (leftIframeRef.current) {
      renderToIframe(leftIframeRef.current, leftCode, 'left');
    }
    if (rightIframeRef.current) {
      renderToIframe(rightIframeRef.current, rightCode, 'right');
    }
  }, [leftCode, rightCode, renderToIframe]);

  const handleCompare = useCallback(() => {
    const start = performance.now();
    
    if (leftStatus !== 'success' || rightStatus !== 'success') {
      toast.error('请先确保两侧代码都渲染成功');
      return;
    }

    if (!leftDocRef.current || !rightDocRef.current) {
      toast.error('预览内容未准备好');
      return;
    }

    const leftBody = leftDocRef.current.body;
    const rightBody = rightDocRef.current.body;

    const result = compareAndHighlight(leftBody, rightBody);

    applyHighlights(leftDocRef.current, result.highlightMap.left);
    applyHighlights(rightDocRef.current, result.highlightMap.right);

    setDiffs(result.diffs);
    setShowResults(true);

    const elapsed = performance.now() - start;
    console.log(`对比耗时: ${elapsed.toFixed(2)}ms，发现 ${result.diffs.length} 个差异`);

    if (result.diffs.length === 0) {
      toast.success('两个代码片段完全相同！');
    } else {
      toast.success(`发现 ${result.diffs.length} 个差异点`);
    }
  }, [leftStatus, rightStatus]);

  const handlePresetSelect = useCallback((caseId: string) => {
    const presetCase = PRESET_CASES.find(c => c.id === caseId);
    if (!presetCase) return;

    setIsLoading(true);
    setShowResults(false);
    setDiffs([]);

    if (leftDocRef.current) {
      clearHighlights(leftDocRef.current);
    }
    if (rightDocRef.current) {
      clearHighlights(rightDocRef.current);
    }

    const leftFullCode = presetCase.left.html + '\n\n<style>\n' + presetCase.left.css + '\n</style>';
    const rightFullCode = presetCase.right.html + '\n\n<style>\n' + presetCase.right.css + '\n</style>';

    setLeftCode(leftFullCode);
    setRightCode(rightFullCode);
    setLeftStatus('idle');
    setRightStatus('idle');
    setLeftError(null);
    setRightError(null);

    setTimeout(() => {
      setIsLoading(false);
      if (leftIframeRef.current) {
        renderToIframe(leftIframeRef.current, leftFullCode, 'left');
      }
      if (rightIframeRef.current) {
        renderToIframe(rightIframeRef.current, rightFullCode, 'right');
      }
    }, 1000);
  }, [renderToIframe]);

  const handleFormat = useCallback((side: 'left' | 'right') => {
    const code = side === 'left' ? leftCode : rightCode;
    
    let htmlContent = code;
    let cssContent = '';
    const styleMatch = code.match(/<style>([\s\S]*?)<\/style>/i);
    
    if (styleMatch) {
      cssContent = styleMatch[1];
      htmlContent = code.replace(/<style>[\s\S]*?<\/style>/i, '').trim();
    }

    const formattedHtml = formatHtml(htmlContent);
    const formattedCss = formatCss(cssContent);
    const formatted = formattedHtml + '\n\n<style>\n' + formattedCss + '\n</style>';

    if (side === 'left') {
      setLeftCode(formatted);
    } else {
      setRightCode(formatted);
    }
    toast.success('代码已格式化');
  }, [leftCode, rightCode]);

  const handleCopy = useCallback((side: 'left' | 'right') => {
    const code = side === 'left' ? leftCode : rightCode;
    navigator.clipboard.writeText(code).then(() => {
      toast.success('已复制');
    }).catch(() => {
      toast.error('复制失败');
    });
  }, [leftCode, rightCode]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
    const clampedWidth = Math.max(20, Math.min(80, newWidth));
    setLeftWidth(clampedWidth);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handlePreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePreview]);

  const getStatusBadge = (status: RenderStatus) => {
    if (status === 'success') {
      return <span style={styles.statusSuccess}>✓ 已渲染</span>;
    }
    if (status === 'error') {
      return <span style={styles.statusError}>✕ 语法错误</span>;
    }
    return <span style={styles.statusIdle}>○ 待渲染</span>;
  };

  const getDiffTypeBadge = (type: string) => {
    if (type === 'added') {
      return <span style={styles.diffTypeAdded}>新增</span>;
    }
    if (type === 'removed') {
      return <span style={styles.diffTypeRemoved}>删除</span>;
    }
    return <span style={styles.diffTypeModified}>修改</span>;
  };

  return (
    <div style={styles.app}>
      <style>{`
        button:hover {
          background-color: #1A9CFF !important;
          transition: all 0.2s ease;
        }
        button:active {
          transform: scale(0.95);
        }
        .result-panel-enter {
          animation: slideDown 0.4s ease-out forwards;
        }
        @keyframes slideDown {
          from {
            height: 0;
            opacity: 0;
          }
          to {
            height: 250px;
            opacity: 1;
          }
        }
        .result-panel-exit {
          animation: slideUp 0.3s ease-in forwards;
        }
        @keyframes slideUp {
          from {
            height: 250px;
            opacity: 1;
          }
          to {
            height: 0;
            opacity: 0;
          }
        }
        .loading-spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top-color: #1976D2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .toast-style {
          position: fixed;
          bottom: 20px;
          right: 20px;
        }
      `}</style>

      <div style={styles.header}>
        <h1 style={styles.title}>HTML/CSS 代码片段对比工具</h1>
        <div style={styles.toolbar}>
          <label style={styles.presetLabel}>预设案例:</label>
          <select 
            style={styles.presetSelect} 
            onChange={(e) => handlePresetSelect(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>选择预设案例...</option>
            {PRESET_CASES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {isLoading && <span className="loading-spinner" style={{ marginLeft: '12px' }}></span>}
        </div>
      </div>

      <div style={styles.actionBar}>
        <button style={styles.actionButton} onClick={handlePreview}>
          ▶ 预览 (Ctrl+Enter)
        </button>
        <button style={{ ...styles.actionButton, background: '#4CAF50' }} onClick={handleCompare}>
          🔍 对比差异
        </button>
        <button 
          style={{ ...styles.actionButton, background: '#757575' }} 
          onClick={() => {
            setShowResults(false);
            setDiffs([]);
            if (leftDocRef.current) clearHighlights(leftDocRef.current);
            if (rightDocRef.current) clearHighlights(rightDocRef.current);
          }}
        >
          ✕ 清除对比
        </button>
      </div>

      <div ref={containerRef} style={styles.mainContent}>
        <div style={{ ...styles.previewPanel, width: `${leftWidth}%`, transition: isDragging ? 'none' : 'width 0.3s ease' }}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>左侧预览</span>
            {getStatusBadge(leftStatus)}
          </div>
          <iframe 
            ref={leftIframeRef} 
            style={styles.iframe}
            title="Left Preview"
            sandbox="allow-scripts"
          />
          <div style={styles.editorContainer}>
            <EditorPanel
              code={leftCode}
              language="html"
              onChange={setLeftCode}
              onFormat={() => handleFormat('left')}
              onCopy={() => handleCopy('left')}
              error={leftError}
              errorLine={leftErrorLine}
            />
          </div>
        </div>

        <div 
          style={styles.divider}
          onMouseDown={handleMouseDown}
        />

        <div style={{ ...styles.previewPanel, width: `${100 - leftWidth}%`, transition: isDragging ? 'none' : 'width 0.3s ease' }}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>右侧预览</span>
            {getStatusBadge(rightStatus)}
          </div>
          <iframe 
            ref={rightIframeRef} 
            style={styles.iframe}
            title="Right Preview"
            sandbox="allow-scripts"
          />
          <div style={styles.editorContainer}>
            <EditorPanel
              code={rightCode}
              language="html"
              onChange={setRightCode}
              onFormat={() => handleFormat('right')}
              onCopy={() => handleCopy('right')}
              error={rightError}
              errorLine={rightErrorLine}
            />
          </div>
        </div>
      </div>

      {showResults && (
        <div 
          className="result-panel-enter"
          style={styles.resultPanel}
        >
          <div style={styles.resultHeader}>
            <h3 style={styles.resultTitle}>对比结果 - 共发现 {diffs.length} 个差异点</h3>
          </div>
          <div style={styles.resultList}>
            {diffs.length === 0 ? (
              <div style={styles.noDiffs}>
                ✅ 两个代码片段完全相同，未发现差异
              </div>
            ) : (
              diffs.map((diff, index) => (
                <div key={index} style={styles.diffItem}>
                  <div style={styles.diffItemHeader}>
                    {getDiffTypeBadge(diff.type)}
                    <span style={styles.diffDescription}>{diff.description}</span>
                  </div>
                  <div style={styles.xpathContainer}>
                    <div style={styles.xpathRow}>
                      <span style={styles.xpathLabel}>左侧 XPath:</span>
                      <code style={styles.xpathCode}>{diff.leftXPath}</code>
                    </div>
                    <div style={styles.xpathRow}>
                      <span style={styles.xpathLabel}>右侧 XPath:</span>
                      <code style={styles.xpathCode}>{diff.rightXPath}</code>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <Toaster 
        position="bottom-right"
        toastOptions={{
          duration: 500,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '4px',
            padding: '8px 16px',
            fontSize: '14px'
          }
        }}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#1E1E1E',
    color: '#D4D4D4',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #444'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#D4D4D4'
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  presetLabel: {
    fontSize: '14px',
    color: '#858585'
  },
  presetSelect: {
    padding: '6px 12px',
    backgroundColor: '#3C3C3C',
    color: '#D4D4D4',
    border: '1px solid #444',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none'
  },
  actionBar: {
    display: 'flex',
    gap: '12px',
    padding: '12px 24px',
    backgroundColor: '#1E1E1E',
    borderBottom: '1px solid #444'
  },
  actionButton: {
    padding: '8px 20px',
    backgroundColor: '#007ACC',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative'
  },
  previewPanel: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#2D2D30',
    borderBottom: '1px solid #444'
  },
  panelTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#CCCCCC'
  },
  statusSuccess: {
    padding: '2px 8px',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    color: '#4CAF50',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500
  },
  statusError: {
    padding: '2px 8px',
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    color: '#F44336',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500
  },
  statusIdle: {
    padding: '2px 8px',
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    color: '#999',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500
  },
  iframe: {
    width: '100%',
    flex: 1,
    border: 'none',
    backgroundColor: 'white',
    minHeight: '200px'
  },
  editorContainer: {
    height: '40%',
    minHeight: '200px',
    borderTop: '1px solid #444'
  },
  divider: {
    width: '6px',
    backgroundColor: '#333',
    cursor: 'col-resize',
    flexShrink: 0,
    transition: 'background-color 0.2s ease',
    zIndex: 10
  },
  resultPanel: {
    backgroundColor: '#252526',
    borderTop: '1px solid #444',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  resultHeader: {
    padding: '12px 24px',
    borderBottom: '1px solid #444',
    flexShrink: 0
  },
  resultTitle: {
    margin: 0,
    fontSize: '14px',
    color: '#D4D4D4'
  },
  resultList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 24px'
  },
  noDiffs: {
    padding: '40px',
    textAlign: 'center',
    color: '#4CAF50',
    fontSize: '16px'
  },
  diffItem: {
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: '#2D2D30',
    borderRadius: '4px',
    border: '1px solid #444'
  },
  diffItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px'
  },
  diffTypeAdded: {
    padding: '2px 8px',
    backgroundColor: '#9C27B0',
    color: 'white',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: 600
  },
  diffTypeRemoved: {
    padding: '2px 8px',
    backgroundColor: '#F44336',
    color: 'white',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: 600
  },
  diffTypeModified: {
    padding: '2px 8px',
    backgroundColor: '#FF9800',
    color: 'white',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: 600
  },
  diffDescription: {
    fontSize: '14px',
    color: '#D4D4D4'
  },
  xpathContainer: {
    marginTop: '8px'
  },
  xpathRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px'
  },
  xpathLabel: {
    fontSize: '12px',
    color: '#858585',
    minWidth: '80px'
  },
  xpathCode: {
    fontFamily: 'monospace',
    fontSize: '12px',
    padding: '2px 6px',
    backgroundColor: '#F5F5F5',
    color: '#333',
    borderRadius: '3px'
  }
};
