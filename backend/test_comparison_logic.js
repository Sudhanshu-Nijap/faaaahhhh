const comparisonService = require('./services/comparisonService');

const mockPrevious = {
    _id: "69c7387e6fa424b416e2b007",
    healthScore: 85,
    lighthouseScores: { performance: 80, accessibility: 90, bestPractices: 85, seo: 90 },
    consoleErrors: [ { message: "Error 1", page: "https://example.com" } ],
    networkLogs: [ { url: "https://api.com/v1", status: 200 } ],
    brokenLinks: [],
    accessibilityIssues: [ { issue: "Alt text missing", page: "https://example.com" } ],
    uiIssues: [],
    formIssues: []
};

const mockCurrent = {
    _id: "69c73905fc90b0ebdb45bf78",
    healthScore: 90,
    lighthouseScores: { performance: 85, accessibility: 95, bestPractices: 90, seo: 90 },
    consoleErrors: [], // Error 1 Fixed!
    networkLogs: [ { url: "https://api.com/v1", status: 404 } ], // New Error!
    brokenLinks: [ { link: "https://dead.com", page: "https://example.com" } ], // New Error!
    accessibilityIssues: [], // Alt text fixed!
    uiIssues: [],
    formIssues: []
};

async function test() {
    console.log("--- Testing Comparison Service Logic ---");
    const delta = await comparisonService.calculateDelta(mockCurrent, mockPrevious);
    
    console.log("Delta Results:", JSON.stringify(delta, null, 2));

    const expectedScoreDelta = 5;
    const expectedNewErrors = 2; // network 404 and broken link
    const expectedFixedErrors = 3; // console error, accessibility issue, and network success 200

    if (delta.scoreDelta === expectedScoreDelta && 
        delta.stats.newErrors === expectedNewErrors && 
        delta.stats.fixedErrors === expectedFixedErrors) {
        console.log("SUCCESS: Logic verified.");
    } else {
        console.error("FAILURE: Logic mismatch.");
        console.error(`Expected: ScoreDelta 5, New 2, Fixed 3`);
        console.error(`Got: ScoreDelta ${delta.scoreDelta}, New ${delta.stats.newErrors}, Fixed ${delta.stats.fixedErrors}`);
        process.exit(1);
    }
}

test().catch(console.error);
