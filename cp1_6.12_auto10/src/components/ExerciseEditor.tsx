import { useEffect, useState, useCallback, memo } from 'react';
import type {
  Exercise,
  ExerciseType,
  ChoiceOption,
  ChoiceExercise,
  ShortExercise,
  CodeExercise,
} from '../types';
import { createExercise, updateExercise } from '../api/exerciseApi';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  mode: 'create' | 'edit';
  exercise: Exercise | null;
  onCancel: () => void;
  onSaved: () => void;
}

const TYPE_LABELS: Record<ExerciseType, string> = {
  choice: '选择题',
  short: '简答题',
  code: '编码题',
};

const ExerciseEditor = memo(function ExerciseEditor({
  mode,
  exercise,
  onCancel,
  onSaved,
}: Props) {
  const [type, setType] = useState<ExerciseType>('choice');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [score, setScore] = useState<number>(10);

  const [isMultiple, setIsMultiple] = useState(false);
  const [options, setOptions] = useState<ChoiceOption[]>([]);
  const [explanation, setExplanation] = useState('');

  const [referenceAnswer, setReferenceAnswer] = useState('');

  const [referenceSolution, setReferenceSolution] = useState('');
  const [language, setLanguage] = useState('typescript');

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!exercise) return;
    setType(exercise.type);
    setTitle(exercise.title);
    setContent(exercise.content);
    setScore(exercise.score);

    if (exercise.type === 'choice') {
      const c = exercise as ChoiceExercise;
      setIsMultiple(c.isMultiple);
      setOptions(c.options.map((o) => ({ ...o })));
      setExplanation(c.explanation);
      setReferenceAnswer(c.referenceAnswer);
    } else if (exercise.type === 'short') {
      const s = exercise as ShortExercise;
      setReferenceAnswer(s.referenceAnswer);
    } else {
      const c = exercise as CodeExercise;
      setReferenceSolution(c.referenceSolution);
      setLanguage(c.language);
    }
  }, [exercise]);

  const addOption = useCallback(() => {
    setOptions((prev) => [
      ...prev,
      { id: uuidv4(), text: '', isCorrect: false },
    ]);
  }, []);

  const updateOption = useCallback(
    (id: string, patch: Partial<ChoiceOption>) => {
      setOptions((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
      );
    },
    []
  );

  const removeOption = useCallback((id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const validate = useCallback((): string | null => {
    if (!title.trim()) return '请输入练习标题';
    if (!content.trim()) return '请输入题目内容';
    if (!(score > 0)) return '分值必须大于 0';

    if (type === 'choice') {
      if (options.length < 2) return '选择题至少需要 2 个选项';
      if (options.some((o) => !o.text.trim())) return '请填写所有选项内容';
      const correct = options.filter((o) => o.isCorrect);
      if (correct.length === 0) return '请至少标记一个正确选项';
      if (!isMultiple && correct.length > 1) return '单选题只能有一个正确选项';
    } else if (type === 'short') {
      if (!referenceAnswer.trim()) return '请填写参考答案';
    } else {
      if (!referenceSolution.trim()) return '请填写预设解法';
    }
    return null;
  }, [
    title,
    content,
    score,
    type,
    options,
    isMultiple,
    referenceAnswer,
    referenceSolution,
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const err = validate();
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      setSaving(true);
      try {
        if (mode === 'create') {
          const base = {
            title: title.trim(),
            content: content.trim(),
            score: Number(score),
          };
          if (type === 'choice') {
            await createExercise({
              ...base,
              type: 'choice',
              isMultiple,
              options,
              explanation: explanation.trim(),
              referenceAnswer: referenceAnswer.trim(),
            });
          } else if (type === 'short') {
            await createExercise({
              ...base,
              type: 'short',
              referenceAnswer: referenceAnswer.trim(),
            });
          } else {
            await createExercise({
              ...base,
              type: 'code',
              referenceSolution: referenceSolution.trim(),
              language: language.trim(),
            });
          }
        } else if (exercise) {
          const base = {
            title: title.trim(),
            content: content.trim(),
            score: Number(score),
            type,
            ...(type === 'choice'
              ? {
                  isMultiple,
                  options,
                  explanation: explanation.trim(),
                  referenceAnswer: referenceAnswer.trim(),
                }
              : type === 'short'
              ? {
                  referenceAnswer: referenceAnswer.trim(),
                }
              : {
                  referenceSolution: referenceSolution.trim(),
                  language: language.trim(),
                }),
          };
          await updateExercise(exercise.id, base);
        }
        onSaved();
      } catch (err) {
        setError('保存失败，请重试');
      } finally {
        setSaving(false);
      }
    },
    [validate, mode, title, content, score, type, isMultiple, options, explanation, referenceAnswer, referenceSolution, language, exercise, onSaved]
  );

  return (
    <div className="editor-layout">
      <div className="card editor-card">
        <div className="editor-header">
          <div className="editor-title">
            {mode === 'create' ? '✏️ 创建新练习' : '📝 编辑练习'}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            ← 返回
          </button>
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">练习类型</label>
            <div className="editor-type-tabs">
              {(['choice', 'short', 'code'] as ExerciseType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`type-tab ${type === t ? 'active' : ''}`}
                  disabled={mode === 'edit'}
                  onClick={() => setType(t)}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            {mode === 'edit' && (
              <div style={{ fontSize: 12, color: '#9e9e9e', marginTop: -4 }}>
                编辑模式下不可修改类型
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">标题</label>
            <input
              className="input"
              style={{ width: '100%', padding: '10px 14px', fontSize: 15 }}
              type="text"
              placeholder="例如：React基础 - 单选"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">题目内容</label>
            <textarea
              className="textarea"
              style={{ minHeight: 100, fontSize: 15 }}
              placeholder="请输入题目描述..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">分值</label>
            <input
              className="input"
              type="number"
              min={1}
              max={999}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
            />
          </div>

          {type === 'choice' && (
            <>
              <div className="form-group">
                <label className="form-label">
                  选择题模式
                </label>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                      padding: '8px 14px',
                      background: isMultiple ? '#f5f5f5' : '#e8eaf6',
                      border: `1.5px solid ${isMultiple ? '#e0e0e0' : '#3949ab'}`,
                      borderRadius: 6,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <input
                      type="radio"
                      checked={!isMultiple}
                      onChange={() => setIsMultiple(false)}
                    />
                    单选
                  </label>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                      padding: '8px 14px',
                      background: isMultiple ? '#fff3e0' : '#f5f5f5',
                      border: `1.5px solid ${isMultiple ? '#ff9800' : '#e0e0e0'}`,
                      borderRadius: 6,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <input
                      type="radio"
                      checked={isMultiple}
                      onChange={() => setIsMultiple(true)}
                    />
                    多选
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">选项列表</label>
                <div>
                  {options.map((opt, i) => (
                    <div key={opt.id} className="option-row">
                      <div
                        style={{
                          fontWeight: 800,
                          color: '#3949ab',
                          paddingTop: 8,
                          minWidth: 20,
                          fontSize: 15,
                        }}
                      >
                        {String.fromCharCode(65 + i)}.
                      </div>
                      <input
                        className="option-input"
                        type="text"
                        placeholder={`选项 ${String.fromCharCode(65 + i)} 内容`}
                        value={opt.text}
                        onChange={(e) =>
                          updateOption(opt.id, { text: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        className={`option-correct ${opt.isCorrect ? 'checked' : ''}`}
                        onClick={() =>
                          updateOption(opt.id, { isCorrect: !opt.isCorrect })
                        }
                      >
                        {opt.isCorrect ? '✓ 正确' : '标记正确'}
                      </button>
                      {options.length > 2 && (
                        <button
                          type="button"
                          className="option-del"
                          onClick={() => removeOption(opt.id)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="add-option-btn"
                    onClick={addOption}
                  >
                    + 添加选项
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">正确答案（简要说明）</label>
                <input
                  className="input"
                  style={{ width: '100%', padding: '10px 14px' }}
                  type="text"
                  placeholder="例如：React"
                  value={referenceAnswer}
                  onChange={(e) => setReferenceAnswer(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">答案解析</label>
                <textarea
                  className="textarea"
                  placeholder="简述为什么正确答案是这个..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
              </div>
            </>
          )}

          {type === 'short' && (
            <div className="form-group">
              <label className="form-label">参考答案</label>
              <textarea
                className="textarea"
                style={{ minHeight: 160 }}
                placeholder="请输入简答题的参考答案，答题后会显示给学员参考..."
                value={referenceAnswer}
                onChange={(e) => setReferenceAnswer(e.target.value)}
              />
            </div>
          )}

          {type === 'code' && (
            <>
              <div className="form-group">
                <label className="form-label">编程语言</label>
                <input
                  className="input"
                  style={{ width: 260 }}
                  type="text"
                  placeholder="例如：typescript、javascript、python"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">预设解法（参考代码）</label>
                <textarea
                  className="textarea"
                  style={{
                    minHeight: 220,
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: 13,
                  }}
                  placeholder="请输入参考解法代码..."
                  value={referenceSolution}
                  onChange={(e) => setReferenceSolution(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="editor-footer">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? '保存中...' : mode === 'create' ? '创建练习' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default ExerciseEditor;
