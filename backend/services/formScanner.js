/**
 * formScanner - Performs deep-form diagnostics for accessibility and validation integrity.
 */
const scanForms = async (page) => {
    return await page.evaluate(() => {
        const issues = [];
        const seenIssues = new Set(); // For deduplication
        
        const getSpatialContext = (el) => {
            try {
                let current = el.parentElement;
                while (current && current !== document.body) {
                    const heading = current.querySelector('h1, h2, h3, h4, h5, h6');
                    if (heading && heading.innerText?.trim()) return heading.innerText.trim();
                    current = current.parentElement;
                }
                return 'Main Content';
            } catch { return 'Global'; }
        };

        const forms = Array.from(document.querySelectorAll('form'));
        
        // 1. Audit formal <form> structures
        forms.forEach((form, index) => {
            // Visibility Filter: Ignore background/tracking forms
            if (form.offsetParent === null) return;

            const formTitle = getSpatialContext(form);
            const formId = form.id || form.name || `Form #${index + 1} near ${formTitle}`;
            
            const action = form.getAttribute('action');
            const method = (form.getAttribute('method') || 'GET').toUpperCase();
            const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
            
            const addIssue = (issueObj, element) => {
                const hash = `${issueObj.type}-${issueObj.issue || ''}-${issueObj.field || ''}`;
                // Only deduplicate within the same page context if they are identical
                if (!seenIssues.has(hash)) {
                    let rect = { x: 0, y: 0, width: 0, height: 0 };
                    try {
                        const r = (element || form).getBoundingClientRect();
                        rect = { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
                    } catch (e) {}

                    issues.push({ ...issueObj, form: formId, location: formTitle, rect: rect });
                    seenIssues.add(hash);
                }
            };

            // Loophole: Sensitive Data in GET
            const hasPassword = inputs.some(i => i.type === 'password');
            if (hasPassword && method === 'GET') {
                addIssue({
                    type: 'SECURITY_LOOPHOLE',
                    issue: 'Sensitive data transmitted via GET',
                    severity: 'Critical',
                    recommendation: 'Change form method to POST. GET parameters are visible in URLs and server logs.'
                }, form);
            }

            // Loophole: Insecure Submission (Mixed Content)
            if (action && action.startsWith('http://') && window.location.protocol === 'https:') {
                addIssue({
                    type: 'SECURITY_WEAKNESS',
                    issue: 'Insecure form submission (HTTP)',
                    severity: 'High',
                    recommendation: 'Update form action to use HTTPS to prevent credential interception.'
                }, form);
            }

            // Loophole: Validation Bypass
            if (form.hasAttribute('novalidate')) {
                addIssue({
                    type: 'INTEGRITY_RISK',
                    issue: 'Browser validation bypassed (novalidate)',
                    severity: 'Medium',
                    recommendation: 'Remove "novalidate" unless implementing custom high-fidelity JS validation.'
                }, form);
            }

            if (!action || action === '#' || action === '') {
                addIssue({
                    type: 'FORM_LOGIC',
                    issue: 'Form missing valid action endpoint',
                    severity: 'Medium',
                    recommendation: 'Define a valid server-side endpoint in the action attribute.'
                }, form);
            }

            const hasSubmit = form.querySelector('button[type=\"submit\"], input[type=\"submit\"]');
            if (!hasSubmit) {
                addIssue({
                    type: 'FORM_UX',
                    issue: 'Form missing explicit submit trigger',
                    severity: 'Low',
                    recommendation: 'Add a <button type=\"submit\"> for better accessibility and predictable submission.'
                }, form);
            }

            // --- Per-Input Audit (Scoped to this form only) ---
            inputs.forEach(input => {
                if (input.type === 'hidden') return;
                const id = input.id;
                const name = input.name || id || 'anonymous';
                const type = input.type;

                // Accessibility: Missing Labels
                if (id) {
                    const label = document.querySelector(`label[for=\"${id}\"]`);
                    if (!label && !input.getAttribute('aria-label') && !input.placeholder) {
                        addIssue({
                            type: 'ACCESSIBILITY',
                            issue: `Input field \"${name}\" missing label`,
                            severity: 'Medium',
                            field: name,
                            recommendation: 'Associate a <label> or add an aria-label to ensure screen reader compatibility.'
                        }, input);
                    }
                }

                // Security Loophole: Unsafe Autocomplete
                if (type === 'password' || name.toLowerCase().includes('card') || name.toLowerCase().includes('cvv')) {
                    const auto = input.getAttribute('autocomplete');
                    if (!auto || auto === 'on') {
                        addIssue({
                            type: 'SECURITY_CONFIG',
                            issue: `Unsafe autocomplete on sensitive field \"${name}\"`,
                            severity: 'Low',
                            field: name,
                            recommendation: 'Set autocomplete=\"off\" or \"new-password\" for sensitive user data.'
                        }, input);
                    }
                }
            });
        });
 
        return issues.slice(0, 100);
    });
};

module.exports = { scanForms };
