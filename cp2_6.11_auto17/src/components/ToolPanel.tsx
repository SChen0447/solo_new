import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';
import { Type, Image, Square, Circle, Save, FolderOpen } from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';
import { BUILTIN_TEMPLATES } from '../utils/templates';
import { downloadJson, readFileAsText } from '../utils/helpers';
import type { ComponentType } from '../types';
import { DND_TYPES } from '../types';

interface ToolItemProps {
  type: ComponentType;
  icon: React.ReactNode;
  label: string;
}

const ToolItem: React.FC<ToolItemProps> = ({ type, icon, label }) => {
  const addComponent = useCanvasStore((s) => s.addComponent);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: DND_TYPES.TOOL,
      item: { type },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [type]
  );

  return (
    <div
      ref={drag}
      onClick={() => addComponent(type)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: '#FFFFFF',
        borderRadius: 8,
        border: '1px solid #E0E0E0',
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        transition: 'transform 0.2s, box-shadow 0.2s',
        userSelect: 'none',
      }}
      className="tool-item"
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 35, 126, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ color: '#1A237E', marginBottom: 8 }}>{icon}</div>
      <span style={{ fontSize: 13, color: '#333333' }}>{label}</span>
    </div>
  );
};

export const ToolPanel: React.FC = () => {
  const loadTemplate = useCanvasStore((s) => s.loadTemplate);
  const saveAsTemplate = useCanvasStore((s) => s.saveAsTemplate);
  const loadTemplateFromJson = useCanvasStore((s) => s.loadTemplateFromJson);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveTemplate = () => {
    const template = saveAsTemplate('我的模板');
    downloadJson(template, `poster-template-${Date.now()}.json`);
  };

  const handleLoadTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const text = await readFileAsText(file);
        loadTemplateFromJson(text);
      } catch (err) {
        console.error('Failed to load template:', err);
        alert('模板文件加载失败');
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      style={{
        width: 240,
        height: '100%',
        background: '#FAFAFA