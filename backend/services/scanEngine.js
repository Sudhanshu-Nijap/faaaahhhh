const { chromium } = require('playwright');
const ScanReport = require('../models/ScanReport');
const crawler = require('./crawler');
const path = require('path');

// Import Specialist Agents
const axios = require('axios');
const fs = require('fs');

const screenshotsDir = path.join(__dirname, '../screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Helper: wrap promise with timeout
const withTimeout = (promise, ms, taskName) => {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${taskName} timed out after ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeout]);
};

/**
 * scanConsole - Captures JS exceptions and console warnings
 */
const scanConsole = async (page) => {
    const logs = [];
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            logs.push({
                page: page.url(),
                message: msg.text().substring(0, 500),
                type: msg.type(),
                location: msg.location().url || 'inline'
            });
        }
    });
    return logs;
};

/**
 * scanNetwork - Captures 4xx/5xx failures
 */
const scanNetwork = async (page) => {
    const failures = [];
    page.on('response', response => {
        const status = response.status();
        if (status >= 400) {
            failures.push({
                method: response.request().method(),
                url: response.url(),
                status,
                type: response.request().resourceType()
            });
        }
    });
    return failures;
};

/**
 * scanForms - Basic validation and accessibility check for forms
 */
const scanForms = async (page) => {
    return await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(form => ({
            id: form.id || 'anonymous',
            action: form.action,
            inputs: form.querySelectorAll('input').length,
            missingLabels: Array.from(form.querySelectorAll('input:not([aria-label]):not([id])')).length
        }));
    });
};

/**
 * scanUI - Detects basic layout issues (overflow, empty headers)
 */
const scanUI = async (page) => {
    return await page.evaluate(() => {
        const issues = [];
        if (document.body.scrollWidth > window.innerWidth) {
            issues.push({ type: 'layout', issue: 'Horizontal overflow detected', severity: 'Medium' });
        }
        if (!document.querySelector('h1')) {
            issues.push({ type: 'layout', issue: 'Missing H1 heading', severity: 'Low' });
        }
        return issues;
    });
};

/**
 * runSinglePageScan - Fast, converged audit of one URL
 */
const runSinglePageScan = async (reportId, url, scannedModules = [], emitProgress) => {
    let isBrowserClosed = false;
    let browser;
    try {
        console.log(`[scanEngine]: Initiating Converged Lean Scan: ${url} | Modules: ${scannedModules.join(', ')}`);
    emitProgress(10, 'Establishing neural uplink...');
    
    // 1. Launch Browser with Remote Debugging for Lighthouse
    const port = 9222 + Math.floor(Math.random() * 100);
    console.log(`[scanEngine]: Spawning Chromium with Debugging Port: ${port}`);
    browser = await chromium.launch({ 
        headless: true,
        args: [
            `--remote-debugging-port=${port}`,
            '--remote-debugging-address=127.0.0.1',
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--ignore-certificate-errors',
            '--force-device-scale-factor=1',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-sync',
            '--disable-gpu', // Added from snippet
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' // Added from snippet
        ]
    });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            viewport: { width: 1440, height: 900 }
        });
        const page = await context.newPage();
        
        // 2. Playwright Diagnostics Setup
        const rawConsole = [];
        const rawNetwork = [];
        let totalSize = 0;
        let requestCount = 0;

        page.on('console', msg => {
            if (msg.type() === 'error') {
                rawConsole.push({
                    page: url,
                    message: msg.text().substring(0, 500),
                    type: 'error',
                    location: msg.location().url || 'inline',
                    recommendation: 'JS failure detected.'
                });
            }
        });

        page.on('response', async (response) => {
            const status = response.status();
            requestCount++;
            try {
                const size = parseInt(response.headers()['content-length'] || '0');
                totalSize += size;
                if (status >= 400) {
                    rawNetwork.push({
                        method: response.request().method(),
                        url: response.url(),
                        status,
                        type: response.request().resourceType(),
                        recommendation: status === 404 ? 'Asset not found.' : 'Request failed.'
                    });
                }
            } catch (_) {}
        });
        
        emitProgress(30, `Targeting ${url}...`);
        const startTime = Date.now();
        
        // --- High-Resiliency Navigation Cycle ---
        try {
            await page.goto(url, { waitUntil: 'load', timeout: 45000 });
        } catch (navError) {
            console.warn(`[scanEngine]: Initial goto failed for ${url}: ${navError.message}. Retrying with permissive fallback...`);
            // Strategic Retry: Use 'domcontentloaded' which is more resilient to slow assets/trackers
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => {
                console.error(`[scanEngine]: Neural Navigation FAIL for ${url}: ${e.message}`);
                // Proceed anyway, as Lighthouse might still manage to audit the page
            });
        }

        const loadTime = Date.now() - startTime;
        // Wait for potential dynamic content to settle
        await page.waitForTimeout(2000); 

        // 2c. Interaction Audit: Forms
        let formIssues = [];
        if (scannedModules.includes('forms') || scannedModules.includes('ui')) {
            emitProgress(70, 'Auditing form interaction layers...');
            const formScanner = require('./formScanner');
            formIssues = await formScanner.scanForms(page);
        }
        const screenshotName = `screenshot-${Date.now()}.png`;
        const screenshotPath = path.join(__dirname, '../screenshots', screenshotName);
        
        emitProgress(50, 'Capturing visual states & UI patterns...');
        await page.screenshot({ path: screenshotPath, fullPage: true }).catch(async () => {
            await page.screenshot({ path: screenshotPath, fullPage: false });
        });

        const uiIssues = scannedModules.includes('ui') ? await scanUI(page).catch(() => []) : [];
        
        let brokenLinks = [];
        if (scannedModules.includes('links')) {
            emitProgress(60, 'Tracing navigation integrity...');
            const links = await page.evaluate(() => 
                Array.from(document.querySelectorAll('a[href]'))
                    .map(a => a.href)
                    .filter(href => href.startsWith('http'))
            );
            for (const link of links.slice(0, 10)) {
                try {
                    const res = await axios.head(link, { timeout: 3000, validateStatus: () => true }).catch(() => null);
                    if (!res || res.status >= 400) {
                        brokenLinks.push({ page: url, link, status: res ? res.status : 0, recommendation: 'Update or remove broken link.' });
                    }
                } catch (_) {}
            }
        }



        // 5. Finalize Playwright Telemetry
        emitProgress(90, 'Synthesizing Session Telemetry...');
        
        const finalUpdate = {
            $set: {
                'performanceMetrics.loadTime': loadTime,
                'performanceMetrics.pageSize': totalSize,
                'performanceMetrics.requestCount': requestCount
            },
            $push: {
                screenshots: { page: url, path: `/screenshots/${screenshotName}`, type: 'Full Audit' }
            }
        };



        // Aggressively append all detected telemetry to the report
        if (rawConsole.length > 0) finalUpdate.$push.consoleErrors = { $each: rawConsole };
        if (rawNetwork.length > 0) finalUpdate.$push.networkLogs = { $each: rawNetwork };
        if (uiIssues.length > 0) finalUpdate.$push.uiIssues = { $each: uiIssues.map(u => ({ ...u, page: url })) };
        if (brokenLinks.length > 0) finalUpdate.$push.brokenLinks = { $each: brokenLinks };
        if (formIssues.length > 0) {
            if (!finalUpdate.$push) finalUpdate.$push = {};
            finalUpdate.$push.formIssues = { $each: formIssues };
        }
        
        console.log(`[scanEngine]: Saving tactical telemetry for ${url}...`);
        await ScanReport.findByIdAndUpdate(reportId, finalUpdate);

        // --- RELAY STEP: Purge Browser before Dedicated Fallback ---
        console.log(`[scanEngine]: Yielding browser session for ${url}...`);
        try {
            await withTimeout(browser.close(), 10000, 'Browser Close');
        } catch (closeError) {
            console.warn(`[scanEngine]: Browser close timed out/failed: ${closeError.message}`);
        }
        isBrowserClosed = true;



        emitProgress(100, 'Audit protocols complete.');

    } catch (criticalError) {
        console.error(`[scanEngine CRITICAL]: Neural Audit Gated: ${criticalError.message}`);
        await ScanReport.findByIdAndUpdate(reportId, { 
            status: 'failed', 
            error: criticalError.message 
        });
        throw criticalError;
    } finally {
        if (!isBrowserClosed) await browser.close();
    }
};

/**
 * runTargetedCrawlScan - Lean site-wide audit (converged)
 */
const runTargetedCrawlScan = async (reportId, url, tests, emitProgress) => {
    console.log(`[scanEngine]: Initiating Converged Site Crawl: ${url}`);
    const pages = await crawler.crawlWebsite(reportId, url, emitProgress, { maxPages: 3, maxDepth: 0 });
    
    for (const targetUrl of pages) {
        // Reuse the single page logic for each target to ensure consistency
        await runSinglePageScan(reportId, targetUrl, tests, emitProgress).catch(err => {
            console.error(`[scanEngine]: Targeted page scan failed for ${targetUrl}: ${err.message}`);
        });
    }
};

/**
 * runFullScan - System Optimized Audit
 */
const runFullScan = async (reportId, url, emitProgress) => {
    const tests = ['console', 'network', 'ui', 'lighthouse', 'accessibility', 'links', 'forms'];
    await runSinglePageScan(reportId, url, tests, emitProgress).catch(err => {
        console.error(`[scanEngine]: Full scan execution failed: ${err.message}`);
    });
};

/**
 * crawlPages - Discovery module
 */
const crawlPages = async (url, options = {}) => {
    return await crawler.crawlWebsite(null, url, null, options);
};

module.exports = {
    runSinglePageScan,
    runTargetedCrawlScan,
    runFullScan,
    crawlPages,
    scanConsole,
    scanNetwork,
    scanForms,
    scanUI
};
