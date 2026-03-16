const puppeteer = require('puppeteer');
const ScanReport = require('../models/ScanReport');

/**
 * analyzePage
 * Performs DOM layout inspection and visual consistency checks using Puppeteer.
 */
const analyzePage = async (reportId, url) => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        const uiIssues = await page.evaluate(() => {
            const issues = [];
            const elements = Array.from(document.querySelectorAll('h1, h2, h3, button, a, img, input, div'));
            
            const viewportWidth = window.innerWidth;

            for (let i = 0; i < elements.length; i++) {
                const rect1 = elements[i].getBoundingClientRect();
                
                // 1. Detect elements outside viewport (horizontal overflow)
                if (rect1.right > viewportWidth + 5 && rect1.width > 0) {
                    issues.push({
                        issue: 'Horizontal Viewport Overflow',
                        selector: elements[i].tagName + (elements[i].className ? '.' + elements[i].className.split(' ')[0] : ''),
                        details: `Element bleeds out of the viewport (right: ${rect1.right}px, viewport: ${viewportWidth}px).`,
                        recommendation: "Use 'max-width: 100%' and 'overflow-x: hidden' on container elements."
                    });
                }

                // 2. Detect Overlapping Elements
                for (let j = i + 1; j < elements.length; j++) {
                    const rect2 = elements[j].getBoundingClientRect();
                    
                    if (rect1.width === 0 || rect1.height === 0 || rect2.width === 0 || rect2.height === 0) continue;
                    
                    const overlap = !(rect1.right < rect2.left || 
                                      rect1.left > rect2.right || 
                                      rect1.bottom < rect2.top || 
                                      rect1.top > rect2.bottom);
                    
                    if (overlap) {
                        const isChild = elements[i].contains(elements[j]) || elements[j].contains(elements[i]);
                        if (!isChild && rect1.width > 10 && rect2.width > 10) {
                            issues.push({
                                issue: 'Overlapping elements detected',
                                selector: `${elements[i].tagName} <-> ${elements[j].tagName}`,
                                details: `Element collision detected at [${rect1.left}, ${rect1.top}]. Potential layout corruption.`,
                                recommendation: "Adjust CSS positioning or margins to prevent element overlap."
                            });
                            if (issues.length > 10) break;
                        }
                    }
                }
                if (issues.length > 10) break;
            }

            // 3. Image loading check
            const brokenImages = Array.from(document.querySelectorAll('img')).filter(img => !img.complete || img.naturalWidth === 0);
            brokenImages.forEach(img => {
                issues.push({
                    issue: 'Broken Image / Failed Load',
                    selector: 'img',
                    details: `Image source failed to render: ${img.src}`,
                    recommendation: "Verify image path existence and ensure server returns 200 OK."
                });
            });

            return issues;
        });

        const mappedIssues = uiIssues.map(issue => ({
            page: url,
            ...issue
        }));

        if (mappedIssues.length > 0) {
            await ScanReport.findByIdAndUpdate(reportId, {
                $push: { uiIssues: { $each: mappedIssues } }
            });
        }

    } catch (error) {
        console.error(`UI Analysis failed on ${url}:`, error.message);
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { analyzePage };
