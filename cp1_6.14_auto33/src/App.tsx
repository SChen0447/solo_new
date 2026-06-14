import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useStoryboardStore } from './store';
import { SceneCard } from './components/SceneCard';
import { PreviewPanel } from './components/PreviewPanel';

const StoryboardListPage: React.FC = () => {
  const { storyboards, isLoading, loadStoryboards, createStoryboard, deleteStoryboard, setCurrentStoryboard, searchQuery, sortBy, setSearchQuery, setSortBy } =
    useStoryboardStore();
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadStoryboards();
  }, [loadStoryboards]);

  const filtered = useMemo(() => {
    let list = [...storyboards];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((sb) => sb.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [storyboards, searchQuery, sortBy]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    await createStoryboard(newName.trim());
    setNewName('');
    setShowCreate(false);
  }, [newName, createStoryboard]);

  const handleLoad = useCallback(
    (id: string) => {
      const sb = storyboards.find((s) => s.id === id);
      if (sb) setCurrentStoryboard(sb);
    },
    [storyboards, setCurrentStoryboard]
  );

  return (
    <div className="page-fade">
      <div className="list-header">
        <h1>我的故事板</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + 新建故事板
        </button>
      </div>

      <div className="list-toolbar">
        <input
          className="search-input"
          placeholder="搜索故事板..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'updatedAt')}>
          <option value="updatedAt">最近编辑</option>
          <option value="createdAt">创建时间</option>
        </select>
      </div>

      {showCreate && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>新建故事板</h3>
            <input
              className="scene-input"
              placeholder="输入故事板名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={50}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleCreate}>创建</button>
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          {searchQuery ? '未找到匹配的故事板' : '还没有故事板，点击上方按钮创建'}
        </div>
      ) : (
        <div className="storyboard-list">
          {filtered.map((sb) => (
            <div key={sb.id} className="storyboard-item">
              <div className="storyboard-item-info">
                <h3>{sb.name}</h3>
                <span className="storyboard-meta">
                  {sb.scenes.length} 个分镜 · 更新于 {new Date(sb.updatedAt).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="storyboard-item-actions">
                <button className="btn-primary btn-sm" onClick={() => handleLoad(sb.id)}>
                  编辑
                </button>
                <button className="btn-danger btn-sm" onClick={() => deleteStoryboard(sb.id)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StoryboardEditorPage: React.FC = () => {
  const {
    currentStoryboard,
    addScene,
    saveCurrentStoryboard,
    startPreview,
    setCurrentStoryboard,
    resetPreview,
  } = useStoryboardStore();
  const [saveMsg, setSaveMsg] = useState('');

  if (!currentStoryboard) {
    return (
      <div className="page-fade empty-state">
        <p>未选择故事板</p>
        <button className="btn-primary" onClick={() => setCurrentStoryboard(null)}>
          返回列表
        </button>
      </div>
    );
  }

  const handleSave = async () => {
    await saveCurrentStoryboard();
    setSaveMsg('已保存');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handlePreview = () => {
    if (currentStoryboard.scenes.length === 0) return;
    startPreview();
  };

  return (
    <div className="page-fade">
      <div className="editor-header">
        <button className="btn-secondary" onClick={() => { resetPreview(); setCurrentStoryboard(null); }}>
          ← 返回列表
        </button>
        <h2>{currentStoryboard.name}</h2>
        <div className="editor-actions">
          <button className="btn-primary" onClick={addScene}>
            + 添加分镜
          </button>
          <button className="btn-secondary" onClick={handlePreview} disabled={currentStoryboard.scenes.length === 0}>
            ▶ 预览
          </button>
          <button className="btn-primary" onClick={handleSave}>
            💾 保存
          </button>
          {saveMsg && <span className="save-msg">{saveMsg}</span>}
        </div>
      </div>

      <div className="scene-grid">
        {currentStoryboard.scenes.map((scene, index) => (
          <SceneCard key={scene.id} scene={scene} index={index} />
        ))}
      </div>

      {currentStoryboard.scenes.length === 0 && (
        <div className="empty-state">
          <p>还没有分镜，点击"添加分镜"开始创作</p>
        </div>
      )}

      <PreviewPanel />
    </div>
  );
};

const App: React.FC = () => {
  const { currentStoryboard } = useStoryboardStore();

  return <div className="app">{currentStoryboard ? <StoryboardEditorPage /> : <StoryboardListPage />}</div>;
};

export default App;
