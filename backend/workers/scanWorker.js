const { parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 1. Load Environment
dotenv.config({ path: path.join(__dirname, '../.env') });

// 2. Import Scanning Services
const ScanReport = require('../models/ScanReport');
const crawler = require('../services/crawler');
const qaScanner = require('../services/qaScanner');
const qaAgent = require('../services/qaAgent');
const scanEngine = require('../services/scanEngine');

// 3. Connect to MongoDB (Worker has its own connection)
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('[Worker]: Connected to Tactical Database'))
    .catch(err => console.error('[Worker]: DB Error:', err));

// 4. Utility: Calculate Health
const calculateReportHealth = (report) => {
    if (!report) return 0;
    const weights = { network: 0.5, links: 10, console: 2, ui: 5, accessibility: 15 };
    const counts = {
        network: report.networkLogs?.length || 0,
        links: report.brokenLinks?.length || 0,
        console: report.consoleErrors?.length || 0,
        ui: (report.uiIssues?.length || 0) + (report.responsiveIssues?.length || 0),
        accessibility: report.accessibilityIssues?.length || 0
    };
    const deductions = Object.keys(weights).reduce((acc, key) => acc + (counts[key] * weights[key]), 0);
    return Math.max(0, Math.round(100 - deductions));
};

// 5. Orchestration Pipeline
async function runMasterOrchestrator(data) {
    const { reportId, baseUrl, tests, scope } = data;
    const { Worker } = require('worker_threads');
    const path = require('path');

    try {
        console.log(`[MasterWorker]: Orchestrating scan for ${baseUrl}`);

        const emitProgress = (percent, stage) => {
            parentPort.postMessage({ type: 'progress', percent, stage });
        };

        // --- STAGE 1: Playwright Diagnostics ---
        emitProgress(5, 'Initializing Playwright Diagnostic Layer...');
        await new Promise((resolve, reject) => {
            const pWorker = new Worker(path.join(__dirname, 'playwrightWorker.js'), {
                workerData: { reportId, baseUrl, tests, scope }
            });
            pWorker.on('message', (msg) => {
                if (msg.type === 'progress') emitProgress(Math.round(msg.percent * 0.6), msg.stage);
                if (msg.type === 'completed') resolve();
                if (msg.type === 'failed') reject(new Error(msg.error));
            });
            pWorker.on('error', reject);
            pWorker.on('exit', (code) => { if (code !== 0) reject(new Error(`Playwright worker exited with code ${code}`)); });
        });

        // --- STAGE 2: Lighthouse Performance Audit ---
        emitProgress(65, 'Initializing Lighthouse Audit Layer...');
        await new Promise((resolve, reject) => {
            const lWorker = new Worker(path.join(__dirname, 'lighthouseWorker.js'), {
                workerData: { reportId, baseUrl, tests }
            });
            lWorker.on('message', (msg) => {
                if (msg.type === 'progress') emitProgress(65 + Math.round(msg.percent * 0.25), msg.stage);
                if (msg.type === 'completed') resolve();
                if (msg.type === 'failed') reject(new Error(msg.error));
            });
            lWorker.on('error', reject);
            lWorker.on('exit', (code) => { if (code !== 0) reject(new Error(`Lighthouse worker exited with code ${code}`)); });
        });

        // --- STAGE 3: AI Synthesis (qaAgent) ---
        emitProgress(95, 'Running Final AI Analysis...');
        await qaAgent.runAgent(reportId);

        // Finalize Report
        const finalReportData = await ScanReport.findById(reportId);
        const healthScore = calculateReportHealth(finalReportData);
        await ScanReport.findByIdAndUpdate(reportId, { status: 'completed', healthScore });
        
        emitProgress(100, 'Strategic Evolution Complete.');
        process.exit(0);

    } catch (error) {
        console.error('[MasterWorker Fatal]:', error);
        await ScanReport.findByIdAndUpdate(reportId, { status: 'failed', customName: error.message });
        parentPort.postMessage({ type: 'failed', error: error.message });
        process.exit(1);
    }
}

// Start immediately
runMasterOrchestrator(workerData);
