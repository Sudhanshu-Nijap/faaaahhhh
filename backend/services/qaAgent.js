const { GoogleGenerativeAI } = require("@google/generative-ai");
const ScanReport = require('../models/ScanReport');

/**
 * qaAgent - AI QA Assistant for Non-Technical Users
 *
 * Analyzes all scan data and produces structured, plain-English
 * issue explanations with severity, fix steps, auto-fix tips, and examples.
 */
class QAAgent {
    constructor(reportId, apiKey) {
        this.reportId = reportId;
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    async analyzeResults(currentReport) {
        const prompt = `
You are a helpful AI QA Assistant designed for NON-TECHNICAL USERS.
Your job is to analyze the website audit report below and explain each issue in the simplest way possible.
Use friendly, clear language. Use real-life analogies where helpful. Act like a helpful teacher, not a robot.

REPORT DATA:
- URL: ${currentReport.url}
- Broken Links: ${currentReport.brokenLinks?.length || 0}${currentReport.brokenLinks?.slice(0,2).map(l => ' [' + l.link?.substring(0,60) + ']').join('') || ''}
- Console Errors: ${currentReport.consoleErrors?.length || 0}${currentReport.consoleErrors?.slice(0,2).map(e => ' [' + (e.message || '').substring(0,60) + ']').join('') || ''}
- UI/Layout Issues: ${currentReport.uiIssues?.length || 0}
- Network Failures (4xx/5xx): ${currentReport.networkLogs?.filter(n => n.status >= 400)?.length || 0}
- Security Issues: ${currentReport.accessibilityIssues?.length || 0}
- Chaos Lab Impacts: ${currentReport.chaosSubmissions?.filter(s => s.outcome === 'Impact Detected')?.length || 0}
- Page Load Time: ${currentReport.performanceMetrics?.loadTime || 0}ms
- Lighthouse Performance: ${currentReport.lighthouseScores?.performance || 0}
- Lighthouse Accessibility: ${currentReport.lighthouseScores?.accessibility || 0}
- Lighthouse SEO: ${currentReport.lighthouseScores?.seo || 0}

Based on the above, identify the TOP issues and explain them clearly.

Respond in this EXACT JSON format (raw JSON only, no markdown, no code blocks):
            "issues": [
                {
                    "title": "Simple name for the issue",
                    "whatThisMeans": "Simple explanation with analogy.",
                    "whyItMatters": "Business/User impact.",
                    "howToFix": {
                        "beginner": "Instructions for non-tech.",
                        "developer": "Instructions for devs."
                    },
                    "remediationCode": "Full, copy-pasteable code block (e.g. Nginx config, Express middleware, or CSS fix).",
                    "autoFix": "Quick tip or tool.",
                    "severity": "Low | Medium | High | Critical",
                    "timeToFix": "e.g. 15 minutes",
                    "example": "Before/After"
                }
            ]
        }

RULES:
- Only generate issues for problems that actually appear in the report data.
- If the site looks healthy, return 0 issues with a positive summary.
- Maximum 5 issues.
- Always use simple English. No jargon.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();

            // Strip markdown code fences if Gemini wraps in them
            const stripped = responseText
                .replace(/```json/gi, '')
                .replace(/```/g, '')
                .trim();

            const cleanJson = stripped.substring(
                stripped.indexOf("{"),
                stripped.lastIndexOf("}") + 1
            );

            const aiData = JSON.parse(cleanJson);

            await ScanReport.findByIdAndUpdate(this.reportId, {
                aiInsights: {
                    classification: aiData.classification || 'Analysis Complete',
                    summary: aiData.summary || '',
                    issues: (aiData.issues || []).map(iss => ({
                        ...iss,
                        remediationCode: iss.remediationCode || ''
                    }))
                }
            });

            console.log(`[qaAgent]: AI analysis saved — ${aiData.issues?.length || 0} issue(s) identified for ${this.reportId}`);
        } catch (e) {
            console.error("[qaAgent]: AI analysis failed:", e.message);

            // Fallback: simple rule-based summary
            const total = (currentReport.brokenLinks?.length || 0) +
                          (currentReport.consoleErrors?.length || 0) +
                          (currentReport.uiIssues?.length || 0);
            const classification = total > 10 ? 'Critical Fixes Needed' : total > 0 ? 'Needs Attention' : 'Working Well';
            const summary = total > 10
                ? "Several significant problems were found. Your website has broken links, errors, and layout issues that need urgent attention."
                : total > 0
                ? "A few issues were detected on your website. They are not critical but should be fixed to improve user experience."
                : "Your website is looking healthy! No major issues were detected in this scan.";

            await ScanReport.findByIdAndUpdate(this.reportId, {
                aiInsights: { classification, summary, issues: [] }
            });
        }
    }
}

const runAgent = async (reportId) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("[qaAgent]: No GEMINI_API_KEY found. Skipping AI analysis.");
        return;
    }

    const report = await ScanReport.findById(reportId);
    if (!report) return;

    const agent = new QAAgent(reportId, apiKey);
    await agent.analyzeResults(report);
};

module.exports = { runAgent };
