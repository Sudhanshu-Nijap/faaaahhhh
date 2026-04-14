/**
 * formScanner - Performs deep-form diagnostics for accessibility and validation integrity.
 */
const scanForms = async (page) => {
    return await page.evaluate(() => {
        const issues = [];
        
        // 1. Audit Semantic Forms
        const forms = Array.from(document.querySelectorAll('form'));
        forms.forEach((form, index) => {
            const buttons = Array.from(form.querySelectorAll('button, input[type="submit"]'));
            
            // UX Check: Submit Button
            if (buttons.length === 0) {
                issues.push({
                    form: form.id || `Form #${index + 1}`,
                    type: 'UX_DEVIATION',
                    severity: 'Medium',
                    message: 'Form has no visible submit button.',
                    recommendation: 'Ensure every form has a clear, accessible submit button.'
                });
            }

            // Logic Check: Empty Action
            if (!form.getAttribute('action') && !form.getAttribute('onsubmit')) {
                issues.push({
                    form: form.id || `Form #${index + 1}`,
                    type: 'LOGIC_GAP',
                    severity: 'Low',
                    message: 'Form has no standard action or obvious submission handler.',
                    recommendation: 'Verify if the form is handled via modern SPA frameworks; otherwise, add a submission target.'
                });
            }
        });

        // 2. Global Input Audit (Covers loose inputs in SPAs)
        const allInputs = Array.from(document.querySelectorAll('input, select, textarea'));
        allInputs.forEach(input => {
            // Accessibility Check: Labels
            const id = input.getAttribute('id');
            const ariaLabel = input.getAttribute('aria-label');
            const label = id ? document.querySelector(`label[for="${id}"]`) : null;
            const parentLabel = input.closest('label');

            if (!label && !ariaLabel && !parentLabel) {
                issues.push({
                    form: input.closest('form')?.id || 'Global Context',
                    type: 'ACCESSIBILITY',
                    field: input.name || input.id || input.placeholder || 'anonymous input',
                    severity: 'High',
                    message: 'Input field is missing a descriptive label or aria-label.',
                    recommendation: 'Add a <label> with "for" attribute or an "aria-label" to this field.'
                });
            }

            // Validation Check: Missing Required Constraints
            const type = input.getAttribute('type') || 'text';
            if (['text', 'email', 'password'].includes(type) && !input.hasAttribute('required') && !input.hasAttribute('pattern')) {
                // Only warn if it's likely a critical entry field
                if (input.name?.toLowerCase().includes('user') || input.name?.toLowerCase().includes('pass') || input.name?.toLowerCase().includes('mail')) {
                    issues.push({
                        form: input.closest('form')?.id || 'Global Context',
                        type: 'VALIDATION',
                        field: input.name || input.id,
                        severity: 'Low',
                        message: 'No client-side validation constraints detected on critical field.',
                        recommendation: 'Add the "required" attribute or HTML5 validation regex.'
                    });
                }
            }
        });

        // 3. Fake Button Detection (Div/Span used as button without role)
        const possibleButtons = Array.from(document.querySelectorAll('div, span, a')).filter(el => {
            const style = window.getComputedStyle(el);
            const isClickable = style.cursor === 'pointer';
            const hasButtonClasses = el.className.toLowerCase().includes('btn') || el.className.toLowerCase().includes('button');
            return isClickable && hasButtonClasses;
        });

        possibleButtons.forEach(el => {
            const role = el.getAttribute('role');
            const tabIndex = el.getAttribute('tabindex');
            if (role !== 'button' && el.tagName !== 'A' && el.tagName !== 'BUTTON') {
                issues.push({
                    form: 'Visual Layer',
                    type: 'UX_SEMANTICS',
                    field: el.innerText?.substring(0, 20) || 'Custom Component',
                    severity: 'Medium',
                    message: 'Interactive element missing ARIA button role.',
                    recommendation: 'Add role=\"button\" and tabindex=\"0\" to ensure accessibility and consistent audit telemetry.'
                });
            }
        });

        return issues;
    });
};

module.exports = { scanForms };
