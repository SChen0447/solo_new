export default function AboutPage() {
  return (
    <div className="about-page">
      <h1>关于 Musician Hub</h1>
      <p>
        Musician Hub 是一个专为独立音乐人打造的作品展示与演出日程管理平台。
      </p>
      <h2>功能特点</h2>
      <ul>
        <li>作品展示与管理 - 发布您的音乐作品，包括音频、歌词和封面</li>
        <li>演出日程管理 - 日历视图展示演出安排，轻松管理您的演出计划</li>
        <li>粉丝互动留言 - 与听众互动，收集反馈和建议</li>
      </ul>
      <h2>联系我们</h2>
      <p>如果您有任何问题或建议，欢迎通过留言板与我们交流。</p>

      <style>{`
        .about-page {
          max-width: 800px;
          margin: 0 auto;
        }
        .about-page h1 {
          font-size: 28px;
          margin-bottom: 24px;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .about-page h2 {
          font-size: 20px;
          margin: 24px 0 12px;
          color: var(--text-primary);
        }
        .about-page p {
          color: var(--text-secondary);
          line-height: 1.8;
          margin-bottom: 16px;
        }
        .about-page ul {
          list-style: none;
          padding: 0;
        }
        .about-page li {
          padding: 8px 0;
          color: var(--text-secondary);
          position: relative;
          padding-left: 24px;
        }
        .about-page li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: var(--accent-primary);
          font-size: 20px;
        }
      `}</style>
    </div>
  )
}
