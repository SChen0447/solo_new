import { memo } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Plus, X, ChevronDown, FileText } from 'lucide-react';
import { useGameStore, GameNode, GameOption } from './store';

interface NodePanelProps {
  className?: string;
}

const NodePanel = memo(({ className = '' }: NodePanelProps) => {
  const {
    selectedNodeId,
    nodes,
    updateNode,
    addOption,
    removeOption,
    updateOption,
    selectNode,
  } = useGameStore();

  const selectedNode: GameNode | undefined = nodes.find(
    (n) => n.id === selectedNodeId
  );

  if (!selectedNode) {
    return (
      <div
        className={`w-[360px] h-full bg-white border-l border-editor-border flex flex-col ${className}`}
      >
        <div className="p-4 border-b border-editor-border flex items-center justify-between">
          <h2 className="font-bold text-editor-text flex items-center gap-2">
            <FileText size={18} />
            属性面板
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-editor-text/50 p-8 text-center">
          <FileText size={48} className="mb-4 opacity-30" />
          <p className="text-sm">点击画布上的节点卡片</p>
          <p className="text-sm">查看和编辑节点属性</p>
        </div>
      </div>
    );
  }

  const handleDescriptionChange = (value: string | undefined) => {
    updateNode(selectedNode.id, { description: value || '' });
  };

  const handleAddOption = () => {
    addOption(selectedNode.id);
  };

  const handleRemoveOption = (optionId: string) => {
    removeOption(selectedNode.id, optionId);
  };

  const handleOptionTextChange = (optionId: string, text: string) => {
    updateOption(selectedNode.id, optionId, { text });
  };

  const handleOptionTargetChange = (optionId: string, targetNodeId: string) => {
    updateOption(selectedNode.id, optionId, {
      targetNodeId: targetNodeId || null,
    });
  };

  const availableTargetNodes = nodes.filter((n) => n.id !== selectedNode.id);

  return (
    <div
      className={`w-[360px] h-full bg-white border-l border-editor-border flex flex-col ${className}`}
    >
      <div className="p-4 border-b border-editor-border flex items-center justify-between">
        <h2 className="font-bold text-editor-text flex items-center gap-2">
          <FileText size={18} />
          节点属性
        </h2>
        <button
          onClick={() => selectNode(null)}
          className="p-1.5 rounded-full hover:bg-editor-bg text-editor-text/60 hover:text-editor-text transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <label className="block text-sm font-medium text-editor-text mb-2">
            节点ID
          </label>
          <div className="px-3 py-2 bg-editor-bg rounded-node text-sm font-mono text-editor-text/70 border border-editor-border">
            {selectedNode.id.slice(0, 12)}...
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-editor-text mb-2">
            背景颜色
          </label>
          <div className="flex gap-2 flex-wrap">
            {[
              '#FFE4E1',
              '#E8F5E9',
              '#E3F2FD',
              '#FFF3E0',
              '#F3E5F5',
              '#FFFDE7',
              '#E0F2F1',
              '#FCE4EC',
            ].map((color) => (
              <button
                key={color}
                onClick={() => updateNode(selectedNode.id, { backgroundColor: color })}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedNode.backgroundColor === color
                    ? 'border-primary scale-110 shadow-md'
                    : 'border-editor-border hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div data-color-mode="light">
          <label className="block text-sm font-medium text-editor-text mb-2">
            场景描述 (支持Markdown)
          </label>
          <div className="rounded-node overflow-hidden border border-editor-border focus-within:border-primary transition-colors">
            <MDEditor
              value={selectedNode.description}
              onChange={handleDescriptionChange}
              height={280}
              preview="edit"
              placeholder="在这里编写场景描述...&#10;&#10;支持：**加粗**、*斜体*、- 列表、## 标题等Markdown格式"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-editor-text">
              跳转选项 ({selectedNode.options.length}/4)
            </label>
            {selectedNode.options.length < 4 && (
              <button
                onClick={handleAddOption}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-pill hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Plus size={14} />
                添加选项
              </button>
            )}
          </div>

          <div className="space-y-3">
            {selectedNode.options.length === 0 && (
              <div className="p-6 border-2 border-dashed border-editor-border rounded-node text-center text-editor-text/40 text-sm">
                点击上方按钮添加选项
              </div>
            )}

            {selectedNode.options.map((option: GameOption, index: number) => (
              <div
                key={option.id}
                className="p-3 bg-editor-bg/50 rounded-node border border-editor-border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-primary">
                    选项 {index + 1}
                  </span>
                  <button
                    onClick={() => handleRemoveOption(option.id)}
                    className="p-1 rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div>
                  <label className="block text-xs text-editor-text/60 mb-1">
                    选项文本
                  </label>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => handleOptionTextChange(option.id, e.target.value)}
                    placeholder="输入玩家看到的选项文字..."
                    className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-editor-border focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-editor-text/60 mb-1">
                    跳转到节点
                  </label>
                  <div className="relative">
                    <select
                      value={option.targetNodeId || ''}
                      onChange={(e) => handleOptionTargetChange(option.id, e.target.value)}
                      className="w-full px-3 py-2 pr-8 text-sm bg-white rounded-lg border border-editor-border focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
                    >
                      <option value="">-- 选择目标节点 --</option>
                      {availableTargetNodes.map((targetNode) => (
                        <option key={targetNode.id} value={targetNode.id}>
                          {targetNode.description
                            ? targetNode.description.slice(0, 30) +
                              (targetNode.description.length > 30 ? '...' : '')
                            : `节点 ${targetNode.id.slice(0, 6)}`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-editor-text/40 pointer-events-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

NodePanel.displayName = 'NodePanel';

export default NodePanel;
