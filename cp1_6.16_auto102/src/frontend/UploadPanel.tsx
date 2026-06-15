import React, { useState, useRef, useCallback } from 'react';

interface UploadPanelProps {
  onAnalysisComplete: (result: any, sessionId: string) => void;
}

const UploadPanel: React.FC<UploadPanelProps> = ({ onAnalysisComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [codeText, setCodeText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isBase64, setIsBase64] = useState(false);
  const [error, setError] = useState('');
  const [shakeError, setShakeError] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showError = useCallback((message: string) => {
    setError(message);
    setShakeError(true);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (count >= 3) {
        clearInterval(interval);
        setTimeout(() => setShakeError(false), 100);
      }
    }, 100);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      showError('请上传 .zip 格式的压缩包文件');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showError('文件大小不能超过 50MB');
      return;
    }

    setError('');
    setIsUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 25);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/analyze/file', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '上传失败');
      }

      setTimeout(() => {
        setIsUploading(false);
        onAnalysisComplete(data.result, data.sessionId);
      }, 200);
    } catch (err: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setIsUploading(false);
      showError(err.message || '上传失败，请重试');
    }
  };

  const handleAnalyzeText = async () => {
    if (!codeText.trim()) {
      showError('请输入或粘贴代码内容');
      return;
    }

    setError('');
    setIsUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 25);

    try {
      const response = await fetch('/api/analyze/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: codeText,
          fileName: fileName || 'code.ts',
          base64: isBase64,
        }),
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '分析失败');
      }

      setTimeout(() => {
        setIsUploading(false);
        onAnalysisComplete(data.result, data.sessionId);
      }, 200);
    } catch (err: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setIsUploading(false);
      showError(err.message || '分析失败，请重试');
    }
  };

  const handleDropClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="upload-panel">
      <div className="panel-tabs">
        <button
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          文件上传
        </button>
        <button
          className={`tab-btn ${activeTab === 'paste' ? 'active' : ''}`}
          onClick={() => setActiveTab('paste')}
        >
          代码粘贴
        </button>
      </div>

      {activeTab === 'upload' && (
        <div className="upload-content">
          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleDropClick}
          >
            <div className="drop-zone-icon">📁</div>
            <p className="drop-zone-text">
              拖拽 .zip 压缩包到此处，或点击选择文件
            </p>
            <p className="drop-zone-hint">
              支持 .js、.ts、.tsx、.jsx 文件，最大 50MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>
        </div>
      )}

      {activeTab === 'paste' && (
        <div className="paste-content">
          <div className="paste-input-group">
            <label className="input-label">文件名（可选）</label>
            <input
              type="text"
              className="text-input"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="例如: myFile.ts"
            />
          </div>
          <div className="paste-input-group">
            <label className="input-label">
              <input
                type="checkbox"
                checked={isBase64}
                onChange={(e) => setIsBase64(e.target.checked)}
                className="checkbox-input"
              />
              Base64 编码
            </label>
          </div>
          <div className="paste-input-group">
            <label className="input-label">代码内容</label>
            <textarea
              className="code-textarea"
              value={codeText}
              onChange={(e) => setCodeText(e.target.value)}
              placeholder="在此粘贴您的代码..."
              spellCheck={false}
            />
          </div>
          <button
            className="analyze-btn"
            onClick={handleAnalyzeText}
            disabled={isUploading}
          >
            开始分析
          </button>
        </div>
      )}

      {isUploading && (
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="progress-text">
            {uploadProgress < 100 ? '正在分析...' : '分析完成！'}
          </p>
        </div>
      )}

      {error && (
        <div className={`error-message ${shakeError ? 'shake' : ''}`}>
          {error}
        </div>
      )}

      <div className="upload-tips">
        <h4>💡 提示</h4>
        <ul>
          <li>支持分析 JavaScript 和 TypeScript 代码</li>
          <li>系统将检测注释覆盖率、准确度和冗余度</li>
          <li>分析结果包含详细的改进建议</li>
          <li>您可以直接在报告中应用建议的修改</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadPanel;
