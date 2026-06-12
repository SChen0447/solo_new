import express from 'express'
import cors from 'cors'
import {
  addEntry,
  getEntries,
  deleteEntry,
  updateEntry,
  getSummary,
  addCompletedItem,
  getCompletedItems,
  updateCompletedItem,
  deleteCompletedItem,
  addBlockerItem,
  getBlockerItems,
  updateBlockerItem,
  deleteBlockerItem,
  type ExportRequest,
} from './dataStore'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/api/entries', (req, res) => {
  const { startDate, endDate } = req.query
  const entries = getEntries(startDate as string, endDate as string)
  res.json(entries)
})

app.post('/api/entries', (req, res) => {
  try {
    const entry = addEntry(req.body)
    res.json({ success: true, entry })
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message })
  }
})

app.delete('/api/entries/:id', (req, res) => {
  const ok = deleteEntry(req.params.id)
  res.json({ success: ok })
})

app.put('/api/entries/:id', (req, res) => {
  const entry = updateEntry(req.params.id, req.body)
  if (!entry) {
    res.status(404).json({ success: false, error: 'Not found' })
    return
  }
  res.json({ success: true, entry })
})

app.get('/api/summary', (req, res) => {
  const { startDate, endDate } = req.query
  const summary = getSummary(startDate as string, endDate as string)
  res.json(summary)
})

app.get('/api/completed', (_req, res) => {
  res.json(getCompletedItems())
})

app.post('/api/completed', (req, res) => {
  try {
    const item = addCompletedItem(req.body)
    res.json({ success: true, item })
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message })
  }
})

app.put('/api/completed/:id', (req, res) => {
  const item = updateCompletedItem(req.params.id, req.body)
  if (!item) {
    res.status(404).json({ success: false, error: 'Not found' })
    return
  }
  res.json({ success: true, item })
})

app.delete('/api/completed/:id', (req, res) => {
  const ok = deleteCompletedItem(req.params.id)
  res.json({ success: ok })
})

app.get('/api/blockers', (_req, res) => {
  res.json(getBlockerItems())
})

app.post('/api/blockers', (req, res) => {
  try {
    const item = addBlockerItem(req.body)
    res.json({ success: true, item })
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message })
  }
})

app.put('/api/blockers/:id', (req, res) => {
  const item = updateBlockerItem(req.params.id, req.body)
  if (!item) {
    res.status(404).json({ success: false, error: 'Not found' })
    return
  }
  res.json({ success: true, item })
})

app.delete('/api/blockers/:id', (req, res) => {
  const ok = deleteBlockerItem(req.params.id)
  res.json({ success: ok })
})

app.post('/api/export', (req, res) => {
  const { summary, template, projectName, exporterName, startDate, endDate } = req.body as ExportRequest

  const typeColors: Record<string, string> = {
    '开发': '#4A6FA5',
    '测试': '#F5A623',
    '会议': '#7B61FF',
    '文档': '#27AE60',
  }

  const typeData = Object.entries(summary.hoursByType)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v }))

  const dateData = Object.entries(summary.hoursByDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, hours]) => ({ date, hours }))

  const completedAchieved = summary.completedItems.filter(i => i.achievedGoal).length
  const completedTotal = summary.completedItems.length
  const blockersSolved = summary.blockerItems.filter(i => i.status === '已解决').length
  const blockersTotal = summary.blockerItems.length

  const isBusiness = template === 'business'
  const primaryColor = isBusiness ? '#4A6FA5' : '#F5A623'
  const bgColor = isBusiness ? '#ffffff' : '#FFFAF3'
  const cardBg = isBusiness ? '#f8fafc' : 'rgba(255,255,255,0.85)'
  const textColor = isBusiness ? '#1e293b' : '#5b4636'

  const exportDate = new Date().toLocaleString('zh-CN')

  const typeBarsSvg = typeData.length > 0 ? `
    <svg width="400" height="220" viewBox="0 0 400 220">
      ${typeData.map((d, i) => {
        const maxVal = Math.max(...typeData.map(t => t.value))
        const barH = (d.value / maxVal) * 120
        const x = 40 + i * 90
        const y = 180 - barH
        const color = typeColors[d.name] || '#4A6FA5'
        return `
          <rect x="${x}" y="${y}" width="60" height="${barH}" fill="${color}" rx="4"/>
          <text x="${x + 30}" y="200" text-anchor="middle" fill="${textColor}" font-size="12">${d.name}</text>
          <text x="${x + 30}" y="${y - 6}" text-anchor="middle" fill="${textColor}" font-size="12" font-weight="bold">${d.value}h</text>
        `
      }).join('')}
    </svg>
  ` : '<p style="color:#94a3b8">暂无数据</p>'

  const dateBarsSvg = dateData.length > 0 ? `
    <svg width="600" height="240" viewBox="0 0 600 240">
      ${dateData.map((d, i) => {
        const maxVal = Math.max(...dateData.map(t => t.hours), 1)
        const barH = (d.hours / maxVal) * 150
        const barW = Math.min(50, 540 / dateData.length - 10)
        const x = 50 + i * (barW + 10)
        const y = 200 - barH
        return `
          <rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${primaryColor}" rx="3"/>
          <text x="${x + barW / 2}" y="222" text-anchor="middle" fill="${textColor}" font-size="11">${d.date.slice(5)}</text>
        `
      }).join('')}
      <line x1="40" y1="200" x2="580" y2="200" stroke="#e2e8f0" stroke-width="1"/>
    </svg>
  ` : '<p style="color:#94a3b8">暂无数据</p>'

  const donutSvg = typeData.length > 0 ? (() => {
    const cx = 110
    const cy = 110
    const r = 80
    const innerR = 50
    const total = typeData.reduce((s, d) => s + d.value, 0)
    let currentAngle = -Math.PI / 2
    const segments = typeData.map((d) => {
      const angle = (d.value / total) * Math.PI * 2
      const startAngle = currentAngle
      currentAngle += angle
      const endAngle = currentAngle
      const x1 = cx + r * Math.cos(startAngle)
      const y1 = cy + r * Math.sin(startAngle)
      const x2 = cx + r * Math.cos(endAngle)
      const y2 = cy + r * Math.sin(endAngle)
      const xi1 = cx + innerR * Math.cos(endAngle)
      const yi1 = cy + innerR * Math.sin(endAngle)
      const xi2 = cx + innerR * Math.cos(startAngle)
      const yi2 = cy + innerR * Math.sin(startAngle)
      const largeArc = angle > Math.PI ? 1 : 0
      const color = typeColors[d.name] || '#4A6FA5'
      return `
        <path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${xi2} ${yi2} Z" fill="${color}"/>
      `
    }).join('')
    return `
      <svg width="220" height="220" viewBox="0 0 220 220">
        ${segments}
        <text x="110" y="105" text-anchor="middle" fill="${textColor}" font-size="28" font-weight="bold">${total}</text>
        <text x="110" y="130" text-anchor="middle" fill="#64748b" font-size="12">总工时(h)</text>
      </svg>
    `
  })() : '<p style="color:#94a3b8">暂无数据</p>'

  const completedList = summary.completedItems.length > 0 ? summary.completedItems.map((item, idx) => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-left:3px solid ${
      item.priority === '高' ? '#ef4444' : item.priority === '中' ? '#F5A623' : '#22c55e'
    };background:${cardBg};border-radius:6px;margin-bottom:8px;">
      <span style="font-weight:600;color:${primaryColor}">${idx + 1}.</span>
      <span style="flex:1;color:${textColor}">${item.content}</span>
      ${item.achievedGoal ? '<span style="color:#22c55e;font-size:14px">✓ 达标</span>' : '<span style="color:#94a3b8;font-size:14px">未达标</span>'}
    </div>
  `).join('') : '<p style="color:#94a3b8">暂无完成事项</p>'

  const blockerList = summary.blockerItems.length > 0 ? summary.blockerItems.map((item, idx) => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-left:3px solid ${
      item.status === '已解决' ? '#22c55e' : item.status === '待沟通' ? '#F5A623' : '#ef4444'
    };background:${cardBg};border-radius:6px;margin-bottom:8px;">
      <span style="font-weight:600;color:${primaryColor}">${idx + 1}.</span>
      <span style="flex:1;color:${textColor}">${item.content}</span>
      <span style="font-size:12px;padding:2px 8px;border-radius:10px;background:${
        item.status === '已解决' ? '#dcfce7' : item.status === '待沟通' ? '#fef3c7' : '#fee2e2'
      };color:${
        item.status === '已解决' ? '#166534' : item.status === '待沟通' ? '#92400e' : '#991b1b'
      }">${item.status}</span>
    </div>
  `).join('') : '<p style="color:#94a3b8">暂无阻塞问题</p>'

  const timeline = dateData.length > 0 ? `
    <div style="position:relative;padding-left:30px;">
      ${dateData.map((d) => {
        const dayEntries = getEntries(d.date, d.date)
        return `
          <div style="position:relative;margin-bottom:20px;">
            <div style="position:absolute;left:-26px;top:6px;width:12px;height:12px;border-radius:50%;background:${primaryColor};"></div>
            <div style="font-weight:600;color:${textColor};margin-bottom:6px;">${d.date} · ${d.hours} 小时</div>
            ${dayEntries.map(e => `
              <div style="padding:6px 10px;background:${cardBg};border-radius:4px;margin-bottom:4px;font-size:14px;color:${textColor};">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${typeColors[e.taskType]};margin-right:6px;"></span>
                ${e.taskName}
                <span style="float:right;color:#94a3b8;">${e.hours}h</span>
              </div>
            `).join('')}
          </div>
        `
      }).join('')}
    </div>
  ` : '<p style="color:#94a3b8">暂无数据</p>'

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${projectName} - 项目复盘报告</title>
<style>
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    background: ${bgColor};
    color: ${textColor};
    line-height: 1.6;
  }
  .cover {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: ${isBusiness ? 'linear-gradient(135deg, #4A6FA5 0%, #2d4a72 100%)' : 'linear-gradient(135deg, #FFB347 0%, #FFCC80 100%)'};
    color: white;
    text-align: center;
    page-break-after: always;
  }
  .cover h1 { font-size: 48px; margin: 0 0 20px; }
  .cover p { font-size: 18px; opacity: 0.9; }
  .toc {
    padding: 40px 60px;
    page-break-after: always;
  }
  .toc h2 { color: ${primaryColor}; font-size: 28px; margin-bottom: 20px; }
  .toc ol { font-size: 18px; line-height: 2.5; }
  .toc a { color: ${textColor}; text-decoration: none; }
  .section {
    padding: 40px 60px;
    page-break-after: always;
  }
  .section h2 {
    color: ${primaryColor};
    font-size: 28px;
    border-bottom: ${isBusiness ? '2px solid ' + primaryColor : 'none'};
    padding-bottom: 10px;
    margin-bottom: 24px;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 30px;
  }
  .stat-card {
    background: ${cardBg};
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .stat-value {
    font-size: 32px;
    font-weight: bold;
    color: ${primaryColor};
  }
  .stat-label { color: #64748b;
    font-size: 14px;
    margin-top: 4px;
  }
  .chart-row {
    display: flex;
    gap: 30px;
    align-items: center;
    justify-content: center;
  }
  .chart-box {
    background: ${cardBg};
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
</style>
</head>
<body>
<div class="cover">
  <h1>${projectName}</h1>
  <p style="font-size:24px;margin-bottom:40px;">项目复盘报告</p>
  <p>报告周期：${startDate} 至 ${endDate}</p>
  <p>导出人：${exporterName}</p>
  <p>导出时间：${exportDate}</p>
</div>

<div class="toc">
  <h2>目录</h2>
  <ol>
    <li><a href="#s1">工时概览</a></li>
    <li><a href="#s2">任务类型分布</a></li>
    <li><a href="#s3">每日工时分布</a></li>
    <li><a href="#s4">完成事项汇总</a></li>
    <li><a href="#s5">阻塞问题列表</a></li>
    <li><a href="#s6">时间线详情</a></li>
  </ol>
</div>

<div class="section" id="s1">
  <h2>一、工时概览</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${summary.totalHours.toFixed(1)}</div>
      <div class="stat-label">总工时（小时）</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${completedTotal}</div>
      <div class="stat-label">完成事项</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${completedAchieved}</div>
      <div class="stat-label">达成绩效目标</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${blockersSolved}/${blockersTotal}</div>
      <div class="stat-label">阻塞问题（已解决/总数）</div>
    </div>
  </div>
</div>

<div class="section" id="s2">
  <h2>二、任务类型分布</h2>
  <div class="chart-row">
    <div class="chart-box">
      ${donutSvg}
    </div>
    <div class="chart-box">
      ${typeBarsSvg}
    </div>
  </div>
</div>

<div class="section" id="s3">
  <h2>三、每日工时分布</h2>
  <div class="chart-box" style="text-align:center;">
    ${dateBarsSvg}
  </div>
</div>

<div class="section" id="s4">
  <h2>四、完成事项汇总</h2>
  ${completedList}
</div>

<div class="section" id="s5">
  <h2>五、阻塞问题列表</h2>
  ${blockerList}
</div>

<div class="section" id="s6">
  <h2>六、时间线详情</h2>
  ${timeline}
</div>

</body>
</html>`

  res.json({ html })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
