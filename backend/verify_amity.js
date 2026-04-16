const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const ScanReport = require('./models/ScanReport');

async function runAmityVerification() {
    const url = 'https://amityonline.com/';
    const userId = '69de78dc73510a9bac80f17e';
    const apiBase = 'http://127.0.0.1:5005/api';
    
    console.log(`[Verification]: Initiating site-wide audit for ${url}`);
    
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('[Verification]: Connected to MongoDB.');

        // 1. Trigger Site-Wide Scan via API
        const response = await axios.post(`${apiBase}/scan`, {
            url,
            userId,
            force: true,
            scope: 'site', // Multi-page audit
            tests: ['console', 'network', 'ui', 'lighthouse', 'accessibility']
        });

        const reportId = response.data.reportId;
        console.log('[Verification]: Site Scan Started. ID:', reportId);

        // 2. Poll for Completion (Wait up to 15 minutes)
        let completed = false;
        let attempts = 0;
        const maxAttempts = 180; // 15 minutes
        
        while (!completed && attempts < maxAttempts) {
            const report = await ScanReport.findById(reportId);
            if (report) {
                console.log(`[Verification]: Status: ${report.status} | Crawled: ${report.pagesCrawled} (Attempt ${attempts + 1})`);
                
                if (report.status === 'completed') {
                    completed = true;
                    console.log('\n--- VERIFICATION SUCCESS ---');
                    console.log('Health Score:', report.healthScore);
                    console.log('Final Node Count:', report.screenshots?.length || 0);
                    break;
                } else if (report.status === 'failed') {
                    console.error('[Verification]: Scan FAILED:', report.customName || report.error);
                    break;
                }
            }
            
            await new Promise(r => setTimeout(r, 5000));
            attempts++;
        }

    } catch (e) {
        console.error('[Verification]: Execution Terminated.', e.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

runAmityVerification();
