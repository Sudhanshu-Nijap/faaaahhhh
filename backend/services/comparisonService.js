const mongoose = require('mongoose');

/**
 * calculateDelta - Computes the difference between two scan reports.
 * 
 * @param {Object} current - The newly completed report
 * @param {Object} previous - The last successful report for the same URL/User
 * @returns {Object} The comparison delta object
 */
async function calculateDelta(current, previous) {
    if (!previous) {
        return {
            previousReportId: null,
            scoreDelta: 0,
            stats: { newErrors: 0, fixedErrors: 0, impact: 'Stable' },
            lighthouseDelta: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 }
        };
    }

    console.log(`[ComparisonService]: Comparing current scan (${current._id}) vs previous (${previous._id})`);

    // 1. Score Deltas
    const scoreDelta = (current.healthScore || 0) - (previous.healthScore || 0);
    
    const lighthouseDelta = {
        performance: (current.lighthouseScores?.performance || 0) - (previous.lighthouseScores?.performance || 0),
        accessibility: (current.lighthouseScores?.accessibility || 0) - (previous.lighthouseScores?.accessibility || 0),
        bestPractices: (current.lighthouseScores?.bestPractices || 0) - (previous.lighthouseScores?.bestPractices || 0),
        seo: (current.lighthouseScores?.seo || 0) - (previous.lighthouseScores?.seo || 0)
    };

    // 2. Error Differential (Signature Matching)
    const currentSignatures = extractSignatures(current);
    const previousSignatures = extractSignatures(previous);

    const newErrors = currentSignatures.filter(sig => !previousSignatures.includes(sig)).length;
    const fixedErrors = previousSignatures.filter(sig => !currentSignatures.includes(sig)).length;

    // 3. Impact Assessment
    let impact = 'Stable';
    if (scoreDelta > 5 || (fixedErrors > newErrors + 5)) impact = 'Improved';
    if (scoreDelta < -5 || (newErrors > fixedErrors + 5)) impact = 'Regressed';

    return {
        previousReportId: previous._id,
        scoreDelta,
        stats: { newErrors, fixedErrors, impact },
        lighthouseDelta
    };
}

/**
 * extractSignatures - Generates unique strings for all issues to allow matching.
 */
function extractSignatures(report) {
    const signatures = [];

    // Console Errors: message + page
    if (report.consoleErrors) {
        report.consoleErrors.forEach(err => {
            if (err.message && err.page) signatures.push(`console:${err.message}:${err.page}`);
        });
    }

    // Network Logs: url + status
    if (report.networkLogs) {
        report.networkLogs.forEach(log => {
            if (log.url && log.status) signatures.push(`network:${log.url}:${log.status}`);
        });
    }

    // Broken Links: link + page
    if (report.brokenLinks) {
        report.brokenLinks.forEach(link => {
            if (link.link && link.page) signatures.push(`link:${link.link}:${link.page}`);
        });
    }

    // Accessibility Issues: issue + page
    if (report.accessibilityIssues) {
        report.accessibilityIssues.forEach(isu => {
            if (isu.issue && isu.page) signatures.push(`access:${isu.issue}:${isu.page}`);
        });
    }

    // UI Issues: type + issue + page
    if (report.uiIssues) {
        report.uiIssues.forEach(isu => {
            if (isu.type && isu.issue && isu.page) signatures.push(`ui:${isu.type}:${isu.issue}:${isu.page}`);
        });
    }
    
    // Form Issues: id + page
    if (report.formIssues) {
        report.formIssues.forEach(isu => {
           if (isu.id && isu.page) signatures.push(`form:${isu.id}:${isu.page}`);
        });
    }

    return signatures;
}

module.exports = { calculateDelta };
