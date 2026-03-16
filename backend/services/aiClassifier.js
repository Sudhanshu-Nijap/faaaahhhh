const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * AI Classifier Upgrade:
 * Uses Google Gemini to perform high-level reasoning over scan results.
 * Falls back to rule-based logic if API key is missing.
 */
const classifyBugs = async (report) => {
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Fallback Logic (if no API key)
    const runFallback = () => {
        let summary = "";
        let classification = "Stable (Rule-based)";
        const issueCount = (report.brokenLinks?.length || 0) + (report.formIssues?.length || 0) + (report.uiIssues?.length || 0);

        if (issueCount > 10) {
            classification = "Critical Stability Issues";
            summary = "The infrastructure has accumulated a high density of defects. Immediate manual audit recommended.";
        } else if (issueCount > 0) {
            classification = "Operational Anomalies Detected";
            summary = "Minor functional and UI discrepancies found. Review the logs for specific fix guides.";
        } else {
            classification = "System Healthy";
            summary = "No significant defects detected in the current audit sector.";
        }
        return { classification, summary };
    };

    if (!apiKey) {
        console.warn("GEMINI_API_KEY missing. Running in simulated (rule-based) mode.");
        return runFallback();
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            You are a helpful Tech-to-English Translator and QA Expert.
            Your job is to read this technical audit report and summarize it for a NON-TECHNICAL project manager or business owner.
            Explain what is wrong in plain English. Tell them WHY it matters, and tell them exactly what to tell their developers to fix.
            Keep the tone professional but highly accessible. Avoid deep technical jargon where possible.

            REPORT DATA:
            - URL: ${report.url}
            - Broken Links: ${report.brokenLinks?.length || 0}
            - Console Errors: ${report.consoleErrors?.length || 0}
            - UI Layout Issues (Overlaps/Hidden Items): ${report.uiIssues?.length || 0}
            - Form Failures: ${report.formIssues?.length || 0}
            - Accessibility (WCAG) Issues: ${report.accessibilityIssues?.length || 0}
            - Avg Latency: ${report.performanceMetrics?.loadTime || 0}ms

            Provide JSON response in this format:
            {
                "classification": "One-word or short phrase category (e.g., 'Needs Attention', 'Working Well', 'Critical Fixes Needed')",
                "summary": "Plain-English executive summary. Explain the main issues found (if any), why they impact the user experience or business, and what the developers need to focus on first. Max 4 sentences."
            }
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Clean JSON from response if AI adds markdown
        const cleanJson = responseText.substring(
            responseText.indexOf("{"),
            responseText.lastIndexOf("}") + 1
        );
        
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Gemini AI Analysis failed:", error);
        return runFallback();
    }
};

module.exports = { classifyBugs };
