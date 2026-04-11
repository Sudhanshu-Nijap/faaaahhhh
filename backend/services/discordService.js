const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ScanReport = require('../models/ScanReport');
const reportExporter = require('./reportExporter');
const FormData = require('form-data');

/**
 * 🛰️ Dedicated Discord Dispatch Service
 * Handles automated report broadcasting to the global tactical network.
 */

const dispatchReport = async (reportId) => {
    try {
        const idString = reportId.toString();
        const report = await ScanReport.findById(idString);
        if (!report) throw new Error('Report not found');
        
        const targetWebhook = process.env.DISCORD_WEBHOOK_URL;
        if (!targetWebhook) {
            console.warn('[DiscordService]: No webhook URL configured. Pulse skipped.');
            return;
        }

        // 1. Generate/Locate PDF Snapshot
        console.log(`[DiscordService]: Syncing PDF for ${idString}...`);
        const pdfUrl = await reportExporter.generatePDF(idString);
        
        // pdfUrl is typically /reports/report-ID.pdf
        const pdfFilename = path.basename(pdfUrl);
        const pdfPath = path.join(__dirname, '..', 'reports', pdfFilename);

        if (!fs.existsSync(pdfPath)) {
            console.error(`[DiscordService]: PDF not found at ${pdfPath}`);
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
                { name: '❤️ Health Score', value: `${report.healthScore || '0'}%`, inline: true },
                { name: '📄 Nodes Scanned', value: `${report.pagesCrawled || 1}`, inline: true },
                { name: '🚨 Anomalies', value: `${(report.brokenLinks?.length || 0) + (report.consoleErrors?.length || 0)} detected`, inline: true }
            ],
            footer: { text: 'Sentinel Pulse Pipeline - Automated Security Audit' },
            timestamp: new Date()
        };

        if (report.comparison && report.comparison.scoreDelta !== undefined) {
            const deltaSign = report.comparison.scoreDelta >= 0 ? '+' : '';
            embed.fields.push({ 
                name: '📈 Score Delta', 
                value: `**${deltaSign}${report.comparison.scoreDelta}%** (since last run)`, 
                inline: false 
            });
        }

        // 3. Dispatch via Axios + form-data (Gold Standard for Node Attachments)
        const form = new FormData();
        form.append('payload_json', JSON.stringify({
            content: `⚡ **Dispatch Received:** Tactical report for **${hostname}** ready for review.`,
            embeds: [embed]
        }));
        
        form.append('file', fs.createReadStream(pdfPath), {
            filename: `Sentinel-Report-${hostname}.pdf`,
            contentType: 'application/pdf',
        });

        console.log(`[DiscordService]: Uploading attachment to Discord...`);
        const response = await axios.post(targetWebhook, form, {
            headers: form.getHeaders(),
        });

        if (response.status !== 200 && response.status !== 204) {
            throw new Error(`Discord Uplink Failed: ${response.status} - ${response.statusText}`);
        }

        console.log(`✅ [DiscordService]: Pulse broadcast successful for ${hostname}`);
        return true;
    } catch (error) {
        const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        console.error(`[DiscordService Error]: ${errorMsg}`);
        return false;
    }
};

module.exports = { dispatchReport };
