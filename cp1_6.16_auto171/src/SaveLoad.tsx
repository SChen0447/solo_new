import React, { useState } from 'react';
import { StoryData } from './types';

interface SaveLoadProps {
  storyName: string;
  setStoryName: React.Dispatch<React.SetStateAction<string>>;
  lastSaved: string;
  setLastSaved: React.Dispatch<React.SetStateAction<string>>;
  getStoryData: () => StoryData;
  loadStoryData: (data: StoryData) => void;
}

const STORAGE_KEY = 'storyData';

const SaveLoad: React.FC<SaveLoadProps> = ({
  storyName,
  setStoryName,
  lastSaved,
  setLastSaved,
  getStoryData,
  loadStoryData
}) => {
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [jsonPreview, setJsonPreview] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const formatDateTime = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const showMsg = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSave = () => {
    try {
      const now = new Date();
      const formattedTime = formatDateTime(now);
      const data: StoryData = {
        ...getStoryData(),
        lastSaved: formattedTime
      };
      const jsonStr = JSON.stringify(data, null, 2);
      localStorage.setItem(STORAGE_KEY, jsonStr);
      setLastSaved(formattedTime);
      setJsonPreview(jsonStr);
      showMsg('✅ 故事保存成功！', 'success');
    } catch (err) {
      showMsg('❌ 保存失败：' + (err as Error).message, 'error');
    }
  };

  const handleLoad = () => {
    try {
      const jsonStr = localStorage.getItem(STORAGE_KEY);
      if (!jsonStr) {
        showMsg('⚠️ 没有找到已保存的故事', 'error');
        return;
      }
      const data: StoryData = JSON.parse(jsonStr);
      loadStoryData(data);
      setJsonPreview(jsonStr);
      showMsg('✅ 故事加载成功！', 'success');
    } catch (err) {
      showMsg('❌ 加载失败：JSON 格式错误', 'error');
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 20);
    setStoryName(value);
  };

  const handleExport = () => {
    const data = getStoryData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyName || '动画故事'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMsg('📤 已导出 JSON 文件', 'success');
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data: StoryData = JSON.parse(ev.target?.result as string);
          loadStoryData(data);
          showMsg('📥 已导入 JSON 文件', 'success');
        } catch {
          showMsg('❌ 导入失败：JSON 格式错误', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="saveload-container">
      <div className="saveload-card">
        <div className="saveload-header">
          <h2>💾 故事管理</h2>
        </div>

        <div className="story-info">
          <label className="info-label">
            故事名称：
            <input
              type="text"
              className="story-name-input"
              value={storyName}
              onChange={handleNameChange}
              maxLength={20}
              placeholder="输入故事名称（最多20字）"
            />
          </label>
          <div className="info-label">
            {lastSaved ? `最后保存：${lastSaved}` : '尚未保存'}
          </div>
        </div>

        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}

        <div className="button-group">
          <button className="btn-primary" onClick={handleSave}>
            💾 保存到本地
          </button>
          <button className="btn-secondary" onClick={handleLoad}>
            📂 从本地加载
          </button>
        </div>

        <div className="divider">
          <span>或使用文件</span>
        </div>

        <div className="button-group">
          <button className="btn-secondary" onClick={handleExport}>
            📤 导出 JSON
          </button>
          <button className="btn-secondary" onClick={handleImportClick}>
            📥 导入 JSON
          </button>
        </div>

        <div className="preview-section">
          <button
            className="btn-text"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? '👁️ 隐藏 JSON 预览' : '👁️ 查看 JSON 预览'}
          </button>
          {showPreview && (
            <textarea
              className="json-preview"
              readOnly
              value={jsonPreview || JSON.stringify(getStoryData(), null, 2)}
              rows={12}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SaveLoad;
