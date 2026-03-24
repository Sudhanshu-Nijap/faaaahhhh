const { chromium } = require('playwright');
const ScanReport = require('../models/ScanReport');

/**
 * flowTester - UI Flow & Interaction Audit
 *
 * Tests critical user flows: navigation, button states, form discoverability.
 * Uses Playwright directly (removed Cypress dependency from the runtime path).
 */
const testFlows = async (reportId, baseUrl) => {
    let browser;
    try {
        console.log(`[FlowTester]: Auditing UI flows for ${baseUrl}`);

        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            viewport: { width: 1440, height: 900 }
        });

        const page = await context.newPage();

        try {
            await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
        } catch (_) {
            await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await page.waitForTimeout(3000);
        }

        const flowIssues = [];

        // 1. Check for disabled buttons
        const buttons = await page.locator('button, input[type="submit"]').all();
        for (const btn of buttons.slice(0, 30)) {
            try {
                const isDisabled = await btn.isDisabled();
                const text = (await btn.innerText().catch(() => '')).trim() || 'Unnamed Button';
                if (isDisabled) {
                    flowIssues.push({
                        page: baseUrl,
                        issue: 'Disabled Interactive Element',
                        details: `Button "${text.substring(0, 60)}" is permanently disabled — users cannot interact with it.`,
                        recommendation: 'Verify this button should be disabled by default. If it should be interactive, fix the state logic.'
                    });
                }
            } catch (_) {}
        }

        // 2. Verify navigation links respond (internal only, fast check)
        const links = await page.locator('nav a, header a').all();
        for (const link of links.slice(0, 10)) {
            try {
                const href = await link.getAttribute('href');
                if (!href || href === '#' || href.startsWith('javascript')) {
                    const text = (await link.innerText().catch(() => '')).trim();
                    flowIssues.push({
                        page: baseUrl,
                        issue: 'Dead Navigation Link',
                        details: `Nav link "${text.substring(0, 60)}" has no valid href (value: "${href}").`,
                        recommendation: 'Update nav link to point to a real route or remove it.'
                    });
                }
            } catch (_) {}
        }

        // 3. Check for empty or missing page title
        const title = await page.title();
        if (!title || title.trim().length === 0) {
            flowIssues.push({
                page: baseUrl,
                issue: 'Missing Page Title',
                details: 'The page has no <title> tag — bad for SEO and screen readers.',
                recommendation: 'Add a descriptive <title> tag to every page.'
            });
        }

        // 4. Check for images without alt text
        const images = await page.locator('img:not([alt])').count();
        if (images > 0) {
            flowIssues.push({
                page: baseUrl,
                issue: `${images} Image(s) Missing Alt Text`,
                details: `Found ${images} <img> elements with no alt attribute — screen readers cannot describe them.`,
                recommendation: 'Add descriptive alt="" attributes to all images. Use empty alt="" for decorative images.'
            });
        }

        if (flowIssues.length > 0) {
            await ScanReport.findByIdAndUpdate(reportId, {
                $push: { uiIssues: { $each: flowIssues } }
            });
            console.log(`[FlowTester]: Found ${flowIssues.length} UI flow issues.`);
        } else {
            console.log(`[FlowTester]: No flow issues detected.`);
        }

    } catch (error) {
        console.error(`[FlowTester Error] ${baseUrl}: ${error.message}`);
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { testFlows };
