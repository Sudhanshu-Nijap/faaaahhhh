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
    const queue = [{ url: baseUrl, depth: 0 }];
    const internalPages = new Set();
    // Use a Map to track the source page for each link to provide better context
    const linkSourceMap = new Map(); 
    const brokenLinks = [];
    
    const scope = options.scope || 'single';
    const maxPages = scope === 'site' ? (options.maxPages || 50) : 1;
    const maxDepth = scope === 'site' ? (options.maxDepth !== undefined ? options.maxDepth : 3) : 0;
    const maxLinksToCheck = scope === 'site' ? 50 : 20;
    const structure = { nodes: [], links: [] };

    const progress = (p, s) => {
        if (emitProgress) emitProgress(p, s);
    };
    
    let domain;
    try {
        domain = new URL(baseUrl).hostname;
    } catch (_) {
        return [baseUrl];
    }

    progress(7, `Initializing crawl for ${domain}...`);

    let browser;
    try {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        // ─── Phase 1: Distributed Page Discovery ──────────────────────────────
        while (queue.length > 0 && visited.size < maxPages) {
            const { url, depth } = queue.shift();
            if (visited.has(url) || depth > maxDepth) continue;
            visited.add(url);

            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                internalPages.add(url);

                // Site Structure Mapping
                const pathName = new URL(url).pathname || '/';
                if (!structure.nodes.find(n => n.id === url)) {
                    structure.nodes.push({ id: url, label: pathName, url, depth });
                }

                // Gather links for centralized audit
                const links = await page.evaluate(() =>
                    Array.from(document.querySelectorAll('a[href]'))
                        .map(a => a.href)
                        .filter(h => h.startsWith('http') && !h.includes('#') && !h.includes('mailto:') && !h.includes('tel:'))
                );

                links.forEach(link => {
                    if (!linkSourceMap.has(link)) {
                        linkSourceMap.set(link, url);
                    }
                    
                    try {
                        const linkUrl = new URL(link);
                        if (linkUrl.hostname === domain && scope === 'site') {
                            if (!visited.has(link) && !queue.find(q => q.url === link)) {
                                queue.push({ url: link, depth: depth + 1 });
                            }
                        }
                    } catch (_) {}
                });
            } catch (e) {
                console.warn(`[Crawler]: Failed to discovery links on ${url}: ${e.message}`);
            }
        }

        await browser.close();
        browser = null;

        // ─── Phase 2: Bot-Tolerant Centralized Link Audit ─────────────────
        const uniqueLinks = Array.from(linkSourceMap.keys()).slice(0, maxLinksToCheck);
        progress(12, `Neural Tracing: Verifying ${uniqueLinks.length} unique navigation nodes...`);

        await Promise.allSettled(
            uniqueLinks.map(async (link) => {
                try {
                    let status = 0;
                    const config = {
                        timeout: 5000,
                        maxRedirects: 5,
                        validateStatus: () => true,
                        headers: { 
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5'
                        }
                    };

                    try {
                        const res = await axios.head(link, config);
                        status = res.status;
                        if (status === 405 || status === 403 || status === 999) {
                            const getRes = await axios.get(link, config);
                            status = getRes.status;
                        }
                    } catch (e) {
                        status = e.response ? e.response.status : 0;
                    }

                    // Bot-Block Tolerance: Ignore 403, 429, and 999 for external domains 
                    // as they represent bot filtering rather than broken links.
                    const isExternal = new URL(link).hostname !== domain;
                    const botBlockedCodes = [403, 429, 999];
                    
                    if (isExternal && botBlockedCodes.includes(status)) {
                        return; // Assume functional but filtered
                    }

                    const isBroken = status === 0 || status === 404 || status === 410 || (status >= 500 && !isExternal);

                    if (isBroken) {
                        brokenLinks.push({
                            page: linkSourceMap.get(link) || baseUrl,
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

        const update = { $set: { pagesCrawled: internalPages.size, siteStructure: structure } };
        if (brokenLinks.length > 0) {
            update.$push = { brokenLinks: { $each: brokenLinks } };
        }

        await ScanReport.findByIdAndUpdate(reportId, update);
        progress(15, `Audit complete. Optimized ${uniqueLinks.length} link checks.`);
        return Array.from(internalPages);

    } catch (error) {
        console.error(`[Crawler] Critical failure: ${error.message}`);
        return [baseUrl];
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { crawlWebsite };
