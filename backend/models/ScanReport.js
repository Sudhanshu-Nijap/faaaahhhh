const mongoose = require('mongoose');

const scanReportSchema = new mongoose.Schema({
    url: { type: String, required: true },
    userId: { type: String, required: true },
    scanDate: { type: Date, default: Date.now },
    pagesCrawled: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'failed'], default: 'pending' },
    brokenLinks: [mongoose.Schema.Types.Mixed],
    consoleErrors: [mongoose.Schema.Types.Mixed],
    uiIssues: [mongoose.Schema.Types.Mixed],
    formIssues: [mongoose.Schema.Types.Mixed],
    assetIssues: [mongoose.Schema.Types.Mixed],
    networkLogs: [mongoose.Schema.Types.Mixed],
    performanceMetrics: {
        loadTime: Number,
        apiResponseTime: Number,
        requestCount: Number,
        pageSize: Number,
        slowRequests: Number
    },
    lighthouseScores: {
        performance: { type: Number, default: 0 },
        accessibility: { type: Number, default: 0 },
        bestPractices: { type: Number, default: 0 },
        seo: { type: Number, default: 0 }
    },
    responsiveIssues: [mongoose.Schema.Types.Mixed],
    accessibilityIssues: [mongoose.Schema.Types.Mixed],
    screenshots: [mongoose.Schema.Types.Mixed],
    aiInsights: {
        classification: String,
        summary: String
    }
}, { timestamps: true });

module.exports = mongoose.model('ScanReport', scanReportSchema);
