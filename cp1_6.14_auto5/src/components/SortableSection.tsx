import { useRef, type ReactNode } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { GripVertical } from 'lucide-react';
import type { SectionType } from '@/context/ResumeContext';

interface SortableSectionProps {
  id: SectionType;
  index: number;
  moveSection: (dragIndex: number, hoverIndex: number) => void;
  children: ReactNode;
}

interface DragItem {
  id: SectionType;
  index: number;
}

const SECTION_LABELS: Record<SectionType, string> = {
  personalInfo: '个人信息',
  education: '教育经历',
  workExperience: '工作经历',
};

export default function SortableSection({ id, index, moveSection, children }: SortableSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, dragRef] = useDrag({
    type: 'SECTION',
    item: (): DragItem => ({ id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, dropRef] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: 'SECTION',
    hover(item, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveSection(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  dragRef(dropRef(ref));

  return (
    <div
      ref={ref}
      className={`
        bg-white rounded-xl shadow-sm border transition-all duration-200
        ${isDragging ? 'opacity-50 shadow-lg scale-[1.02] border-blue-300' : 'border-gray-100'}
        ${isOver && !isDragging ? 'border-blue-300 border-dashed' : ''}
      `}
      style={{ cursor: 'grab' }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50 bg-gray-50/50 rounded-t-xl">
        <GripVertical size={16} className="text-gray-400" />
        <span className="text-xs font-medium text-gray-600">{SECTION_LABELS[id]}</span>
      </div>
      <div className="p-4" style={{ cursor: 'default' }}>
        {children}
      </div>
    </div>
  );
}
