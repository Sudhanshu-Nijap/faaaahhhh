const mongoose = require('mongoose');

const scanReportSchema = new mongoose.Schema({
    url: { type: String, required: true },
    userId: { type: String, required: true },
    scanDate: { type: Date, default: Date.now },
    pagesCrawled: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'failed'], default: 'pending' },
    brokenLinks: [{
        page: String,
        link: String,
        status: Number,
        recommendation: String,
        suggestedFix: String
    }],
    consoleErrors: [{
        page: String,
        message: String,
        type: String,
        location: String,
        recommendation: String,
        suggestedFix: String
    }],
    uiIssues: [{
        page: String,
        issue: String,
        details: String,
        recommendation: String,
        suggestedFix: String
    }],
    chaosSubmissions: [{
        page: String,
        formSelector: String,
        payload: String,
        outcome: String, // 'Impact Detected', 'System Resilience', 'Error 500'
        details: String,
        riskLevel: String // 'Critical', 'Moderate', 'Secure'
    }],
    smartFormTests: [{
        page: String,
        formName: String,
        testType: String, // 'Empty', 'Invalid', 'Valid'
        status: String, // 'Blocked', 'Accepted', 'Flagged'
        details: String,
        screenshot: String,
        confidence: String // 'High', 'Medium', 'Low'
    }],
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
    responsiveIssues: [{
        page: String,
        device: String,
        issue: String,
        selector: String,
        recommendation: String,
        suggestedFix: String
    }],
    accessibilityIssues: [{
        page: String,
        issue: String,
        severity: String,
        element: String,
        recommendation: String,
        suggestedFix: String
    }],
    screenshots: [mongoose.Schema.Types.Mixed],
    aiInsights: {
        classification: String,
        summary: String,
        issues: [{
            title: String,
            whatThisMeans: String,
            whyItMatters: String,
            howToFix: {
                beginner: String,
                developer: String
            },
            remediationCode: String, // NEW: Full copy-pasteable code fix
            autoFix: String,
            severity: String,
            timeToFix: String,
            example: String
        }],
        keyFindings: [String],
        criticalVulnerabilities: [String]
    },
    liveEvents: [{ // NEW: For Cyber-Range Live Fuzzing
        timestamp: { type: Date, default: Date.now },
        type: String, // 'INFO', 'ATTACK', 'IMPACT', 'SUCCESS'
        message: String,
        source: String // 'ChaosAgent', 'SmartForm', etc.
    }],
    isPinned: { type: Boolean, default: false },
    isShared: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    customName: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ScanReport', scanReportSchema);
