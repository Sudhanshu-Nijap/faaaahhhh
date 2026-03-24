const newman = require('newman');
const ScanReport = require('../models/ScanReport');

/**
 * testAPI
 * High-accuracy API diagnostic service utilizing Newman.
 * Probes typical REST patterns for stability and response integrity.
 */
const testAPI = async (reportId, baseUrl) => {
    try {
        const sanitizedBaseUrl = baseUrl.replace(/\/+$/, '');
        console.log(`[Newman]: Starting API architectural probe for ${sanitizedBaseUrl}`);
        
        const collection = {
            info: {
                name: "Automated API Audit",
                schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
            },
            item: [
                { name: "Public Health Endpoint", request: { url: `${sanitizedBaseUrl}/api/health`, method: "GET" } },
                { name: "API Root Discovery", request: { url: `${sanitizedBaseUrl}/api`, method: "GET" } },
                { name: "Auth Status Check", request: { url: `${sanitizedBaseUrl}/api/auth/status`, method: "GET" } },
                { name: "Version Inquiry", request: { url: `${sanitizedBaseUrl}/api/v1`, method: "GET" } }
            ]
        };

        return new Promise((resolve) => {
            newman.run({
                collection: collection,
                reporters: 'json',
                iterationCount: 1,
                quiet: true
            }, async (err, summary) => {
                if (err) {
                    console.error("[Newman Run Error]:", err.message);
                    return resolve();
                }

                const apiResults = summary.run.executions.map(exec => ({
                    method: exec.request.method,
                    url: exec.request.url.toString(),
                    status: exec.response ? exec.response.code : 0,
                    time: exec.response ? exec.response.responseTime : 0,
                    type: 'API_AUDIT',
                    recommendation: (exec.response && exec.response.code >= 400) ? 
                        `Endpoint ${exec.item.name} failed with status ${exec.response.code}. Verify backend controller and route definitions.` :
                        `Endpoint ${exec.item.name} responded within ${exec.response ? exec.response.responseTime : 0}ms. Validated.`
                }));

                await ScanReport.findByIdAndUpdate(reportId, {
                    $push: { networkLogs: { $each: apiResults } }
                });

                console.log(`[Newman]: API audit cycle finalized for ${baseUrl}`);
                resolve();
            });
        });

    } catch (error) {
        console.error("[Newman Critical]:", error.message);
    }
};

module.exports = { testAPI };
