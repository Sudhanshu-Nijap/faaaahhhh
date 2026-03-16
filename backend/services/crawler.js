const puppeteer = require('puppeteer');
const ScanReport = require('../models/ScanReport');
const blc = require('broken-link-checker');

/**
 * crawlWebsite
 * Discovers internal pages and validates links using Puppeteer.
 */
const crawlWebsite = async (reportId, baseUrl) => {
    const visited = new Set();
    const queue = [baseUrl];
    const internalPages = new Set();
    const brokenLinks = [];
    const maxPages = 15;
    const domain = new URL(baseUrl).hostname;

    let browser;
    try {
        browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
        const page = await browser.newPage();

        while (queue.length > 0 && visited.size < maxPages) {
            const url = queue.shift();
            if (visited.has(url)) continue;
            visited.add(url);
            
            console.log(`Crawling (Puppeteer): ${url}`);
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                internalPages.add(url);

                // Extract internal links
                const links = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('a'))
                        .map(a => a.href)
                        .filter(href => href.startsWith('http'));
                });

                for (const link of links) {
                    try {
                        const linkUrl = new URL(link);
                        if (linkUrl.hostname === domain) {
                            if (!visited.has(link) && !queue.includes(link)) {
                                queue.push(link);
                            }
                        }
                    } catch (e) { /* Invalid URL */ }
                }
            } catch (e) {
                console.error(`Failed to crawl ${url}:`, e.message);
            }
        }

        // 404 Detection via broken-link-checker
        const siteChecker = new blc.SiteChecker({
            excludeExternalLinks: true,
            filterLevel: 1,
            acceptedSchemes: ["http", "https"]
        }, {
            link: (result) => {
                if (result.broken) {
                    brokenLinks.push({
                        page: result.base.original,
                        link: result.url.original,
                        status: result.http.response ? result.http.response.statusCode : 0,
                        text: result.html.text || 'N/A',
                        recommendation: "Broken link detected. Verify destination or update href."
                    });
                }
            },
            end: async () => {
                if (brokenLinks.length > 0) {
                    await ScanReport.findByIdAndUpdate(reportId, {
                        $push: { brokenLinks: { $each: brokenLinks } }
                    });
                }
            }
        });

        siteChecker.enqueue(baseUrl);

        await ScanReport.findByIdAndUpdate(reportId, {
            $set: { pagesCrawled: internalPages.size }
        });

        return Array.from(internalPages);
    } catch (error) {
        console.error("Crawling Failure (Puppeteer):", error);
        return [baseUrl];
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { crawlWebsite };
