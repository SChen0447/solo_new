import { useEffect, useState, useCallback, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Play,
  BookOpen,
  RotateCcw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import EditorCanvas from './EditorCanvas';
import NodePanel from './NodePanel';
import PlayMode from './PlayMode';
import { useGameStore, PlayProgress } from './store';

const STORAGE_KEY_PROGRESS = 'text-adventure-progress';

const ProgressDialog = memo(
  ({
    progress,
    onRestore,
    onDiscard,
  }: {
    progress: PlayProgress;
    onRestore: () => void;
    onDiscard: () => void;
  }) => {
    const formatDate = (timestamp: number): string => {
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN');
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onDiscard}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-br from-primary to-purple-400 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl">
                <RotateCcw size={24} />
              </div>
              <h2 className="text-xl font-bold">检测到保存的进度</h2>
            </div>
            <p className="text-white/80 text-sm">
              是否恢复上次的游玩进度？
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-editor-bg rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-editor-text/60 text-xs">
                <AlertCircle size={14} />
                <span>保存时间</span>
              </div>
              <p className="font-mono text-editor-text font-medium">
                {formatDate(progress.savedAt)}
              </p>
              <div className="pt-2 border-t border-editor-border/50">
                <div className="flex items-center gap-2 text-editor-text/60 text-xs">
                  <BookOpen size={14} />
                  <span>历史路径</span>
                </div>
                <p className="text-editor-text/80 text-sm mt-1">
                  共经历 {progress.history.length} 个节点
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={onDiscard}
                className="px-4 py-3 rounded-2xl border-2 border-editor-border text-editor-text font-medium hover:bg-editor-bg transition-all active:scale-95"
              >
                重新开始
              </button>
              <button
                onClick={onRestore}
                className="px-4 py-3 rounded-2xl bg-primary text-white font-medium hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/30"
              >
                恢复进度
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }
);

ProgressDialog.displayName = 'ProgressDialog';

const App = memo(() => {
  const { mode, setMode, addNode, loadProgress, clearProgress, nodes } =
    useGameStore();
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [savedProgress, setSavedProgress] = useState<PlayProgress | null>(null);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROGRESS);
      if (stored) {
        const progress: PlayProgress = JSON.parse(stored);
        if (progress && progress.currentNodeId) {
          setSavedProgress(progress);
          setTimeout(() => setShowProgressDialog(true), 500);
        }
      }
    } catch {
      console.warn('Failed to load progress from localStorage');
    }
  }, []);

  const handleRestoreProgress = useCallback(() => {
    loadProgress();
    setShowProgressDialog(false);
    setSavedProgress(null);
  }, [loadProgress]);

  const handleDiscardProgress = useCallback(() => {
    clearProgress();
    setShowProgressDialog(false);
    setSavedProgress(null);
  }, [clearProgress]);

  const handleAddNode = useCallback(() => {
    const offset = nodes.length * 40;
    addNode({ x: 200 + offset, y: 200 + offset });
  }, [addNode, nodes.length]);

  const handleEnterPlayMode = useCallback(() => {
    if (nodes.length === 0) {
      setShowEmptyWarning(true);
      setTimeout(() => setShowEmptyWarning(false), 2500);
      return;
    }
    setMode('play');
  }, [setMode, nodes.length]);

  if (mode === 'play') {
    return <PlayMode />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-editor-bg overflow-hidden">
      <header className="flex-shrink-0 bg-white border-b border-editor-border">
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-purple-400 flex items-center justify-center shadow-lg shadow-primary/30">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-editor-text text-lg leading-tight">
                文字冒险编辑器
              </h1>
              <p className="text-xs text-editor-text/50">
                Interactive Fiction Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AnimatePresence>
              {showEmptyWarning && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-pill border border-red-200"
                >
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">
                    请先创建至少一个节点
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="h-8 w-px bg-editor-border" />

            <div className="flex items-center gap-1 px-2 py-1 bg-editor-bg rounded-pill text-xs text-editor-text/60 font-mono">
              <Sparkles size={14} className="text-primary" />
              <span>{nodes.length} 个节点</span>
            </div>

            <button
              onClick={handleAddNode}
              className="flex items-center gap-2 px-5 py-2.5 rounded-pill bg-white border-2 border-editor-border text-editor-text font-medium hover:border-primary hover:text-primary hover:shadow-md transition-all active:scale-95"
            >
              <Plus size={18} />
              <span>添加节点</span>
            </button>

            <button
              onClick={handleEnterPlayMode}
              className="flex items-center gap-2 px-5 py-2.5 rounded-pill bg-primary text-white font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-95"
            >
              <Play size={18} fill="currentColor" />
              <span>游玩模式</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex min-h-0">
        <EditorCanvas />
        <NodePanel />
      </main>

      <AnimatePresence>
        {showProgressDialog && savedProgress && (
          <ProgressDialog
            progress={savedProgress}
            onRestore={handleRestoreProgress}
            onDiscard={handleDiscardProgress}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

App.displayName = 'App';

export default App;
