import { useEffect, useState } from 'react';
import InputPanel from './components/InputPanel';
import PreviewPanel from './components/PreviewPanel';
import { useReviewStore, ReviewMaterial } from './store';
import { generateReview } from './api/generate';

export interface GenerateParams {
  course: string;
  chapter: string;
}

function App() {
  const { setReviewMaterial, setLoading, setError, reset } = useReviewStore();
  const [showCoverageWarning, setShowCoverageWarning] = useState(false);
  const [warningContent, setWarningContent] = useState('');

  const handleGenerate = async (params: GenerateParams) => {
    reset();
    setLoading(true);
    setError(null);

    try {
      const result: ReviewMaterial = await generateReview(params);
      setReviewMaterial(result);

      if (result.insufficientCoverage) {
        setWarningContent(
          `当前章节「${result.chapter}」在知识库中的知识点仅有 ${result.totalCount} 题，` +
          `少于建议的 15 题，复习覆盖面可能不够全面，建议调整输入或补充知识库。`
        );
        setShowCoverageWarning(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成复习资料失败，请稍后重试';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showCoverageWarning) {
      const timer = setTimeout(() => setShowCoverageWarning(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [showCoverageWarning]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">📚 智能复习资料生成器</h1>
        <p className="app-subtitle">一键生成个性化复习文档，高效学习从此开始</p>
      </header>

      <InputPanel onGenerate={handleGenerate} />

      <main className="main-content">
        <PreviewPanel />
      </main>

      {showCoverageWarning && (
        <div className="coverage-warning">
          <div className="warning-content">
            <span className="warning-icon">⚠️</span>
            <span className="warning-text">{warningContent}</span>
            <button
              className="warning-close"
              onClick={() => setShowCoverageWarning(false)}
              aria-label="关闭提示"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
