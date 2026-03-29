const ScanReport = require('../models/ScanReport');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * generatePDF
 * Generates a detailed, professional PDF report using Playwright.
 * Embeds screenshots, full issue lists, chaos results, and AI insights.
 */
const generatePDF = async (reportId) => {
    const report = await ScanReport.findById(reportId);
    if (!report) return null;

    const screenshotsDir = path.join(__dirname, '../screenshots');

    // Helper: convert a screenshot path to a base64 data URI so it works in the PDF
    const toBase64 = (relPath) => {
        try {
            const absPath = path.join(__dirname, '..', relPath);
            if (fs.existsSync(absPath)) {
                const data = fs.readFileSync(absPath);
                return `data:image/png;base64,${data.toString('base64')}`;
            }
        } catch (_) {}
        return null;
    };

    // ── Stats ──────────────────────────────────────────────────────────────────
    const totalIssues =
        (report.brokenLinks?.length || 0) +
        (report.consoleErrors?.length || 0) +
        (report.uiIssues?.length || 0) +
        (report.accessibilityIssues?.length || 0) +
        (report.networkLogs?.filter(n => n.status >= 400)?.length || 0);

    const chaosImpacts = report.chaosSubmissions?.filter(s => s.outcome === 'Impact Detected') || [];
    const criticalFormTests = report.smartFormTests?.filter(t => t.status !== 'Blocked') || [];

    const severityColor = (sev) => {
        if (!sev) return '#64748b';
        const s = sev.toLowerCase();
        if (s === 'critical') return '#dc2626';
        if (s === 'high') return '#f97316';
        if (s === 'medium') return '#eab308';
        return '#22c55e';
    };

    // ── Build screenshot gallery HTML for SmartFormTests ──────────────────────
    const formScreenshotRows = (report.smartFormTests || []).map((test) => {
        const imgSrc = test.screenshot ? toBase64(test.screenshot) : null;
        const statusColor = test.status === 'Blocked' ? '#22c55e' : test.status === 'Flagged' ? '#eab308' : '#3b82f6';
        return `
        <div class="form-test-card">
            <div class="form-test-header">
                <span class="badge" style="background:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}40">${test.status}</span>
                <span class="form-test-title">${test.formName || 'Unknown Form'}</span>
                <span class="form-test-type">${test.testType}</span>
            </div>
            <p class="form-test-details">${test.details || 'No details.'}</p>
            ${imgSrc ? `<img class="form-screenshot" src="${imgSrc}" alt="Screenshot of ${test.testType} test" />` : ''}
        </div>`;
    }).join('');

    // ── Build chaos table rows ─────────────────────────────────────────────────
    const chaosRows = (report.chaosSubmissions || []).map(s => {
        const riskColor = s.riskLevel === 'Critical' ? '#dc2626' : s.riskLevel === 'Moderate' ? '#f97316' : '#22c55e';
        return `<tr>
            <td>${escHtml(s.payload || '')}</td>
            <td>${escHtml(s.outcome || '')}</td>
            <td style="color:${riskColor};font-weight:700">${s.riskLevel || 'Unknown'}</td>
            <td>${escHtml(s.details || '')}</td>
        </tr>`;
    }).join('');

    // ── Build AI issues section ────────────────────────────────────────────────
    const aiIssuesHtml = (report.aiInsights?.issues || []).map((issue, idx) => {
        const sc = severityColor(issue.severity);
        const codeBlock = issue.remediationCode
            ? `<pre class="code-block"><code>${escHtml(issue.remediationCode)}</code></pre>`
            : '';
        return `
        <div class="ai-issue-card">
            <div class="ai-issue-header">
                <span class="issue-num">${idx + 1}</span>
                <span class="issue-title">${escHtml(issue.title || 'Unknown Issue')}</span>
                <span class="severity-badge" style="background:${sc}20;color:${sc};border:1px solid ${sc}40">${issue.severity || 'Unknown'}</span>
                ${issue.timeToFix ? `<span class="time-badge">⏱ ${issue.timeToFix}</span>` : ''}
            </div>
            <div class="ai-issue-body">
                ${issue.whatThisMeans ? `<div class="detail-row"><strong>What This Means:</strong> ${escHtml(issue.whatThisMeans)}</div>` : ''}
                ${issue.whyItMatters ? `<div class="detail-row"><strong>Why It Matters:</strong> ${escHtml(issue.whyItMatters)}</div>` : ''}
                ${issue.howToFix?.beginner ? `<div class="detail-row"><strong>Fix (General):</strong> ${escHtml(issue.howToFix.beginner)}</div>` : ''}
                ${issue.howToFix?.developer ? `<div class="detail-row fix-dev"><strong>Fix (Developer):</strong> ${escHtml(issue.howToFix.developer)}</div>` : ''}
                ${codeBlock}
            </div>
        </div>`;
    }).join('');

    // ── Build issue log tables ─────────────────────────────────────────────────
    const issueTable = (items, fields) => {
        if (!items || items.length === 0) return `<p class="empty-note">None detected.</p>`;
        const headers = fields.map(f => `<th>${f.label}</th>`).join('');
        const rows = items.slice(0, 100).map(item =>
            `<tr>${fields.map(f => `<td>${escHtml(String(item[f.key] || '—'))}</td>`).join('')}</tr>`
        ).join('');
        return `<table class="data-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    };

    // ── Lighthouse Scores dials ────────────────────────────────────────────────
    const lhScores = report.lighthouseScores || {};
    const scoreGauge = (label, val) => {
        const v = Math.round(val || 0);
        const color = v >= 90 ? '#22c55e' : v >= 50 ? '#eab308' : '#dc2626';
        return `<div class="gauge">
            <div class="gauge-circle" style="background:conic-gradient(${color} ${v * 3.6}deg, #1e293b 0deg)">
                <span class="gauge-val">${v}</span>
            </div>
            <div class="gauge-label">${label}</div>
        </div>`;
    };

    // ── Full HTML Template ─────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #0f172a; color: #e2e8f0; font-size: 12px; }
  
  /* Cover Page */
  .cover { width: 100%; min-height: 100vh; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2240 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 60px; text-align: center; page-break-after: always; }
  .cover-logo { font-size: 56px; font-weight: 900; letter-spacing: -2px; background: linear-gradient(135deg, #60a5fa, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px; }
  .cover-sub { font-size: 13px; letter-spacing: 6px; text-transform: uppercase; color: #64748b; margin-bottom: 60px; }
  .cover-url { font-size: 20px; font-weight: 700; color: #60a5fa; margin-bottom: 12px; word-break: break-all; }
  .cover-meta { font-size: 12px; color: #64748b; }
  .cover-stats { display: flex; gap: 48px; margin: 48px 0; }
  .stat-box { text-align: center; }
  .stat-num { font-size: 48px; font-weight: 900; color: #f8fafc; }
  .stat-label { font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: #64748b; }
  .status-pill { display: inline-block; margin-top: 24px; padding: 8px 24px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; background: #22c55e20; color: #22c55e; border: 1px solid #22c55e40; }

  /* Sections */
  .section { padding: 48px 60px; page-break-inside: avoid; }
  .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; border-bottom: 1px solid #1e293b; padding-bottom: 16px; }
  .section-tag { font-size: 9px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: #60a5fa; }
  .section-title { font-size: 24px; font-weight: 800; color: #f8fafc; }

  /* Summary box */
  .summary-box { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; }
  .summary-text { font-size: 15px; line-height: 1.9; color: #cbd5e1; }

  /* Lighthouse gauges */
  .gauges { display: flex; gap: 32px; justify-content: center; margin: 32px 0; }
  .gauge { text-align: center; }
  .gauge-circle { width: 88px; height: 88px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; }
  .gauge-val { font-size: 22px; font-weight: 900; color: #f8fafc; }
  .gauge-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #64748b; }

  /* AI Issues */
  .ai-issue-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px 24px; margin-bottom: 16px; }
  .ai-issue-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
  .issue-num { width: 28px; height: 28px; background: #60a5fa20; border: 1px solid #60a5fa40; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #60a5fa; flex-shrink: 0; }
  .issue-title { font-size: 14px; font-weight: 700; color: #f8fafc; flex: 1; }
  .severity-badge, .time-badge { font-size: 9px; font-weight: 700; padding: 3px 10px; border-radius: 999px; letter-spacing: 1px; text-transform: uppercase; }
  .time-badge { background: #334155; color: #94a3b8; }
  .detail-row { margin-bottom: 8px; color: #94a3b8; line-height: 1.6; }
  .fix-dev { color: #6ee7b7; }
  .code-block { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-top: 12px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #7dd3fc; white-space: pre-wrap; word-break: break-all; }

  /* Form Test Cards */
  .form-test-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px 20px; margin-bottom: 12px; }
  .form-test-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
  .badge { font-size: 9px; font-weight: 700; padding: 3px 10px; border-radius: 999px; letter-spacing: 1px; text-transform: uppercase; }
  .form-test-title { font-size: 13px; font-weight: 700; color: #f8fafc; flex: 1; }
  .form-test-type { font-size: 10px; color: #64748b; }
  .form-test-details { font-size: 11px; color: #94a3b8; line-height: 1.6; margin-bottom: 12px; }
  .form-screenshot { width: 100%; max-height: 280px; object-fit: contain; border-radius: 8px; border: 1px solid #334155; margin-top: 8px; }

  /* Chaos table */
  .data-table { width: 100%; border-collapse: collapse; font-size: 10px; }
  .data-table th { background: #1e293b; color: #64748b; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; text-align: left; padding: 10px 12px; border-bottom: 1px solid #334155; }
  .data-table td { padding: 8px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; word-break: break-word; }
  .data-table tr:hover td { background: #1e293b; }
  .empty-note { color: #64748b; font-style: italic; padding: 16px 0; }

  /* Footer */
  .footer { text-align: center; padding: 32px; border-top: 1px solid #1e293b; color: #475569; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }
  
  /* Page breaks */
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<!-- ═══════ COVER PAGE ═══════ -->
<div class="cover">
  <div class="cover-logo">SENTINEL</div>
  <div class="cover-sub">AI QA Inspection Report</div>
  <div class="cover-url">${escHtml(report.url)}</div>
  <div class="cover-stats">
    <div class="stat-box"><div class="stat-num">${report.pagesCrawled || 0}</div><div class="stat-label">Pages Crawled</div></div>
    <div class="stat-box"><div class="stat-num">${totalIssues}</div><div class="stat-label">Issues Found</div></div>
    <div class="stat-box"><div class="stat-num">${chaosImpacts.length}</div><div class="stat-label">Vulnerabilities</div></div>
    <div class="stat-box"><div class="stat-num">${criticalFormTests.length}</div><div class="stat-label">Form Flags</div></div>
  </div>
  <div class="cover-meta">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Report ID: ${reportId}</div>
  <div class="status-pill">${report.status.toUpperCase()}</div>
</div>

<!-- ═══════ EXECUTIVE SUMMARY ═══════ -->
  <div class="summary-box">
    <p class="summary-text">${report.aiInsights?.summary || 'No AI summary was generated for this scan.'}</p>
  </div>

  <!-- Strategic Delta (Comparison) -->
  ${report.comparison?.previousReportId ? `
  <div style="margin-top:24px; background: ${report.comparison.scoreDelta >= 0 ? '#065f4620' : '#991b1b20'}; border: 1px solid ${report.comparison.scoreDelta >= 0 ? '#05966940' : '#dc262640'}; border-radius: 12px; padding: 20px;">
    <div style="font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Delta Comparison</div>
    <div style="display: flex; align-items: center; justify-content: justify; gap: 24px;">
        <div>
            <div style="font-size: 32px; font-weight: 900; color: ${report.comparison.scoreDelta >= 0 ? '#22c55e' : '#dc2626'}">
                ${report.comparison.scoreDelta >= 0 ? '+' : ''}${report.comparison.scoreDelta}%
            </div>
            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Score Delta</div>
        </div>
        <div style="flex: 1; border-left: 1px solid #334155; padding-left: 24px;">
            <div style="font-size: 11px; color: #cbd5e1; line-height: 1.6;">
                <strong>New Anomalies:</strong> ${report.comparison.stats?.newErrors || 0}<br/>
                <strong>Fixed Issues:</strong> ${report.comparison.stats?.fixedErrors || 0}<br/>
                <strong>Current Impact:</strong> ${report.comparison.stats?.impact || 'Calculated Baseline'}
            </div>
        </div>
    </div>
  </div>` : ''}

  <!-- Lighthouse Scores -->
  ${Object.values(lhScores).some(v => v > 0) ? `
  <div style="margin-top:36px">
    <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#64748b;margin-bottom:20px">Lighthouse Quality Scores</div>
    <div class="gauges">
      ${scoreGauge('Performance', lhScores.performance)}
      ${scoreGauge('Accessibility', lhScores.accessibility)}
      ${scoreGauge('Best Practices', lhScores.bestPractices)}
      ${scoreGauge('SEO', lhScores.seo)}
    </div>
  </div>` : ''}
</div>

<!-- ═══════ AI CRITICAL FINDINGS ═══════ -->
${report.aiInsights?.issues?.length > 0 ? `
<div class="section page-break">
  <div class="section-header"><span class="section-tag">02</span><span class="section-title">AI-Driven Critical Findings & Remediation</span></div>
  ${aiIssuesHtml}
</div>` : ''}

<!-- ═══════ SMART FORM TESTING ═══════ -->
${report.smartFormTests?.length > 0 ? `
<div class="section page-break">
  <div class="section-header"><span class="section-tag">03</span><span class="section-title">Smart Form Test Results</span></div>
  ${formScreenshotRows}
</div>` : ''}

<!-- ═══════ CHAOS FUZZING ═══════ -->
${report.chaosSubmissions?.length > 0 ? `
<div class="section page-break">
  <div class="section-header"><span class="section-tag">04</span><span class="section-title">AI Chaos Fuzzing — Injection Attack Log</span></div>
  ${issueTable(report.chaosSubmissions, [
    { label: 'Payload', key: 'payload' },
    { label: 'Outcome', key: 'outcome' },
    { label: 'Risk Level', key: 'riskLevel' },
    { label: 'Details', key: 'details' }
  ])}
</div>` : ''}

<!-- ═══════ BROKEN LINKS ═══════ -->
<div class="section page-break">
  <div class="section-header"><span class="section-tag">05</span><span class="section-title">Broken Links (${report.brokenLinks?.length || 0})</span></div>
  ${issueTable(report.brokenLinks, [
    { label: 'Page', key: 'page' },
    { label: 'Broken URL', key: 'link' },
    { label: 'HTTP Status', key: 'status' },
    { label: 'Recommendation', key: 'recommendation' }
  ])}
</div>

<!-- ═══════ CONSOLE ERRORS ═══════ -->
<div class="section page-break">
  <div class="section-header"><span class="section-tag">06</span><span class="section-title">Console Errors (${report.consoleErrors?.length || 0})</span></div>
  ${issueTable(report.consoleErrors, [
    { label: 'Page', key: 'page' },
    { label: 'Error Message', key: 'message' },
    { label: 'Type', key: 'type' },
    { label: 'Suggestion', key: 'recommendation' }
  ])}
</div>

<!-- ═══════ ACCESSIBILITY ISSUES ═══════ -->
<div class="section page-break">
  <div class="section-header"><span class="section-tag">07</span><span class="section-title">Accessibility Issues (${report.accessibilityIssues?.length || 0})</span></div>
  ${issueTable(report.accessibilityIssues, [
    { label: 'Page', key: 'page' },
    { label: 'Issue', key: 'issue' },
    { label: 'Severity', key: 'severity' },
    { label: 'Element', key: 'element' },
    { label: 'Recommendation', key: 'recommendation' }
  ])}
</div>

<!-- ═══════ NETWORK ANOMALIES ═══════ -->
<div class="section page-break">
  <div class="section-header"><span class="section-tag">08</span><span class="section-title">Network Anomalies (${report.networkLogs?.filter(n => n.status >= 400)?.length || 0})</span></div>
  ${issueTable(
    report.networkLogs?.filter(n => n.status >= 400),
    [
      { label: 'URL', key: 'url' },
      { label: 'Status', key: 'status' },
      { label: 'Method', key: 'method' },
    ]
  )}
</div>

<!-- ═══════ FOOTER ═══════ -->
<div class="footer">Sentinel AI QA Platform &nbsp;|&nbsp; Autonomous Inspection Report &nbsp;|&nbsp; ${new Date().toLocaleDateString()}</div>
</body>
</html>`;

    // ── Render via Playwright ──────────────────────────────────────────────────
    let browser;
    try {
        browser = await chromium.launch({ 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle' });

        const pdfPath = path.join(__dirname, `../reports/report-${reportId}.pdf`);
        const pdfDir = path.dirname(pdfPath);
        if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        return `/reports/report-${reportId}.pdf`;
    } finally {
        if (browser) await browser.close();
    }
};

// Minimal HTML escape to prevent XSS inside the report
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

module.exports = { generatePDF };
