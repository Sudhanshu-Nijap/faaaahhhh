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
            let rect = { x: 0, y: 0, width: 0, height: 0 };
            try {
                htmlSnippet = item.outerHTML?.substring(0, 500);
                const r = item.getBoundingClientRect();
                rect = { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
            } catch (e) {}

            issues.push({
                ...issueObj,
                location: getSpatialContext(item),
                htmlSnippet: htmlSnippet,
                rect: rect,
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
            }, 50);
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
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-CH-UA': '"Not A(Brand";v="99", "Google Chrome";v="122", "Chromium";v="122"',
                'Sec-CH-UA-Mobile': '?0',
                'Sec-CH-UA-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        // --- FLASH-MODE: Resource Shield (V3) ---
        await context.route('**/*', (route) => {
            const url = route.request().url();
            const blockedDomains = [
                'google-analytics.com', 'googletagmanager.com', 'facebook.com', 
                'connect.facebook.net', 'ads-twitter.com', 'doubleclick.net', 
                'adnxs.com', 'impactradius-event.com', 'hotjar.com'
            ];
            
            if (blockedDomains.some(d => url.includes(d))) {
                return route.abort();
            }
            route.continue();
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
        console.log(`[scanEngine]: Initializing Ghost-Protocol Level 2 navigation for ${url}...`);
        
        const jitter = 200 + Math.floor(Math.random() * 600);
        await new Promise(res => setTimeout(res, jitter));

        try {
            await page.goto(url, { waitUntil: 'load', timeout: 35000 });
            console.log(`[scanEngine]: Uplink stable (${url}). Commencing Neural Drift...`);
            await page.waitForLoadState('domcontentloaded');
            await neuralDrift(page);
            await new Promise(r => setTimeout(r, 1000));
        } catch (navError) {
            console.warn(`[scanEngine]: Tactical Navigation delay: ${navError.message}. Triggering High-Resiliency Fallback...`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        }
        
        const loadTime = Date.now() - startTime;
        console.log(`[scanEngine]: Page stabilized through Neural Drift in ${loadTime}ms.`);
        
        emitProgress(25, 'Stabilizing page & triggering dynamic assets...');
        await neuralScroll(page).catch(() => {});
        
        await page.evaluate(() => {
            const selectors = [
                '[id*=\"cookie\"]', '[class*=\"cookie\"]', 
                '[id*=\"consent\"]', '[class*=\"consent\"]',
                '[id*=\"banner\"]', '[class*=\"banner\"]',
                '.modal-backdrop', '.modal-open',
                '[class*=\"overlay\"]', '[id*=\"overlay\"]',
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

        await page.waitForTimeout(1000);

        const screenshotName = `screenshot-${Date.now()}.png`;
        const screenshotPath = path.join(__dirname, '../screenshots', screenshotName);
        
        emitProgress(30, 'Capturing high-fidelity visual context...');
        await page.screenshot({ 
            path: screenshotPath, 
            fullPage: true, 
            animations: 'disabled',
            timeout: 30000 
        }).catch((e) => {
            console.warn('[scanEngine]: Full-page screenshot failed, falling back to viewport:', e.message);
            return page.screenshot({ path: screenshotPath, fullPage: false, timeout: 15000 });
        });

        let formIssues = [];
        if (scannedModules.includes('forms') || scannedModules.includes('ui')) {
            emitProgress(40, 'Auditing form interaction layers...');
            const formScanner = require('./formScanner');
            formIssues = await formScanner.scanForms(page);
        }

        const uiIssues = scannedModules.includes('ui') ? await scanUI(page).catch(() => []) : [];
        const results = {
            url,
            consoleErrors: rawConsole,
            networkLogs: rawNetwork,
            uiIssues: uiIssues.map(u => ({ ...u, page: url })),
            formIssues: formIssues.map(f => ({ ...f, page: url })),
            loadTime,
            totalSize,
            requestCount,
            screenshot: { 
                page: url, 
                path: `/screenshots/${screenshotName}`, 
                type: 'High-Fidelity Scan',
                timestamp: new Date().toISOString()
            },
            accessibilityIssues: []
        };

        // --- 2c. Modular Deep Diagnostic (Pulse) ---
        if (scannedModules.includes('lighthouse')) {
            emitProgress(70, 'Running Lighthouse deep diagnostic (Synthetic Pulse)...');
            
            // --- SELF-HEALING PULSE PROTOCOL (V2) ---
            let lhResult = null;
            let attempts = 0;
            const maxAttempts = 2;

            while (attempts < maxAttempts) {
                try {
                    lhResult = await (require('./qaScanner').runDedicatedScan(url));
                    if (lhResult && lhResult.scores?.performance > 0) break;
                    throw new Error('Incomplete telemetry captured');
                } catch (lhErr) {
                    attempts++;
                    console.warn(`[scanEngine]: Lighthouse attempt ${attempts} failed: ${lhErr.message}`);
                    if (attempts < maxAttempts) {
                        emitProgress(72, `Pulse failure. Triggering Neural Reset (Attempt ${attempts + 1})...`);
                        await new Promise(r => setTimeout(r, 2500)); 
                    }
                }
            }

            if (lhResult) {
                results.lighthouseScores = lhResult.scores;
                results.accessibilityIssues.push(...lhResult.accessibilityIssues);
            }
        }

        let updatedAtlas = atlas;
        if (!isBrowserClosed) {
            const atlasData = await page.evaluate(() => Array.from(window.__sentinel_atlas || []));
            updatedAtlas = new Set(atlasData);
        }

        results.atlas = updatedAtlas;
        results.cdpPort = port;
        return results;

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
        maxPages: scope === 'site' ? 8 : 1, 
        maxDepth: scope === 'site' ? 2 : 0 
    });
    
    const auditLimit = 15;
    const pagesToAudit = pages.slice(0, auditLimit);
    let sessionAtlas = new Set();
    
    const siteLogs = {
        consoleErrors: [],
        networkLogs: [],
        uiIssues: [],
        formIssues: [],
        screenshots: [],
        accessibilityIssues: [],
        lighthouseScores: null,
        metrics: { totalSize: 0, loadTime: 0, requestCount: 0 }
    };

    if (pagesToAudit.length > 0) {
        const batchSize = 5; // Optimized for high-throughput concurrency
        for (let i = 0; i < pagesToAudit.length; i += batchSize) {
            const batch = pagesToAudit.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (pageUrl, batchIdx) => {
                const globalIdx = i + batchIdx;
                
                // --- NEURAL STAGGERING (V2) ---
                await new Promise(r => setTimeout(r, batchIdx * 600));
                
                const isMainPage = normalizeUrl(pageUrl) === normalizeUrl(url);
                // LEAN AUDIT PROTOCOL: Sub-pages skip heavy modules for speed
                const activeTests = isMainPage ? tests : tests.filter(t => !['lighthouse', 'forms', 'accessibility'].includes(t));
                
                const onPageProgress = (percent, message) => {
                    const totalProgress = Math.round(((globalIdx / pagesToAudit.length) * 100) + (percent / pagesToAudit.length));
                    emitProgress(totalProgress, `[Warp-Drive] Node ${globalIdx+1}/${pagesToAudit.length}: ${message}`);
                };

                const result = await withTimeout(
                    runSinglePageScan(reportId, pageUrl, activeTests, onPageProgress, sessionAtlas),
                    90000, 
                    `Node Audit (${pageUrl})`
                ).catch(err => {
                    console.error(`[scanEngine]: Warp-Drive Node Failure (${pageUrl}): ${err.message}`);
                    return null;
                });

                if (result) {
                    siteLogs.consoleErrors.push(...result.consoleErrors);
                    siteLogs.networkLogs.push(...result.networkLogs);
                    siteLogs.uiIssues.push(...result.uiIssues);
                    siteLogs.formIssues.push(...result.formIssues);
                    if (result.screenshot) {
                        siteLogs.screenshots.push(result.screenshot);
                    }
                    siteLogs.metrics.totalSize += result.totalSize;
                    siteLogs.metrics.loadTime = Math.max(siteLogs.metrics.loadTime, result.loadTime);
                    siteLogs.metrics.requestCount += result.requestCount;
                    
                    if (result.lighthouseScores) {
                        siteLogs.lighthouseScores = result.lighthouseScores;
                        siteLogs.accessibilityIssues.push(...result.accessibilityIssues);
                    }
                }
            }));
        }

        const siteResults = {
            consoleErrors: siteLogs.consoleErrors,
            uiIssues: siteLogs.uiIssues,
            formIssues: siteLogs.formIssues,
            networkLogs: siteLogs.networkLogs,
            screenshots: siteLogs.screenshots,
            lighthouseScores: siteLogs.lighthouseScores,
            accessibilityIssues: siteLogs.accessibilityIssues,
            loadTime: siteLogs.metrics.loadTime,
            totalSize: siteLogs.metrics.totalSize,
            requestCount: siteLogs.metrics.requestCount
        };

        await persistScanData(reportId, siteResults);
        console.log('[scanEngine]: Multi-threaded Warp-Drive report generated.');
    }
};

/**
 * persistScanData - Centralized persistence for all audit results.
 */
const persistScanData = async (reportId, results) => {
    console.log(`[scanEngine]: Persisting tactical telemetry for report ${reportId}...`);
    
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
            accessibilityIssues: (results.accessibilityIssues || []).slice(0, 100),
            lighthouseScores: results.lighthouseScores,
            networkLogs: (results.networkLogs || []).slice(0, 200),
            screenshots: (results.screenshots && results.screenshots.length > 0) ? results.screenshots : (results.screenshot ? [results.screenshot] : []),
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
 * neuralDrift - Simulates human mechanical interaction to bypass bot-detection challenges.
 */
async function neuralDrift(page) {
    try {
        const { width, height } = page.viewportSize();
        for (let i = 0; i < 1; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            await page.mouse.move(x, y, { steps: 15 });
            await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
        }
        await page.mouse.wheel(0, 400 + Math.floor(Math.random() * 200));
        await new Promise(r => setTimeout(r, 400));
        await page.mouse.wheel(0, -(200 + Math.floor(Math.random() * 100)));
    } catch (e) {
        console.warn('[scanEngine]: Neural Drift encountered non-critical turbulence:', e.message);
    }
}

/**
 * applyStealthPatches - Hardens the browser context against WAF/Bot detection.
 */
async function applyStealthPatches(page) {
    const memOptions = [4, 8];
    const cpuOptions = [4, 8, 12];
    const pickedMem = memOptions[Math.floor(Math.random() * memOptions.length)];
    const pickedCpu = cpuOptions[Math.floor(Math.random() * cpuOptions.length)];

    await page.addInitScript(({ memory, cpu }) => {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.'; 
            if (parameter === 37446) return 'Intel(R) Iris(R) Xe Graphics (0x9A49)'; 
            return getParameter.apply(this, arguments);
        };
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => memory });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => cpu });
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
        Object.defineProperty(navigator, 'pdfViewerEnabled', { get: () => true });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { 
            get: () => ({
                length: 3,
                0: { name: 'PDF Viewer' },
                1: { name: 'Chrome PDF Viewer' },
                2: { name: 'Chromium PDF Viewer' },
                item: (i) => this[i],
                namedItem: (n) => this[0]
            }) 
        });
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
    }, { memory: pickedMem, cpu: pickedCpu });
}

/**
 * normalizeUrl - Ensures consistent URL comparison for target identification.
 */
function normalizeUrl(url) {
    try {
        const u = new URL(url);
        let path = u.pathname.replace(/\/+$/, '');
        if (path === '') path = '/';
        return `${u.protocol}//${u.hostname}${path}`;
    } catch (_) {
        return url;
    }
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
