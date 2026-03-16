const puppeteer = require('puppeteer');
const ScanReport = require('../models/ScanReport');
const path = require('path');

/**
 * scanPage
 * Core diagnostic engine using Puppeteer + Lighthouse.
 */
const scanPage = async (reportId, url) => {
    let browser;
    try {
        console.log(`[qaScanner]: Beginning deep audit for ${url}`);
        
        // Launch with debugging port for Lighthouse
        browser = await puppeteer.launch({ 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--remote-debugging-port=9222'] 
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });

        const rawConsoleErrors = [];
        const rawNetworkLogs = [];
        let totalSize = 0;

        page.on('console', msg => {
            rawConsoleErrors.push({
                page: url,
                message: msg.text(),
                type: msg.type(),
                location: msg.location().url || 'inline'
            });
        });

        page.on('response', response => {
            const status = response.status();
            if (status >= 400) {
                rawNetworkLogs.push({
                    method: response.request().method(),
                    url: response.url(),
                    status,
                    type: response.request().resourceType()
                });
            }
            const headers = response.headers();
            if (headers['content-length']) totalSize += parseInt(headers['content-length']);
        });

        const startTime = Date.now();
        // Use 'load' for max compatibility, then wait specifically for a few seconds if needed
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        const loadTime = Date.now() - startTime;

        // Take screenshot
        const screenshotName = `screenshot-${Date.now()}.png`;
        const screenshotPath = path.join(__dirname, '../screenshots', screenshotName);
        console.log(`[qaScanner]: Capturing screenshot: ${screenshotName}`);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        // Lighthouse Audit
        let lighthouseScores = { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 };
        try {
            console.log(`[qaScanner]: Triggering Lighthouse Performance Audit...`);
            const { default: lighthouse } = await import('lighthouse');
            const result = await lighthouse(url, { 
                port: 9222, 
                output: 'json', 
                logLevel: 'error',
                onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
            });
            
            if (result && result.lhr) {
                lighthouseScores = {
                    performance: result.lhr.categories.performance.score * 100,
                    accessibility: result.lhr.categories.accessibility.score * 100,
                    bestPractices: result.lhr.categories['best-practices'].score * 100,
                    seo: result.lhr.categories.seo.score * 100
                };
            }
            console.log(`[qaScanner]: Lighthouse scores captured successfully.`);
        } catch (lhError) {
            console.warn(`[qaScanner Warning]: Lighthouse stalled or failed: ${lhError.message}`);
        }

        // Map data strictly to Schema
        const consoleErrors = rawConsoleErrors.map(e => ({
            page: String(e.page),
            message: String(e.message),
            type: String(e.type),
            location: String(e.location),
            recommendation: e.type === 'error' ? "Critical execution failure detected." : 
                            e.type === 'warning' ? "Non-breaking issue; review for optimization." :
                            "Standard diagnostic log."
        }));

        const networkLogs = rawNetworkLogs.map(n => ({
            method: String(n.method),
            url: String(n.url),
            status: Number(n.status),
            time: 0,
            size: 0,
            type: String(n.type),
            recommendation: "Investigate backend response or broken asset link."
        }));

        const updateData = {
            $push: {
                screenshots: { page: String(url), path: `/screenshots/${screenshotName}`, type: 'Full Page' }
            },
            $set: { 
                'performanceMetrics.loadTime': Number(loadTime),
                'performanceMetrics.pageSize': Number(totalSize),
                'lighthouseScores': lighthouseScores
            }
        };

        if (consoleErrors.length > 0) updateData.$push.consoleErrors = { $each: consoleErrors };
        if (networkLogs.length > 0) updateData.$push.networkLogs = { $each: networkLogs };

        console.log(`[qaScanner]: Pushing payload to DB: ${JSON.stringify(updateData).substring(0, 200)}...`);
        await ScanReport.findByIdAndUpdate(reportId, updateData, { returnDocument: 'after' });
        console.log(`[qaScanner]: Data persistence confirmed for ${url}`);

    } catch (error) {
        console.error(`[qaScanner Critical Error on ${url}]: ${error.message}`);
        throw error; // Rethrow so pipeline withTimeout catches it properly
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { scanPage };
