import { useState, FormEvent } from 'react';
import { useReviewStore } from '../store';
import type { GenerateParams } from '../App';

interface InputPanelProps {
  onGenerate: (params: GenerateParams) => void;
}

function InputPanel({ onGenerate }: InputPanelProps) {
  const [course, setCourse] = useState('');
  const [chapter, setChapter] = useState('');
  const { loading, inputPanelCollapsed, toggleInputPanel } = useReviewStore();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!course.trim() || !chapter.trim()) {
      return;
    }
    onGenerate({ course: course.trim(), chapter: chapter.trim() });
  };

  const presetExamples = [
    { course: '计算机网络', chapter: '第一章 概述' },
    { course: '计算机网络', chapter: '第二章 物理层' },
    { course: '数据结构', chapter: '第一章 绪论' },
    { course: '高等数学', chapter: '第一章 函数与极限' }
  ];

  const handlePresetClick = (p: { course: string; chapter: string }) => {
    setCourse(p.course);
    setChapter(p.chapter);
  };

  return (
    <section
      className={`input-panel ${inputPanelCollapsed ? 'collapsed' : ''}`}
      aria-label="输入面板"
    >
      <button
        className="panel-toggle mobile-only"
        onClick={toggleInputPanel}
        aria-expanded={!inputPanelCollapsed}
        aria-label="展开/收起输入面板"
      >
        <span className="hamburger">
          <span />
          <span />
          <span />
        </span>
        <span>设置复习条件</span>
      </button>

      <div className="panel-body">
        <form className="input-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="course">课程名称</label>
              <input
                id="course"
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="例如：计算机网络"
                className="form-input"
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label htmlFor="chapter">章节</label>
              <input
                id="chapter"
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="例如：第一章 概述"
                className="form-input"
                autoComplete="off"
              />
            </div>
            <div className="form-group form-group-button">
              <label>&nbsp;</label>
              <button
                type="submit"
                className="btn btn-primary btn-generate"
                disabled={loading || !course.trim() || !chapter.trim()}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    生成中...
                  </>
                ) : (
                  <>✨ 生成复习资料</>
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="preset-section">
          <span className="preset-label">快速选择示例：</span>
          <div className="preset-list">
            {presetExamples.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="preset-chip"
                onClick={() => handlePresetClick(p)}
              >
                {p.course} · {p.chapter}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default InputPanel;
