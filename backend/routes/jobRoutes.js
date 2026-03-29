const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const ScanReport = require('../models/ScanReport');
const { runFullScan } = require('./scanRoutes');

// ── TRIGGER a Scan via External Webhook (n8n, CI/CD, etc.) ──────────────────
router.post('/trigger', async (req, res) => {
    try {
        const { userId, url, scanType, callbackUrl } = req.body;
        if (!userId || !url) return res.status(400).json({ error: 'User ID and Target URL are required for external trigger.' });

        // Normalize scan type
        const type = scanType || 'quick';
        const tests = type === 'full' 
            ? ['console', 'network', 'lighthouse', 'accessibility', 'links', 'ui', 'forms']
            : ['console', 'network', 'ui', 'lighthouse', 'accessibility'];
        const mode = type === 'full' ? 'full' : 'specific';
        const scope = type === 'full' ? 'site' : 'single';

        // Initialize tactical report entry
        const report = new ScanReport({
            url,
            userId,
            status: 'in-progress',
            scannedModules: tests,
            mode: mode,
            callbackUrl // NEW: Store for n8n notifications
        });
        await report.save();

        // Dispatch to background worker
        runFullScan(report._id, url, 'standard', type === 'quick', tests, scope, mode).catch(e => {
            console.error(`[Webhook Trigger Failure]: ${e.message}`);
        });

        res.status(202).json({ 
            message: 'Tactical scan initiated via external trigger.',
            reportId: report._id,
            status: 'in-progress'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── GET all Jobs for a User ───────────────────────────────────────────────
router.get('/jobs', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'User ID is required' });
        const jobs = await Job.find({ userId }).sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── CREATE a new Job ──────────────────────────────────────────────────────
router.post('/jobs', async (req, res) => {
    try {
        const { userId, url, scanType, mode, date, time, dayOfWeek } = req.body;
        if (!userId || !url || !time) return res.status(400).json({ error: 'Incomplete job parameters' });

        const job = new Job({
            userId,
            url,
            scanType: scanType || 'quick',
            mode: mode || 'one-time',
            date,
            time,
            dayOfWeek: dayOfWeek || 0,
            status: 'pending',
            isActive: true
        });

        await job.save();
        res.status(201).json(job);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── UPDATE a Job (Edit / Pause / Resume) ───────────────────────────────────
router.patch('/job/:id', async (req, res) => {
    try {
        const updates = req.body;
        const job = await Job.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' });
        if (!job) return res.status(404).json({ error: 'Job not found' });
        res.json(job);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── DELETE a Job ──────────────────────────────────────────────────────────
router.delete('/job/:id', async (req, res) => {
    try {
        const job = await Job.findByIdAndDelete(req.params.id);
        if (!job) return res.status(404).json({ error: 'Job not found' });
        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
