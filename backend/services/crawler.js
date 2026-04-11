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
    const scope = options.scope || 'single';
    const maxPages = scope === 'site' ? (options.maxPages || 50) : 1;
    const maxDepth = scope === 'site' ? (options.maxDepth !== undefined ? options.maxDepth : 3) : 0;
    const maxLinksToCheck = scope === 'site' ? 25 : 10;
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
                try {
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                } catch (e) {
                    console.warn(`[Crawler]: Navigation slow for ${url}, proceeding...`);
                }
                
                await page.waitForTimeout(200); // reduced further for hackathon speed
                internalPages.add(url);


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
                        .filter(l => {
                            const h = l.href;
                            return h.startsWith('http') && 
                                   !h.includes('#') && 
                                   !h.includes('mailto:') && 
                                   !h.includes('tel:') && 
                                   !h.includes('javascript:') &&
                                   !/\.(zip|pdf|docx|xlsx|pptx|jpg|jpeg|png|gif|mp4|mp3|wav)$/i.test(h); // Skip binaries
                        })
                );

                if (scope === 'site') {
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
                } else {
                    // Just gather links for breakage check even in single mode, but don't queue
                    links.forEach(l => allLinks.add(l.href));
                }
            } catch (e) {
                console.warn(`[Crawler]: Failed to crawl ${url}: ${e.message}`);
                progress(7, `Warning: Failed to reach ${url.slice(0, 30)}...`);
            }
        }

        await browser.close();
        browser = null;

        // ─── Phase 2: Broken Link Check with Promise.all ─────────────────
        console.log(`[Crawler]: Checking ${Math.min(allLinks.size, maxLinksToCheck)} links for breakage...`);
        progress(12, `Verifying ${Math.min(allLinks.size, maxLinksToCheck)} links...`);
        const linksToCheck = [...allLinks].slice(0, maxLinksToCheck);

        await Promise.allSettled(
            linksToCheck.map(async (link, idx) => {
                try {
                    let status = 0;
                    try {
                        // Try HEAD first (faster), fall back to GET
                        const res = await axios.head(link, {
                            timeout: 3000,
                            maxRedirects: 3,
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
