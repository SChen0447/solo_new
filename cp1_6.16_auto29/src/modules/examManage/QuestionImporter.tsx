import { useState, useRef } from 'react';
import { X, Upload, Shuffle, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { useExamStore } from '../../stores/examStore';
import type { QuestionType, Question } from '../../types';

interface QuestionImporterProps {
  onClose: () => void;
}

interface ImportQuestion {
  type: string;
  question: string;
  options: string[];
  answer: string | string[];
  score?: number;
}

const QuestionImporter = ({ onClose }: QuestionImporterProps) => {
  const { addQuestionsToBank, questionBank, generateRandomExam } = useExamStore();
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [success, setSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const [randomTitle, setRandomTitle] = useState('');
  const [randomCount, setRandomCount] = useState(10);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sampleData = `[
  {
    "type": "single",
    "question": "JavaScript中，以下哪个不是基本数据类型？",
    "options": ["string", "number", "array", "boolean"],
    "answer": "array",
    "score": 2
  },
  {
    "type": "multiple",
    "question": "以下哪些是React的Hook？",
    "options": ["useState", "useEffect", "useClass", "useCallback"],
    "answer": ["useState", "useEffect", "useCallback"],
    "score": 3
  },
  {
    "type": "truefalse",
    "question": "TypeScript是JavaScript的超集。",
    "options": ["正确", "错误"],
    "answer": "正确",
    "score": 1
  }
]`;

  const validateJSON = (text: string): ImportQuestion[] | null => {
    try {
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        setError('JSON格式错误：根节点必须是数组');
        setErrorLine(1);
        return null;
      }

      if (data.length > 50) {
        setError('题目数量不能超过50道');
        setErrorLine(1);
        return null;
      }

      const validTypes: QuestionType[] = ['single', 'multiple', 'truefalse'];

      for (let i = 0; i < data.length; i++) {
        const item = data[i];

        if (!item.type || !validTypes.includes(item.type as QuestionType)) {
          setError(`第 ${i + 1} 题：题型不正确，必须是 single、multiple 或 truefalse`);
          setErrorLine(i + 1);
          return null;
        }

        if (!item.question || typeof item.question !== 'string') {
          setError(`第 ${i + 1} 题：缺少题目内容或格式错误`);
          setErrorLine(i + 1);
          return null;
        }

        if (!Array.isArray(item.options)) {
          setError(`第 ${i + 1} 题：选项必须是数组`);
          setErrorLine(i + 1);
          return null;
        }

        if (item.type === 'multiple') {
          if (!Array.isArray(item.answer)) {
            setError(`第 ${i + 1} 题：多选题答案必须是数组`);
            setErrorLine(i + 1);
            return null;
          }
        } else {
          if (typeof item.answer !== 'string') {
            setError(`第 ${i + 1} 题：单选题/判断题答案必须是字符串`);
            setErrorLine(i + 1);
            return null;
          }
        }

        if (item.score !== undefined && (typeof item.score !== 'number' || item.score < 1 || item.score > 5)) {
          setError(`第 ${i + 1} 题：分值必须是1-5的数字`);
          setErrorLine(i + 1);
          return null;
        }
      }

      return data as ImportQuestion[];
    } catch (e: unknown) {
      const err = e as Error;
      const match = err.message.match(/position (\d+)/);
      if (match && textareaRef.current) {
        const position = parseInt(match[1]);
        const lines = text.substring(0, position).split('\n');
        setErrorLine(lines.length);
      }
      setError(`JSON解析错误：${err.message}`);
      return null;
    }
  };

  const handleImport = () => {
    setError(null);
    setErrorLine(null);
    setSuccess(false);

    const validated = validateJSON(jsonText);
    if (!validated) return;

    const questions: Omit<Question, 'id'>[] = validated.map((q) => ({
      type: q.type as QuestionType,
      question: q.question,
      options: q.options,
      answer: q.answer,
      score: q.score || 2,
    }));

    const newQuestions = addQuestionsToBank(questions);
    setImportedCount(newQuestions.length);
    setSuccess(true);
  };

  const handleRandomExam = () => {
    if (questionBank.length < randomCount || !randomTitle.trim()) return;

    setIsShuffling(true);
    setTimeout(() => {
      const exam = generateRandomExam(randomTitle, randomCount);
      setIsShuffling(false);
      if (exam) {
        setSuccess(true);
        setError(`已成功生成试卷：${exam.title}（${exam.questions.length}道题）`);
      }
    }, 500);
  };

  const loadSample = () => {
    setJsonText(sampleData);
    setError(null);
    setErrorLine(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <Upload className="icon" />
            题库导入
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X className="icon-sm" />
          </button>
        </div>

        <div className="modal-body">
          <div className="import-section">
            <div className="section-header">
              <h4>JSON格式导入</h4>
              <button className="btn-text" onClick={loadSample}>
                加载示例
              </button>
            </div>

            <p className="hint-text">
              请粘贴JSON格式的题目数据，格式：{`{type, question, options, answer}`}，最多支持50道题。
            </p>

            <div className="json-editor">
              <textarea
                ref={textareaRef}
                className={`form-textarea json-textarea ${error ? 'has-error' : ''}`}
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setError(null);
                  setErrorLine(null);
                  setSuccess(false);
                }}
                placeholder={`[\n  {\n    "type": "single",\n    "question": "题目内容",\n    "options": ["选项A", "选项B"],\n    "answer": "选项A",\n    "score": 2\n  }\n]`}
                rows={15}
              />
              {errorLine && (
                <div className="error-line-marker">
                  <span className="line-number">第 {errorLine} 行</span>
                </div>
              )}
            </div>

            {error && (
              <div className="alert alert-error">
                <AlertCircle className="icon-sm" />
                <span>{error}</span>
              </div>
            )}

            {success && !error && (
              <div className="alert alert-success">
                <CheckCircle className="icon-sm" />
                <span>成功导入 {importedCount} 道题目到题库</span>
              </div>
            )}

            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleImport}>
                <Upload className="icon-sm" />
                导入题库
              </button>
            </div>
          </div>

          <div className="divider" />

          <div className="import-section">
            <div className="section-header">
              <h4>随机组卷</h4>
              <span className="bank-count">
                题库共 {questionBank.length} 道题
              </span>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">试卷标题</label>
                <input
                  type="text"
                  className="form-input"
                  value={randomTitle}
                  onChange={(e) => setRandomTitle(e.target.value)}
                  placeholder="请输入试卷标题"
                />
              </div>
              <div className="form-group">
                <label className="form-label">抽取数量</label>
                <select
                  className="form-select"
                  value={randomCount}
                  onChange={(e) => setRandomCount(Number(e.target.value))}
                  disabled={questionBank.length < 1}
                >
                  {[5, 10, 15, 20, 25, 30, 40, 50].map((n) => (
                    <option key={n} value={n} disabled={n > questionBank.length}>
                      {n} 道题
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`shuffle-container ${isShuffling ? 'shuffling' : ''}`}>
              {isShuffling ? (
                <div className="shuffle-cards">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="shuffle-card"
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        transform: `rotate(${(i - 2) * 5}deg)`,
                      }}
                    >
                      <FileText className="icon" />
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  className="btn btn-secondary btn-block"
                  onClick={handleRandomExam}
                  disabled={questionBank.length < randomCount || !randomTitle.trim()}
                >
                  <Shuffle className="icon-sm" />
                  随机抽取生成试卷
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionImporter;
