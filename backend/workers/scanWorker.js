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

// 3. Connection Substrate Logic (Hardened)
const connectWithRetry = async (attempts = 0) => {
    const MAX_ATTEMPTS = 5;
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 15000, // Fail fast (15s) if DNS/Host is unreachable
        });
        console.log('[Worker]: Connected to Tactical Database');
    } catch (err) {
        if (attempts >= MAX_ATTEMPTS) {
            console.error('[Worker]: Critical DB Failure: Max retries exceeded. Aborting scan.');
            throw new Error(`Database connection timed out after ${MAX_ATTEMPTS} attempts.`);
        }
        console.warn(`[Worker]: DB connection attempt ${attempts + 1} failed. Retrying in 5s...`, err.message);
        await new Promise(res => setTimeout(res, 5000));
        return connectWithRetry(attempts + 1);
    }
};

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

const calculateReportHealth = (report, lhMetrics = null) => {
    if (!report) return 0;
    
    // If Lighthouse metrics are available, they become the primary driver (80% weight)
    if (lhMetrics && (lhMetrics.performance || lhMetrics.accessibility || lhMetrics.seo || lhMetrics.bestPractices)) {
        const lhAvg = (
            (lhMetrics.performance || 0) + 
            (lhMetrics.accessibility || 0) + 
            (lhMetrics.seo || 0) + 
            (lhMetrics.bestPractices || 0)
        ) / 4;
        
        // Apply small penalty for tactical failures (Broken links, console errors)
        const tacticalPenalty = (
            (report.brokenLinks?.length || 0) * 2 + 
            (report.consoleErrors?.length || 0) * 0.5 +
            (report.networkLogs?.filter(n => n.status >= 500).length || 0) * 2
        );

        const score = Math.max(1, Math.round(lhAvg - tacticalPenalty));
        console.log(`[Scoring]: Lighthouse Centric -> Avg: ${lhAvg}, Penalty: ${tacticalPenalty}, Final: ${score}`);
        return score;
    }

    // Fallback Heuristic if Lighthouse is disabled
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
    
    console.log(`[Scoring]: Fallback Heuristic -> RawDeduction: ${rawDeduction}, Score: ${score}%`);
    return score;
};

// 5. Orchestration Pipeline
async function runMasterOrchestrator(data) {
    const { reportId, baseUrl, tests, scope, chatId } = data;
    console.log(`[MasterWorker]: Starting Tactical Pulse for Report: ${reportId} (Target: ${baseUrl})`);
    
    // Initialize primary dispatcher
    mainChatMessageDispatcher = persistMessageLocally;
    console.log('[MasterWorker]: Neural Insight Substrate Initialized.');

    try {
        console.log(`[MasterWorker]: Orchestrating tactical scan for ${baseUrl}`);
        let lighthouseMetrics = null;

        const emitProgress = (percent, stage) => {
            if (parentPort) parentPort.postMessage({ type: 'progress', percent, stage });
        };

        // --- FLASH-MODE ORCHESTRATION ---
        emitProgress(5, 'Engaging Integrated Audit Core...');
        
        // 1. Integrated Discovery & Audit (Converged Engine)
        // The engine now handles technical, visual, and compliance (Lighthouse) audits in a single resilient pass.

        if (scope === 'single') {
            console.log('[MasterWorker]: Executing Unified Session Audit (Standard Convergence)...');
            const result = await scanEngine.runSinglePageScan(reportId, baseUrl, tests, (p, s) => {
                emitProgress(5 + Math.round(p * 0.80), s);
            });
            
            if (result) {
                lighthouseMetrics = result.lighthouseScores;
                await scanEngine.persistScanData(reportId, result);
            }
        } else {
            // Site-wide crawl handles its own persistence internally
            await scanEngine.runTargetedCrawlScan(reportId, baseUrl, tests, (p, s) => {
                emitProgress(5 + Math.round(p * 0.80), s);
            }, scope);
            
            // Re-fetch to get consolidated lighthouse scores from site-wide crawl if captured
            const consolidatedReport = await ScanReport.findById(reportId);
            lighthouseMetrics = consolidatedReport.lighthouseScores;
        }

        // 2. Parallel Secondary UX Pulse (Insights)
        await Promise.all([

            // 3. Early AI Insight Dispatch
            (async () => {
                if (workerData.prevReportId) return;
                try {
                    const insightSummary = "Strategic Analysis: Sentinel AI is engaging core diagnostics for " + baseUrl + "...";
                    const earlyMsg = await safeMessageUplink(chatId, 'ai', insightSummary, reportId, null);
                    if (earlyMsg && parentPort) {
                        parentPort.postMessage({ type: 'new-message', message: earlyMsg.toObject() });
                    }
                } catch (e) {
                    console.warn('[MasterWorker]: Early Insight delivery issue:', e.message);
                }
            })()
        ]);

        emitProgress(90, 'All tactical pulses converged. Finalizing Neural Report...');

        // --- STAGE 3: AI Synthesis & Evolution ---
        emitProgress(92, 'Syncing Final AI Analysis...');
        const { prevReportId } = data;

        // Parallel Fetch for current and baseline reports
        const [currentReport, previousReport] = await Promise.all([
            ScanReport.findById(reportId),
            prevReportId ? ScanReport.findById(prevReportId) : Promise.resolve(null)
        ]);

        if (!currentReport) throw new Error('Neural focus lost: Report not found during synthesis.');

        // 1. Calculate health score using Lighthouse as the primary driver
        const healthScore = calculateReportHealth(currentReport, lighthouseMetrics);
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
        
        console.log(`[MasterWorker]: Scan Cycle Optimized. Report ${reportId} is fully materialized.`);
        emitProgress(100, 'Strategic Evolution Complete.');
        parentPort.postMessage({ type: 'completed', reportId: reportId });
        return;

    } catch (error) {
        console.error('[MasterWorker Fatal]:', error);
        await ScanReport.findByIdAndUpdate(reportId, { status: 'failed', customName: error.message });
        parentPort.postMessage({ type: 'failed', error: error.message });
        return;
    }
}

// ── Deadlock Watchdog (Adaptive Cutoff) ──────────────────────────────────────
const SCOPE_TIMEOUTS = {
    'single': 300000,   // 5 minutes
    'site': 1200000     // 20 minutes (for multi-page scans)
};

const timeoutMs = SCOPE_TIMEOUTS[workerData.scope] || 300000;

const watchdog = setTimeout(async () => {
    console.error(`[MasterWorker]: Neural Watchdog Triggered for ${workerData.reportId}. Force terminating...`);
    await ScanReport.findByIdAndUpdate(workerData.reportId, { 
        status: 'failed', 
        customName: `Scan timed out after ${Math.round(timeoutMs/60000)}m of inactivity.` 
    });
    parentPort.postMessage({ type: 'failed', error: 'Neural substrate timeout' });
    process.exit(1);
}, timeoutMs); 

// Start immediately with connection synchronization
connectWithRetry().then(() => {
    runMasterOrchestrator(workerData).then(() => clearTimeout(watchdog));
});
