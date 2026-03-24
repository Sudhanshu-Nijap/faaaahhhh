const axios = require('axios');
const User = require('../models/User');

/**
 * n8nService - Automated Neural Orchestration Dispatcher
 */
class N8NService {
    async dispatch(userId, reportData) {
        try {
            const user = await User.findById(userId);
            const targetUrl = user?.n8nWebhookUrl || process.env.N8N_WEBHOOK_URL;
            
            if (!targetUrl) {
                console.log(`[n8nService]: No webhook configured for user ${userId} and no global fallback.`);
                return;
            }

            console.log(`[n8nService]: Dispatching tactical payload to ${targetUrl}`);
            
            const payload = {
                event: 'SCAN_COMPLETED',
                timestamp: new Date().toISOString(),
                reportId: reportData._id,
                url: reportData.url,
                summary: reportData.aiInsights?.summary || 'No summary generated.',
                findings: reportData.aiInsights?.keyFindings || [],
                criticalCount: reportData.aiInsights?.criticalVulnerabilities?.length || 0,
                status: reportData.status,
                fullReportUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/report/${reportData._id}`
            };

            await axios.post(user.n8nWebhookUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000
            });

            console.log(`[n8nService]: Neural dispatch successful.`);
        } catch (error) {
            console.error(`[n8nService Error]: ${error.message}`);
        }
    }
}

module.exports = new N8NService();
