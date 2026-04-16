const { Worker } = require('worker_threads');
const path = require('path');
require('dotenv').config(); // Load in parent

console.log('Parent URI:', process.env.MONGODB_URI ? 'Exists' : 'MISSING');

const worker = new Worker(path.join(__dirname, 'workers/scanWorker.js'), {
    workerData: { 
        reportId: 'test-id', 
        baseUrl: 'https://google.com', 
        tests: [], 
        scope: 'single' 
    }
});

worker.on('error', (err) => {
    console.error('Worker startup error:', err);
});

worker.on('message', (msg) => {
    console.log('Worker message:', msg);
});

setTimeout(() => {
    console.log('Manual termination of test.');
    process.exit(0);
}, 10000);
