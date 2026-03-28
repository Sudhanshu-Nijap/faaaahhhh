const chatAgent = require('../services/chatAgent');
const qaAgent = require('../services/qaAgent');
const assert = require('assert');

async function testChatAgent() {
    console.log('Testing ChatAgent...');
    const chatHistory = [
        { role: 'user', content: 'What is the performance score?', timestamp: '10:00 AM' }
    ];
    const reportData = {
        url: 'https://example.com',
        lighthouseScores: { performance: 85 }
    };
    
    // This should not throw anymore
    const result = await chatAgent.analyzeReportQuestion(chatHistory, reportData);
    console.log('ChatAgent response:', result.substring(0, 100));
}

async function testQAAgent() {
    console.log('Testing QAAgent...');
    const reportData = {
        _id: '123',
        url: 'https://example.com',
        consoleErrors: [{ message: 'Test error' }],
        networkLogs: []
    };
    
    // We can't easily test its full run without DB, but let's check the logic
    const agent = new qaAgent.runAgent.constructor('123'); // Hack to get the class if exported
    // Actually qaAgent exports { runAgent }. The class QAAgent is private.
    // But we can check if it throws ReferenceErrors in analyzeResults
    // by mocking Axios and ScanReport.
}

testChatAgent().catch(console.error);
