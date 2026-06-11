import React from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from 'react-beautiful-dnd';
import { ClipboardList, Loader, CheckCircle2 } from 'lucide-react';
import { CardItem } from '@/components/Card';
import type { Card, CardStatus } from '@/types';

interface KanbanBoardProps {
  cards: Card[];
  onDragEnd: (result: DropResult) => void;
  onUpdate: (id: string, data: Partial<Card>) => void;
  onDelete: (id: string) => void;
  onAddCheckItem: (cardId: string, text: string) => void;
  onToggleCheckItem: (cardId: string, itemId: string) => void;
  onRemoveCheckItem: (cardId: string, itemId: string) => void;
  disabledCardIds?: Set<string>;
  searchKeyword?: string;
}

const COLUMNS: { id: CardStatus; title: string; icon: React.ReactNode; colorClass: string }[] = [
  { id: 'todo', title: '待办', icon: <ClipboardList size={18} />, colorClass: 'column--todo' },
  { id: 'in_progress', title: '进行中', icon: <Loader size={18} />, colorClass: 'column--in_progress' },
  { id: 'done', title: '已完成', icon: <CheckCircle2 size={18} />, colorClass: 'column--done' },
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  cards,
  onDragEnd,
  onUpdate,
  onDelete,
  onAddCheckItem,
  onToggleCheckItem,
  onRemoveCheckItem,
  disabledCardIds = new Set(),
  searchKeyword = '',
}) => {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="kanban-board">
        {COLUMNS.map(col => {
          const columnCards = cards
            .filter(c => c.status === col.id)
            .sort((a, b) => a.order - b.order);

          return (
            <div key={col.id} className={`kanban-column ${col.colorClass}`}>
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  {col.icon}
                  <span>{col.title}</span>
                </div>
                <span className="kanban-column-count">{columnCards.length}</span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`kanban-column-body ${snapshot.isDraggingOver ? 'kanban-column-body--drag-over' : ''}`}
                  >
                    {columnCards.map((card, index) => {
                      const isDisabled = disabledCardIds.has(card.id);
                      return (
                        <Draggable
                          key={card.id}
                          draggableId={card.id}
                          index={index}
                          isDragDisabled={isDisabled}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={`card-draggable ${dragSnapshot.isDragging ? 'card-draggable--dragging' : ''}`}
                              style={dragProvided.draggableProps.style}
                            >
                              <CardItem
                                card={card}
                                onUpdate={onUpdate}
                                onDelete={onDelete}
                                onAddCheckItem={onAddCheckItem}
                                onToggleCheckItem={onToggleCheckItem}
                                onRemoveCheckItem={onRemoveCheckItem}
                                isDragDisabled={isDisabled}
                                isDimmed={isDisabled}
                                searchKeyword={searchKeyword}
                              />
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
