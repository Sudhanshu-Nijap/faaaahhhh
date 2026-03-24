const { chromium } = require('playwright');
const ScanReport = require('../models/ScanReport');
const axios = require('axios');

/**
 * crawlWebsite - Universal Crawler with Broken Link Detection
 *
 * Discovers all internal pages (up to maxPages) and validates
 * every link (internal + external) by making HEAD/GET requests.
 * Uses Playwright for SPA support (React/Angular/Vue).
 */
const crawlWebsite = async (reportId, baseUrl) => {
    const visited = new Set();
    const queue = [baseUrl];
    const internalPages = new Set();
    const allLinks = new Set();
    const brokenLinks = [];
    const maxPages = 15;
    const maxLinks = 80;

    let domain;
    try {
        domain = new URL(baseUrl).hostname;
    } catch (_) {
        console.error(`[Crawler]: Invalid URL: ${baseUrl}`);
        return [baseUrl];
    }

    let browser;
    try {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
        });
        const page = await context.newPage();

        // ─── Phase 1: Crawl internal pages ──────────────────────────────
        while (queue.length > 0 && visited.size < maxPages) {
            const url = queue.shift();
            if (visited.has(url)) continue;
            visited.add(url);

            console.log(`[Crawler]: Visiting ${url}`);
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await page.waitForTimeout(1500); // Let JS render
                internalPages.add(url);

                // Extract all links
                const links = await page.evaluate(() =>
                    Array.from(document.querySelectorAll('a[href]'))
                        .map(a => a.href)
                        .filter(href => href.startsWith('http') && !href.includes('#') && !href.includes('mailto:') && !href.includes('tel:') && !href.includes('javascript:'))
                );

                for (const link of links) {
                    allLinks.add(link);
                    try {
                        const linkHostname = new URL(link).hostname;
                        if (linkHostname === domain && !visited.has(link) && !queue.includes(link)) {
                            queue.push(link);
                        }
                    } catch (_) {}
                }
            } catch (e) {
                console.warn(`[Crawler]: Failed to crawl ${url}: ${e.message}`);
            }
        }

        await browser.close();
        browser = null;

        // ─── Phase 2: Broken Link Check with Promise.all ─────────────────
        console.log(`[Crawler]: Checking ${Math.min(allLinks.size, maxLinks)} links for breakage...`);
        const linksToCheck = [...allLinks].slice(0, maxLinks);

        await Promise.allSettled(
            linksToCheck.map(async (link) => {
                try {
                    let status = 0;
                    try {
                        // Try HEAD first (faster), fall back to GET
                        const res = await axios.head(link, {
                            timeout: 8000,
                            maxRedirects: 5,
                            validateStatus: () => true,
                            headers: { 'User-Agent': 'Sentinel-QA-Bot/1.0' }
                        });
                        status = res.status;
                        // Some servers reject HEAD — try GET if 405
                        if (status === 405) {
                            const getRes = await axios.get(link, {
                                timeout: 8000,
                                maxRedirects: 5,
                                validateStatus: () => true,
                                headers: { 'User-Agent': 'Sentinel-QA-Bot/1.0' }
                            });
                            status = getRes.status;
                        }
                    } catch (e) {
                        status = 0; // Connection error = broken
                    }

                    const isBroken = status === 0 || status === 404 || status === 410 || status >= 500;

                    if (isBroken) {
                        brokenLinks.push({
                            page: baseUrl,
                            link: link,
                            status: status,
                            recommendation:
                                status === 0 ? 'Connection failed — host may be down or URL is malformed.' :
                                status === 404 ? 'Page/resource not found. Update or remove this link.' :
                                status === 410 ? 'Resource permanently removed. Remove this link.' :
                                status >= 500 ? 'Server error on destination. Contact server owner.' :
                                'Link appears broken. Verify the destination URL.'
                        });
                    }
                } catch (_) {}
            })
        );

        // ─── Persist results ──────────────────────────────────────────────
        const update = { $set: { pagesCrawled: internalPages.size } };
        if (brokenLinks.length > 0) {
            update.$push = { brokenLinks: { $each: brokenLinks } };
            console.log(`[Crawler]: ${brokenLinks.length} broken links found.`);
        }

        await ScanReport.findByIdAndUpdate(reportId, update);
        console.log(`[Crawler]: Discovered ${internalPages.size} internal pages.`);
        return Array.from(internalPages);

    } catch (error) {
        console.error(`[Crawler] Critical failure: ${error.message}`);
        return [baseUrl];
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { crawlWebsite };
