const { parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 1. Load Environment
dotenv.config({ path: path.join(__dirname, '../.env') });

// 2. Import Scanning Services
const ScanReport = require('../models/ScanReport');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const crawler = require('../services/crawler');
const qaScanner = require('../services/qaScanner');
const qaAgent = require('../services/qaAgent');
const scanEngine = require('../services/scanEngine');
const comparisonService = require('../services/comparisonService');

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
    const { reportId, baseUrl, tests, scope, chatId } = data;
    const { Worker } = require('worker_threads');
    const path = require('path');

    // Helper: post a message to the chat thread
    const postChatMessage = async (type, content, scanReportId, reportSummary) => {
        if (!chatId) return null;
        try {
            const msg = await Message.create({ chatId, type, content, scanReportId, reportSummary });
            await Chat.findByIdAndUpdate(chatId, { lastMessageAt: new Date() });
            console.log(`[MasterWorker]: Posted chat message type=${type} to chatId=${chatId}`);
            return msg;
        } catch (e) {
            console.warn('[MasterWorker]: Could not post chat message:', e.message);
            return null;
        }
    };

    try {
        console.log(`[MasterWorker]: Orchestrating scan for ${baseUrl}`);

        const emitProgress = (percent, stage) => {
            parentPort.postMessage({ type: 'progress', percent, stage });
        };

        // ... STAGE 1, 2, 3, 4 logic ... (same)
        // (Assuming these stay the same, but let me re-write the stages to be safe and clean)
        
        // --- STAGES 1 & 2: Inline Neural Audit Layers (Ultra-Speed) ---
        emitProgress(5, 'Engaging Integrated Audit Core...');
        
        await Promise.all([
            // Playwright Diagnostic Layer (Inline)
            (async () => {
                const activeSuite = Array.isArray(tests) ? tests.filter(t => ['console', 'network', 'ui', 'links', 'forms'].includes(t)) : [];
                if (scope === 'single') {
                    await scanEngine.runSinglePageScan(reportId, baseUrl, activeSuite, (p, s) => emitProgress(5 + Math.round(p * 0.6), s));
                } else {
                    await scanEngine.runTargetedCrawlScan(reportId, baseUrl, activeSuite, (p, s) => emitProgress(5 + Math.round(p * 0.6), s));
                }
                
                // --- Early Insight Protocol (Immediate delivery) ---
                try {
                    const partialReport = await ScanReport.findById(reportId);
                    if (partialReport && chatId) {
                        const insightSummary = {
                            status: 'partial',
                            healthScore: calculateReportHealth(partialReport),
                            stats: {
                                brokenLinks: partialReport.brokenLinks?.length || 0,
                                consoleErrors: partialReport.consoleErrors?.length || 0,
                                networkIssues: partialReport.networkLogs?.length || 0
                            }
                        };
                        const earlyMsg = await postChatMessage('report', `Early Diagnostic Insight for ${baseUrl}`, reportId, insightSummary);
                        if (earlyMsg) {
                            parentPort.postMessage({ type: 'new-message', message: earlyMsg.toObject() });
                        }
                    }
                } catch (e) {
                    console.warn('[MasterWorker]: Early Insight delivery issue:', e.message);
                }
            })(),

            // Lighthouse Performance Audit (Inline)
            (async () => {
                const runIh = tests.includes('lighthouse') || tests.includes('performance') || tests.includes('accessibility');
                if (!runIh) return;

                emitProgress(60, 'Engaging Dedicated Lighthouse Engine...');
                const dedicatedData = await qaScanner.runDedicatedScan(baseUrl).catch(err => {
                    console.error(`[MasterWorker]: Inline Lighthouse Audit FAILED: ${err.message}`);
                    return null;
                });

                if (dedicatedData && dedicatedData.scores?.performance >= 0) {
                    await ScanReport.findByIdAndUpdate(reportId, {
                        $set: { lighthouseScores: dedicatedData.scores },
                        $push: { accessibilityIssues: { $each: dedicatedData.accessibilityIssues || [] } }
                    });
                }
                emitProgress(90, 'Lighthouse Synthesis Complete.');
            })()
        ]);

        // --- STAGE 3: AI Synthesis (qaAgent) ---
        emitProgress(90, 'Running Final AI Analysis...');
        await qaAgent.runAgent(reportId);

        // --- STAGE 4: Delta Comparison ---
        emitProgress(95, 'Calculating Performance Delta...');
        const currentReport = await ScanReport.findById(reportId);
        const previousReport = await ScanReport.findOne({
            url: baseUrl,
            userId: currentReport.userId,
            status: 'completed',
            _id: { $ne: reportId }
        }).sort({ createdAt: -1 });

        const comparison = await comparisonService.calculateDelta(currentReport, previousReport);

        // Finalize Report
        const healthScore = calculateReportHealth(currentReport);
        const finalReport = await ScanReport.findByIdAndUpdate(reportId, { 
            status: 'completed', 
            healthScore,
            comparison
        }, { new: true });

        // --- STAGE 5: Post to Chat Thread ---
        if (chatId) {
            const isPreviousScan = !!comparison?.previousReportId;
            const msgType = isPreviousScan ? 'rescan' : 'report';
            const reportSummary = {
                healthScore,
                status: 'completed',
                lighthouseScores: finalReport?.lighthouseScores || {},
                stats: {
                    brokenLinks: finalReport?.brokenLinks?.length || 0,
                    consoleErrors: finalReport?.consoleErrors?.length || 0,
                    accessibilityIssues: finalReport?.accessibilityIssues?.length || 0,
                    networkIssues: finalReport?.networkLogs?.length || 0
                },
                comparison: comparison?.previousReportId ? {
                    scoreDelta: comparison.scoreDelta,
                    newErrors: comparison.stats.newErrors,
                    fixedErrors: comparison.stats.fixedErrors,
                    impact: comparison.stats.impact
                } : null
            };
            const chatMsg = await postChatMessage(msgType, baseUrl, reportId, reportSummary);
            if (chatMsg) {
                // Fix: Convert Mongoose document to plain object for thread cloning
                parentPort.postMessage({ type: 'new-message', message: chatMsg.toObject() });
            }
        }
        
        emitProgress(100, 'Strategic Evolution Complete.');
        parentPort.postMessage({ type: 'completed' });
        return;

    } catch (error) {
        console.error('[MasterWorker Fatal]:', error);
        await ScanReport.findByIdAndUpdate(reportId, { status: 'failed', customName: error.message });
        parentPort.postMessage({ type: 'failed', error: error.message });
        return;
    }
}

// Start immediately
runMasterOrchestrator(workerData);
