import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { CanvasCard, CanvasText, Inspiration } from '../api/api';
import './IdeaCanvas.css';

const CARD_WIDTH = 180;
const CARD_HEIGHT = 120;
const TEXT_WIDTH = 200;

const IdeaCanvas: React.FC = () => {
  const {
    collectedCards,
    canvasCards,
    canvasTexts,
    connections,
    generatedIdea,
    showIdeaModal,
    isLoading,
    addCanvasCard,
    removeCanvasCard,
    updateCanvasCardPosition,
    addCanvasText,
    updateCanvasText,
    removeCanvasText,
    generateIdea,
    closeIdeaModal,
    convertToProject,
    saveIdeas,
    updateConnections
  } = useStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [draggedFromSidebar, setDraggedFromSidebar] = useState<Inspiration | null>(null);
  const [modalClosing, setModalClosing] = useState(false);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, clientX - rect.left),
      y: Math.max(0, clientY - rect.top)
    };
  }, []);

  useEffect(() => {
    updateConnections();
  }, [canvasCards, updateConnections]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (canvasCards.length > 0 || canvasTexts.length > 0) {
        saveIdeas();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [canvasCards, canvasTexts, saveIdeas]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingId) return;
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const x = Math.max(0, coords.x - dragOffset.x);
      const y = Math.max(0, coords.y - dragOffset.y);
      updateCanvasCardPosition(draggingId, x, y);
    },
    [draggingId, dragOffset, getCanvasCoords, updateCanvasCardPosition]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingId, handleMouseMove, handleMouseUp]);

  const startCardDrag = (card: CanvasCard, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingId(card.id);
    const coords = getCanvasCoords(e.clientX, e.clientY);
    setDragOffset({
      x: coords.x - card.x,
      y: coords.y - card.y
    });
  };

  const handleSidebarDragStart = (card: Inspiration, e: React.DragEvent) => {
    setDraggedFromSidebar(card);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', card.id);
  };

  const handleSidebarDragEnd = () => {
    setDraggedFromSidebar(null);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedFromSidebar) return;
    const coords = getCanvasCoords(e.clientX, e.clientY);
    const x = coords.x - CARD_WIDTH / 2;
    const y = coords.y - CARD_HEIGHT / 2;
    addCanvasCard(draggedFromSidebar, x, y);
    setDraggedFromSidebar(null);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.canvas-card') || target.closest('.canvas-text-item')) return;
    const coords = getCanvasCoords(e.clientX, e.clientY);
    addCanvasText(coords.x - TEXT_WIDTH / 2, coords.y - 20);
  };

  const handleTextDoubleClick = (textId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTextId(textId);
  };

  const handleTextChange = (textId: string, content: string) => {
    updateCanvasText(textId, { content });
  };

  const handleTextBlur = () => {
    setEditingTextId(null);
  };

  const getConnectionPath = (fromId: string, toId: string) => {
    const from = canvasCards.find((c) => c.id === fromId);
    const to = canvasCards.find((c) => c.id === toId);
    if (!from || !to) return '';

    const fromX = from.x + CARD_WIDTH / 2;
    const fromY = from.y + CARD_HEIGHT / 2;
    const toX = to.x + CARD_WIDTH / 2;
    const toY = to.y + CARD_HEIGHT / 2;

    const dx = toX - fromX;
    const dy = toY - fromY;
    const cx1 = fromX + dx * 0.4;
    const cy1 = fromY;
    const cx2 = fromX + dx * 0.6;
    const cy2 = toY;

    return `M ${fromX} ${fromY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toX} ${toY}`;
  };

  const handleCloseModal = () => {
    setModalClosing(true);
    setTimeout(() => {
      setModalClosing(false);
      closeIdeaModal();
    }, 300);
  };

  const handleConvertToProject = async () => {
    await convertToProject();
    setModalClosing(false);
  };

  const toggleTextBold = (textId: string, current: boolean) => {
    updateCanvasText(textId, { bold: !current });
  };

  const toggleTextItalic = (textId: string, current: boolean) => {
    updateCanvasText(textId, { italic: !current });
  };

  const changeTextColor = (textId: string, color: string) => {
    updateCanvasText(textId, { color });
  };

  return (
    <div className="idea-canvas-container fade-in-item">
      <div className="canvas-toolbar">
        <h2 className="canvas-title">
          <span className="title-icon">🎨</span>
          创意画布
        </h2>
        <div className="canvas-hint">
          拖拽左侧卡片到画布 · 双击画布添加文字
        </div>
        <button
          className="btn btn-gradient-purple generate-btn"
          onClick={generateIdea}
          disabled={isLoading || (canvasCards.length === 0 && canvasTexts.length === 0)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2z" />
          </svg>
          {isLoading ? '生成中...' : '生成创意'}
        </button>
      </div>

      <div className="main-content">
        <div className="sidebar-cards">
          <div className="sidebar-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            灵感收集区 ({collectedCards.length})
          </div>
          <div className="sidebar-scroll">
            {collectedCards.length === 0 ? (
              <div className="empty-collection">
                <span className="empty-icon">📭</span>
                <p>暂无收藏的灵感</p>
                <span className="empty-tip">去灵感看板收藏一些卡片吧</span>
              </div>
            ) : (
              collectedCards.map((card, index) => (
                <div
                  key={card.id}
                  className="sidebar-card fade-in-item"
                  style={{
                    background: `linear-gradient(135deg, ${card.gradient[0]} 0%, ${card.gradient[1]} 100%)`,
                    animationDelay: `${index * 0.1}s`
                  }}
                  draggable
                  onDragStart={(e) => handleSidebarDragStart(card, e)}
                  onDragEnd={handleSidebarDragEnd}
                  title="拖拽到画布"
                >
                  <span className="sidebar-card-emoji">{card.emoji}</span>
                  <span className="sidebar-card-text">{card.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          ref={canvasRef}
          className="canvas-area"
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
          onDoubleClick={handleCanvasDoubleClick}
        >
          <svg className="connections-layer">
            {connections.map((conn) => (
              <path
                key={conn.id}
                d={getConnectionPath(conn.fromId, conn.toId)}
                className={`connection-line ${hoveredConnection === conn.id ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredConnection(conn.id)}
                onMouseLeave={() => setHoveredConnection(null)}
              />
            ))}
          </svg>

          {canvasCards.map((card, index) => (
            <div
              key={card.id}
              className={`canvas-card fade-in-item ${draggingId === card.id ? 'dragging' : ''}`}
              style={{
                left: card.x,
                top: card.y,
                background: `linear-gradient(135deg, ${card.gradient[0]} 0%, ${card.gradient[1]} 100%)`,
                animationDelay: `${index * 0.1}s`
              }}
              onMouseDown={(e) => startCardDrag(card, e)}
            >
              <button
                className="card-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCanvasCard(card.id);
                }}
              >
                ×
              </button>
              <span className="canvas-card-emoji">{card.emoji}</span>
              <span className="canvas-card-text">{card.text}</span>
            </div>
          ))}

          {canvasTexts.map((text, index) => (
            <div
              key={text.id}
              className="canvas-text-item fade-in-item"
              style={{
                left: text.x,
                top: text.y,
                animationDelay: `${index * 0.15}s`
              }}
              onDoubleClick={(e) => handleTextDoubleClick(text.id, e)}
            >
              {editingTextId === text.id && (
                <div className="text-toolbar">
                  <button
                    className={`tool-btn ${text.bold ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTextBold(text.id, text.bold);
                    }}
                    title="加粗"
                  >
                    <b>B</b>
                  </button>
                  <button
                    className={`tool-btn ${text.italic ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTextItalic(text.id, text.italic);
                    }}
                    title="斜体"
                  >
                    <i>I</i>
                  </button>
                  <input
                    type="color"
                    value={text.color}
                    onChange={(e) => {
                      e.stopPropagation();
                      changeTextColor(text.id, e.target.value);
                    }}
                    className="color-picker"
                    title="颜色"
                  />
                  <button
                    className="tool-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCanvasText(text.id);
                      setEditingTextId(null);
                    }}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              )}
              {editingTextId === text.id ? (
                <textarea
                  className="text-editor"
                  value={text.content}
                  onChange={(e) => handleTextChange(text.id, e.target.value)}
                  onBlur={handleTextBlur}
                  autoFocus
                  style={{
                    fontWeight: text.bold ? 700 : 400,
                    fontStyle: text.italic ? 'italic' : 'normal',
                    color: text.color
                  }}
                />
              ) : (
                <div
                  className="text-content"
                  style={{
                    fontWeight: text.bold ? 700 : 400,
                    fontStyle: text.italic ? 'italic' : 'normal',
                    color: text.color
                  }}
                >
                  {text.content}
                </div>
              )}
            </div>
          ))}

          {canvasCards.length === 0 && canvasTexts.length === 0 && (
            <div className="empty-canvas">
              <div className="empty-canvas-icon">🎯</div>
              <h3>开始你的创意</h3>
              <p>将左侧卡片拖拽到这里</p>
              <p className="sub-tip">或双击画布添加文字说明</p>
            </div>
          )}
        </div>
      </div>

      {showIdeaModal && generatedIdea && (
        <div className={`idea-modal-overlay ${modalClosing ? 'closing' : ''}`} onClick={handleCloseModal}>
          <div
            className={`idea-modal ${modalClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close-btn" onClick={handleCloseModal}>
              ×
            </button>
            <div className="modal-header">
              <span className="modal-icon">✨</span>
              <h3>创意生成结果</h3>
            </div>
            <div className="modal-body">
              <div className="idea-title-section">
                <label>创意标题</label>
                <h2 className="generated-title">{generatedIdea.title}</h2>
              </div>
              <div className="idea-summary-section">
                <label>项目摘要</label>
                <p className="generated-summary">{generatedIdea.summary}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={handleCloseModal}>
                继续编辑
              </button>
              <button className="btn btn-gradient-purple" onClick={handleConvertToProject}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                转为项目看板
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdeaCanvas;
