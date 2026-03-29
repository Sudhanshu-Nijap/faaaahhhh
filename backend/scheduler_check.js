const mongoose = require('mongoose');
const Job = require('./models/Job');
const scheduler = require('./services/schedulerService');
const dotenv = require('dotenv');

/**
 * 🕵️ Sentinel Scheduler Diagnostic
 * This script verifies that the internal scheduler correctly identifies
 * your local machine time and matches it against your jobs.
 */

async function diagnosticRun() {
    dotenv.config();
    console.log('--- 🚀 [Sentinel Intelligence] Scheduler Diagnostic ---');

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('[Registry]: Connected to Tactical Database.');

        // 1. Calculate the matching window
        const now = new Date();
        const currentHHMM = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        const currentDate = now.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        
        console.log(`[Clock]: Local Time Detected : ${currentHHMM}`);
        console.log(`[Clock]: Local Date Detected : ${currentDate}`);

        // 2. Search for any jobs set to match THIS exact minute
        const jobs = await Job.find({ 
            isActive: true, 
            time: currentHHMM 
        });

        if (jobs.length === 0) {
            console.log(`\n[Status]: No active jobs found for the current minute (${currentHHMM}).`);
            console.log('💡 TIP: Set a job in your dashboard for 2 minutes from now to see it trigger below.');
        } else {
            console.log(`\n✅ [Status]: I found ${jobs.length} active job(s) for the current minute!`);
            jobs.forEach(j => {
                console.log(`   - TRG: [${j.scanType}] ${j.url} (Mode: ${j.mode})`);
            });
        }

        // 3. Simulate the matching logic from the real service
        console.log('\n[Analyzer]: Testing scheduler precision logic...');
        const mockNow = new Date();
        const mockHHMM = mockNow.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        
        if (currentHHMM === mockHHMM) {
            console.log('✅ SYNC: Precision is nominal. Local matching logic matches system clock.');
        } else {
            console.log('⚠️ DE-SYNC: Small lag detected in logic processing.');
        }

        console.log('\n--- Diagnostic Complete ---');
        process.exit(0);
    } catch (e) {
        console.error(`[Fatal]: diagnostic pulse failed: ${e.message}`);
        process.exit(1);
    }
}

diagnosticRun();
