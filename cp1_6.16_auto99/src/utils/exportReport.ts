import { Note } from '../types';

export function generateReport(notes: Note[]): string {
  const sortedNotes = [...notes].sort((a, b) => {
    const scoreA = a.upvotes - a.downvotes;
    const scoreB = b.upvotes - b.downvotes;
    return scoreB - scoreA;
  });

  const colorGroups = new Map<string, Note[]>();
  notes.forEach((note) => {
    const color = note.color || '#ffffff';
    if (!colorGroups.has(color)) {
      colorGroups.set(color, []);
    }
    colorGroups.get(color)!.push(note);
  });

  const maxScore = Math.max(...sortedNotes.map((n) => n.upvotes - n.downvotes), 1);

  const chartBars = sortedNotes
    .map((note, index) => {
      const score = note.upvotes - note.downvotes;
      const height = Math.max((Math.abs(score) / Math.max(Math.abs(maxScore), 1)) * 150, 5);
      const barColor = score >= 0 ? '#4CAF50' : '#f44336';
      const position = score >= 0 ? 'bottom' : 'top';
      const rank = index + 1;

      return `
        <div class="chart-bar-container" title="${note.text.substring(0, 30)}... (得分: ${score})">
          <div class="chart-bar" style="height: ${height}px; background: ${barColor}; ${position}: 0;"></div>
          <div class="chart-label">#${rank}</div>
        </div>
      `;
    })
    .join('');

  const notesList = sortedNotes
    .map((note, index) => {
      const score = note.upvotes - note.downvotes;
      const rankClass = index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : '';
      const textLines = note.text.split('\n').filter((line) => line.trim()).map((line) => `<div class="note-text-line">${escapeHtml(line)}</div>`).join('');

      return `
        <div class="note-item ${rankClass}" style="border-left-color: ${note.color};">
          <div class="note-rank">#${index + 1}</div>
          <div class="note-content">
            ${textLines}
          </div>
          <div class="note-score">得分: ${score} (+${note.upvotes}/-${note.downvotes})</div>
        </div>
      `;
    })
    .join('');

  const colorGroupsHtml = Array.from(colorGroups.entries())
    .map(([color, groupNotes]) => {
      return `
        <div class="color-group">
          <div class="color-group-header">
            <div class="color-dot" style="background: ${color};"></div>
            <span>${groupNotes.length} 个便签</span>
          </div>
        </div>
      `;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BrainStorm 会议摘要报告</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }
    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .report-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 30px;
    }
    .report-header h1 {
      font-size: 28px;
      margin-bottom: 8px;
    }
    .report-header p {
      opacity: 0.8;
      font-size: 14px;
    }
    .report-section {
      padding: 30px;
      border-bottom: 1px solid #eee;
    }
    .report-section:last-child {
      border-bottom: none;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #1a1a2e;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
    }
    .chart-container {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 10px;
      height: 200px;
      padding: 20px 0;
      border-bottom: 2px solid #ddd;
      position: relative;
    }
    .chart-bar-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 40px;
      height: 180px;
      position: relative;
    }
    .chart-bar {
      width: 30px;
      border-radius: 4px 4px 0 0;
      transition: height 0.3s ease;
      position: absolute;
    }
    .chart-label {
      position: absolute;
      bottom: -25px;
      font-size: 12px;
      color: #666;
    }
    .notes-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .note-item {
      padding: 16px;
      background: #fafafa;
      border-radius: 8px;
      border-left: 4px solid #ddd;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .note-item.rank-gold {
      background: linear-gradient(90deg, #fff9e6 0%, #fafafa 100%);
      border-left-color: #FFD700;
      box-shadow: 0 0 0 1px rgba(255, 215, 0, 0.3);
    }
    .note-item.rank-silver {
      background: linear-gradient(90deg, #f5f5f5 0%, #fafafa 100%);
      border-left-color: #C0C0C0;
      box-shadow: 0 0 0 1px rgba(192, 192, 192, 0.3);
    }
    .note-item.rank-bronze {
      background: linear-gradient(90deg, #faf0e6 0%, #fafafa 100%);
      border-left-color: #CD7F32;
      box-shadow: 0 0 0 1px rgba(205, 127, 50, 0.3);
    }
    .note-rank {
      font-size: 20px;
      font-weight: 700;
      color: #999;
      min-width: 50px;
    }
    .rank-gold .note-rank { color: #FFD700; }
    .rank-silver .note-rank { color: #A0A0A0; }
    .rank-bronze .note-rank { color: #CD7F32; }
    .note-content {
      flex: 1;
      font-size: 14px;
      line-height: 1.5;
    }
    .note-text-line {
      margin-bottom: 2px;
    }
    .note-score {
      font-size: 13px;
      color: #666;
      background: #f0f0f0;
      padding: 6px 12px;
      border-radius: 20px;
      white-space: nowrap;
    }
    .color-groups {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .color-group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: #f8f9fa;
      border-radius: 20px;
    }
    .color-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 0 1px #ddd;
    }
    .report-footer {
      padding: 20px 30px;
      background: #f8f9fa;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .report-container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1>🧠 BrainStorm 会议摘要报告</h1>
      <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>

    <div class="report-section">
      <h2 class="section-title">📊 数据概览</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${notes.length}</div>
          <div class="stat-label">总便签数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${colorGroups.size}</div>
          <div class="stat-label">颜色分组</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${notes.reduce((sum, n) => sum + n.upvotes, 0)}</div>
          <div class="stat-label">总赞成票</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${notes.reduce((sum, n) => sum + n.downvotes, 0)}</div>
          <div class="stat-label">总反对票</div>
        </div>
      </div>
    </div>

    <div class="report-section">
      <h2 class="section-title">📈 得分排名图表</h2>
      <div class="chart-container">
        ${chartBars}
      </div>
    </div>

    <div class="report-section">
      <h2 class="section-title">🏆 便签排名</h2>
      <div class="notes-list">
        ${notesList}
      </div>
    </div>

    <div class="report-section">
      <h2 class="section-title">🎨 颜色分组</h2>
      <div class="color-groups">
        ${colorGroupsHtml}
      </div>
    </div>

    <div class="report-footer">
      由 BrainStorm Board 生成 | 创意头脑风暴工具
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function downloadReport(html: string, filename: string = 'brainstorm-report.html'): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
