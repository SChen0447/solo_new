import { useState, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useColorStore } from './store/colorStore';
import { ColorInputModal } from './components/ColorInputModal';
import type { ColorSwatch, SvgLayerId } from './types';

interface Props {
  onColorSelected?: (hex: string) => void;
}

interface SwatchProps {
  color: ColorSwatch;
  isSelected: boolean;
  isFavorite: boolean;
  onClick: () => void;
  onLongPress: () => void;
  onFavoriteToggle: () => void;
  index?: number;
  draggable?: boolean;
}

const ColorSwatchItem: React.FC<SwatchProps> = ({
  color,
  isSelected,
  isFavorite,
  onClick,
  onLongPress,
  onFavoriteToggle,
  index,
  draggable = false
}) => {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showContext = useRef(false);

  const handleMouseDown = () => {
    showContext.current = false;
    pressTimer.current = setTimeout(() => {
      showContext.current = true;
      onLongPress();
    }, 600);
  };

  const handleMouseUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (showContext.current) {
      e.preventDefault();
      showContext.current = false;
      return;
    }
    onClick();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onFavoriteToggle();
  };

  const content = (
    <div
      className={`color-swatch ${isSelected ? 'selected' : ''} ${isFavorite ? 'favorite' : ''}`}
      style={{ backgroundColor: color.hex }}
      title={`${color.name || color.hex}${isFavorite ? ' (已收藏)' : ''}\n右键或长按可收藏/取消`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      draggable={false}
    />
  );

  if (draggable && typeof index === 'number') {
    return (
      <Draggable draggableId={color.id} index={index}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{ ...provided.draggableProps.style }}
          >
            {content}
          </div>
        )}
      </Draggable>
    );
  }

  return content;
};

export const ColorPalette: React.FC<Props> = () => {
  const [modalOpen, setModalOpen] = useState(false);

  const presetPalettes = useColorStore((state) => state.presetPalettes);
  const customColors = useColorStore((state) => state.customColors);
  const favoriteColors = useColorStore((state) => state.favoriteColors);
  const selectedColor = useColorStore((state) => state.selectedColor);
  const selectedLayer = useColorStore((state) => state.selectedLayer);
  const setSelectedColor = useColorStore((state) => state.setSelectedColor);
  const applyColorToLayer = useColorStore((state) => state.applyColorToLayer);
  const toggleFavorite = useColorStore((state) => state.toggleFavorite);
  const reorderCustomColors = useColorStore((state) => state.reorderCustomColors);
  const addToast = useColorStore((state) => state.addToast);

  const allFavorites = favoriteColors.map((c) => c.hex);

  const handleColorClick = useCallback(
    (hex: string) => {
      setSelectedColor(hex === selectedColor ? null : hex);
      if (hex !== selectedColor && selectedLayer) {
        applyColorToLayer(hex, selectedLayer as SvgLayerId);
        addToast(`已应用颜色到当前图层`, 'success');
      }
    },
    [selectedColor, selectedLayer, setSelectedColor, applyColorToLayer, addToast]
  );

  const handleFavoriteToggle = useCallback(
    (colorId: string, hex: string) => {
      toggleFavorite(colorId, hex);
      const isFav = allFavorites.includes(hex);
      addToast(isFav ? '已取消收藏' : '已加入收藏夹', 'info');
    },
    [toggleFavorite, allFavorites, addToast]
  );

  const handleLongPress = useCallback(
    (colorId: string, hex: string) => {
      handleFavoriteToggle(colorId, hex);
    },
    [handleFavoriteToggle]
  );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderCustomColors(result.source.index, result.destination.index);
  };

  const renderSwatch = (
    color: ColorSwatch,
    isCustom: boolean = false,
    index?: number,
    draggable: boolean = false
  ) => (
    <ColorSwatchItem
      key={color.id}
      color={color}
      isSelected={selectedColor?.toUpperCase() === color.hex.toUpperCase()}
      isFavorite={allFavorites.includes(color.hex)}
      onClick={() => handleColorClick(color.hex)}
      onLongPress={() => handleLongPress(color.id, color.hex)}
      onFavoriteToggle={() => handleFavoriteToggle(color.id, color.hex)}
      index={index}
      draggable={draggable && isCustom}
    />
  );

  return (
    <aside className="color-palette-panel">
      <div className="palette-section">
        <div className="palette-section-title">预设色板</div>
        {presetPalettes.map((palette) => (
          <div key={palette.id} className="preset-palette">
            <div className="preset-palette-header">
              <span className="preset-palette-name">{palette.name}</span>
            </div>
            <div className="color-grid">
              {palette.colors.map((c) => renderSwatch(c))}
            </div>
          </div>
        ))}
      </div>

      <div className="palette-section">
        <div className="palette-section-title">收藏夹</div>
        <div className="favorite-colors">
          {favoriteColors.length > 0 ? (
            favoriteColors.map((c) => renderSwatch(c))
          ) : (
            <div style={{ fontSize: '12px', color: '#999', padding: '8px 0' }}>
              长按或右键点击色块可收藏
            </div>
          )}
        </div>
      </div>

      <div className="palette-section" style={{ flex: 1, borderBottom: 'none' }}>
        <div className="palette-section-title">自定义色板</div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="custom-colors" direction="horizontal">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="custom-colors-drag"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '8px',
                  alignItems: 'start'
                }}
              >
                {customColors.map((c, idx) => renderSwatch(c, true, idx, true))}
                {provided.placeholder}
                <button
                  className="add-color-btn"
                  onClick={() => setModalOpen(true)}
                  title="添加自定义颜色"
                >
                  +
                </button>
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {customColors.length === 0 && (
          <div style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
            点击 + 号添加自定义颜色，可拖拽调整顺序
          </div>
        )}
      </div>

      <ColorInputModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </aside>
  );
};
