import React, { useRef, useEffect, useState } from 'react';
import { useFontStore } from '../store';
import ScoreBar from './ScoreBar';
import './PreviewRenderer.css';

const PreviewRenderer: React.FC = () => {
  const { fontTitle, fontBody, styleParams, getCompatibilityScore, getCompatibilityAdvice } = useFontStore();
  const previewRef = useRef<HTMLDivElement>(null);
  const [animatedScore, setAnimatedScore] = useState(0);
  const targetScore = getCompatibilityScore();
  const advice = getCompatibilityAdvice();

  useEffect(() => {
    let rafId: number;
    const startScore = animatedScore;
    const diff = targetScore - startScore;
    const duration = 500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentScore = Math.round(startScore + diff * easeProgress);
      setAnimatedScore(currentScore);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [targetScore]);

  const previewStyle: React.CSSProperties = {
    fontFamily: fontBody.fontFamily,
    fontSize: `${styleParams.bodyFontSize}px`,
    lineHeight: styleParams.lineHeight,
    letterSpacing: `${styleParams.letterSpacing}em`,
    color: styleParams.bodyColor,
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: fontTitle.fontFamily,
    fontSize: `${styleParams.titleFontSize}px`,
    lineHeight: styleParams.lineHeight * 1.2,
    letterSpacing: `${styleParams.letterSpacing}em`,
    color: styleParams.titleColor,
  };

  const quoteStyle: React.CSSProperties = {
    fontFamily: fontBody.fontFamily,
    fontSize: '14px',
    fontStyle: 'italic',
    lineHeight: styleParams.lineHeight,
    color: styleParams.quoteColor,
  };

  return (
    <div className="preview-renderer">
      <div className="preview-renderer__canvas" ref={previewRef} style={previewStyle}>
        <article className="preview-article">
          <h1 className="preview-article__title" style={titleStyle}>
            探索 Typography 之美：中西文字体搭配的艺术
          </h1>
          <p className="preview-article__meta" style={{ color: '#999', fontSize: '13px' }}>
            {fontTitle.name} × {fontBody.name}
          </p>

          <hr className="preview-article__divider" />

          <p className="preview-article__paragraph">
            字体是设计的灵魂，好的字体搭配能让内容更具可读性与美感。在中文设计中，
            选择合适的中英文字体组合是一项重要技能。Chinese typography requires careful
            consideration of both form and function, balancing visual harmony with reading comfort.
          </p>

          <h2 className="preview-article__subtitle" style={titleStyle}>
            为什么字体配对很重要？
          </h2>

          <p className="preview-article__paragraph">
            优秀的字体配对能够建立清晰的视觉层次，引导读者的视线流动。当标题与正文字体
            在 x-height、字面率和字间距上达到协调时，整体阅读体验会更加舒适自然。
          </p>

          <blockquote className="preview-article__quote" style={quoteStyle}>
            "Typography is the craft of endowing human language with a durable visual form."
            — Robert Bringhurst
          </blockquote>

          <p className="preview-article__paragraph">
            在进行中西文混排时，需要特别注意基线对齐和视觉重量的平衡。中文字符通常比
            英文字符更大、更重，因此选择合适的字号比例和字重搭配至关重要。
          </p>

          <h2 className="preview-article__subtitle" style={titleStyle}>
            实用的搭配建议
          </h2>

          <p className="preview-article__paragraph">
            以下是一些经过验证的字体搭配原则：选择风格相近但有对比的字体、注意 x-height
            的匹配、考虑字重的层次关系。记住，规则是用来打破的，但首先要理解规则。
          </p>

          <ul className="preview-article__list">
            <li>标题使用展示性强的字体，正文使用易读性高的字体</li>
            <li>保持字体风格的一致性：现代配现代，古典配古典</li>
            <li>注意字号比例，通常标题是正文的 1.5-2 倍</li>
            <li>测试不同屏幕尺寸下的可读性表现</li>
          </ul>

          <p className="preview-article__paragraph">
            希望这款工具能帮助你找到完美的字体组合，让你的设计更加出色。Happy designing!
          </p>
        </article>
      </div>

      <div className="preview-renderer__score">
        <ScoreBar score={animatedScore} advice={advice} />
      </div>
    </div>
  );
};

export default PreviewRenderer;
