const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const ScanReport = require('../models/ScanReport');

router.post('/notify', async (req, res) => {
    const { reportId, type, webhookUrl } = req.body;

    try {
        const report = await ScanReport.findById(reportId);
        if (!report) return res.status(404).json({ error: 'Report not found' });

        let result;
        if (type === 'discord') {
            result = await notificationService.sendDiscordAlert(webhookUrl, report);
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Notification failed' });
    }
});

module.exports = router;
