import { useMemo } from 'react';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import {
  useReviewStore,
  ReviewMaterial,
  Section,
  Question,
  QuestionType
} from '../store';

function getCardId(sectionType: QuestionType, questionId: number) {
  return `${sectionType}-${questionId}`;
}

function handleCardClick(
  cardId: string,
  toggleCard: (id: string) => void,
  highlightCard: (id: string) => void,
  clearHighlight: (id: string) => void
) {
  toggleCard(cardId);
  highlightCard(cardId);
  setTimeout(() => clearHighlight(cardId), 500);
}

function getTypeBadge(type: QuestionType): { label: string; className: string } {
  switch (type) {
    case 'choice':
      return { label: '选择题', className: 'badge-choice' };
    case 'fill':
      return { label: '填空题', className: 'badge-fill' };
    case 'short':
      return { label: '简答题', className: 'badge-short' };
  }
}

function QuestionCard({
  section,
  question
}: {
  section: Section;
  question: Question;
}) {
  const {
    toggleCard,
    isCardExpanded,
    highlightCard,
    isCardHighlighted,
    clearHighlight
  } = useReviewStore();

  const cardId = getCardId(section.type, question.id);
  const expanded = isCardExpanded(cardId);
  const highlighted = isCardHighlighted(cardId);
  const badge = getTypeBadge(section.type);

  return (
    <div
      className={`question-card ${expanded ? 'expanded' : ''} ${
        highlighted ? 'highlighted' : ''
      }`}
      onClick={() =>
        handleCardClick(cardId, toggleCard, highlightCard, clearHighlight)
      }
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick(cardId, toggleCard, highlightCard, clearHighlight);
        }
      }}
      aria-expanded={expanded}
    >
      <div className="card-header">
        <span className={`question-badge ${badge.className}`}>{badge.label}</span>
        <span className="question-index">第 {question.index} 题</span>
        <span className={`expand-icon ${expanded ? 'rotated' : ''}`}>▼</span>
      </div>

      <div className="card-body">
        <div className="question-text">{question.question}</div>

        {section.type === 'choice' && question.options && (
          <div className="options-list">
            {question.options.map((opt, idx) => (
              <div key={idx} className="option-item">
                <span className="option-label">{String.fromCharCode(65 + idx)}.</span>
                <span className="option-text">{opt}</span>
              </div>
            ))}
          </div>
        )}

        {section.type === 'fill' && (
          <div className="fill-blanks-hint">
            <span className="blank-line">_______________</span>
            <span className="blank-hint">（点击查看答案）</span>
          </div>
        )}

        <div className="card-answer">
          <div className="answer-wrapper">
            <span className="answer-label">📝 参考答案：</span>
            <div className="answer-content">
              {section.type === 'short' ? (
                <div className="short-answer-text">{question.answer}</div>
              ) : (
                <span>{question.answer}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">📖</div>
      <h3>暂无复习资料</h3>
      <p>请在上方输入课程名称和章节，点击「生成复习资料」按钮开始</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loader-spinner" />
      <p>正在从知识库提取知识点并生成复习资料...</p>
    </div>
  );
}

function generatePdfContent(material: ReviewMaterial): string {
  const lines: string[] = [];
  lines.push(`【${material.course}】${material.chapter}`);
  lines.push(`生成时间：${new Date(material.generatedAt).toLocaleString('zh-CN')}`);
  lines.push(`共 ${material.totalCount} 道题目`);
  lines.push('='.repeat(50));
  lines.push('');

  material.sections.forEach((section) => {
    lines.push(`【${section.title}】`);
    lines.push('-'.repeat(40));
    lines.push('');

    section.questions.forEach((q) => {
      lines.push(`${q.index}. ${q.question}`);

      if (section.type === 'choice' && q.options) {
        q.options.forEach((opt, idx) => {
          lines.push(`   ${String.fromCharCode(65 + idx)}. ${opt}`);
        });
      }
      if (section.type === 'fill') {
        lines.push('   （填空处）_______________');
      }

      lines.push(`   【答案】${q.answer}`);
      lines.push('');
    });
    lines.push('');
  });

  return lines.join('\n');
}

function exportToPdf(material: ReviewMaterial) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 50;
  const marginTop = 60;
  const contentWidth = pageWidth - marginLeft * 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  const title = `${material.course} - ${material.chapter}`;
  doc.text(title, marginLeft, marginTop);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `生成时间：${new Date(material.generatedAt).toLocaleString('zh-CN')}  |  共 ${material.totalCount} 题`,
    marginLeft,
    marginTop + 20
  );
  doc.setTextColor(0, 0, 0);

  let cursorY = marginTop + 50;
  const lineHeight = 14;
  const sectionGap = 10;

  const addWrappedText = (text: string, indent: number = 0) => {
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      if (cursorY + lineHeight > doc.internal.pageSize.getHeight() - 50) {
        doc.addPage();
        cursorY = marginTop;
      }
      doc.text(line, marginLeft + indent, cursorY);
      cursorY += lineHeight;
    });
  };

  material.sections.forEach((section) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(25, 118, 210);
    addWrappedText(`【${section.title}】`);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    cursorY += sectionGap / 2;

    section.questions.forEach((q) => {
      doc.setFont('helvetica', 'bold');
      addWrappedText(`${q.index}. ${q.question}`, 0);
      doc.setFont('helvetica', 'normal');

      if (section.type === 'choice' && q.options) {
        q.options.forEach((opt, idx) => {
          addWrappedText(`${String.fromCharCode(65 + idx)}. ${opt}`, 20);
        });
      }
      if (section.type === 'fill') {
        addWrappedText('（填空处）_______________', 20);
      }

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(76, 175, 80);
      addWrappedText(`【参考答案】${q.answer}`, 20);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      cursorY += sectionGap;
    });

    cursorY += sectionGap;
  });

  const fileName = `${material.course}_${material.chapter}_复习资料.pdf`;
  const blob = doc.output('blob');
  saveAs(blob, fileName);
}

function PreviewPanel() {
  const { reviewMaterial, loading, error } = useReviewStore();

  const sectionCountMap = useMemo((): Record<QuestionType, number> => {
    if (!reviewMaterial) return { choice: 0, fill: 0, short: 0 };
    return reviewMaterial.sections.reduce<Record<QuestionType, number>>(
      (acc, s) => {
        acc[s.type] = s.questions.length;
        return acc;
      },
      { choice: 0, fill: 0, short: 0 }
    );
  }, [reviewMaterial]);

  if (loading) {
    return (
      <section className="preview-panel">
        <LoadingState />
      </section>
    );
  }

  if (error) {
    return (
      <section className="preview-panel">
        <div className="error-state">
          <div className="error-icon">❌</div>
          <h3>出错了</h3>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (!reviewMaterial) {
    return (
      <section className="preview-panel">
        <EmptyState />
      </section>
    );
  }

  return (
    <section className="preview-panel">
      <div className="preview-header">
        <div className="meta-info">
          <h2 className="review-title">
            <span className="course-chip">{reviewMaterial.course}</span>
            <span className="chapter-chip">{reviewMaterial.chapter}</span>
          </h2>
          <div className="review-meta">
            <span className="meta-item">
              🕒 {new Date(reviewMaterial.generatedAt).toLocaleString('zh-CN')}
            </span>
            <span className="meta-item">📊 共 {reviewMaterial.totalCount} 题</span>
            {reviewMaterial.sections.map((s) => (
              <span key={s.type} className="meta-item meta-count">
                {s.title} {sectionCountMap[s.type]}题
              </span>
            ))}
            {reviewMaterial.insufficientCoverage && (
              <span className="meta-item meta-warn">⚠️ 知识点覆盖较少</span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-download"
          onClick={() => exportToPdf(reviewMaterial)}
        >
          📄 下载 PDF
        </button>
      </div>

      <div className="sections-container">
        {reviewMaterial.sections.map((section) => (
          <div key={section.type} className="section-block">
            <div className={`section-title section-${section.type}`}>
              <span className="section-icon">
                {section.type === 'choice' && '☑️'}
                {section.type === 'fill' && '✏️'}
                {section.type === 'short' && '📝'}
              </span>
              {section.title}
              <span className="section-count">{section.questions.length} 题</span>
            </div>
            <div className="cards-grid">
              {section.questions.map((q) => (
                <QuestionCard key={q.id} section={section} question={q} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PreviewPanel;
