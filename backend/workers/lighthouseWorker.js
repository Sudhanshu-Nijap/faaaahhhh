const { parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 1. Load Environment
dotenv.config({ path: path.join(__dirname, '../.env') });

// 2. Import Scanning Services
const ScanReport = require('../models/ScanReport');
const qaScanner = require('../services/qaScanner');

// 3. Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('[LighthouseWorker]: Connected to Tactical Database'))
    .catch(err => console.error('[LighthouseWorker]: DB Error:', err));

// 4. Main Audit Pipeline
async function runLighthouseAudit(data) {
    const { reportId, baseUrl, tests } = data;
    
    try {
        console.log(`[LighthouseWorker]: Initiating Performance Audit for ${baseUrl}`);

        const emitProgress = (percent, stage) => {
            parentPort.postMessage({ type: 'progress', percent, stage });
        };

        // Skip if Lighthouse is not requested
        if (!tests.includes('lighthouse') && !tests.includes('performance') && !tests.includes('accessibility')) {
            console.log('[LighthouseWorker]: Bypassing audit, modules not selected.');
            parentPort.postMessage({ type: 'completed' });
            process.exit(0);
        }

        emitProgress(5, 'Engaging Dedicated Lighthouse Core...');

        // Run dedicated scan for isolation
        const dedicatedData = await qaScanner.runDedicatedScan(baseUrl).catch(err => {
            console.error(`[LighthouseWorker]: Dedicated Audit FAILED: ${err.message}`);
            return null;
        });

        if (dedicatedData && dedicatedData.scores?.performance > 0) {
            await ScanReport.findByIdAndUpdate(reportId, {
                $set: { lighthouseScores: dedicatedData.scores },
                $push: { accessibilityIssues: { $each: dedicatedData.accessibilityIssues || [] } }
            });
            console.log(`[LighthouseWorker]: Audit Success for ${baseUrl}`);
        } else {
            console.warn(`[LighthouseWorker]: Audit returned NO telemetry for ${baseUrl}`);
        }

        parentPort.postMessage({ type: 'completed' });
        process.exit(0);

    } catch (error) {
        console.error('[LighthouseWorker Fatal]:', error);
        parentPort.postMessage({ type: 'failed', error: error.message });
        process.exit(1);
    }
}

// Start immediately
runLighthouseAudit(workerData);
