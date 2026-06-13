import { Router, type Request, type Response } from 'express'

const router = Router()

router.post('/generate-pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const { htmlContent, resumeData } = req.body

    if (!htmlContent && !resumeData) {
      res.status(400).json({ success: false, error: 'No resume data provided' })
      return
    }

    let puppeteer: typeof import('puppeteer') | null = null
    try {
      puppeteer = await import('puppeteer')
    } catch {
      const fallbackHtml = buildFallbackHtml(htmlContent || buildHtmlFromData(resumeData))
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('Content-Disposition', 'attachment; filename="resume.html"')
      res.send(fallbackHtml)
      return
    }

    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    const page = await browser.newPage()

    const fullHtml = buildFullHtml(htmlContent || buildHtmlFromData(resumeData))

    await page.setContent(fullHtml, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    await browser.close()

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"')
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)
  } catch (error) {
    console.error('PDF generation error:', error)
    res.status(500).json({ success: false, error: 'Failed to generate PDF' })
  }
})

function buildFullHtml(bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  svg { display: inline-block; vertical-align: middle; }
</style>
</head>
<body>${bodyContent}</body>
</html>`
}

function buildHtmlFromData(data: { personalInfo?: { name?: string; email?: string; phone?: string; address?: string }; education?: Array<{ school?: string; major?: string; period?: string; description?: string }>; workExperience?: Array<{ company?: string; position?: string; period?: string; description?: string }> }): string {
  const personalInfo = data.personalInfo || {}
  const education = data.education || []
  const workExperience = data.workExperience || []

  let html = ''

  html += `<div style="padding:40px 48px">`
  html += `<h1 style="font-size:28px;font-weight:700;margin-bottom:8px">${personalInfo.name || ''}</h1>`
  html += `<div style="font-size:13px;color:#666;margin-bottom:20px">`
  if (personalInfo.email) html += `<span style="margin-right:16px">${personalInfo.email}</span>`
  if (personalInfo.phone) html += `<span style="margin-right:16px">${personalInfo.phone}</span>`
  if (personalInfo.address) html += `<span>${personalInfo.address}</span>`
  html += `</div>`
  html += `<hr style="border:none;border-top:1px solid #e5e7eb;margin-bottom:20px"/>`

  if (education.length > 0) {
    html += `<h2 style="font-size:16px;font-weight:700;color:#1976D2;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #1976D2">教育经历</h2>`
    for (const edu of education) {
      html += `<div style="margin-bottom:12px">`
      html += `<div style="display:flex;justify-content:space-between"><strong style="font-size:14px">${edu.school || ''}</strong><span style="font-size:12px;color:#888">${edu.period || ''}</span></div>`
      if (edu.major) html += `<span style="font-size:13px;color:#1976D2">${edu.major}</span>`
      if (edu.description) html += `<p style="font-size:13px;color:#555;margin-top:4px">${edu.description}</p>`
      html += `</div>`
    }
  }

  if (workExperience.length > 0) {
    html += `<h2 style="font-size:16px;font-weight:700;color:#1976D2;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #1976D2">工作经历</h2>`
    for (const work of workExperience) {
      html += `<div style="margin-bottom:12px">`
      html += `<div style="display:flex;justify-content:space-between"><strong style="font-size:14px">${work.company || ''}</strong><span style="font-size:12px;color:#888">${work.period || ''}</span></div>`
      if (work.position) html += `<span style="font-size:13px;color:#1976D2">${work.position}</span>`
      if (work.description) html += `<p style="font-size:13px;color:#555;margin-top:4px">${work.description}</p>`
      html += `</div>`
    }
  }

  html += `</div>`
  return html
}

function buildFallbackHtml(bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6;
  }
  svg { display: inline-block; vertical-align: middle; }
</style>
</head>
<body>${bodyContent}</body>
</html>`
}

export default router
