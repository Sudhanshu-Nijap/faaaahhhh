
/**
 * runDedicatedScan - Ultimate fallback using a fresh browser instance
 */
async function runDedicatedScan(url) {
    let chrome;
    try {
        const lighthouse = (await import('lighthouse')).default;
        const chromeLauncher = await import('chrome-launcher');
        const { chromium } = require('playwright');
        
        console.log(`[qaScanner]: Launching Dedicated Lighthouse Session for ${url}...`);

        let chromePath;
        try {
            chromePath = chromium.executablePath();
            console.log(`[qaScanner]: Bound to Playwright Chromium: ${chromePath}`);
        } catch (e) {
            console.warn('[qaScanner]: Could not determine Playwright Chromium path, letting chrome-launcher decide.');
        }

        chrome = await chromeLauncher.launch({ 
            chromePath: chromePath, 
            chromeFlags: [
                '--headless', 
                '--no-sandbox', 
                '--disable-gpu',
                '--disable-web-security',
                '--ignore-certificate-errors',
                '--remote-allow-origins=*',
                '--disable-storage-reset',
                '--disable-dev-shm-usage'
            ] 
        });
        
        console.log(`[qaScanner]: Pulse Port Active: ${chrome.port}. Stabilization Window (500ms)...`);
        await new Promise(res => setTimeout(res, 500));

        const result = await lighthouse(url, {
            port: chrome.port,
            output: 'json',
            logLevel: 'silent', 
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
            settings: {
                throttlingMethod: 'simulate', // Faster, more stable scores
                onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
                skipAudits: ['screenshot-thumbnails', 'final-screenshot'], // Playwright handles screenshots better
                screenEmulation: {
                    mobile: false,
                    width: 1350,
                    height: 940,
                    deviceScaleFactor: 1,
                    disabled: false,
                }
            }
        });

        if (result && result.lhr) {
            console.log(`[qaScanner]: Telemetry Captured for ${url}. Scores -> Perf: ${Math.round(result.lhr.categories.performance?.score * 100 || 0)}`);
            return processLhr(result.lhr, url);
        }
        
        throw new Error('Dedicated pulse returned no telemetry.');
    } catch (err) {
        console.error(`[qaScanner Critical Failure]: Dedicated Pulse failed for ${url}: ${err.message}`);
        return {
            scores: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
            accessibilityIssues: []
        };
    } finally {
        if (chrome) {
            console.log('[qaScanner]: Closing dedicated bridge...');
            try {
                if (typeof chrome.kill === 'function') {
                    await chrome.kill();
                }
            } catch (killErr) {
                console.warn('[qaScanner]: Non-critical cleanup failure:', killErr.message);
            }
            // --- High-Resiliency Cleanup Window (V34) ---
            await new Promise(res => setTimeout(res, 100));
        }
    }
}

/**
 * processLhr - Extracts strategic telemetry from the Lighthouse Result
 */
function processLhr(lhr, url) {
    const accessibilityAudits = [];
    const audits = lhr.audits || {};
    const accessCategory = lhr.categories.accessibility;
    
    if (accessCategory && accessCategory.auditRefs) {
        accessCategory.auditRefs.forEach(ref => {
            const audit = audits[ref.id];
            if (audit && audit.score !== null && audit.score < 1) {
                accessibilityAudits.push({
                    page: url,
                    issue: audit.title,
                    severity: ref.weight > 7 ? 'Critical' : ref.weight > 3 ? 'Medium' : 'Low',
                    element: audit.description?.substring(0, 300) || 'Structural non-compliance detected.',
                    recommendation: audit.title,
                    suggestedFix: audit.description
                });
            }
        });
    }

    const finalScores = {
        performance: Math.round((lhr.categories.performance?.score || 0) * 100),
        accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
        seo: Math.round((lhr.categories.seo?.score || 0) * 100)
    };

    console.log(`[qaScanner]: Processed Pulse Scores for ${url} | Perf: ${finalScores.performance} | SEO: ${finalScores.seo}`);

    return {
        scores: finalScores,
        accessibilityIssues: accessibilityAudits
    };
}

module.exports = { runDedicatedScan };
