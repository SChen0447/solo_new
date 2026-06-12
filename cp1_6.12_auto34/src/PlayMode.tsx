import { memo, useMemo, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  Save,
  X,
  BookOpen,
  CheckCircle,
  Home,
} from 'lucide-react';
import { useGameStore, GameNode, GameOption } from './store';

const PlayMode = memo(() => {
  const {
    nodes,
    currentPlayNodeId,
    playHistory,
    setCurrentPlayNode,
    goBack,
    saveProgress,
    setMode,
    clearProgress,
  } = useGameStore();

  const [saveToast, setSaveToast] = useState(false);

  const currentNode: GameNode | undefined = useMemo(() => {
    return nodes.find((n) => n.id === currentPlayNodeId);
  }, [nodes, currentPlayNodeId]);

  const validOptions: GameOption[] = useMemo(() => {
    if (!currentNode) return [];
    return currentNode.options.filter(
      (opt) => opt.targetNodeId && nodes.some((n) => n.id === opt.targetNodeId)
    );
  }, [currentNode, nodes]);

  const handleOptionClick = useCallback(
    (targetNodeId: string) => {
      setCurrentPlayNode(targetNodeId);
    },
    [setCurrentPlayNode]
  );

  const handleSaveProgress = useCallback(() => {
    saveProgress();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  }, [saveProgress]);

  const handleExit = useCallback(() => {
    setMode('edit');
  }, [setMode]);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };

  if (!currentNode) {
    return (
      <div className="fixed inset-0 bg-play-bg flex items-center justify-center z-50">
        <div className="text-center text-play-text/80">
          <BookOpen size={64} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-4">暂无可用的故事节点</p>
          <button
            onClick={handleExit}
            className="px-6 py-2 bg-primary text-white rounded-pill hover:bg-primary/90 transition-all"
          >
            返回编辑器
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-play-bg z-50 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/30 to-transparent">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExit}
            className="flex items-center gap-2 px-4 py-2 rounded-pill bg-white/10 text-play-text hover:bg-white/20 transition-all backdrop-blur-sm"
            title="返回编辑器"
          >
            <Home size={18} />
            <span className="text-sm hidden sm:inline">编辑器</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveProgress}
            className="flex items-center gap-2 px-4 py-2 rounded-pill bg-primary/80 text-white hover:bg-primary transition-all backdrop-blur-sm"
            title="保存进度"
          >
            <Save size={18} />
            <span className="text-sm hidden sm:inline">保存进度</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-20"
          >
            <div className="flex items-center gap-2 px-5 py-3 bg-green-500/90 text-white rounded-pill shadow-xl backdrop-blur-sm">
              <CheckCircle size={20} />
              <span className="font-medium">进度已保存</span>
              <span className="text-xs opacity-80 ml-1">
                {formatDate(Date.now())}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-full overflow-y-auto">
        <div className="min-h-full flex items-center justify-center py-24 px-6">
          <div className="w-full max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentNode.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="space-y-10"
              >
                <div
                  className="p-8 sm:p-12 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-sm"
                  style={{
                    backgroundColor:
                      currentNode.backgroundColor + '20',
                  }}
                >
                  <div className="prose prose-invert max-w-none">
                    <div className="text-play-text font-serif leading-relaxed text-[18px] sm:text-[20px] space-y-4">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentNode.description || '*暂无场景描述*'}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {validOptions.length > 0 && (
                    <h3 className="text-play-text/60 text-sm font-medium tracking-wider uppercase text-center mb-6">
                      选择你的行动
                    </h3>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {validOptions.map((option, index) => (
                      <motion.button
                        key={option.id}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: 0.2 + index * 0.08,
                          ease: 'easeOut',
                        }}
                        whileHover={{
                          scale: 1.02,
                          y: -4,
                          boxShadow:
                            '0 12px 40px rgba(108, 99, 255, 0.4)',
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          handleOptionClick(option.targetNodeId as string)
                        }
                        className="group relative p-5 text-left rounded-2xl bg-white/5 border-2 border-white/10 text-play-text hover:border-primary transition-all duration-300 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-start gap-4">
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center font-bold text-primary text-sm">
                            {index + 1}
                          </span>
                          <span className="text-base sm:text-lg font-medium leading-relaxed pt-1">
                            {option.text || `选项 ${index + 1}`}
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {validOptions.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-play-text/50 text-sm mb-4">
                        — 故事在这里暂时结束了 —
                      </p>
                      <p className="text-play-text/30 text-xs">
                        返回编辑器可以继续添加更多剧情分支
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-t from-black/40 to-transparent">
        <button
          onClick={goBack}
          disabled={playHistory.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-pill backdrop-blur-sm transition-all ${
            playHistory.length === 0
              ? 'bg-white/5 text-play-text/30 cursor-not-allowed'
              : 'bg-white/10 text-play-text hover:bg-white/20 active:scale-95'
          }`}
        >
          <ArrowLeft size={18} />
          <span className="text-sm">
            返回上一步 {playHistory.length > 0 && `(${playHistory.length}/10)`}
          </span>
        </button>

        <div className="text-play-text/40 text-xs">
          {playHistory.length > 0 && (
            <span className="opacity-50">
              已走过 {playHistory.length} 个节点
            </span>
          )}
        </div>
      </div>

      {clearProgress && (
        <div className="hidden">{/* placeholder to avoid unused warnings */}</div>
      )}

      <AnimatePresence>
        {false && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <X />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

PlayMode.displayName = 'PlayMode';

export default PlayMode;
