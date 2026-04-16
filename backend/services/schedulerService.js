const Job = require('../models/Job');
// Circular Dependency Shield: runFullScan is required inside executive methods
// instead of top-level to prevent server startup deadlocks.
const ScanReport = require('../models/ScanReport');
const Chat = require('../models/Chat');

/**
 * Tactical Scheduler Service
 * Manages the lifecycle of scheduled neural scans.
 */
class SchedulerService {
    constructor() {
        this.jobRegistry = new Map(); // jobId -> Timeout/Interval reference
        this.checkInterval = null;
    }

    /**
     * Initializes the scheduler by loading all active jobs from the database.
     */
    async init() {
        console.log('[Scheduler]: Initializing tactical job substrate...');
        this.startWatcher();
    }

    /**
     * Periodically checks for jobs that need execution.
     * Checks every 60 seconds.
     */
    startWatcher() {
        if (this.checkInterval) clearInterval(this.checkInterval);
        
        this.checkInterval = setInterval(() => {
            this.processPendingJobs();
        }, 15000); // 15 second precision for better tactical response

        // Run immediately on start
        this.processPendingJobs();
    }

    /**
     * Analyzes all active jobs and triggers those whose time has come.
     */
    async processPendingJobs() {
        try {
            // Normalize current time to IST (Asia/Kolkata) for tactical alignment
            const now = new Date();
            const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            
            const currentDay = istTime.getDay(); // 0-6
            const currentHHMM = istTime.toLocaleTimeString('en-GB', { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false,
                timeZone: 'Asia/Kolkata' 
            });
            const currentDate = istTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD

            // Find jobs that are active and not currently running
            const jobs = await Job.find({ 
                isActive: true, 
                status: { $ne: 'running' } 
            });

            for (const job of jobs) {
                let shouldRun = false;

                if (job.mode === 'one-time') {
                    if (job.date === currentDate && job.time === currentHHMM) {
                        shouldRun = true;
                    }
                } else if (job.mode === 'daily') {
                    if (job.time === currentHHMM) {
                        shouldRun = true;
                    }
                } else if (job.mode === 'weekly') {
                    if (job.dayOfWeek === currentDay && job.time === currentHHMM) {
                        shouldRun = true;
                    }
                }

                if (shouldRun) {
                    // Check if we haven't already run it in the same minute
                    const lastRunAt = job.lastRun ? new Date(job.lastRun) : null;
                    if (lastRunAt && (now - lastRunAt) < 61000) {
                        continue; // Already triggered this minute
                    }

                    console.log(`[Scheduler]: Triggering ${job.scanType} scan for ${job.url} (Job: ${job._id})`);
                    this.executeJob(job);
                }
            }
        } catch (error) {
            console.error('[Scheduler Error]:', error.message);
        }
    }

    /**
     * Dispatches the job to the scan engine.
     */
    async executeJob(job) {
        try {
            job.status = 'running';
            job.lastRun = new Date();
            await job.save();

            // Prepare tactical parameters
            const tests = job.scanType === 'full' 
                ? ['console', 'network', 'lighthouse', 'accessibility', 'links', 'ui', 'forms']
                : ['console', 'network', 'ui', 'lighthouse', 'accessibility'];
            const mode = job.scanType === 'full' ? 'full' : 'specific';
            const scope = job.scanType === 'full' ? 'site' : 'single';

            // ── CHAT INTEGRATION ──────────────────────────────────────────
            // Find or initialize the permanent chat thread for this URL
            let chat = await Chat.findOne({ url: job.url, userId: job.userId });
            if (!chat) {
                console.log(`[Scheduler]: Initializing brand-new Neural Chat for ${job.url}`);
                chat = new Chat({ url: job.url, userId: job.userId });
                await chat.save();
            }

            // Find baseline report for comparison
            const previousReport = await ScanReport.findOne({ 
                url: job.url, 
                userId: job.userId, 
                status: 'completed' 
            }).sort({ createdAt: -1 });

            // Create initial report entry
            const report = new ScanReport({
                url: job.url,
                userId: job.userId,
                status: 'in-progress',
                scannedModules: tests,
                mode: mode,
                jobId: job._id,
                comparison: previousReport ? { previousReportId: previousReport._id } : undefined
            });
            await report.save();

            // ── SOCKET EMISSION ──────────────────────────────────────────
            // Run scan async via existing worker infrastructure
            const { runFullScan } = require('../routes/scanRoutes');
            runFullScan(
                report._id, 
                job.url, 
                'standard', 
                job.scanType === 'quick', 
                tests, 
                scope, 
                mode,
                chat._id, // Pass permanent chat ID
                previousReport?._id // Pass previous report ID for delta calculation
            ).catch(e => {
                console.error(`[Scheduler Task Failure]: ${e.message}`);
                job.status = 'failed';
                job.save();
            });

            // ── SOCKET EMISSION ──────────────────────────────────────────
            // Notify UI that a job has started executing
            if (global.io) {
                // 1. Job-Sync: Update the Scheduling Dashboard entry
                global.io.emit('job-sync', { 
                    jobId: job._id.toString(), 
                    reportId: report._id.toString(), 
                    status: 'running',
                    lastRun: job.lastRun
                });

                // 2. Scan-Progress: Wake up the Global Progress Bar immediately (0%)
                global.io.emit('scan-progress', {
                    reportId: report._id.toString(),
                    percent: 0,
                    stage: 'Initializing autonomous scan...',
                    status: 'in-progress'
                });

                // 3. Report-Update: Trigger a global refresh of the History Lattice
                global.io.to(`user_${job.userId.toString()}`).emit('report-update', {
                    type: 'scan_started',
                    reportId: report._id.toString()
                });
            }

            // Note: Job status and isActive are now managed when the scan worker exits (scanRoutes.js)
            // to ensure accurate dashboard feedback.

        } catch (error) {
            console.error(`[Job Execution Error]: ${error.message}`);
            job.status = 'failed';
            await job.save();
        }
    }

    /**
     * Manually stop/remove a job from the registry.
     */
    async removeJob(jobId) {
        if (this.jobRegistry.has(jobId)) {
            // If it was using cron, we would stop the task here
            this.jobRegistry.delete(jobId);
        }
    }
}

const scheduler = new SchedulerService();
module.exports = scheduler;
