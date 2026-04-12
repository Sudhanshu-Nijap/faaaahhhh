const { chromium } = require('playwright');
const ScanReport = require('../models/ScanReport');
const crawler = require('./crawler');
const path = require('path');
const linkGuardian = require('./linkGuardian');
const axios = require('axios');

// Import Specialist Agents
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
    emitProgress(5, 'Pre-flight security audit...');

    // --- NEW: Global Pre-flight Logic ---
    const initialSecurity = linkGuardian.analyze(url);
    if (initialSecurity.isMalicious) {
        await ScanReport.findByIdAndUpdate(reportId, {
            $push: {
                securityIssues: {
                    page: url,
                    issue: `Critical Threat: ${initialSecurity.threatType}`,
                    severity: 'Critical',
                    link: url,
                    reason: initialSecurity.reason,
                    suggestedFix: "This domain matches high-fidelity phishing patterns. Neural audit aborted for safety."
                }
            }
        });
    }

    try {
        await axios.get(url, { timeout: 5000, validateStatus: () => true });
    } catch (e) {
        console.warn(`[scanEngine]: Host unreachable: ${url}`);
        emitProgress(10, 'Host unreachable. Finalizing reports...');
        await ScanReport.findByIdAndUpdate(reportId, { 
            status: 'failed', 
            error: 'Target host is unreachable. Scan terminated.' 
        });
        return;
    }

    emitProgress(15, 'Establishing neural uplink...');
    
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
            '--disable-gpu',
            '--no-first-run',
            '--disable-notifications',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            viewport: { width: 1440, height: 900 },
            deviceScaleFactor: 2 // High DPI for production accuracy
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
        
        // --- High-Resiliency Navigation Cycle ---
        const startTime = Date.now();
        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        } catch (navError) {
            console.warn(`[scanEngine]: Neural Navigation slow for ${url}: ${navError.message}`);
            // Fallback to simpler wait if networkidle hangs
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
        }
        const loadTime = Date.now() - startTime;
        
        // --- 2b. Converged Telemetry Capture ---
        emitProgress(25, 'Stabilizing page & identifying UI patterns...');
        
        // Hide common overlays (cookie banners, popups) for cleaner screenshots
        await page.evaluate(() => {
            const selectors = [
                '[id*="cookie"]', '[class*="cookie"]', 
                '[id*="consent"]', '[class*="consent"]',
                '[id*="banner"]', '[class*="banner"]',
                '.modal-backdrop', '.modal-open',
                '[class*="overlay"]', '[id*="overlay"]',
                '#GdprBanner', '.cc-banner'
            ];
            selectors.forEach(s => {
                try {
                    document.querySelectorAll(s).forEach(el => {
                        el.style.display = 'none';
                        el.style.pointerEvents = 'none';
                        el.style.opacity = '0';
                    });
                } catch(e) {}
            });
        }).catch(() => {});

        await page.waitForTimeout(1000); // Wait for animations to settle

        const screenshotName = `screenshot-${Date.now()}.png`;
        const screenshotPath = path.join(__dirname, '../screenshots', screenshotName);
        
        emitProgress(30, 'Capturing high-fidelity visual context...');
        // Accuracy Optimization: Use fullPage screenshot with moderate delay
        await page.screenshot({ 
            path: screenshotPath, 
            fullPage: true, 
            animations: 'disabled',
            timeout: 10000 
        }).catch((e) => {
            console.warn('[scanEngine]: Full-page screenshot failed, falling back to viewport:', e.message);
            return page.screenshot({ path: screenshotPath, fullPage: false });
        });

        // 2c. Interaction Audit: Forms
        let formIssues = [];
        if (scannedModules.includes('forms') || scannedModules.includes('ui')) {
            emitProgress(40, 'Auditing form interaction layers...');
            const formScanner = require('./formScanner');
            formIssues = await formScanner.scanForms(page);
        }

        const uiIssues = scannedModules.includes('ui') ? await scanUI(page).catch(() => []) : [];
        
        let brokenLinks = [];
        if (scannedModules.includes('links')) {
            emitProgress(60, 'Tracing navigation integrity...');
            const links = await page.evaluate(() => 
                Array.from(document.querySelectorAll('a[href]'))
                    .map(a => a.href)
                    .filter(href => href.startsWith('http'))
                    .slice(0, 10) // Production-ready sample size
            );
            
            // Parallelize link checks with Promise.all for speed
            await Promise.all(links.map(async (link) => {
                try {
                    const res = await axios.head(link, { 
                        timeout: 3000, 
                        validateStatus: () => true,
                        headers: { 'User-Agent': 'Sentinel-Turbo-Bot/1.0' }
                    }).catch(async () => {
                        // Fallback to GET if HEAD fails
                        return await axios.get(link, { timeout: 5000, validateStatus: () => true }).catch(() => null);
                    });
                    
                    if (!res || res.status >= 400) {
                        brokenLinks.push({ page: url, link, status: res ? res.status : 0, recommendation: 'Update or remove broken link.' });
                    }
                } catch (_) {}
            }));
        }



        // 5. Finalize Playwright Telemetry
        emitProgress(80, 'Synthesizing Session Telemetry...');
        
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
        if (scannedModules.includes('console') && rawConsole.length > 0) finalUpdate.$push.consoleErrors = { $each: rawConsole };
        if (scannedModules.includes('network') && rawNetwork.length > 0) finalUpdate.$push.networkLogs = { $each: rawNetwork };
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
            await withTimeout(browser.close(), 2000, 'Browser Close');
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
        if (browser && !isBrowserClosed) await browser.close();
    }
};

/**
 * runTargetedCrawlScan - Lean site-wide audit (converged)
 */
const runTargetedCrawlScan = async (reportId, url, tests, emitProgress, scope = 'site') => {
    console.log(`[scanEngine]: Initiating Converged Site Crawl: ${url} | Scope: ${scope}`);
    
    // 1. Universal Discovery Phase
    const pages = await crawler.crawlWebsite(reportId, url, emitProgress, { 
        scope: scope,
        maxPages: scope === 'site' ? 20 : 1, 
        maxDepth: scope === 'site' ? 2 : 0 
    });
    
    // Parallel Diagnostic Surge - Only diagnostic entry page for speed
    // If multiple pages are found, they're only tracked in the discovery stage
    if (pages.length > 0) {
        await runSinglePageScan(reportId, pages[0], tests, emitProgress).catch(err => {
            console.error(`[scanEngine]: Targeted page scan failed for ${pages[0]}: ${err.message}`);
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
