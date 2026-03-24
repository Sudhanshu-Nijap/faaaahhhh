const { chromium } = require('playwright');
const ScanReport = require('../models/ScanReport');
const path = require('path');

/**
 * qaScanner - Core Diagnostic Engine
 *
 * Captures console logs (all levels), network errors (4xx/5xx),
 * full-page screenshots, and performance metrics for any URL.
 * Uses Playwright for universal compatibility with SPAs.
 */
const scanPage = async (reportId, url) => {
    let browser;
    try {
        console.log(`[qaScanner]: Deep audit for ${url}`);

        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            viewport: { width: 1440, height: 900 }
        });

        const page = await context.newPage();

        // ─── Console Log Capture (all levels) ─────────────────────────────
        const rawConsoleErrors = [];
        page.on('console', msg => {
            rawConsoleErrors.push({
                page: url,
                message: msg.text().substring(0, 500),
                type: msg.type(), // log, info, warn, error, debug
                location: msg.location().url || 'inline'
            });
        });

        // ─── Network Error Capture (4xx / 5xx) ────────────────────────────
        const rawNetworkLogs = [];
        let totalSize = 0;
        let requestCount = 0;

        page.on('response', async response => {
            const status = response.status();
            requestCount++;
            try {
                const headers = response.headers();
                const size = parseInt(headers['content-length'] || '0');
                totalSize += size;

                if (status >= 400) {
                    rawNetworkLogs.push({
                        method: response.request().method(),
                        url: response.url(),
                        status,
                        type: response.request().resourceType(),
                        size,
                        recommendation:
                            status === 404 ? 'Asset not found. Verify file paths and server config.' :
                            status === 401 || status === 403 ? 'Unauthorized. Check auth headers and permissions.' :
                            status === 405 ? 'Method Not Allowed. Verify API supported methods.' :
                            status >= 500 ? 'Server error. Investigate backend logs immediately.' :
                            'Request failed. Check network stability and server config.'
                    });
                }
            } catch (_) {}
        });

        // ─── Page Load ────────────────────────────────────────────────────
        const startTime = Date.now();
        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        } catch (_) {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(3000);
        }
        const loadTime = Date.now() - startTime;

        // Wait for dynamic content (React/Angular hydration)
        await page.waitForTimeout(2000);

        // ─── Screenshot ───────────────────────────────────────────────────
        const screenshotName = `screenshot-${Date.now()}.png`;
        const screenshotPath = path.join(__dirname, '../screenshots', screenshotName);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        // **CRITICAL FIX**: Close Playwright Chrome BEFORE booting Lighthouse's Chrome!
        // This prevents hardware/memory starvation and port lock conflicts on Windows/Linux environments
        // especially on heavy pages like chatgpt.com
        if (browser) {
            await browser.close();
            browser = null;
            console.log(`[qaScanner]: Playwright released. Memory free for Lighthouse.`);
        }

        // ─── Lighthouse (Optional — skip if already ran) ──────────────────
        let lighthouseScores = { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 };
        // NOTE: Lighthouse requires a dedicated Chrome debug port and is kept
        // as a best-effort run. Errors are silently swallowed.
        try {
            console.log(`[qaScanner]: Booting Lighthouse for ${url}`);
            const lighthouse = (await import('lighthouse')).default;
            const chromeLauncher = await import('chrome-launcher');
            
            // Launch a fresh Chrome specifically for Lighthouse
            const chrome = await chromeLauncher.launch({ 
                chromeFlags: ['--headless', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
            });
            
            console.log(`[qaScanner]: Lighthouse Chrome started on port ${chrome.port}`);
            
            const result = await lighthouse(url, {
                port: chrome.port,
                output: 'json',
                logLevel: 'error',
                onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
                settings: { formFactor: 'desktop', screenEmulation: { disabled: true } }
            });
            
            await chrome.kill();
            
            if (result?.lhr?.categories) {
                lighthouseScores = {
                    performance: (result.lhr.categories.performance?.score || 0) * 100,
                    accessibility: (result.lhr.categories.accessibility?.score || 0) * 100,
                    bestPractices: (result.lhr.categories['best-practices']?.score || 0) * 100,
                    seo: (result.lhr.categories.seo?.score || 0) * 100
                };
                console.log(`[qaScanner]: Lighthouse scores acquired for ${url}:`, lighthouseScores);
            } else {
                console.warn(`[qaScanner]: Lighthouse lhr/categories missing for ${url}`);
            }
        } catch (lhError) {
            console.error(`[qaScanner Warning]: Lighthouse failed completely for ${url}:`, lhError);
        }

        // ─── Map data to schema ────────────────────────────────────────────
        const consoleErrors = rawConsoleErrors.map(e => ({
            page: String(e.page),
            message: String(e.message),
            type: String(e.type),
            location: String(e.location),
            recommendation:
                e.type === 'error' ? 'JavaScript execution failure. Review stack trace in browser DevTools.' :
                e.type === 'warning' ? 'Non-critical warning. Check for deprecated APIs or minor errors.' :
                e.type === 'info' ? 'Informational log. No action required unless unexpected.' :
                'Diagnostic console output.'
        }));

        const networkLogs = rawNetworkLogs.map(n => ({
            method: String(n.method),
            url: String(n.url),
            status: Number(n.status),
            time: 0,
            size: Number(n.size),
            type: String(n.type),
            recommendation: n.recommendation
        }));

        const updateData = {
            $push: {
                screenshots: { page: String(url), path: `/screenshots/${screenshotName}`, type: 'Full Page' }
            },
            $set: {
                'performanceMetrics.loadTime': Number(loadTime),
                'performanceMetrics.pageSize': Number(totalSize),
                'performanceMetrics.requestCount': Number(requestCount)
            }
        };

        if (lighthouseScores.performance > 0 || lighthouseScores.seo > 0 || lighthouseScores.accessibility > 0 || lighthouseScores.bestPractices > 0) {
            updateData.$set.lighthouseScores = lighthouseScores;
        }

        if (consoleErrors.length > 0) updateData.$push.consoleErrors = { $each: consoleErrors };
        if (networkLogs.length > 0) updateData.$push.networkLogs = { $each: networkLogs };

        await ScanReport.findByIdAndUpdate(reportId, updateData);
        console.log(`[qaScanner]: Audit complete for ${url} — ${consoleErrors.length} console, ${networkLogs.length} network issues`);

    } catch (error) {
        console.error(`[qaScanner] Critical Failure on ${url}: ${error.message}`);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { scanPage };
