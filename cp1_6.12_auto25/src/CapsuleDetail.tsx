import { useState, useEffect, useRef } from 'react';
import { Capsule } from './types';

interface CapsuleDetailProps {
  capsule: Capsule;
  isFlipped: boolean;
  onClose: () => void;
}

export default function CapsuleDetail({ capsule, isFlipped, onClose }: CapsuleDetailProps) {
  const [highlightedContentId, setHighlightedContentId] = useState<string | null>(null);
  const imageScrollRef = useRef<HTMLDivElement>(null);
  const contentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const clues = capsule.clues && capsule.clues.length > 0 ? capsule.clues : [];

  const handleClueClick = (clue: string) => {
    const matchingContent = capsule.contents.find(c => c.tags.includes(clue));
    if (matchingContent) {
      setHighlightedContentId(matchingContent.id);
      const element = contentRefs.current[matchingContent.id];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlightedContentId(null), 2000);
      }
    }
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="flip-container" onClick={e => e.stopPropagation()}>
        <div className={`flipper ${isFlipped ? 'flipped' : ''}`}>
          <div
            className="flip-front"
            style={{
              background: `linear-gradient(135deg, ${capsule.coverColor.from}, ${capsule.coverColor.to})`,
            }}
          >
            <div className="front-content">
              <div className="front-icon">🔒</div>
              <h2 className="front-title">{capsule.title}</h2>
              <p className="front-date">开启日期：{capsule.openDate}</p>
            </div>
          </div>

          <div className="flip-back">
            <div className="back-content">
              <button className="detail-close-btn" onClick={onClose}>×</button>

              {clues.length > 0 && (
                <div className="clues-section">
                  <p className="clues-title">🔍 回忆线索</p>
                  <div className="clues-container">
                    {clues.map((clue, index) => (
                      <button
                        key={index}
                        className="clue-chip"
                        onClick={() => handleClueClick(clue)}
                        style={{
                          animationDelay: `${0.6 + index * 0.15}s`,
                        }}
                      >
                        #{clue}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <h2 className="detail-title">{capsule.title}</h2>

              {capsule.images.length > 0 && (
                <div className="image-gallery">
                  <div
                    className="image-scroll-container"
                    ref={imageScrollRef}
                  >
                    {capsule.images.map((img, index) => (
                      <div key={index} className="image-scroll-item">
                        <img src={img} alt={`图片 ${index + 1}`} loading="lazy" />
                      </div>
                    ))}
                  </div>
                  {capsule.images.length > 1 && (
                    <p className="image-scroll-hint">← 左右滑动查看更多 →</p>
                  )}
                </div>
              )}

              <div className="contents-section">
                {capsule.contents.map((content, index) => (
                  <div
                    key={content.id}
                    ref={el => { contentRefs.current[content.id] = el; }}
                    className={`content-paragraph ${highlightedContentId === content.id ? 'highlighted' : ''}`}
                  >
                    <div className="paragraph-header">
                      <span className="paragraph-number">第 {index + 1} 段</span>
                      <div className="paragraph-tags">
                        {content.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className="content-tag">#{tag}</span>
                        ))}
                      </div>
                    </div>
                    <p className="paragraph-text">{content.text}</p>
                  </div>
                ))}
              </div>

              <div className="detail-footer">
                <p className="create-date">封存于 {new Date(capsule.createdAt).toLocaleDateString('zh-CN')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
