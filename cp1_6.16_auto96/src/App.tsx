import React, { useState, useEffect, useRef } from 'react';
import { ConfigPanel } from './ui/ConfigPanel';
import { PreviewRenderer } from './ui/PreviewRenderer';
import { CodeGenerator } from './ui/CodeGenerator';
import { CountdownConfig, configDataModel } from './config/ConfigDataModel';
import { eventBus, Events } from './utils/EventBus';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

interface SavedConfig {
  id: string;
  name: string;
  savedAt: number;
  config: CountdownConfig;
}

const STORAGE_KEY = 'countdown_configs_history';
const MAX_HISTORY = 10;

function App() {
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<CountdownConfig>(configDataModel.getConfig());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const unsubscribe = eventBus.on(Events.CONFIG_CHANGED, (config: CountdownConfig) => {
      setCurrentConfig(config);
    });

    loadHistory();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    eventBus.emit(Events.TIMER_CONTROL, 'reset');
  }, []);

  const loadHistory = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setSavedConfigs(JSON.parse(data));
      }
    } catch (e) {
      console.error('加载历史配置失败:', e);
    }
  };

  const saveHistory = (configs: SavedConfig[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    } catch (e) {
      console.error('保存历史配置失败:', e);
    }
  };

  const handleSaveConfig = () => {
    const name = prompt('请输入方案名称:', currentConfig.activityName);
    if (!name) return;

    const newSaved: SavedConfig = {
      id: uuidv4(),
      name: name.trim(),
      savedAt: Date.now(),
      config: { ...currentConfig, id: uuidv4() }
    };

    const updated = [newSaved, ...savedConfigs].slice(0, MAX_HISTORY);
    setSavedConfigs(updated);
    saveHistory(updated);
  };

  const handleLoadConfig = (saved: SavedConfig) => {
    setIsTransitioning(true);
    setTimeout(() => {
      configDataModel.loadConfig(saved.config);
      eventBus.emit(Events.TIMER_CONTROL, 'reset');
      setTimeout(() => {
        setIsTransitioning(false);
      }, 500);
    }, 250);
  };

  const handleDeleteConfig = (id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      const updated = savedConfigs.filter(s => s.id !== id);
      setSavedConfigs(updated);
      saveHistory(updated);
      setDeletingId(null);
    }, 300);
  };

  const handleClearAll = () => {
    if (!confirm('确定要清空所有历史方案吗？')) return;
    
    setIsClearing(true);
    setTimeout(() => {
      setSavedConfigs([]);
      saveHistory([]);
      setIsClearing(false);
    }, 400);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateThumbnailStyle = (config: CountdownConfig): React.CSSProperties => {
    const bg = config.backgroundColor;
    if (bg.type === 'solid') {
      return { background: bg.color1 };
    } else if (bg.type === 'linear-gradient') {
      return { background: `linear-gradient(${bg.angle}deg, ${bg.color1}, ${bg.color2})` };
    } else {
      return { background: `radial-gradient(circle, ${bg.color1}, ${bg.color2})` };
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎯 动态倒计时组件配置器</h1>
        <button className="btn-save" onClick={handleSaveConfig}>
          💾 保存方案
        </button>
      </header>

      <main className="app-main">
        <div className={`main-content ${isTransitioning ? 'content-transitioning' : ''}`}>
          <div className="left-panel">
            <ConfigPanel />
          </div>
          <div className="right-panel">
            <PreviewRenderer />
          </div>
        </div>

        <div className="bottom-panel">
          <CodeGenerator />
        </div>
      </main>

      <section className="history-section">
        <div className="history-header">
          <h2>📋 历史方案</h2>
          <div className="history-actions">
            <span className="history-count">共 {savedConfigs.length} 个方案</span>
            {savedConfigs.length > 0 && (
              <button className="btn-clear" onClick={handleClearAll}>
                清空全部
              </button>
            )}
          </div>
        </div>

        <div className={`history-grid ${isClearing ? 'clearing' : ''}`}>
          {savedConfigs.length === 0 ? (
            <div className="empty-history">
              <p>暂无保存的方案</p>
              <span>点击上方"保存方案"按钮保存当前配置</span>
            </div>
          ) : (
            savedConfigs.map((saved) => (
              <div
                key={saved.id}
                className={`history-card ${deletingId === saved.id ? 'deleting' : ''}`}
                onClick={() => handleLoadConfig(saved)}
              >
                <div className="card-thumbnail" style={generateThumbnailStyle(saved.config)}>
                  <span
                    className="thumbnail-text"
                    style={{ color: saved.config.textColor, fontFamily: saved.config.fontFamily }}
                  >
                    00:00
                  </span>
                </div>
                <div className="card-info">
                  <h3 className="card-title">{saved.name}</h3>
                  <span className="card-date">{formatDate(saved.savedAt)}</span>
                </div>
                <button
                  className="card-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConfig(saved.id);
                  }}
                  title="删除"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
