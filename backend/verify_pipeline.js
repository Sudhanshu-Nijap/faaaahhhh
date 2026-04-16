const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const ScanReport = require('./models/ScanReport');

async function runEndToEndVerification() {
    const url = 'https://example.com';
    const userId = '69de78dc73510a9bac80f17e';
    const apiBase = 'http://127.0.0.1:5005/api';
    
    console.log(`[Verification]: Initiating end-to-end audit for ${url}`);
    
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('[Verification]: Connected to MongoDB.');

        // 1. Trigger Scan via API
        console.log('[Verification]: Sending request to 127.0.0.1:5005/api/scan');
        const response = await axios.post(`${apiBase}/scan`, {
            url,
            userId,
            force: true,
            tests: ['console', 'network', 'ui', 'lighthouse', 'accessibility']
        }).catch(err => {
            if (err.response) {
                console.error('[Verification]: API Error Response:', err.response.status, err.response.data);
            } else {
                console.error('[Verification]: API Error Message:', err.message);
            }
            throw err;
        });

        const reportId = response.data.reportId;
        console.log('[Verification]: Scan Started. ID:', reportId);

        // 2. Poll for Completion
        let completed = false;
        let attempts = 0;
        const maxAttempts = 60; 
        
        while (!completed && attempts < maxAttempts) {
            const report = await ScanReport.findById(reportId);
            if (!report) {
                console.warn('[Verification]: Report not found in DB... retrying.');
            } else {
                console.log(`[Verification]: Status: ${report.status} (Attempt ${attempts + 1})`);
                
                if (report.status === 'completed') {
                    completed = true;
                    console.log('\n--- VERIFICATION SUCCESS ---');
                    console.log('Health Score:', report.healthScore);
                    console.log('Lighthouse Metrics:', report.lighthouseScores ? '✅' : '❌');
                    console.log('Screenshots:', report.screenshots.length > 0 ? '✅' : '❌');
                    break;
                } else if (report.status === 'failed') {
                    console.error('[Verification]: Scan FAILED:', report.customName || report.error);
                    break;
                }
            }
            
            await new Promise(r => setTimeout(r, 5000));
            attempts++;
        }

        if (!completed) {
            console.error('[Verification]: TIMEOUT!');
        }

    } catch (e) {
        console.error('[Verification]: Execution Terminated.');
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

runEndToEndVerification();
