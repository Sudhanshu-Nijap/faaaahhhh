const { chromium } = require('playwright');
const ScanReport = require('../models/ScanReport');
const axios = require('axios');
const path = require('path');

/**
 * crawlWebsite - Universal Crawler with Discovery Constraints
 * @param {Object} options - { maxPages, maxDepth, emitProgress }
 */
const crawlWebsite = async (reportId, baseUrl, emitProgress, options = {}) => {
    const visited = new Set();
    const queue = [{ url: baseUrl, depth: 0 }]; // Track depth per URL
    const internalPages = new Set();
    const allLinks = new Set();
    const brokenLinks = [];
    
    // Constraints
    const maxPages = options.maxPages || 15;
    const maxDepth = options.maxDepth !== undefined ? options.maxDepth : 2;
    const maxLinks = 80;
    const structure = { nodes: [], links: [] };

    const progress = (p, s) => {
        if (emitProgress) emitProgress(p, s);
    };
    
    let domain;
    try {
        domain = new URL(baseUrl).hostname;
    } catch (_) {
        console.error(`[Crawler]: Invalid URL: ${baseUrl}`);
        progress(1, "Error: Invalid target URL.");
        return [baseUrl];
    }

    progress(7, `Initializing crawl for ${domain}...`);

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
            const { url, depth } = queue.shift();
            if (visited.has(url) || depth > maxDepth) continue;
            visited.add(url);

            console.log(`[Crawler]: Visiting ${url}`);
            try {
                const pathName = new URL(url).pathname || '/';
                progress(7 + Math.floor((visited.size / maxPages) * 3), `Crawling: ${pathName}`);
            } catch (e) {
                progress(7 + Math.floor((visited.size / maxPages) * 3), `Crawling: ${url.substring(0, 20)}...`);
            }
            
            try {
                // Multi-stage navigation strategy for maximum resilience
                try {
                    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
                } catch (e) {
                    console.warn(`[Crawler]: 'load' timed out for ${url}, trying 'domcontentloaded'...`);
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                }
                
                await page.waitForTimeout(2000); // Allow additional time for dynamic SPAs
                internalPages.add(url);

                // Capture Page Screenshot
                const screenshotName = `screenshot-${Date.now()}-${visited.size}.png`;
                const screenshotPath = path.join(__dirname, '../screenshots', screenshotName);
                try {
                    await page.screenshot({ path: screenshotPath, fullPage: false });
                    await ScanReport.findByIdAndUpdate(reportId, {
                        $push: { screenshots: { page: url, path: `/screenshots/${screenshotName}`, type: 'Crawl Snapshot' } }
                    });
                } catch (ssErr) {
                    console.warn(`[Crawler]: Screenshot failed for ${url}: ${ssErr.message}`);
                }

                // ── Site Structure Mapping ──────────────────────────────────
                const pathName = new URL(url).pathname || '/';
                const nodeId = url; 
                
                // Add node if not exists
                const nodeExists = structure.nodes.find(n => n.id === nodeId);
                if (!nodeExists) {
                    structure.nodes.push({ id: nodeId, label: pathName, url, depth });
                }

                // Extract all links
                const links = await page.evaluate(() =>
                    Array.from(document.querySelectorAll('a[href]'))
                        .map(a => ({ href: a.href, text: a.innerText.trim() }))
                        .filter(l => l.href.startsWith('http') && !l.href.includes('#') && !l.href.includes('mailto:') && !l.href.includes('tel:') && !l.href.includes('javascript:'))
                );

                for (const linkGroup of links) {
                    const link = linkGroup.href;
                    allLinks.add(link);
                    try {
                        const linkUrl = new URL(link);
                        const linkHostname = linkUrl.hostname;
                        
                        if (linkHostname === domain) {
                             // Internal Link - Add to structure
                             const targetId = link;
                             const linkExists = structure.links.find(l => l.source === nodeId && l.target === targetId);
                             if (!linkExists && nodeId !== targetId) {
                                 structure.links.push({ source: nodeId, target: targetId });
                             }

                             if (!visited.has(link) && !queue.find(q => q.url === link)) {
                                 queue.push({ url: link, depth: depth + 1 });
                             }
                        }
                    } catch (_) {}
                }
            } catch (e) {
                console.warn(`[Crawler]: Failed to crawl ${url}: ${e.message}`);
                progress(7, `Warning: Failed to reach ${url.slice(0, 30)}...`);
            }
        }

        await browser.close();
        browser = null;

        // ─── Phase 2: Broken Link Check with Promise.all ─────────────────
        console.log(`[Crawler]: Checking ${Math.min(allLinks.size, maxLinks)} links for breakage...`);
        progress(12, `Verifying ${Math.min(allLinks.size, maxLinks)} links...`);
        const linksToCheck = [...allLinks].slice(0, maxLinks);

        await Promise.allSettled(
            linksToCheck.map(async (link, idx) => {
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
        const update = { $set: { pagesCrawled: internalPages.size, siteStructure: structure } };
        if (brokenLinks.length > 0) {
            update.$push = { brokenLinks: { $each: brokenLinks } };
            console.log(`[Crawler]: ${brokenLinks.length} broken links found.`);
        }

        await ScanReport.findByIdAndUpdate(reportId, update);
        console.log(`[Crawler]: Discovered ${internalPages.size} internal pages.`);
        progress(15, `Crawled ${internalPages.size} pages. Launching deep scanners...`);
        return Array.from(internalPages);

    } catch (error) {
        console.error(`[Crawler] Critical failure: ${error.message}`);
        progress(15, "Crawler encountered a non-fatal error. Continuing...");
        return [baseUrl];
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { crawlWebsite };
