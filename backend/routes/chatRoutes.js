const express = require('express');
const router = express.Router();
const chatAgent = require('../services/chatAgent');
const scanRoutes = require('./scanRoutes'); // To reuse runFullScan
const ScanReport = require('../models/ScanReport');

router.post('/command', async (req, res) => {
    const { message, userId, contextUrl } = req.body;

    if (!message) return res.status(400).json({ error: 'Message is required' });
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    try {
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
            scanType: analysis.intent,
            aiInsights: {
                summary: analysis.reasoning,
                keyFindings: analysis.testCases,
                classification: `Tactical Recon: ${analysis.intent}`
            }
        });
        await report.save();

        // Trigger the scan pipeline
        // For now, we reuse runFullScan, but in a real app we'd filter scanners based on intent
        scanRoutes.runFullScan(report._id, analysis.url);

        res.json({
            response: `🎯 ${analysis.reasoning} \n\n🚀 **Initiating ${analysis.intent.replace('_', ' ')}**\n\n🔍 **Strategic Focus:**\n${analysis.testCases.map(tc => `• ${tc}`).join('\n')}`,
            reportId: report._id,
            analysis
        });

    } catch (error) {
        console.error("[ChatRoute Error]:", error.message);
        res.status(500).json({ error: "Failed to process conversational command." });
    }
});

module.exports = router;
