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
        
        // 1. Layout Integrity
        if (document.body.scrollWidth > window.innerWidth) {
            issues.push({ type: 'UX_VISUAL', issue: 'Horizontal overflow detected', severity: 'Medium', recommendation: 'Check for elements with fixed widths or absolute positioning leaking outside of viewport.' });
        }
        
        // 2. SEO & Structure
        if (!document.querySelector('h1')) {
            issues.push({ type: 'SEO_STRUCTURAL', issue: 'Missing H1 heading', severity: 'Low', recommendation: 'Every page should have exactly one H1 for optimal search indexing.' });
        }

        // --- Spatial Intelligence Helpers ---
        const getSpatialContext = (el) => {
            try {
                // Find nearest heading or section title
                let current = el.parentElement;
                while (current && current !== document.body) {
                    const heading = current.querySelector('h1, h2, h3, h4, h5, h6');
                    if (heading && heading.innerText?.trim()) return heading.innerText.trim();
                    current = current.parentElement;
                }
                return 'Main Content';
            } catch { return 'Global'; }
        };

        const generateIdentifiableSelector = (el) => {
            if (el.tagName === 'IMG') return el.src;
            const id = el.id ? `#${el.id}` : '';
            const cls = (el.className && typeof el.className === 'string') 
                ? `.${el.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.')}` 
                : '';
            const text = el.innerText?.trim().substring(0, 20);
            return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` [${text}]` : ''}` || el.tagName.toLowerCase();
        };

        const addIssue = (item, issueObj) => {
            if (!window.__sentinel_atlas) window.__sentinel_atlas = new Set();
            const signature = `${issueObj.type}|${issueObj.selector}`;
            if (window.__sentinel_atlas.has(signature)) return;
            window.__sentinel_atlas.add(signature);
            
            // Capture a safe snippet of the offending element
            let htmlSnippet = 'UNAVAILABLE';
            try {
                htmlSnippet = item.outerHTML?.substring(0, 500);
            } catch (e) {}

            issues.push({
                ...issueObj,
                location: getSpatialContext(item),
                htmlSnippet: htmlSnippet,
                timestamp: new Date().toISOString()
            });
        };

        // 3. Image UX
        const images = Array.from(document.querySelectorAll('img'));
        images.forEach(img => {
            const rect = img.getBoundingClientRect();
            if (rect.width < 30 && rect.height < 30) return;

            if (!img.alt && !img.hasAttribute('aria-label') && !img.hasAttribute('alt')) {
                addIssue(img, { 
                    type: 'UX_ACCESSIBILITY', 
                    issue: 'Image missing alternate text', 
                    severity: 'High', 
                    selector: img.src,
                    technicalImpact: 'Severe compliance failure (WCAG 2.1 - 1.1.1). Non-text content must have a text alternative for screen readers.',
                    recommendation: 'Add alt=\"\" for decorative images or descriptive text for informational images.' 
                });
            }
        });

        // 4. Interactive Target Integrity
        const interactive = Array.from(document.querySelectorAll('a, button, input[type=\"button\"], input[type=\"submit\"]'));
        interactive.forEach(el => {
            const rect = el.getBoundingClientRect();
            
            if (rect.width > 0 && rect.height > 0 && (rect.width < 32 || rect.height < 32)) {
                addIssue(el, {
                    type: 'UX_MOBILE',
                    issue: 'Small touch target detected',
                    severity: 'Low',
                    selector: generateIdentifiableSelector(el),
                    technicalImpact: 'Sub-optimal mobile experience. Touch targets below 44px (or 10mm) increase user error rates on smaller viewports.',
                    recommendation: 'Increase target size to at least 44x44px for optimal mobile UX.'
                });
            }

            const hasIcon = el.querySelector('svg, img, i, span, em');
            if ((el.tagName === 'BUTTON' || el.tagName === 'A') && !el.innerText?.trim() && !el.getAttribute('aria-label') && !hasIcon) {
                addIssue(el, {
                    type: 'UX_VISUAL',
                    issue: 'Empty interactive element detected',
                    severity: 'Medium',
                    selector: generateIdentifiableSelector(el),
                    technicalImpact: 'Interaction dead-end. Without labels or icons, users cannot identify the purpose of this element.',
                    recommendation: 'Ensure all buttons have visible text, an icon, or an aria-label.'
                });
            }
        });

        // 5. Layout Shift (CLS)
        const media = Array.from(document.querySelectorAll('img, video')).slice(0, 10);
        media.forEach(m => {
            const rect = m.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 100) {
                if (!m.getAttribute('width') || !m.getAttribute('height')) {
                    addIssue(m, {
                        type: 'PERF_STABILITY',
                        issue: 'Potential Layout Shift (CLS)',
                        severity: 'Low',
                        selector: m.tagName === 'IMG' ? m.src : m.tagName.toLowerCase(),
                        technicalImpact: 'Cumulative Layout Shift (CLS) risk. Missing dimensions cause page jumps during asset loading, lowering Core Web Vitals score.',
                        recommendation: 'Add explicit width and height attributes.'
                    });
                }
            }
        });

        return issues.slice(0, 100);
    });
};

/**
 * neuralScroll - Simulates a human scroll sequence to trigger lazy-loaded assets.
 */
const neuralScroll = async (page) => {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    window.scrollTo(0, 0);
                    resolve();
                }
            }, 100);
        });
    });
    await new Promise(res => setTimeout(res, 500));
};

/**
 * runSinglePageScan - Fast, converged audit of one URL
 */
const runSinglePageScan = async (reportId, url, scannedModules = [], emitProgress, atlas = null) => {
    let isBrowserClosed = false;
    let browser;
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;

        console.log(`[scanEngine]: Initiating Converged Lean Scan: ${url} | Modules: ${scannedModules.join(', ')}`);
        emitProgress(5, 'Establishing neural uplink...');
    
        const port = 9222 + Math.floor(Math.random() * 100);
        browser = await chromium.launch({ 
            headless: true,
            args: [
                `--remote-debugging-port=${port}`, 
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled' // Stealth: mask playwright presence
            ]
        });

        const context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            deviceScaleFactor: 2,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();
        
        // --- GHOST PROTOCOL: Stealth Fingerprinting (V6 Hardening) ---
        await applyStealthPatches(page);
        
        // Initialize the global atlas for this page session if provided
        if (atlas) {
            await page.evaluate((serializedAtlas) => {
                window.__sentinel_atlas = new Set(serializedAtlas);
            }, Array.from(atlas));
        }

        const rawConsole = [];
        const rawNetwork = [];
        let totalSize = 0;
        let requestCount = 0;

        page.on('console', msg => {
            if (msg.type() === 'error') {
                const errorLocation = msg.location().url || '';
                // Domain Filtering: Only report errors from the site's own domain or inline scripts
                const isInternal = !errorLocation || errorLocation.includes(domain) || errorLocation === 'inline';
                
                if (isInternal) {
                    rawConsole.push({
                        page: url,
                        message: msg.text().substring(0, 500),
                        type: 'error',
                        location: errorLocation || 'inline',
                        recommendation: 'Fix internal script failure.'
                    });
                }
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
                        page: url,
                        method: response.request().method(),
                        url: response.url(),
                        status,
                        type: response.request().resourceType(),
                        recommendation: status === 404 ? 'Asset not found.' : 'Request failed.'
                    });
                }
            } catch (_) {}
        });
        
        // --- Adaptive Navigation Strategy (WAF Bypass V2) ---
        const startTime = Date.now();
        console.log(`[scanEngine]: Initializing stealth navigation pulse for ${url}...`);
        
        // Randomized human-like preamble to avoid instant-bot detection
        const jitter = 500 + Math.floor(Math.random() * 1000);
        await new Promise(res => setTimeout(res, jitter));

        try {
            // Speed Optimization: Use 'load' first, then a shorter stabilization window
            await page.goto(url, { waitUntil: 'load', timeout: 35000 });
            console.log(`[scanEngine]: Uplink stable (${url}). Commencing adaptive stabilization...`);
            
            // Wait for visual stability (much faster than networkidle for 3rd party trackers)
            await page.waitForLoadState('domcontentloaded');
            // Adaptive wait: 1s is usually enough after 'load' if the site isn't extremely heavy
            await new Promise(r => setTimeout(r, 1000));
        } catch (navError) {
            console.warn(`[scanEngine]: Tactical Navigation delay: ${navError.message}. Triggering High-Resiliency Fallback...`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        }
        
        // Human-Simulated interaction: Perform a subtle scroll to trigger lazy-load assets
        await page.mouse.wheel(0, 300);
        await new Promise(r => setTimeout(r, 500));
        await page.mouse.wheel(0, -300);
        
        const loadTime = Date.now() - startTime;
        console.log(`[scanEngine]: Page stabilized in ${loadTime}ms.`);
        
        // --- 2b. Converged Telemetry Capture ---
        emitProgress(25, 'Stabilizing page & triggering dynamic assets...');
        
        // Trigger lazy loads
        await neuralScroll(page).catch(() => {});
        
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
            timeout: 30000 // Extended for high-fidelity captures on slower uplinks
        }).catch((e) => {
            console.warn('[scanEngine]: Full-page screenshot failed, falling back to viewport:', e.message);
            return page.screenshot({ path: screenshotPath, fullPage: false, timeout: 15000 });
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
        // Note: Broken Link Audit is now centralized in crawler.js to avoid redundant checks per page.
        // This significantly optimizes scan speed for multi-page crawl.



        // Extract updated atlas before closing browser
        let updatedAtlas = atlas;
        if (!isBrowserClosed) {
            const result = await page.evaluate(() => Array.from(window.__sentinel_atlas || []));
            updatedAtlas = new Set(result);
        }

        // Return all findings for centralized deduplication
        return {
            consoleErrors: rawConsole,
            networkLogs: rawNetwork,
            uiIssues: uiIssues.map(u => ({ ...u, page: url })),
            formIssues: formIssues.map(f => ({ ...f, page: url })),
            loadTime,
            totalSize,
            requestCount,
            screenshot: { page: url, path: `/screenshots/${screenshotName}`, type: 'Full Audit' },
            atlas: updatedAtlas
        };

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
    
    const pages = await crawler.crawlWebsite(reportId, url, emitProgress, { 
        scope: scope,
        maxPages: scope === 'site' ? 20 : 1, 
        maxDepth: scope === 'site' ? 2 : 0 
    });
    
    const auditLimit = 10;
    const pagesToAudit = pages.slice(0, auditLimit);
    let sessionAtlas = new Set();
    
    // Aggregate storage for site-wide results
    const siteLogs = {
        consoleErrors: [],
        networkLogs: [],
        uiIssues: [],
        formIssues: [],
        screenshots: [],
        metrics: { totalSize: 0, loadTime: 0, requestCount: 0 }
    };

    if (pagesToAudit.length > 0) {
        for (let i = 0; i < pagesToAudit.length; i++) {
            const pageUrl = pagesToAudit[i];
            const onPageProgress = (percent, message) => {
                const totalProgress = Math.round(((i / pagesToAudit.length) * 100) + (percent / pagesToAudit.length));
                emitProgress(totalProgress, `Audit [${i+1}/${pagesToAudit.length}]: ${message}`);
            };

            const result = await runSinglePageScan(reportId, pageUrl, tests, onPageProgress, sessionAtlas).catch(err => {
                console.error(`[scanEngine]: Targeted page scan failed for ${pageUrl}: ${err.message}`);
                return null;
            });

            if (result) {
                // Aggregate and deduplicate
                siteLogs.consoleErrors.push(...result.consoleErrors);
                siteLogs.networkLogs.push(...result.networkLogs);
                siteLogs.uiIssues.push(...result.uiIssues);
                siteLogs.formIssues.push(...result.formIssues);
                siteLogs.screenshots.push(result.screenshot);
                siteLogs.metrics.totalSize += result.totalSize;
                siteLogs.metrics.loadTime = Math.max(siteLogs.metrics.loadTime, result.loadTime);
                siteLogs.metrics.requestCount += result.requestCount;
                sessionAtlas = result.atlas;
            }
        }

        // Prepare for centralized persistence
        const siteResults = {
            consoleErrors: siteLogs.consoleErrors,
            uiIssues: siteLogs.uiIssues,
            formIssues: siteLogs.formIssues,
            networkLogs: siteLogs.networkLogs,
            screenshots: siteLogs.screenshots,
            loadTime: siteLogs.metrics.loadTime,
            totalSize: siteLogs.metrics.totalSize,
            requestCount: siteLogs.metrics.requestCount
        };

        await persistScanData(reportId, siteResults);
        console.log('[scanEngine]: Site-wide deduped report generated.');
    }
};

/**
 * persistScanData - Centralized persistence for all audit results.
 */
const persistScanData = async (reportId, results) => {
    console.log(`[scanEngine]: Persisting tactical telemetry for report ${reportId}...`);
    
    // Neural Pruning Pass (Zero-Deduplication)
    const prune = (arr, fingerprint) => {
        const seen = new Set();
        return (arr || []).filter(item => {
            const sig = fingerprint(item);
            if (seen.has(sig)) return false;
            seen.add(sig);
            return true;
        });
    };

    const finalUI = prune(results.uiIssues, u => `${u.type}|${u.issue}|${u.selector}|${u.location}`);
    const finalForms = prune(results.formIssues, f => `${f.formName}|${f.type}|${f.fieldName}`);
    const finalConsole = prune(results.consoleErrors, c => `${c.message}|${c.location}`);

    await ScanReport.findByIdAndUpdate(reportId, {
        $set: {
            consoleErrors: finalConsole.slice(0, 100),
            uiIssues: finalUI.slice(0, 100),
            formIssues: finalForms.slice(0, 100),
            networkLogs: (results.networkLogs || []).slice(0, 200),
            screenshots: results.screenshots || (results.screenshot ? [results.screenshot] : []),
            'performanceMetrics.loadTime': results.loadTime,
            'performanceMetrics.pageSize': results.totalSize,
            'performanceMetrics.requestCount': results.requestCount
        }
    });
};

/**
 * runFullScan - System Optimized Audit (Single Page)
 */
const runFullScan = async (reportId, url, emitProgress) => {
    const tests = ['console', 'network', 'ui', 'lighthouse', 'accessibility', 'links', 'forms'];
    const result = await runSinglePageScan(reportId, url, tests, emitProgress).catch(err => {
        console.error(`[scanEngine]: Full scan execution failed: ${err.message}`);
        return null;
    });

    if (result) {
        await persistScanData(reportId, result);
    }
};

/**
 * crawlPages - Discovery module
 */
const crawlPages = async (url, options = {}) => {
    return await crawler.crawlWebsite(null, url, null, options);
};

/**
 * applyStealthPatches - Hardens the browser context against WAF/Bot detection.
 * Spoofs hardware concurrency, WebGL vendor, and various browser signatures.
 */
async function applyStealthPatches(page) {
    await page.addInitScript(() => {
        // 1. Spoof WebGL Vendor/Renderer (Common WAF Signal)
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
            if (parameter === 37446) return 'Intel(R) Iris(R) Xe Graphics (0x9A49)'; // UNMASKED_RENDERER_WEBGL
            return getParameter.apply(this, arguments);
        };

        // 2. Hide Webdriver Presence
        Object.defineProperty(navigator, 'webdriver', { get: () => false });

        // 3. Spoof Plugins & Hardware
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });

        // 4. Permission State masking
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
    });
}

module.exports = {
    runSinglePageScan,
    runTargetedCrawlScan,
    persistScanData,
    runFullScan,
    crawlPages,
    scanConsole,
    scanNetwork,
    scanForms,
    scanUI
};
