const chatAgent = require('./services/chatAgent');

// Mock Report Data
const mockReport = {
    url: 'https://example.com',
    brokenLinks: [{ link: '404-1' }],
    consoleErrors: [{ message: 'Err 1' }, { message: 'Err 2' }, { message: 'Err 3' }],
    accessibilityIssues: new Array(9).fill({ issue: 'A11y Issue' }),
    uiIssues: [{}],
    responsiveIssues: [{}],
    networkLogs: [],
    securityIssues: []
};

async function runTests() {
    console.log('--- SENTINEL INTENT ENGINE VALDIATION ---\n');

    const tests = [
        { name: 'A11Y Keyword Test', input: 'how many A11Y errors?' },
        { name: 'Total Errors Test', input: 'how many total errors?' },
        { name: 'All Issues Test', input: 'show me all issues count' },
        { name: 'Generic Error Test', input: 'how many errors?' }
    ];

    for (const test of tests) {
        console.log(`[Test]: ${test.name}`);
        console.log(`[Input]: "${test.input}"`);
        
        // Mock history
        const history = [{ role: 'user', content: test.input }];
        
        try {
            const response = await chatAgent.analyzeReportQuestion(history, mockReport);
            console.log(`[Response]: ${response}`);
        } catch (e) {
            console.error(`[Error]: ${e.message}`);
        }
        console.log('-----------------------------------\n');
    }
}

runTests().then(() => {
    console.log('Validation Complete.');
    process.exit(0);
});
