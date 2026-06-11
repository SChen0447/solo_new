import { useState } from 'react';
import type { ParseResult } from '../types';

interface InputPanelProps {
  onParse: (text: string) => ParseResult;
  onResult: (result: ParseResult) => void;
  disabled?: boolean;
}

export default function InputPanel({ onParse, onResult, disabled }: InputPanelProps) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);

  const charCount = text.length;
  const isValid = charCount >= 200 && charCount <= 800;

  const handleParse = () => {
    if (!isValid || parsing || disabled) return;
    setParsing(true);
    setTimeout(() => {
      const result = onParse(text);
      onResult(result);
      setParsing(false);
    }, 30);
  };

  const handleClear = () => {
    setText('');
  };

  const handleExample = () => {
    setText(
      '用户管理模块必须实现登录注册功能，支持手机号和邮箱两种方式。登录后应当展示用户个人信息页面，允许用户修改头像和昵称。' +
      '必须提供密码找回功能，通过邮箱验证码完成验证。建议增加第三方登录能力，如微信和QQ登录。' +
      '页面响应速度需要控制在500ms以内，保证良好的用户体验。界面设计应当遵循深灰配色方案，支持深色模式切换。' +
      '用户数据必须加密存储，密码采用bcrypt哈希处理。后续可以考虑增加社交好友功能。' +
      '需要先完成基础用户表设计，基于用户表再开发权限管理模块。权限模块应当支持角色分配，每个角色对应不同的操作权限。'
    );
  };

  return (
    <div className="card input-panel">
      <div className="panel-header">
        <h2>需求描述输入</h2>
        <div className="char-count" data-valid={isValid}>
          {charCount}/800
        </div>
      </div>
      <textarea
        className="input-textarea"
        placeholder="请输入200-800字的需求描述，包含功能点、非功能要求、优先级暗示和依赖关系等信息..."
        value={text}
        onChange={e => setText(e.target.value)}
        rows={14}
      />
      <div className="input-actions">
        <button className="btn btn-secondary ripple" onClick={handleClear} disabled={!text || parsing}>
          清空
        </button>
        <button className="btn btn-secondary ripple" onClick={handleExample} disabled={parsing}>
          示例
        </button>
        <button
          className={`btn btn-primary ripple ${parsing ? 'loading' : ''}`}
          onClick={handleParse}
          disabled={!isValid || parsing || disabled}
        >
          {parsing ? '解析中...' : '解析需求'}
        </button>
      </div>
      <div className="input-hint">
        <span>提示：描述越详细，解析结果越准确。建议用"必须"、"应当"、"可选"等词暗示优先级；用"基于"、"在…之后"等词暗示依赖关系。</span>
      </div>
    </div>
  );
}
