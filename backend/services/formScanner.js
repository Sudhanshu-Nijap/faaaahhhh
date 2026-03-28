/**
 * formScanner - Performs deep-form diagnostics for accessibility and validation integrity.
 */
const scanForms = async (page) => {
    return await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const issues = [];

        forms.forEach((form, index) => {
            const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
            const buttons = Array.from(form.querySelectorAll('button, input[type="submit"]'));

            // 1. Accessibility Check: Labels
            inputs.forEach(input => {
                const id = input.getAttribute('id');
                const ariaLabel = input.getAttribute('aria-label');
                const label = id ? document.querySelector(`label[for="${id}"]`) : null;

                if (!label && !ariaLabel) {
                    issues.push({
                        form: form.id || `Form #${index + 1}`,
                        type: 'ACCESSIBILITY',
                        field: input.name || input.id || 'anonymous input',
                        severity: 'High',
                        message: 'Input field is missing a descriptive label or aria-label.',
                        recommendation: 'Add a <label> with "for" attribute or an "aria-label" to this field.'
                    });
                }
            });

            // 2. UX Check: Submit Button
            if (buttons.length === 0) {
                issues.push({
                    form: form.id || `Form #${index + 1}`,
                    type: 'UX_DEVIATION',
                    severity: 'Medium',
                    message: 'Form has no visible submit button.',
                    recommendation: 'Ensure every form has a clear, accessible submit button.'
                });
            }

            // 3. Logic Check: Empty Action
            if (!form.getAttribute('action') && !form.getAttribute('onsubmit')) {
                // Ignore if it's a SPA-style form, but warn if no event listeners (simplified check)
                issues.push({
                    form: form.id || `Form #${index + 1}`,
                    type: 'LOGIC_GAP',
                    severity: 'Low',
                    message: 'Form has no standard action or obvious submission handler.',
                    recommendation: 'Verify if the form is handled via modern SPA frameworks; otherwise, add a submission target.'
                });
            }

            // 4. Validation Check: Missing Required Constraints
            const rawInputs = inputs.filter(i => ['text', 'email', 'password'].includes(i.type));
            if (rawInputs.length > 0 && !rawInputs.some(i => i.required)) {
                issues.push({
                    form: form.id || `Form #${index + 1}`,
                    type: 'VALIDATION',
                    severity: 'Low',
                    message: 'No client-side validation constraints detected on textual inputs.',
                    recommendation: 'Add the "required" attribute or HTML5 validation regex to improve interaction safety.'
                });
            }
        });

        return issues;
    });
};

module.exports = { scanForms };
