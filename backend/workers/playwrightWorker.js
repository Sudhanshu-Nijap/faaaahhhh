const { parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 1. Load Environment
dotenv.config({ path: path.join(__dirname, '../.env') });

// 2. Import Scanning Services
const ScanReport = require('../models/ScanReport');
const scanEngine = require('../services/scanEngine');

// 3. Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('[PlaywrightWorker]: Connected to Tactical Database'))
    .catch(err => console.error('[PlaywrightWorker]: DB Error:', err));

// 4. Main Diagnostic Pipeline
async function runPlaywrightDiagnostics(data) {
    const { reportId, baseUrl, tests, scope } = data;
    
    try {
        console.log(`[PlaywrightWorker]: Initiating Diagnostics for ${baseUrl}`);

        const emitProgress = (percent, stage) => {
            parentPort.postMessage({ type: 'progress', percent, stage });
        };

        // Filter tests to only include Playwright-compatible modules
        const playwrightModules = ['console', 'network', 'ui', 'links', 'forms'];
        const activeSuite = Array.isArray(tests) ? tests.filter(t => playwrightModules.includes(t)) : [];

        if (scope === 'single') {
            await scanEngine.runSinglePageScan(reportId, baseUrl, activeSuite, emitProgress);
        } else {
            await scanEngine.runTargetedCrawlScan(reportId, baseUrl, activeSuite, emitProgress);
        }

        parentPort.postMessage({ type: 'completed' });
        process.exit(0);

    } catch (error) {
        console.error('[PlaywrightWorker Fatal]:', error);
        parentPort.postMessage({ type: 'failed', error: error.message });
        process.exit(1);
    }
}

// Start immediately
runPlaywrightDiagnostics(workerData);
