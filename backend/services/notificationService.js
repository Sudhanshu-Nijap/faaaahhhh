const axios = require('axios');

class NotificationService {
    async sendDiscordAlert(webhookUrl, report) {
        if (!webhookUrl) return;

        const embed = {
            title: "🚨 Sentinel AI: Security & QA Breach Detected",
            color: 15158332, // Red
            fields: [
                { name: "Target", value: report.url, inline: false },
                { name: "Status", value: report.aiInsights?.classification || 'N/A', inline: true },
                { name: "Health Score", value: "Flagged", inline: true }
            ],
            description: report.aiInsights?.summary?.substring(0, 2048) || "Full diagnostic report available in dashboard.",
            footer: { text: `Report ID: ${report._id}` },
            timestamp: new Date()
        };

        try {
            await axios.post(webhookUrl, { embeds: [embed] });
            return { success: true };
        } catch (error) {
            console.error("Discord notification failed:", error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new NotificationService();
