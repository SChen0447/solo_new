import { useState, useCallback, memo } from 'react';
import type {
  Exercise,
  ChoiceExercise,
  ShortExercise,
  CodeExercise,
  GradingResult,
  MasteryLevel,
} from '../types';
import {
  gradeExercise,
  submitAttempt,
} from '../api/exerciseApi';
import CodeEditor from './CodeEditor';

interface Props {
  exercise: Exercise;
  onBack: () => void;
  onEdit: () => void;
}

const TYPE_LABELS: Record<Exercise['type'], string> = {
  choice: '选择题',
  short: '简答题',
  code: '编码题',
};

const ExercisePlayer = memo(function ExercisePlayer({ exercise, onBack, onEdit }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shortText, setShortText] = useState('');
  const [codeText, setCodeText] = useState('');
  const [grading, setGrading] = useState<GradingResult | null>(null);
  const [selfScore, setSelfScore] = useState<number | null>(null);
  const [masteryLevel, setMasteryLevel] = useState<MasteryLevel | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const choiceEx = exercise.type === 'choice' ? (exercise as ChoiceExercise) : null;
  const shortEx = exercise.type === 'short' ? (exercise as ShortExercise) : null;
  const codeEx = exercise.type === 'code' ? (exercise as CodeExercise) : null;

  const toggleChoice = useCallback(
    (id: string) => {
      if (grading) return;
      if (!choiceEx) return;
      if (choiceEx.isMultiple) {
        setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
      } else {
        setSelectedIds([id]);
      }
    },
    [grading, choiceEx]
  );

  const doGrade = useCallback(async () => {
    if (loading) return;
    if (choiceEx && selectedIds.length === 0) {
      alert('请至少选择一个选项');
      return;
    }
    if (shortEx && !shortText.trim()) {
      alert('请输入你的回答');
      return;
    }
    if (codeEx && !codeText.trim()) {
      alert('请编写代码后再提交');
      return;
    }
    setLoading(true);
    try {
      let result: GradingResult;
      if (choiceEx) {
        result = await gradeExercise(exercise, { selectedOptionIds: selectedIds });
      } else if (shortEx) {
        result = await gradeExercise(exercise, { text: shortText });
      } else {
        result = await gradeExercise(exercise, { code: codeText });
      }
      setGrading(result);
    } finally {
      setLoading(false);
    }
  }, [loading, choiceEx, shortEx, codeEx, selectedIds, shortText, codeText, exercise]);

  const computeFinalScore = useCallback((): { score: number; selfScore?: number; masteryLevel?: MasteryLevel; isCorrect?: boolean } => {
    if (!grading) return { score: 0 };
    if (choiceEx) {
      return {
        score: grading.score,
        isCorrect: grading.isCorrect,
      };
    }
    if (shortEx && selfScore !== null) {
      const normalized = Math.round((selfScore / 5) * grading.maxScore);
      return {
        score: normalized,
        selfScore,
      };
    }
    if (codeEx && masteryLevel !== null) {
      const weightMap: Record<MasteryLevel, number> = { familiar: 1, normal: 0.6, unfamiliar: 0.2 };
      const normalized = Math.round(weightMap[masteryLevel] * grading.maxScore);
      return {
        score: normalized,
        masteryLevel,
      };
    }
    return { score: 0 };
  }, [grading, choiceEx, shortEx, codeEx, selfScore, masteryLevel]);

  const canSubmit =
    !!grading &&
    (choiceEx || (shortEx && selfScore !== null) || (codeEx && masteryLevel !== null));

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitted) return;
    const final = computeFinalScore();
    let userAnswer: unknown;
    if (choiceEx) {
      userAnswer = { selectedOptionIds: selectedIds };
    } else if (shortEx) {
      userAnswer = { text: shortText };
    } else {
      userAnswer = { code: codeText };
    }
    setLoading(true);
    try {
      await submitAttempt({
        exerciseId: exercise.id,
        type: exercise.type,
        score: final.score,
        maxScore: grading!.maxScore,
        isCorrect: final.isCorrect,
        selfScore: final.selfScore,
        masteryLevel: final.masteryLevel,
        userAnswer,
      });
      setSubmitted(true);
      setSuccessMsg('🎉 作答已提交，可返回列表查看统计');
      setTimeout(() => setSuccessMsg(null), 4000);
    } finally {
      setLoading(false);
    }
  }, [canSubmit, submitted, computeFinalScore, choiceEx, shortEx, codeEx, selectedIds, shortText, codeText, exercise, grading]);

  const resetAll = useCallback(() => {
    setSelectedIds([]);
    setShortText('');
    setCodeText('');
    setGrading(null);
    setSelfScore(null);
    setMasteryLevel(null);
    setSubmitted(false);
  }, []);

  const getChoiceClass = useCallback(
    (optId: string, isCorrectOpt: boolean): string => {
      const classes: string[] = ['choice-item'];
      if (choiceEx?.isMultiple) classes.push('multiple');
      if (selectedIds.includes(optId)) classes.push('selected');
      if (grading) {
        const wasSelected = selectedIds.includes(optId);
        if (isCorrectOpt) {
          classes.push('show-correct');
        }
        if (wasSelected && !isCorrectOpt) {
          classes.push('wrong');
        } else if (wasSelected && isCorrectOpt) {
          classes.push('correct');
        }
      }
      return classes.join(' ');
    },
    [choiceEx, selectedIds, grading]
  );

  const final = grading ? computeFinalScore() : null;

  return (
    <div>
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="player-layout">
        <div className="card player-pane question">
          <button className="player-back" onClick={onBack}>
            ← 返回列表
          </button>
          <div className="player-header">
            <div>
              <div style={{ marginBottom: 8 }}>
                <span className={`tag tag-${exercise.type}`}>
                  {TYPE_LABELS[exercise.type]}
                  {choiceEx?.isMultiple ? ' · 多选' : ''}
                </span>
              </div>
              <div className="player-title">{exercise.title}</div>
            </div>
            <div className="player-meta">
              <span className="score-badge">{exercise.score} 分</span>
              <button className="btn btn-ghost btn-sm" onClick={onEdit}>
                编辑
              </button>
            </div>
          </div>

          <div className="question-body">{exercise.content}</div>

          {choiceEx && (
            <div className="choice-list">
              {choiceEx.options.map((opt, i) => (
                <div
                  key={opt.id}
                  className={getChoiceClass(opt.id, opt.isCorrect)}
                  onClick={() => toggleChoice(opt.id)}
                >
                  <div className="choice-radio" />
                  <div className="choice-text">
                    <span style={{ fontWeight: 800, marginRight: 6 }}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt.text}
                  </div>
                  {grading && opt.isCorrect && (
                    <span className="choice-result-icon correct-icon">✓</span>
                  )}
                  {grading &&
                    selectedIds.includes(opt.id) &&
                    !opt.isCorrect && (
                      <span className="choice-result-icon wrong-icon">✗</span>
                    )}
                </div>
              ))}
            </div>
          )}

          {grading && (
            <div
              className={`grading-box ${
                grading.isCorrect === true
                  ? 'correct'
                  : grading.isCorrect === false
                  ? 'wrong'
                  : 'info'
              }`}
            >
              {choiceEx && (
                <>
                  <div
                    className={`grading-title ${
                      grading.isCorrect ? 'correct' : 'wrong'
                    }`}
                  >
                    {grading.isCorrect ? '✓ 回答正确！' : '✗ 回答错误'}
                  </div>
                  <div className="grading-score">
                    得分：<strong>{grading.score}</strong> / {grading.maxScore} 分
                  </div>
                  {grading.explanation && (
                    <div className="grading-explanation">
                      💡 解析：{grading.explanation}
                    </div>
                  )}
                  {grading.referenceAnswer && (
                    <div className="grading-reference">
                      <strong>参考答案：</strong>
                      {grading.referenceAnswer}
                    </div>
                  )}
                </>
              )}

              {shortEx && (
                <>
                  <div className="grading-title info">📖 参考答案</div>
                  <div className="grading-reference">
                    {grading.referenceAnswer}
                  </div>
                  <div style={{ marginTop: 14, fontWeight: 700, fontSize: 14 }}>
                    请根据参考答案自我评分（1-5分）：
                  </div>
                  <div className="self-rate-group">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`self-rate-btn ${
                          selfScore === s ? 'active' : ''
                        }`}
                        onClick={() => setSelfScore(s)}
                        disabled={submitted}
                      >
                        {s}
                        {s === 1 && ' · 很差'}
                        {s === 2 && ' · 较差'}
                        {s === 3 && ' · 一般'}
                        {s === 4 && ' · 良好'}
                        {s === 5 && ' · 完美'}
                      </button>
                    ))}
                  </div>
                  {selfScore !== null && (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                      }}
                    >
                      折算得分：
                      {Math.round((selfScore / 5) * grading.maxScore)} /{' '}
                      {grading.maxScore} 分
                    </div>
                  )}
                </>
              )}

              {codeEx && (
                <>
                  <div className="grading-title info">💻 参考解法</div>
                  <pre className="code-solution">
                    {grading.referenceAnswer}
                  </pre>
                  <div style={{ marginTop: 14, fontWeight: 700, fontSize: 14 }}>
                    请比对参考解法，标记你的掌握程度：
                  </div>
                  <div className="mastery-group">
                    <button
                      type="button"
                      className={`mastery-btn familiar ${
                        masteryLevel === 'familiar' ? 'active' : ''
                      }`}
                      onClick={() => setMasteryLevel('familiar')}
                      disabled={submitted}
                    >
                      ✓ 熟悉（得分 100%）
                    </button>
                    <button
                      type="button"
                      className={`mastery-btn normal ${
                        masteryLevel === 'normal' ? 'active' : ''
                      }`}
                      onClick={() => setMasteryLevel('normal')}
                      disabled={submitted}
                    >
                      ○ 一般（得分 60%）
                    </button>
                    <button
                      type="button"
                      className={`mastery-btn unfamiliar ${
                        masteryLevel === 'unfamiliar' ? 'active' : ''
                      }`}
                      onClick={() => setMasteryLevel('unfamiliar')}
                      disabled={submitted}
                    >
                      ✗ 不熟悉（得分 20%）
                    </button>
                  </div>
                  {masteryLevel && (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                      }}
                    >
                      折算得分：
                      { (() => {
                        const map: Record<MasteryLevel, number> = { familiar: 1, normal: 0.6, unfamiliar: 0.2 };
                        return Math.round(map[masteryLevel] * grading.maxScore);
                      })()}{' '}
                      / {grading.maxScore} 分
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="card player-pane answer">
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-accent)' }}>
            {submitted ? '✅ 已提交' : grading ? '🎯 评分与解析' : '✍️ 答题区'}
          </div>

          {choiceEx && (
            <>
              <div className="form-label">
                {choiceEx.isMultiple
                  ? '请选择所有正确的选项（可多选）'
                  : '请选择一个正确答案'}
              </div>
              <div
                style={{
                  padding: '12px 14px',
                  background: '#fff8f3',
                  border: '1.5px dashed #ffcc80',
                  borderRadius: 8,
                  fontSize: 14,
                  color: '#e65100',
                  minHeight: 46,
                }}
              >
                {selectedIds.length === 0
                  ? '尚未选择...'
                  : '已选：' +
                    choiceEx.options
                      .filter((o) => selectedIds.includes(o.id))
                      .map(
                        (o) =>
                          `${String.fromCharCode(65 + choiceEx!.options.indexOf(o))}. ${o.text}`
                      )
                      .join('；')}
              </div>
            </>
          )}

          {shortEx && (
            <>
              <label className="form-label">请输入你的回答</label>
              <textarea
                className="textarea"
                style={{ minHeight: 220 }}
                placeholder="在此输入你的答案..."
                value={shortText}
                onChange={(e) => setShortText(e.target.value)}
                disabled={!!grading}
              />
            </>
          )}

          {codeEx && (
            <>
              <label className="form-label">
                请编写代码（语言：{codeEx.language || '未指定'}）
              </label>
              <CodeEditor
                value={codeText}
                onChange={setCodeText}
                placeholder="// 请在此编写你的代码..."
                disabled={!!grading}
                language={codeEx.language}
                minLines={14}
              />
            </>
          )}

          <div className="submit-btn-wrap">
            {!grading && (
              <button
                className="btn btn-primary"
                onClick={doGrade}
                disabled={loading}
              >
                {loading ? '处理中...' : '提交作答'}
              </button>
            )}
            {grading && !submitted && (
              <>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={resetAll}
                  disabled={loading}
                >
                  重新作答
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={!canSubmit || loading}
                >
                  {loading
                    ? '提交中...'
                    : final
                    ? `记录成绩（${final.score} 分）`
                    : '记录成绩'}
                </button>
              </>
            )}
            {submitted && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={onBack}>
                  返回列表
                </button>
                <button className="btn btn-secondary" onClick={resetAll}>
                  再做一次
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ExercisePlayer;
