const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const ScanReport = require('../models/ScanReport');

/**
 * testAccessibility
 * Uses axe-core (via puppeteer) for deep accessibility auditing.
 */
const testAccessibility = async (reportId, url) => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const results = await new AxePuppeteer(page).analyze();
        
        const issues = results.violations.map(v => ({
            page: url,
            issue: v.help,
            severity: v.impact,
            element: v.nodes.map(n => n.target).join(', '),
            recommendation: `${v.description}. Fix: ${v.helpUrl}`
        }));

        if (issues.length > 0) {
            await ScanReport.findByIdAndUpdate(reportId, {
                $push: { accessibilityIssues: { $each: issues } }
            });
        }
    } catch (error) {
        console.error("Axe-Core Error:", error.message);
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { testAccessibility };
