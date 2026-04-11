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

// --- 4. Tactical Event Substrate ---
let mainChatMessageDispatcher = null;
const earlyInsightQueue = [];

// Fallback: In-built message persistence if service is not yet ready
const persistMessageLocally = async (chatId, type, content, scanReportId, reportSummary) => {
    if (!chatId) return null;
    try {
        const msg = await Message.create({ chatId, type, content, scanReportId, reportSummary });
        await Chat.findByIdAndUpdate(chatId, { lastMessageAt: new Date() });
        return msg;
    } catch (e) {
        console.warn('[Worker]: Local persistence failed:', e.message);
        return null;
    }
};

const safeMessageUplink = async (chatId, type, content, scanReportId, reportSummary) => {
    if (mainChatMessageDispatcher) {
        return await mainChatMessageDispatcher(chatId, type, content, scanReportId, reportSummary);
    }
    
    // Dispatcher not ready (e.g. still requiring modules) -> Persist and queue for sync
    console.log('[Worker]: Dispatcher not ready. Persisting early insight locally...');
    const msg = await persistMessageLocally(chatId, type, content, scanReportId, reportSummary);
    if (msg) earlyInsightQueue.push(msg);
    return msg;
};

const calculateReportHealth = (report) => {
    if (!report) return 0;
    
    const weights = { network: 0.1, links: 10, console: 5, ui: 10, accessibility: 10 };
    const counts = {
        network: report.networkLogs?.length || 0,
        links: report.brokenLinks?.length || 0,
        console: report.consoleErrors?.length || 0,
        ui: (report.uiIssues?.length || 0) + (report.responsiveIssues?.length || 0),
        accessibility: report.accessibilityIssues?.length || 0
    };
    
    const rawDeduction = Object.keys(weights).reduce((acc, key) => acc + (counts[key] * weights[key] || 0), 0);
    const decayConstant = 400; 
    const scaledScore = 100 * Math.exp(-rawDeduction / decayConstant);
    const score = Math.max(1, Math.round(scaledScore));
    
    console.log(`[Scoring]: ${report.url} -> RawDeduction: ${rawDeduction}, Score: ${score}%`);
    return score;
};

// 5. Orchestration Pipeline
async function runMasterOrchestrator(data) {
    const { reportId, baseUrl, tests, scope, chatId } = data;
    
    // Initialize primary dispatcher
    mainChatMessageDispatcher = persistMessageLocally;
    console.log('[MasterWorker]: Neural Insight Substrate Initialized.');

    try {
        console.log(`[MasterWorker]: Orchestrating tactical scan for ${baseUrl}`);
        let lighthouseMetrics = null;

        const emitProgress = (percent, stage) => {
            if (parentPort) parentPort.postMessage({ type: 'progress', percent, stage });
        };

        // --- STAGE 1: Infrastructure Discovery (Vite/Playwright) ---
        emitProgress(5, 'Engaging Integrated Audit Core...');
        
        await Promise.all([
            (async () => {
                const activeSuite = Array.isArray(tests) ? tests.filter(t => ['console', 'network', 'ui', 'links', 'forms'].includes(t)) : [];
                if (scope === 'single') {
                    await scanEngine.runSinglePageScan(reportId, baseUrl, activeSuite, (p, s) => emitProgress(5 + Math.round(p * 0.45), s));
                } else {
                    await scanEngine.runTargetedCrawlScan(reportId, baseUrl, activeSuite, (p, s) => emitProgress(5 + Math.round(p * 0.45), s), scope);
                }
            })(),
            (async () => {
                // Post early insight using the safe uplink (Skip for rescans to avoid duplication)
                if (workerData.prevReportId) return;

                try {
                    const insightSummary = "Sentinel AI is analyzing structural integrity and network protocols...";
                    const earlyMsg = await safeMessageUplink(chatId, 'report', `Early Diagnostic Insight for ${baseUrl}`, reportId, insightSummary);
                    if (earlyMsg && parentPort) {
                        parentPort.postMessage({ type: 'new-message', message: earlyMsg.toObject() });
                    }
                } catch (e) {
                    console.warn('[MasterWorker]: Early Insight delivery issue:', e.message);
                }
            })()
        ]);

        emitProgress(50, 'Infrastructure Audit Phase Complete.');

        // --- STAGE 2: Quality Matrix Audit (Lighthouse) ---
        // RUN SEQUENTIALLY TO AVOID CHROMIUM CONFLICTS ON WINDOWS
        const runIh = tests.includes('lighthouse') || tests.includes('performance') || tests.includes('accessibility');
        if (runIh) {
            emitProgress(60, 'Engaging Dedicated Lighthouse Engine...');
            
            // Heartbeat progress to keep UI alive during long audit
            let lighthouseWait = 60;
            const lbInterval = setInterval(() => {
                if (lighthouseWait < 85) {
                    lighthouseWait += 2;
                    emitProgress(lighthouseWait, 'Lighthouse Pulse in progress: Deciphering quality metrics...');
                }
            }, 3000);

            const dedicatedData = await qaScanner.runDedicatedScan(baseUrl).catch(err => {
                clearInterval(lbInterval);
                console.error(`[MasterWorker]: Dedicated Lighthouse Audit FAILED: ${err.message}`);
                return null;
            });

            clearInterval(lbInterval);

            if (dedicatedData && (dedicatedData.scores?.performance >= 0)) {
                console.log(`[MasterWorker]: Synchronizing tactical scores for ${baseUrl}`);
                lighthouseMetrics = dedicatedData.scores;
                // Pre-sync accessibility issues to the DB for health calculation
                await ScanReport.findByIdAndUpdate(reportId, {
                    $push: { accessibilityIssues: { $each: dedicatedData.accessibilityIssues || [] } }
                });
                emitProgress(90, 'Lighthouse Telemetry Synchronized.');
            } else {
                console.warn(`[MasterWorker]: Lighthouse returned 0 or failed for ${baseUrl}.`);
            }
        } else {
            emitProgress(90, 'Skipping Lighthouse (User specific request).');
        }

        // --- STAGE 3: AI Synthesis & Evolution ---
        emitProgress(92, 'Syncing Final AI Analysis...');
        const { prevReportId } = data;

        // Parallel Fetch for current and baseline reports
        const [currentReport, previousReport] = await Promise.all([
            ScanReport.findById(reportId),
            prevReportId ? ScanReport.findById(prevReportId) : Promise.resolve(null)
        ]);

        if (!currentReport) throw new Error('Neural focus lost: Report not found during synthesis.');

        // 1. Calculate health score locally first
        const healthScore = calculateReportHealth(currentReport);
        currentReport.healthScore = healthScore; 

        // 2. Run AI Agent and capture insights (avoiding direct DB updates in agent)
        const aiInsights = await qaAgent.runAgent(reportId, prevReportId, currentReport, previousReport);

        // 3. Run Comparison Service
        emitProgress(95, 'Calculating Performance Delta...');
        const comparison = await comparisonService.calculateDelta(currentReport, previousReport);

        // Finalize Report - Atomic update including all gathered intelligence
        console.log(`[MasterWorker]: Finalizing Atomic Update for ${reportId}...`);
        const finalSet = {
            status: 'completed',
            healthScore: healthScore,
            comparison: comparison,
            aiInsights: aiInsights
        };
        
        // Ensure lighthouse scores are included in the final write if they were captured
        if (lighthouseMetrics) {
            finalSet.lighthouseScores = lighthouseMetrics;
        }

        const finalReport = await ScanReport.findByIdAndUpdate(reportId, {
            $set: finalSet
        }, { returnDocument: 'after' });

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
                    previousReportId: comparison.previousReportId,
                    scoreDelta: comparison.scoreDelta,
                    newErrors: comparison.stats.newErrors,
                    fixedErrors: comparison.stats.fixedErrors,
                    impact: comparison.stats.impact
                } : null
            };
            const chatMsg = await safeMessageUplink(chatId, msgType, baseUrl, reportId, reportSummary);
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
