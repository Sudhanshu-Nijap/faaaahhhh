const express = require('express');
const router = express.Router();
const ScanReport = require('../models/ScanReport');
const crawler = require('../services/crawler');
const qaScanner = require('../services/qaScanner');
const uiAnalyzer = require('../services/uiAnalyzer');
const formTester = require('../services/formTester');
const accessibilityTester = require('../services/accessibilityTester');
const htmlValidator = require('../services/htmlValidator');
const interactionTester = require('../services/interactionTester');
const qaAgent = require('../services/qaAgent');
const aiClassifier = require('../services/aiClassifier');
const regressionTester = require('../services/regressionTester');
const securityScanner = require('../services/securityScanner');

// Start a new scan
router.post('/scan', async (req, res) => {
    const { url, userId } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    try {
        const report = new ScanReport({ url, userId, status: 'in-progress' });
        await report.save();

        // Run scan asynchronously to avoid timeout
        runFullScan(report._id, url);

        res.status(202).json({ message: 'Scan started', reportId: report._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all reports
router.get('/reports', async (req, res) => {
    try {
        const { userId } = req.query;
        const filter = userId ? { userId } : {};
        const reports = await ScanReport.find(filter).sort({ scanDate: -1 });
        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get a specific report
router.get('/report/:id', async (req, res) => {
    try {
        const report = await ScanReport.findById(req.params.id);
        if (!report) return res.status(404).json({ error: 'Report not found' });
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a specific report
router.delete('/report/:id', async (req, res) => {
    try {
        const report = await ScanReport.findByIdAndDelete(req.params.id);
        if (!report) return res.status(404).json({ error: 'Report not found' });
        res.json({ message: 'Report purged successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper to wrap promise with timeout
const withTimeout = (promise, ms, taskName) => {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${taskName} timed out after ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeout]);
};

async function runFullScan(reportId, baseUrl) {
    try {
        console.log(`--- [STARTING TARGETED QA INSPECTION: ${baseUrl}] ---`);
        
        // 1. Crawl for internal pages (Puppeteer)
        const pages = await crawler.crawlWebsite(reportId, baseUrl);
        console.log(`[Pipeline]: Discovered ${pages.length} pages: ${pages.join(', ')}`);
        
        // Update pagesCrawled
        await ScanReport.findByIdAndUpdate(reportId, { pagesCrawled: pages.length });

        // 2. Sequential Audit per page
        for (const pageUrl of pages) {
            console.log(`\n[Auditing Sector]: ${pageUrl}`);
            
            const tasks = [
                withTimeout(qaScanner.scanPage(reportId, pageUrl), 60000, 'qaScanner').catch(e => console.error(`[Pipeline Error]: ${e.message}`)),
                withTimeout(uiAnalyzer.analyzePage(reportId, pageUrl), 30000, 'uiAnalyzer').catch(e => console.error(`[Pipeline Error]: ${e.message}`)),
                withTimeout(formTester.testForms(reportId, pageUrl), 30000, 'formTester').catch(e => console.error(`[Pipeline Error]: ${e.message}`)),
                withTimeout(accessibilityTester.testAccessibility(reportId, pageUrl), 30000, 'accessibilityTester').catch(e => console.error(`[Pipeline Error]: ${e.message}`)),
                withTimeout(htmlValidator.validateHTML(reportId, pageUrl), 15000, 'htmlValidator').catch(e => console.error(`[Pipeline Error]: ${e.message}`)),
                withTimeout(regressionTester.testRegression(reportId, pageUrl), 30000, 'regressionTester').catch(e => console.error(`[Pipeline Error]: ${e.message}`)),
                withTimeout(securityScanner.testSecurity(reportId, pageUrl), 15000, 'securityScanner').catch(e => console.error(`[Pipeline Error]: ${e.message}`))
            ];

            await Promise.allSettled(tasks);
            console.log(`[Pipeline]: Per-page tasks settled for ${pageUrl}`);

            // 3. AI Analysis (Pivoted Role)
            try {
                await qaAgent.runAgent(reportId);
            } catch (agentErr) {
                console.warn(`[Pipeline Warning]: AI Agent failed: ${agentErr.message}`);
            }
        }

        // 4. Finalize
        console.log(`[Pipeline]: Running final classification...`);
        await aiClassifier.classifyBugs(reportId);
        await ScanReport.findByIdAndUpdate(reportId, { status: 'completed' });
        console.log(`--- [TARGETED INSPECTION COMPLETE: ${reportId}] ---`);
    } catch (error) {
        console.error('Pipeline Critical Failure:', error.message);
        console.error(error.stack);
        await ScanReport.findByIdAndUpdate(reportId, { status: 'failed' });
    }
}

const reportExporter = require('../services/reportExporter');

// Export Report as PDF
router.get('/report/:id/export', async (req, res) => {
    try {
        const pdfUrl = await reportExporter.generatePDF(req.params.id);
        if (!pdfUrl) return res.status(404).json({ error: "Report not found" });
        res.json({ url: pdfUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Finalize
module.exports = {
    router,
    runFullScan
};
