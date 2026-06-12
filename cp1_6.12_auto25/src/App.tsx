import { useState, useEffect } from 'react';
import CapsuleForm from './CapsuleForm';
import CapsuleList from './CapsuleList';
import { listCapsules, generateMockCapsules } from './store';

function App() {
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const capsules = listCapsules();
    if (capsules.length === 0) {
      generateMockCapsules(20);
      setRefreshKey(k => k + 1);
    }
  }, []);

  const handleCreated = () => {
    setShowForm(false);
    setRefreshKey(k => k + 1);
  };

  const handleGenerateMock = () => {
    generateMockCapsules(100);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">⏳</span>
            时光胶囊
          </h1>
          <p className="app-subtitle">给未来的自己，留一封惊喜的信</p>
        </div>
        <div className="header-actions">
          <button className="mock-btn" onClick={handleGenerateMock}>
            生成100个测试数据
          </button>
          <button className="create-btn" onClick={() => setShowForm(true)}>
            <span className="btn-icon">+</span>
            创建胶囊
          </button>
        </div>
      </header>

      <main className="app-main">
        <CapsuleList refreshKey={refreshKey} />
      </main>

      {showForm && (
        <CapsuleForm
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default App;
