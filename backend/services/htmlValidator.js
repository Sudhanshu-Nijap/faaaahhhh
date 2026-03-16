const validator = require('html-validator');
const ScanReport = require('../models/ScanReport');

/**
 * validateHTML
 * Checks page for W3C compliance issues.
 */
const validateHTML = async (reportId, url) => {
    try {
        const options = {
            url: url,
            format: 'json'
        };

        const result = await validator(options);
        
        // Map W3C messages to UI-friendly issues
        // Since ScanReport doesn't have a specific htmlIssues field, 
        // we'll push them into accessibilityIssues or a new field if we want to extend the model.
        // For now, let's push them as accessibility/UI issues with a specific tag.
        
        const issues = result.messages
            .filter(m => m.type === 'error')
            .slice(0, 10) // Limit to top 10 errors
            .map(m => ({
                page: url,
                issue: `HTML standard violation: ${m.message}`,
                severity: "warning",
                element: m.extract || "HTML Source",
                recommendation: "Clean up nested elements and ensure tags are closed correctly according to W3C standards."
            }));

        if (issues.length > 0) {
            await ScanReport.findByIdAndUpdate(reportId, {
                $push: { accessibilityIssues: { $each: issues } }
            });
        }
    } catch (error) {
        console.error(`HTML Validation failed on ${url}:`, error);
    }
};

module.exports = { validateHTML };
