const express = require('express');
const router = express.Router();
const chatAgent = require('../services/chatAgent');
const scanRoutes = require('./scanRoutes'); // To reuse runFullScan
const ScanReport = require('../models/ScanReport');

// NEW: Conversational Q&A route with Memory
router.post('/', async (req, res) => {
    const { message, reportId } = req.body;
    if (!message || !reportId) {
        return res.status(400).json({ error: "Message and reportId required" });
    }

    try {
        const report = await ScanReport.findById(reportId);
        if (!report) {
            return res.status(404).json({ error: "Report not found" });
        }

        // 1. Save user message to history
        const userMsg = {
            role: 'user',
            content: message,
            timestamp: new Date().toLocaleTimeString()
        };
        report.chatHistory.push(userMsg);
        
        // 2. Pass the entire updated history (sliding window) to the agent
        const slidingWindow = report.chatHistory.slice(-6);
        const answer = await chatAgent.analyzeReportQuestion(slidingWindow, report);

        // 3. Save AI reply to history
        const aiMsg = {
            role: 'ai',
            content: answer,
            timestamp: new Date().toLocaleTimeString()
        };
        report.chatHistory.push(aiMsg);
        await report.save();

        res.json({ reply: answer });
    } catch (error) {
        console.error("[Chat API Error]:", error.message);
        res.status(500).json({ error: "Failed to process chat message." });
    }
});

router.post('/command', async (req, res) => {
    const { message, userId, contextUrl, reportId } = req.body;

    if (!message) return res.status(400).json({ error: 'Message is required' });
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    try {
        // Priority 1: Check for explicit RE-SCAN / RE-TEST intent
        if (message.toUpperCase().includes('RE-SCAN') || message.toUpperCase().includes('RE-TEST')) {
            const urlToScan = contextUrl || (reportId ? (await ScanReport.findById(reportId))?.url : null);
            if (urlToScan) {
                const report = new ScanReport({ url: urlToScan, userId, status: 'in-progress' });
                await report.save();
                scanRoutes.runFullScan(report._id, urlToScan);
                return res.json({
                    response: `RE-TEST INITIATED\n\nTarget: ${urlToScan}\nBypassing cache for fresh diagnostic signatures.`,
                    reportId: report._id,
                    analysis: { intent: 'RE_SCAN', url: urlToScan }
                });
            }
        }

        // Default intent-based parsing for NEW scans
        const analysis = await chatAgent.parseCommand(message, contextUrl);

        if (analysis.needsMoreInfo || !analysis.url) {
            return res.json({
                response: analysis.followUpQuestion || analysis.reasoning,
                analysis
            });
        }

        // If intent is valid and URL is present, trigger the scan
        const report = new ScanReport({
            url: analysis.url,
            userId,
            status: 'in-progress',
            aiInsights: {
                summary: analysis.reasoning,
                keyFindings: analysis.testCases,
                classification: `Tactical Recon: ${analysis.intent}`
            }
        });
        await report.save();

        // Trigger the scan pipeline
        scanRoutes.runFullScan(report._id, analysis.url);

        res.json({
            response: `SCAN INITIATED\n\nTarget: ${analysis.url}\nMode: ${analysis.intent.replace(/_/g, ' ')}\nReasoning: ${analysis.reasoning}\n\nFocus Areas:\n${analysis.testCases.map(tc => `— ${tc}`).join('\n')}`,
            reportId: report._id,
            analysis
        });

    } catch (error) {
        console.error("[ChatRoute Error]:", error.message);
        res.status(500).json({ error: "Failed to process conversational command." });
    }
});

module.exports = router;
