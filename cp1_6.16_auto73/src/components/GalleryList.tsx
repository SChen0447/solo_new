import React, { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useAppContext } from '../context/AppContext';
import './GalleryList.css';

const GalleryList: React.FC = () => {
  const { state, selectImage, selectAllImages, reorderImages, setEditingImage, generateExhibition } =
    useAppContext();

  const sortedImages = useMemo(() => {
    return [...state.images].sort((a, b) => a.order - b.order);
  }, [state.images]);

  const selectedCount = state.images.filter((img) => img.selected).length;

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const startIndex = result.source.index;
    const endIndex = result.destination.index;

    if (startIndex !== endIndex) {
      reorderImages(startIndex, endIndex);
    }
  };

  const handleGenerateExhibition = () => {
    if (selectedCount === 0) {
      alert('请至少选择一张图片');
      return;
    }
    const url = generateExhibition();
    window.open(url, '_blank');
  };

  const handleSelectAll = () => {
    const allSelected = state.images.every((img) => img.selected);
    selectAllImages(!allSelected);
  };

  const handleEdit = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    setEditingImage(imageId);
  };

  if (state.images.length === 0) {
    return (
      <div className="gallery-empty">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="empty-icon"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <p className="empty-text">暂无图片，请先在瀑布流页面上传</p>
      </div>
    );
  }

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <div className="header-left">
          <h2 className="gallery-title">图库管理</h2>
          <span className="image-count">共 {state.images.length} 张图片</span>
        </div>
        <div className="header-actions">
          <button className="action-btn secondary" onClick={handleSelectAll}>
            {state.images.every((img) => img.selected) ? '取消全选' : '全选'}
          </button>
          <button
            className="action-btn primary"
            onClick={handleGenerateExhibition}
            disabled={selectedCount === 0}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
              <path d="M21 14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
            </svg>
            生成展示页 ({selectedCount})
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="gallery" direction="horizontal">
          {(provided) => (
            <div
              className="gallery-grid"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {sortedImages.map((image, index) => (
                <Draggable key={image.id} draggableId={image.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`gallery-item ${image.selected ? 'selected' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
                      onClick={() => selectImage(image.id, !image.selected)}
                      style={{
                        ...provided.draggableProps.style,
                        transform: snapshot.isDragging
                          ? `${provided.draggableProps.style?.transform} scale(1.05)`
                          : provided.draggableProps.style?.transform
                      }}
                    >
                      <div className="thumbnail-wrapper">
                        <img
                          src={image.editedUrl || image.originalUrl}
                          alt={image.name}
                          loading="lazy"
                        />
                        <div className="item-overlay">
                          <div className="select-indicator">
                            {image.selected && (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <button
                            className="edit-btn"
                            onClick={(e) => handleEdit(e, image.id)}
                            title="编辑图片"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="item-info">
                        <span className="item-order">{index + 1}</span>
                        <span className="item-name" title={image.name}>
                          {image.name}
                        </span>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="gallery-tips">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        提示：拖拽图片可调整排序顺序，点击图片选中后生成展示页
      </div>
    </div>
  );
};

export default GalleryList;
