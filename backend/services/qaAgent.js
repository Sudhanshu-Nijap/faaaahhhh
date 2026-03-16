const { GoogleGenerativeAI } = require("@google/generative-ai");
const ScanReport = require('../models/ScanReport');

/**
 * qaAgent
 * Pivoted role: An analysis engine that reasons about tool-provided scan results.
 */
class QAAgent {
    constructor(reportId, apiKey) {
        this.reportId = reportId;
        this.genAI = new GoogleGenerativeAI(apiKey);
        
        let model;
        try {
            model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        } catch (e) {
            model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        }
        this.model = model;
    }

    async analyzeResults(currentReport) {
        const prompt = `
            You are a Senior QA Lead. Review these raw technical logs from an automated scanner.
            Identify the most critical functional patterns and suggest manual verification steps.
            
            SCAN DATA:
            - Console Logs: ${JSON.stringify(currentReport.consoleErrors?.slice(0, 20))}
            - UI Issues: ${JSON.stringify(currentReport.uiIssues?.slice(0, 10))}
            - Access Issues: ${JSON.stringify(currentReport.accessibilityIssues?.slice(0, 10))}
            
            Provide a list of "Proactive QA Tasks" (human-readable) for this page.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            
            console.log(`[qaAgent]: Analysis complete for ${this.reportId}. Results truncated for brevity.`);
        } catch (e) {
            console.error("Agent analysis failed:", e);
        }
    }
}

const runAgent = async (reportId) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return;
    
    const report = await ScanReport.findById(reportId);
    if (!report) return;

    const agent = new QAAgent(reportId, apiKey);
    await agent.analyzeResults(report);
};

module.exports = { runAgent };
