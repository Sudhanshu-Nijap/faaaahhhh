const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ScanReport = require('../models/ScanReport');
const reportExporter = require('./reportExporter');
const { Blob } = require('buffer');

/**
 * 🛰️ Dedicated Discord Dispatch Service
 * Handles automated report broadcasting to the global tactical network.
 */

const dispatchReport = async (reportId) => {
    try {
        const report = await ScanReport.findById(reportId);
        if (!report) throw new Error('Report not found');
        
        const targetWebhook = process.env.DISCORD_WEBHOOK_URL;
        if (!targetWebhook) {
            console.warn('[DiscordService]: No webhook URL configurared. Pulse skipped.');
            return;
        }

        // 1. Generate/Locate PDF Snapshot
        console.log(`[DiscordService]: Syncing PDF for ${reportId}...`);
        const pdfUrl = await reportExporter.generatePDF(reportId);
        const pdfPath = path.join(__dirname, '..', pdfUrl);

        if (!fs.existsSync(pdfPath)) {
            throw new Error('PDF Snapshot missing from registry.');
        }

        const hostname = new URL(report.url).hostname;

        // 2. Prepare Detailed Embed
        const embed = {
            title: `🛡️ Sentinel AI Dispatch: ${hostname}`,
            url: `http://localhost:5173/report/${report._id}`,
            description: `Neural analysis complete for **${report.url}**`,
            color: report.healthScore >= 80 ? 0x22c55e : report.healthScore >= 50 ? 0xf97316 : 0xdc2626,
            fields: [
                { name: '❤️ Health Score', value: `${report.healthScore || 'N/A'}%`, inline: true },
                { name: '📄 Nodes Scanned', value: `${report.pagesCrawled || 1}`, inline: true },
                { name: '🚨 Anomalies', value: `${(report.brokenLinks?.length || 0) + (report.consoleErrors?.length || 0)} detected`, inline: true }
            ],
            footer: { text: 'Sentinel Pulse Pipeline - Automated Security Audit' },
            timestamp: new Date()
        };

        // If comparison exists, add it to embed
        if (report.comparison && report.comparison.scoreDelta !== undefined) {
            const deltaSign = report.comparison.scoreDelta >= 0 ? '+' : '';
            embed.fields.push({ 
                name: '📈 Score Delta', 
                value: `**${deltaSign}${report.comparison.scoreDelta}%** (since last run)`, 
                inline: false 
            });
        }

        // 3. Dispatch Multipart Payload via Native Fetch (Node v22+)
        const formData = new FormData();
        formData.append('payload_json', JSON.stringify({
            content: `⚡ **Dispatch Received:** Tactical report for **${hostname}** ready for review.`,
            embeds: [embed]
        }));
        
        const pdfBuffer = fs.readFileSync(pdfPath);
        formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), `Sentinel-Report-${hostname}.pdf`);

        console.log(`[DiscordService]: Pushing telemetry to Discord...`);
        const response = await fetch(targetWebhook, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Discord Uplink Failed: ${response.status} - ${errBody}`);
        }

        console.log(`✅ [DiscordService]: Pulse broadcast successful for ${hostname}`);
        return true;
    } catch (error) {
        console.error(`[DiscordService Error]: ${error.message}`);
        return false;
    }
};

module.exports = { dispatchReport };
