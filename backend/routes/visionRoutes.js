const express = require('express');
const router = express.Router();
const visionService = require('../services/visionService');
const ScanReport = require('../models/ScanReport');
const path = require('path');

router.post('/compare', async (req, res) => {
    const { reportId1, reportId2 } = req.body;

    try {
        const report1 = await ScanReport.findById(reportId1);
        const report2 = await ScanReport.findById(reportId2);

        if (!report1 || !report2) {
            return res.status(404).json({ error: 'Reports not found' });
        }

        const img1 = report1.screenshots?.[0]?.path;
        const img2 = report2.screenshots?.[0]?.path;

        if (!img1 || !img2) {
            return res.status(400).json({ error: 'Screenshots missing in one or both reports' });
        }

        const img1Path = path.join(__dirname, '..', 'public', img1);
        const img2Path = path.join(__dirname, '..', 'public', img2);

        const comparison = await visionService.compareScreenshots(img1Path, img2Path);
        res.json(comparison);
    } catch (error) {
        res.status(500).json({ error: 'Comparison failed' });
    }
});

module.exports = router;
