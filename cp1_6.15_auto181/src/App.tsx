import { useState, useEffect } from 'react';
import DiaryPage from './modules/diary/DiaryPage';
import VisualizationPage from './modules/visualization/VisualizationPage';
import { usePlantStore } from './stores/plantStore';
import type { Plant } from './types';
import { CARE_TYPE_LABELS } from './types';

function App() {
  const { plants, entries, selectedPlantId, selectPlant, exportData, importData } =
    usePlantStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'diary' | 'visualization'>('diary');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 480) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const filename = `plant-diary-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = importData(content);
      if (success) {
        setShowImportModal(false);
        alert('导入成功！');
      } else {
        alert('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);
  };

  const getHealthColor = (health: number) => {
    if (health >= 70) return '#4caf50';
    if (health >= 40) return '#ffeb3b';
    return '#f44336';
  };

  const getPlantLastCareDate = (plantId: string) => {
    const plantEntries = entries.filter((e) => e.plantId === plantId);
    if (plantEntries.length === 0) return '暂无记录';
    const latest = plantEntries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    return latest.date;
  };

  const sortedPlants = [...plants].sort((a, b) => {
    const aDate = getPlantLastCareDate(a.id);
    const bDate = getPlantLastCareDate(b.id);
    if (aDate === '暂无记录') return 1;
    if (bDate === '暂无记录') return -1;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#121212',
        color: '#e0e0e0'
      }}
    >
      <div
        style={{
          display: window.innerWidth < 480 ? 'flex' : 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          backgroundColor: '#1e1e1e',
          borderBottom: '1px solid #333',
          alignItems: 'center',
          padding: '0 16px',
          zIndex: 100
        }}
      >
        <button
          onClick={() => setMobileSidebarOpen(true)}
          style={{
            background: 'none',
            color: '#e0e0e0',
            fontSize: 24,
            padding: 4
          }}
        >
          ☰
        </button>
        <span style={{ marginLeft: 12, fontSize: 16, fontWeight: 600 }}>
          植物生长日记
        </span>
      </div>

      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#00000080',
            zIndex: 200
          }}
        />
      )}

      <aside
        style={{
          width: sidebarOpen || mobileSidebarOpen ? 280 : 0,
          minWidth: sidebarOpen || mobileSidebarOpen ? 280 : 0,
          backgroundColor: '#f5f5f5',
          boxShadow: '0 2px 8px #0000001a',
          overflowY: 'auto',
          transition: 'all 0.3s ease-out',
          position: window.innerWidth < 480 ? 'fixed' : 'relative',
          left: 0,
          top: window.innerWidth < 480 ? 56 : 0,
          bottom: 0,
          zIndex: window.innerWidth < 480 ? 300 : 1,
          display: 'flex',
          flexDirection: 'column',
          opacity: sidebarOpen || mobileSidebarOpen ? 1 : 0,
          pointerEvents: sidebarOpen || mobileSidebarOpen ? 'auto' : 'none'
        }}
      >
        <div
          style={{
            padding: 20,
            borderBottom: '1px solid #ddd'
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#333',
              marginBottom: 4
            }}
          >
            🌱 植物概览
          </h2>
          <p style={{ fontSize: 12, color: '#888' }}>
            共 {plants.length} 株植物 · {entries.length} 条记录
          </p>
        </div>

        <div style={{ padding: 12, flex: 1 }}>
          {sortedPlants.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
              暂无植物，请先添加护理记录
            </div>
          ) : (
            sortedPlants.map((plant: Plant) => {
              const isSelected = plant.id === selectedPlantId;
              return (
                <div
                  key={plant.id}
                  onClick={() => {
                    selectPlant(plant.id);
                    setMobileSidebarOpen(false);
                  }}
                  style={{
                    height: 60,
                    padding: '0 12px',
                    marginBottom: 8,
                    borderRadius: 8,
                    backgroundColor: isSelected ? '#e3f2fd' : '#fff',
                    border: isSelected ? '1px solid #1976d2' : '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-out'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#e3f2fd';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#fff';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#333',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {plant.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      最近: {getPlantLastCareDate(plant.id)}
                    </div>
                  </div>
                  <div style={{ width: 60, marginLeft: 12 }}>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#eee',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${plant.health}%`,
                          height: '100%',
                          backgroundColor: getHealthColor(plant.health),
                          transition: 'width 0.3s ease-out'
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#666',
                        textAlign: 'right',
                        marginTop: 2
                      }}
                    >
                      {plant.health}%
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            padding: 12,
            borderTop: '1px solid #ddd',
            display: 'flex',
            gap: 8
          }}
        >
          <button
            onClick={handleExport}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              backgroundColor: '#1976d2',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500
            }}
          >
            导出数据
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              backgroundColor: '#388e3c',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500
            }}
          >
            导入数据
          </button>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: window.innerWidth < 480 ? 56 : 0,
          minWidth: 0
        }}
      >
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #333',
            backgroundColor: '#1e1e1e'
          }}
        >
          <button
            onClick={() => setActiveTab('diary')}
            style={{
              padding: '14px 24px',
              fontSize: 14,
              fontWeight: 500,
              color: activeTab === 'diary' ? '#1976d2' : '#b0b0b0',
              backgroundColor: activeTab === 'diary' ? '#2a2a2a' : 'transparent',
              borderBottom:
                activeTab === 'diary' ? '2px solid #1976d2' : '2px solid transparent'
            }}
          >
            📖 护理日志
          </button>
          <button
            onClick={() => setActiveTab('visualization')}
            style={{
              padding: '14px 24px',
              fontSize: 14,
              fontWeight: 500,
              color: activeTab === 'visualization' ? '#1976d2' : '#b0b0b0',
              backgroundColor: activeTab === 'visualization' ? '#2a2a2a' : 'transparent',
              borderBottom:
                activeTab === 'visualization' ? '2px solid #1976d2' : '2px solid transparent'
            }}
          >
            📊 数据可视化
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {activeTab === 'diary' ? <DiaryPage /> : <VisualizationPage />}
        </div>
      </main>

      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(128, 128, 128, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowImportModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 24,
              width: 400,
              maxWidth: '90vw',
              color: '#333',
              animation: 'fadeIn 0.3s ease-out'
            }}
          >
            <h3 style={{ fontSize: 18, marginBottom: 12, color: '#333' }}>
              确认导入数据？
            </h3>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
              导入将替换当前所有数据，此操作不可撤销。
            </p>
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
              style={{
                width: '100%',
                marginBottom: 20,
                padding: 8,
                border: '1px solid #ddd',
                borderRadius: 6
              }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  backgroundColor: '#d32f2f',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
