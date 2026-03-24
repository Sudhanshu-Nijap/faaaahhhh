const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const ScanReport = require('../models/ScanReport');
const crawler = require('../services/crawler');
const qaScanner = require('../services/qaScanner');
const qaAgent = require('../services/qaAgent');
const securityScanner = require('../services/securityScanner');
const apiTester = require('../services/apiTester');
const flowTester = require('../services/flowTester');
const chaosAgent = require('../services/chaosAgent');
const smartFormAgent = require('../services/smartFormAgent');
const reportExporter = require('../services/reportExporter');

// ── Start a new scan ──────────────────────────────────────────────────────────
router.post('/scan', async (req, res) => {
    const { url, userId } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const urlPattern = /^(https?:\/\/)/i;
    if (!urlPattern.test(url))
        return res.status(400).json({ error: 'Protocol (http/https) is required.' });

    try { new URL(url); }
    catch (e) { return res.status(400).json({ error: 'Invalid URL format.' }); }

    try {
        const report = new ScanReport({ url, userId, status: 'in-progress' });
        await report.save();

        // Run scan fully async — returns reportId immediately to the client
        runFullScan(report._id, url);

        res.status(202).json({ message: 'Scan started', reportId: report._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Get all reports ───────────────────────────────────────────────────────────
router.get('/reports', async (req, res) => {
    try {
        const { userId } = req.query;
        const filter = userId ? { userId } : {};
        const reports = await ScanReport.find(filter).sort({ isPinned: -1, scanDate: -1 });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Get a specific report ─────────────────────────────────────────────────────
router.get('/report/:id', async (req, res) => {
    try {
        const report = await ScanReport.findById(req.params.id);
        if (!report) return res.status(404).json({ error: 'Report not found' });
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/report/:id/pin', async (req, res) => {
    try {
        const report = await ScanReport.findById(req.params.id);
        if (!report) return res.status(404).json({ error: 'Report not found' });
        
        report.isPinned = !report.isPinned;
        await report.save({ validateBeforeSave: false }); // Bypass validation for tactical updates
        
        res.json(report);
    } catch (error) {
        console.error("Pin toggle error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ── Share Report ─────────────────────────────────────────────────────────────
router.patch('/report/:id/share', async (req, res) => {
    try {
        const report = await ScanReport.findById(req.params.id);
        if (!report) return res.status(404).json({ error: 'Report not found' });
        report.isShared = true;
        await report.save();
        res.json({ message: 'Share link activated', url: `http://localhost:5173/report/${report._id}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Rename Report ────────────────────────────────────────────────────────────
router.patch('/report/:id/rename', async (req, res) => {
    try {
        const { name } = req.body;
        const report = await ScanReport.findByIdAndUpdate(req.params.id, { customName: name }, { new: true });
        if (!report) return res.status(404).json({ error: 'Report not found' });
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Archive / Unarchive Report ───────────────────────────────────────────────
router.patch('/report/:id/archive', async (req, res) => {
    try {
        const report = await ScanReport.findById(req.params.id);
        if (!report) return res.status(404).json({ error: 'Report not found' });
        report.isArchived = !report.isArchived;
        await report.save();
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Delete a specific report ──────────────────────────────────────────────────
router.delete('/report/:id', async (req, res) => {
    try {
        const report = await ScanReport.findByIdAndDelete(req.params.id);
        if (!report) return res.status(404).json({ error: 'Report not found' });
        res.json({ message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Export PDF ────────────────────────────────────────────────────────────────
router.get('/report/:id/export', async (req, res) => {
    try {
        const pdfUrl = await reportExporter.generatePDF(req.params.id);
        if (!pdfUrl) return res.status(404).json({ error: 'Report not found' });
        res.json({ url: pdfUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Helper: wrap promise with timeout ────────────────────────────────────────
const withTimeout = (promise, ms, taskName) => {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${taskName} timed out after ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeout]);
};

// ── Core Scan Pipeline ───────────────────────────────────────────────────────
/**
 * FLOW:
 * 1. Crawl → discover all internal pages
 * 2. For each page: run all diagnostic scanners IN PARALLEL
 * 3. After ALL pages are scanned → run AI analysis ONCE on complete data
 * 4. Mark report as completed
 */
async function runFullScan(reportId, baseUrl) {
    try {
        console.log(`\n╔══════════════════════════════════════════════╗`);
        console.log(`║  SENTINEL SCAN STARTED: ${baseUrl}`);
        console.log(`╚══════════════════════════════════════════════╝\n`);

        // ── STEP 1: Crawl ────────────────────────────────────────────────────
        const pages = await crawler.crawlWebsite(reportId, baseUrl);
        console.log(`[Pipeline]: Discovered ${pages.length} page(s): ${pages.join(', ')}`);
        await ScanReport.findByIdAndUpdate(reportId, { pagesCrawled: pages.length });

        // ── STEP 2: Scan each page ───────────────────────────────────────────
        for (const pageUrl of pages) {
            console.log(`\n[Scanning]: ${pageUrl}`);

            const tasks = [
                withTimeout(qaScanner.scanPage(reportId, pageUrl),         120000, 'qaScanner'),
                withTimeout(securityScanner.testSecurity(reportId, pageUrl), 30000, 'securityScanner'),
                withTimeout(apiTester.testAPI(reportId, pageUrl),           60000, 'apiTester'),
                withTimeout(flowTester.testFlows(reportId, pageUrl),        90000, 'flowTester'),
                withTimeout(chaosAgent.runChaos(reportId, pageUrl),         90000, 'chaosAgent'),
                withTimeout(smartFormAgent.runTest(reportId, pageUrl),      90000, 'smartFormAgent'),
            ].map(p => p.catch(e => console.warn(`[Scanner Warning]: ${e.message}`)));

            await Promise.allSettled(tasks);
            console.log(`[Pipeline]: All scanners settled for ${pageUrl}`);
        }

        // ── STEP 3: AI Analysis (runs ONCE after ALL pages are done) ─────────
        // This ensures the AI sees the complete picture, not just one page.
        console.log(`\n[AI Analysis]: Running on complete scan data...`);
        try {
            await qaAgent.runAgent(reportId);
            console.log(`[AI Analysis]: Done ✓`);
        } catch (agentErr) {
            console.warn(`[AI Analysis Warning]: ${agentErr.message}`);
        }

        // ── STEP 4: Mark complete ────────────────────────────────────────────
        const finalReport = await ScanReport.findByIdAndUpdate(reportId, { status: 'completed' }, { new: true });

        // ── STEP 5: Neural Orchestration (n8n Webhook) ───────────────────────
        const n8nService = require('../services/n8nService');
        await n8nService.dispatch(finalReport.userId, finalReport);

        // ── STEP 6: Direct Tactical Alerts (Slack/Discord) ───────────────────
        const User = require('../models/User');
        const user = await User.findById(finalReport.userId);
        const notificationService = require('../services/notificationService');

        // Discord Dispatch (User Custom -> Global Fallback)
        const discordTarget = user?.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL;
        if (discordTarget) await notificationService.sendDiscordAlert(discordTarget, finalReport);

        console.log(`\n╔══════════════════════════════════════════════╗`);
        console.log(`║  SCAN COMPLETE: ${reportId}`);
        console.log(`╚══════════════════════════════════════════════╝\n`);

    } catch (error) {
        console.error('[Pipeline Critical Failure]:', error.message);
        await ScanReport.findByIdAndUpdate(reportId, { status: 'failed' });
    }
}

module.exports = { router, runFullScan };
