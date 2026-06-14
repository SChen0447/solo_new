import React, { useState, useEffect } from 'react';
import { useCardStore } from '../../stores/cardStore';
import { themes, themeKeys } from '../../themes';
import { ThemeKey, SocialLink } from '../../types';
import './CardEditor.css';

const defaultSocialLinks: SocialLink[] = [
  { platform: '', url: '' },
  { platform: '', url: '' },
  { platform: '', url: '' },
];

const platformOptions = ['GitHub', 'Behance', 'LinkedIn', 'Twitter', 'Instagram', 'Dribbble'];

export const CardEditor: React.FC = () => {
  const { createCard, updateCard, currentCard, setCurrentCard } = useCardStore();
  
  const [name, setName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(defaultSocialLinks);
  const [bio, setBio] = useState('');
  const [theme, setTheme] = useState<ThemeKey>('minimalWhite');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (currentCard) {
      setName(currentCard.name);
      setOccupation(currentCard.occupation);
      setPhone(currentCard.phone);
      setEmail(currentCard.email);
      setWebsite(currentCard.website);
      setSocialLinks(
        currentCard.socialLinks.length
          ? [...currentCard.socialLinks, ...Array(3 - currentCard.socialLinks.length).fill({ platform: '', url: '' })]
          : defaultSocialLinks
      );
      setBio(currentCard.bio);
      setTheme(currentCard.theme as ThemeKey);
      setAvatarUrl(currentCard.avatarUrl);
      setSavedId(currentCard.id);
    }
  }, [currentCard]);

  const handleSocialLinkChange = (index: number, field: 'platform' | 'url', value: string) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSocialLinks(updated);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage('请输入姓名');
      return;
    }

    const validLinks = socialLinks.filter((l) => l.platform.trim() && l.url.trim());

    const cardData = {
      name,
      occupation,
      phone,
      email,
      website,
      socialLinks: validLinks,
      bio: bio.slice(0, 15),
      theme,
      avatarUrl,
    };

    let result;
    if (savedId) {
      result = await updateCard(savedId, cardData);
    } else {
      result = await createCard(cardData);
    }

    if (result) {
      setSavedId(result.id);
      setMessage(`保存成功！名片ID: ${result.id}`);
      setCurrentCard(result);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleReset = () => {
    setName('');
    setOccupation('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setSocialLinks(defaultSocialLinks);
    setBio('');
    setTheme('minimalWhite');
    setAvatarUrl('');
    setSavedId(null);
    setCurrentCard(null);
    setMessage('');
  };

  const themeConfig = themes[theme];

  return (
    <div className="editor-container">
      <div className="editor-form">
        <h2>创建名片</h2>
        
        <div className="form-group">
          <label>姓名 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入您的姓名"
          />
        </div>

        <div className="form-group">
          <label>职业</label>
          <input
            type="text"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="例如：UI设计师"
          />
        </div>

        <div className="form-group">
          <label>一句话简介（15字以内）</label>
          <input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 15))}
            placeholder="简短介绍自己"
            maxLength={15}
          />
          <span className="char-count">{bio.length}/15</span>
        </div>

        <div className="form-group">
          <label>手机</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="联系电话"
          />
        </div>

        <div className="form-group">
          <label>邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
          />
        </div>

        <div className="form-group">
          <label>个人网站</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yoursite.com"
          />
        </div>

        <div className="form-group">
          <label>头像 URL</label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="头像图片链接"
          />
        </div>

        <div className="form-group">
          <label>社交媒体链接（最多3个）</label>
          {socialLinks.map((link, index) => (
            <div key={index} className="social-input-row">
              <select
                value={link.platform}
                onChange={(e) => handleSocialLinkChange(index, 'platform', e.target.value)}
              >
                <option value="">选择平台</option>
                {platformOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <input
                type="url"
                value={link.url}
                onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                placeholder="链接地址"
              />
            </div>
          ))}
        </div>

        <div className="form-group">
          <label>视觉主题</label>
          <div className="theme-selector">
            {themeKeys.map((key) => (
              <button
                key={key}
                type="button"
                className={`theme-btn ${theme === key ? 'active' : ''}`}
                style={{
                  backgroundColor: themes[key].bgColor,
                  borderColor: themes[key].borderColor,
                  boxShadow: theme === key ? `0 0 12px ${themes[key].dotColor}` : 'none',
                }}
                onClick={() => setTheme(key)}
                title={themes[key].name}
              >
                <span
                  className="theme-dot"
                  style={{ backgroundColor: themes[key].dotColor }}
                />
                <span className="theme-name" style={{ color: themes[key].textColor }}>
                  {themes[key].name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="button-row">
          <button className="save-btn" onClick={handleSave}>
            {savedId ? '更新名片' : '保存名片'}
          </button>
          <button className="reset-btn" onClick={handleReset}>
            重新创建
          </button>
        </div>

        {message && <div className="message">{message}</div>}
      </div>

      <div className="editor-preview">
        <h2>实时预览</h2>
        <div className="preview-wrapper">
          <div
            className="business-card card-preview"
            style={{
              backgroundColor: themeConfig.bgColor,
              color: themeConfig.textColor,
              fontFamily: themeConfig.fontFamily,
              border: `3px double ${themeConfig.borderColor}`,
            }}
          >
            <div className="card-header">
              <div className="card-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" />
                ) : (
                  <div className="avatar-placeholder">头像</div>
                )}
              </div>
              <div className="card-title">
                <div className="card-name">{name || '您的姓名'}</div>
                <div className="card-occupation">{occupation || '职业/职位'}</div>
              </div>
            </div>
            <div className="card-bio">{bio || '一句话介绍自己'}</div>
            <div className="card-social">
              {socialLinks.filter(l => l.platform).slice(0, 2).map((link, i) => (
                <span key={i} className="social-tag" style={{ color: themeConfig.accentColor }}>
                  {link.platform}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="card-size">名片尺寸：320 × 200 px</p>
      </div>
    </div>
  );
};
