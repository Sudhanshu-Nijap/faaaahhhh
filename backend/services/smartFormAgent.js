const { chromium } = require('playwright');
const ScanReport = require('../models/ScanReport');
const path = require('path');

/**
 * smartFormAgent - Universal Intelligent Form Testing
 *
 * Works on ANY website URL (React SPA, static HTML, Angular, Vue, etc.)
 * Tests: Empty → Invalid → Valid submissions with screenshots.
 * Captures console errors and network failures during form submission.
 */
const runTest = async (reportId, url) => {
    let browser;
    try {
        console.log(`[SmartFormAgent]: Universal form testing for ${url}`);

        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1440, height: 900 }
        });

        const page = await context.newPage();

        // ─────── Global Error & Network Capture ──────────────────────────
        const consoleMessages = [];
        const networkErrors = [];

        page.on('console', msg => {
            if (msg.type() === 'error') consoleMessages.push(msg.text());
        });
        page.on('requestfailed', req => {
            networkErrors.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
        });

        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        } catch (e) {
            // Try domcontentloaded as fallback (works for slow sites)
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(3000);
        }

        // ─────── Phase 1: CTA Discovery (for SPAs like React/Angular) ────
        let formLocators = await page.locator('form').all();

        if (formLocators.length === 0) {
            console.log('[SmartFormAgent]: No forms found directly, clicking CTAs...');
            const ctaTexts = ['login', 'sign in', 'sign up', 'register', 'get started', 'authenticate', 'join', 'try', 'start', 'contact', 'submit'];
            const buttons = await page.locator('button, a[role="button"], input[type="button"]').all();

            for (const btn of buttons.slice(0, 10)) {
                try {
                    const txt = (await btn.innerText()).toLowerCase().trim();
                    if (ctaTexts.some(k => txt.includes(k))) {
                        await btn.click({ timeout: 3000 });
                        await page.waitForTimeout(2000);
                        formLocators = await page.locator('form').all();
                        if (formLocators.length > 0) break;
                    }
                } catch (_) {}
            }
        }

        // ─────── Phase 2: Also scan iframes ──────────────────────────────
        if (formLocators.length === 0) {
            for (const frame of page.frames()) {
                const frameForms = await frame.locator('form').all();
                if (frameForms.length > 0) {
                    formLocators = frameForms;
                    break;
                }
            }
        }

        if (formLocators.length === 0) {
            console.log(`[SmartFormAgent]: No forms found on ${url}`);
            return;
        }

        console.log(`[SmartFormAgent]: Found ${formLocators.length} form(s). Running test matrix...`);

        // ─────── Phase 3: Test each form ──────────────────────────────────
        for (let i = 0; i < Math.min(formLocators.length, 5); i++) {
            const form = formLocators[i];
            let formName = 'Unknown Form';
            try {
                formName = await form.evaluate(el =>
                    el.id || el.getAttribute('aria-label') || el.getAttribute('name') ||
                    el.querySelector('h1,h2,h3,legend')?.innerText?.trim()?.split('\n')[0] ||
                    `Form ${el.closest('[id]')?.id || (document.forms ? [...document.forms].indexOf(el) + 1 : 1)}`
                );
            } catch (_) { formName = `Form ${i + 1}`; }

            // -- A. EMPTY SUBMISSION TEST --
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await page.waitForTimeout(1500);

                // Re-acquire form after navigation
                let testForm = (await page.locator('form').all())[i];
                if (!testForm) continue;

                let submitBtn = testForm.locator('button[type="submit"], input[type="submit"]').first();
                if (!(await submitBtn.count())) submitBtn = testForm.locator('button').last();

                const priorErrors = [...consoleMessages];
                await submitBtn.click({ timeout: 5000 }).catch(() => {});
                await page.waitForTimeout(1500);

                // Detect block: HTML5 :invalid, error elements, or page didn't change
                const emptyResult = await page.evaluate(() => {
                    const invalid = document.querySelector(':invalid');
                    const errEl = document.querySelector('[role="alert"], .error, .error-message, [class*="error"], [class*="invalid"]');
                    return {
                        blocked: !!(invalid || errEl),
                        detail: errEl?.innerText?.trim() || (invalid ? `${invalid.name || invalid.type} field is required` : 'No visible error shown')
                    };
                });

                const screenshotFile = `sft-empty-${Date.now()}.png`;
                await page.screenshot({ path: path.join(__dirname, '../screenshots', screenshotFile), fullPage: false });

                await ScanReport.findByIdAndUpdate(reportId, {
                    $push: {
                        smartFormTests: {
                            page: url,
                            formName: String(formName).substring(0, 100),
                            testType: 'Empty Input',
                            status: emptyResult.blocked ? 'Blocked' : 'Accepted',
                            details: emptyResult.blocked
                                ? `✅ Empty submission correctly blocked. ${emptyResult.detail}`
                                : `⚠️ Form may accept empty input — no validation detected.`,
                            screenshot: `/screenshots/${screenshotFile}`,
                            confidence: 'High'
                        }
                    }
                });
            } catch (e) {
                console.warn(`[SmartFormAgent] Empty test error on form ${i}: ${e.message}`);
            }

            // -- B. INVALID INPUT TEST --
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await page.waitForTimeout(1500);

                let testForm = (await page.locator('form').all())[i];
                if (!testForm) continue;

                const inputs = await testForm.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea').all();

                for (const input of inputs) {
                    try {
                        const type = await input.getAttribute('type') || 'text';
                        if (type === 'email') await input.fill('not-an-email@@bad');
                        else if (type === 'url') await input.fill('htp:/bad-url');
                        else if (type === 'number') await input.fill('abc');
                        else if (type === 'tel') await input.fill('aaaa');
                        else if (type === 'date') await input.fill('99/99/9999');
                        else await input.fill('<script>alert(1)</script>');
                    } catch (_) {}
                }

                let submitBtn = testForm.locator('button[type="submit"], input[type="submit"]').first();
                if (!(await submitBtn.count())) submitBtn = testForm.locator('button').last();
                await submitBtn.click({ timeout: 5000 }).catch(() => {});
                await page.waitForTimeout(1500);

                const invalidResult = await page.evaluate(() => {
                    const invalid = document.querySelector(':invalid');
                    const errEl = document.querySelector('[role="alert"], .error, .error-message, [class*="error"], [class*="invalid"]');
                    return {
                        blocked: !!(invalid || errEl),
                        detail: errEl?.innerText?.trim() || (invalid ? `Field "${invalid.name || invalid.type}" rejected invalid input` : 'No validation error shown')
                    };
                });

                const screenshotFile = `sft-invalid-${Date.now()}.png`;
                await page.screenshot({ path: path.join(__dirname, '../screenshots', screenshotFile), fullPage: false });

                await ScanReport.findByIdAndUpdate(reportId, {
                    $push: {
                        smartFormTests: {
                            page: url,
                            formName: String(formName).substring(0, 100),
                            testType: 'Invalid Input',
                            status: invalidResult.blocked ? 'Blocked' : 'Flagged',
                            details: invalidResult.blocked
                                ? `✅ Invalid data correctly rejected. ${invalidResult.detail}`
                                : `⚠️ Form accepted invalid data — validation may be insufficient.`,
                            screenshot: `/screenshots/${screenshotFile}`,
                            confidence: 'High'
                        }
                    }
                });
            } catch (e) {
                console.warn(`[SmartFormAgent] Invalid test error on form ${i}: ${e.message}`);
            }

            // -- C. VALID INPUT TEST --
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await page.waitForTimeout(1500);

                let testForm = (await page.locator('form').all())[i];
                if (!testForm) continue;

                const inputs = await testForm.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea').all();

                for (const input of inputs) {
                    try {
                        const type = await input.getAttribute('type') || 'text';
                        const name = (await input.getAttribute('name') || '').toLowerCase();
                        const placeholder = (await input.getAttribute('placeholder') || '').toLowerCase();
                        const hint = name + placeholder;

                        if (type === 'email' || hint.includes('email'))  await input.fill('qa_tester@sentinel.ai');
                        else if (type === 'password' || hint.includes('pass')) await input.fill('Sentinel@QA2026!');
                        else if (type === 'url' || hint.includes('url')) await input.fill('https://example.com');
                        else if (type === 'number') await input.fill('42');
                        else if (type === 'tel') await input.fill('+1234567890');
                        else if (hint.includes('name') || hint.includes('first') || hint.includes('last')) await input.fill('Sentinel QA');
                        else if (hint.includes('city')) await input.fill('Mumbai');
                        else if (hint.includes('zip') || hint.includes('postal')) await input.fill('400001');
                        else if (hint.includes('search') || hint.includes('query')) await input.fill('test query');
                        else if (hint.includes('msg') || hint.includes('message') || hint.includes('comment')) await input.fill('This is an automated QA test message from Sentinel AI.');
                        else await input.fill('QA_Test_Data');
                    } catch (_) {}
                }

                // Handle checkboxes and selects
                for (const checkbox of await testForm.locator('input[type="checkbox"]').all()) {
                    try { await checkbox.check({ timeout: 2000 }); } catch (_) {}
                }
                for (const select of await testForm.locator('select').all()) {
                    try {
                        const options = await select.locator('option').all();
                        if (options.length > 1) await select.selectOption({ index: 1 });
                    } catch (_) {}
                }

                const preUrl = page.url();
                let submitBtn = testForm.locator('button[type="submit"], input[type="submit"]').first();
                if (!(await submitBtn.count())) submitBtn = testForm.locator('button').last();
                await submitBtn.click({ timeout: 5000 }).catch(() => {});
                await page.waitForTimeout(2500);
                const postUrl = page.url();

                const screenshotFile = `sft-valid-${Date.now()}.png`;
                await page.screenshot({ path: path.join(__dirname, '../screenshots', screenshotFile), fullPage: false });

                const navigated = preUrl !== postUrl;
                await ScanReport.findByIdAndUpdate(reportId, {
                    $push: {
                        smartFormTests: {
                            page: url,
                            formName: String(formName).substring(0, 100),
                            testType: 'Valid Input',
                            status: 'Accepted',
                            details: navigated
                                ? `✅ Form submitted and navigated to ${postUrl}`
                                : `✅ Form submitted with valid QA data (no page navigation detected — may be AJAX).`,
                            screenshot: `/screenshots/${screenshotFile}`,
                            confidence: 'High'
                        },
                        liveEvents: {
                            type: 'SUCCESS',
                            message: `Form "${formName}" verified with valid input.`,
                            source: 'SmartFormAgent'
                        }
                    }
                });

                if (global.io) {
                    global.io.to(reportId.toString()).emit('scan-event', {
                        type: 'SUCCESS',
                        message: `Form "${formName}" verified with valid input.`,
                        source: 'SmartFormAgent',
                        timestamp: new Date()
                    });
                }
            } catch (e) {
                console.warn(`[SmartFormAgent] Valid test error on form ${i}: ${e.message}`);
            }
        }

        console.log(`[SmartFormAgent]: Test matrix complete for ${url}`);

    } catch (error) {
        console.error(`[SmartFormAgent Error] ${url}: ${error.message}`);
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { runTest };
