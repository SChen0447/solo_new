import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import './TextPanel.css';

export default function TextPanel() {
  const inputText = useAppStore(state => state.inputText);
  const setInputText = useAppStore(state => state.setInputText);
  const analyzeInput = useAppStore(state => state.analyzeInput);
  const isAnalyzing = useAppStore(state => state.isAnalyzing);
  const analysisResult = useAppStore(state => state.analysisResult);

  const wordCount = useMemo(() => {
    return inputText.trim().split(/\s+/).filter(w => w.length > 0).length;
  }, [inputText]);

  const sentimentLabel = useMemo(() => {
    if (!analysisResult) return null;
    const { sentiment, sentimentScore } = analysisResult;
    const percentage = Math.round(Math.abs(sentimentScore) * 100);
    const labels: Record<string, string> = {
      positive: `积极 ${percentage}%`,
      negative: `消极 ${percentage}%`,
      neutral: '中性'
    };
    return { text: labels[sentiment], type: sentiment };
  }, [analysisResult]);

  return (
    <div className="text-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <Sparkles size={18} className="title-icon" />
          文本输入
        </h2>
        <span className="word-count">
          {wordCount} / 200 词
        </span>
      </div>

      <textarea
        className="text-input"
        placeholder="输入或粘贴英文歌词或诗歌，最多200词..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        maxLength={1000}
      />

      <button
        className="analyze-btn"
        onClick={analyzeInput}
        disabled={isAnalyzing || wordCount === 0}
      >
        {isAnalyzing ? (
          <>
            <span className="loading-spinner" />
            分析中...
          </>
        ) : (
          '分析文本'
        )}
      </button>

      {analysisResult && (
        <div className="analysis-card">
          <div className="analysis-header">
            <h3 className="analysis-title">分析结果</h3>
            {sentimentLabel && (
              <span className={`sentiment-tag ${sentimentLabel.type}`}>
                {sentimentLabel.text}
              </span>
            )}
          </div>

          <div className="keyword-cloud">
            {analysisResult.keywords.map((kw, index) => (
              <span
                key={index}
                className="keyword"
                style={{
                  fontSize: `${kw.size}px`,
                  color: kw.color
                }}
              >
                {kw.word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
