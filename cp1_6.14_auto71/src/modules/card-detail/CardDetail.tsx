import React from 'react';
import { Card, ThemeKey } from '../../types';
import { themes } from '../../themes';
import './CardDetail.css';

interface CardDetailProps {
  card: Card;
  onClose: () => void;
}

export const CardDetail: React.FC<CardDetailProps> = ({ card, onClose }) => {
  const themeConfig = themes[card.theme as ThemeKey] || themes.minimalWhite;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${label}已复制到剪贴板`);
    });
  };

  const handleEmail = () => {
    if (card.email) {
      window.location.href = `mailto:${card.email}`;
    }
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>

        <div
          className="detail-card"
          style={{
            backgroundColor: themeConfig.bgColor,
            color: themeConfig.textColor,
            fontFamily: themeConfig.fontFamily,
            border: `3px double ${themeConfig.borderColor}`,
          }}
        >
          <div className="detail-card-header">
            <div className="detail-avatar">
              {card.avatarUrl ? (
                <img src={card.avatarUrl} alt={card.name} />
              ) : (
                <div className="avatar-init-large">{card.name.charAt(0)}</div>
              )}
            </div>
            <div className="detail-title">
              <h2 className="detail-name">{card.name}</h2>
              <p className="detail-occupation">{card.occupation}</p>
            </div>
          </div>
          <p className="detail-bio">{card.bio}</p>
          <div className="detail-social">
            {card.socialLinks.map((link, i) => (
              <span key={i} className="social-tag">
                {link.platform}
              </span>
            ))}
          </div>
        </div>

        <div className="detail-info">
          <h3>联系方式</h3>
          
          {card.phone && (
            <div className="info-row">
              <span className="info-label">📱 手机</span>
              <span className="info-value">{card.phone}</span>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(card.phone, '手机号')}
              >
                复制
              </button>
            </div>
          )}

          {card.email && (
            <div className="info-row">
              <span className="info-label">📧 邮箱</span>
              <span className="info-value">{card.email}</span>
              <button className="copy-btn" onClick={handleEmail}>
                发邮件
              </button>
            </div>
          )}

          {card.website && (
            <div className="info-row">
              <span className="info-label">🌐 网站</span>
              <span className="info-value">{card.website}</span>
              <button
                className="copy-btn"
                onClick={() => window.open(card.website, '_blank')}
              >
                访问
              </button>
            </div>
          )}

          {card.socialLinks.length > 0 && (
            <>
              <h3 style={{ marginTop: '20px' }}>社交链接</h3>
              {card.socialLinks.map((link, i) => (
                <div key={i} className="info-row">
                  <span className="info-label">🔗 {link.platform}</span>
                  <span className="info-value social-url">{link.url}</span>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(link.url, link.platform + '链接')}
                  >
                    复制
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="detail-footer">
          <span className="card-id">名片ID: {card.id}</span>
          <span className="card-date">
            创建于 {new Date(card.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>
    </div>
  );
};
