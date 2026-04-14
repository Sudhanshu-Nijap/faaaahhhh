const Groq = require('groq-sdk');
const ScanReport = require('../models/ScanReport');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../groq_errors.log');

// Helper: wrap promise with timeout
const withTimeout = (promise, ms, taskName) => {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${taskName} timed out after ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeout]);
};

class QAAgent {
    constructor(reportId) {
        this.reportId = reportId;
        const apiKey = process.env.GROQ_QA_API_KEY || process.env.GROQ_API_KEY;
        this.groq = new Groq({ apiKey });
        this.modelName = process.env.GROQ_QA_MODEL || 'llama-3.3-70b-versatile';
    }

    async analyzeResults(currentReport, previousReport = null) {
        let comparisonNotice = "";
        if (previousReport) {
            comparisonNotice = `
            BASELINE COMPARISON (AGAINST PREVIOUS SCAN):
            - Previous Health Score: ${previousReport.healthScore || 0}
            - Previous Broken Links: ${previousReport.brokenLinks?.length || 0}
            - Previous Console Errors: ${previousReport.consoleErrors?.length || 0}
            - Previous Lighthouse Performance: ${previousReport.lighthouseScores?.performance || 0}
            
            Compare the current numbers with these baseline metrics. Highlight if things got better or worse in the summary.
            `;
        }

        const prompt = `
            Analyze website diagnostic data for: ${currentReport.url}
            ${comparisonNotice}
            
            AUDIT DATA (PRUNED FOR STABILITY):
            - CONSOLE ERRORS: ${JSON.stringify((currentReport.consoleErrors || []).slice(0, 25))}
            - NETWORK FAILURES: ${JSON.stringify((currentReport.networkLogs || []).slice(0, 25))}
            - LIGHTHOUSE SCORES: ${JSON.stringify(currentReport.lighthouseScores || {})}
            - ACCESSIBILITY ISSUES: ${JSON.stringify((currentReport.accessibilityIssues || []).slice(0, 25))}
            - FORM DIAGNOSTICS: ${JSON.stringify((currentReport.formIssues || []).slice(0, 25))}
            
            TASK: 
            Provide a technical classification (e.g., PERFORMANCE_CRITICAL, ACCESSIBILITY_FAILED, HYGIENE_STABLE).
            
            IMPORTANT: Generate a concise high-level summary. 
            If baseline data was provided above, you MUST explicitly mention the comparison in the summary (e.g., "Health improved by X points" or "Regressed since last scan due to Y new errors").
            
            List the top 3 most urgent issues.
            
            OUTPUT FORMAT (STRICT JSON ONLY):
            {
              "classification": "STATUS",
              "summary": "1-2 sentence executive overview with comparison highlights",
              "issues": [
                { 
                  "title": "Short UI friendly title",
                  "issue": "What is the problem?",
                  "reason": "Why did it happen?",
                  "fix": ["Step 1", "Step 2"],
                  "severity": "Critical|High|Medium|Low",
                  "source": "llm"
                }
              ]
            }
        `;

        try {
            const result = await withTimeout(
                this.groq.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: this.modelName,
                    temperature: 0.2,
                    response_format: { type: "json_object" }
                }),
                15000,
                'Groq Analysis'
            );
            
            const parsed = JSON.parse(result.choices[0].message.content);
            return {
                classification: parsed.classification || 'ANALYSIS COMPLETE',
                summary: parsed.summary || 'Strategic audit complete.',
                issues: (parsed.issues || []).slice(0, 5)
            };
        } catch (e) {
            console.warn(`[qaAgent]: Neural analysis pulse failed (${e.message}). Triggering local high-fidelity synthesis...`);
            
            // --- Local High-Fidelity Synthesis (Failover) ---
            const localIssues = [];
            if (currentReport.lighthouseScores?.performance < 50) {
                localIssues.push({
                    title: "Critical Performance Bottleneck",
                    issue: "Homepage load speed is significantly below baseline.",
                    reason: "Heavy script execution or unoptimized assets detected.",
                    fix: ["Analyze main thread activity", "Implement aggressive asset compression"],
                    severity: "High",
                    source: "local"
                });
            }
            if ((currentReport.consoleErrors || []).length > 0) {
                localIssues.push({
                    title: "Runtime Exceptions Detected",
                    issue: `${currentReport.consoleErrors.length} JavaScript errors captured in console.`,
                    reason: "Client-side code crashes or missing dependencies.",
                    fix: ["Review console logs in the Console tab", "Fix target script exceptions"],
                    severity: "Critical",
                    source: "local"
                });
            }
            if ((currentReport.accessibilityIssues || []).length > 0) {
                localIssues.push({
                    title: "ADA Compliance Non-Conformity",
                    issue: "Structural accessibility violations detected.",
                    reason: "Missing ARIA attributes or semantic HTML violations.",
                    fix: ["Review specific failures in Accessibility tab", "Apply recommended ARIA patches"],
                    severity: "Medium",
                    source: "local"
                });
            }

            return {
                classification: 'LOCAL_SYNTHESIS',
                summary: 'AI analysis timed out. Displaying local diagnostic summary based on raw telemetry.',
                issues: localIssues
            };

            const entry = `${new Date().toISOString()} - qaAgent - ${e.message}\n`;
            fs.appendFileSync(LOG_FILE, entry);
        }
    }
}

const runAgent = async (reportId, prevReportId = null, currentReport = null, previousReport = null) => {
    const report = currentReport || await ScanReport.findById(reportId);
    if (!report) return null;
    
    const prev = previousReport || (prevReportId ? await ScanReport.findById(prevReportId) : null);

    const agent = new QAAgent(reportId);
    return await agent.analyzeResults(report, prev);
};

module.exports = { runAgent };
