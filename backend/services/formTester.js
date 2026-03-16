const puppeteer = require('puppeteer');
const ScanReport = require('../models/ScanReport');

/**
 * testForms
 * Identifies form elements and tests validation using Puppeteer.
 */
const testForms = async (reportId, url) => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
        const page = await browser.newPage();
        const formIssues = [];

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        const forms = await page.$$('form');
        
        for (let i = 0; i < forms.length; i++) {
            const formSelector = `form:nth-of-type(${i + 1})`;
            
            const formInfo = await page.evaluate((sel, index) => {
                const f = document.querySelector(sel);
                if (!f) return null;
                const inputs = Array.from(f.querySelectorAll('input, select, textarea'));
                return {
                    id: f.id || f.name || `form-${index + 1}`,
                    hasRequired: inputs.some(i => i.required || i.getAttribute('aria-required') === 'true'),
                    inputCount: inputs.length
                };
            }, formSelector, i);

            if (!formInfo) continue;

            // Empty Submission Test
            if (formInfo.hasRequired) {
                const submitBtn = await page.$(`${formSelector} button[type="submit"], ${formSelector} input[type="submit"]`);
                if (submitBtn) {
                    await submitBtn.click();
                    await new Promise(r => setTimeout(r, 1000));
                    
                    const hasError = await page.evaluate((sel) => {
                        const f = document.querySelector(sel);
                        const states = [':invalid', '.error', '.invalid-feedback', '[aria-invalid="true"]'];
                        return states.some(s => !!f.querySelector(s)) || f.innerText.toLowerCase().includes('required');
                    }, formSelector);

                    if (!hasError) {
                        formIssues.push({
                            page: url,
                            formSelector: formInfo.id,
                            issue: 'Incomplete Validation',
                            details: `Form "${formInfo.id}" allowed submission attempt with empty required fields.`,
                            recommendation: "Implement robust client-side validation."
                        });
                    }
                }
            }

            // Label Check
            const unlabeledFields = await page.evaluate((sel) => {
                const f = document.querySelector(sel);
                const inputs = Array.from(f.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), select, textarea'));
                return inputs.filter(i => {
                    const id = i.id;
                    const label = id ? document.querySelector(`label[for="${id}"]`) : null;
                    const parentLabel = i.closest('label');
                    const ariaLabel = i.getAttribute('aria-label') || i.getAttribute('aria-labelledby');
                    return !label && !parentLabel && !ariaLabel;
                }).map(i => i.name || i.id || i.tagName);
            }, formSelector);

            if (unlabeledFields.length > 0) {
                formIssues.push({
                    page: url,
                    formSelector: formInfo.id,
                    issue: 'Missing Input Labels',
                    details: `Accessible labels missing for: ${unlabeledFields.join(', ')}`,
                    recommendation: "Use <label> or aria-label for accessibility."
                });
            }
        }

        if (formIssues.length > 0) {
            await ScanReport.findByIdAndUpdate(reportId, {
                $push: { formIssues: { $each: formIssues } }
            });
        }

    } catch (error) {
        console.error(`Form Testing failed on ${url}:`, error.message);
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { testForms };
