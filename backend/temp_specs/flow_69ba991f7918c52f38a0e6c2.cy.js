
describe('Automated UI Architecture Audit', () => {
  beforeEach(() => {
    cy.visit('https://example.com', { failOnStatusCode: false });
  });

  it('Verifies critical path: DOM Ready & Visibility', () => {
    cy.get('body').should('be.visible');
  });

  it('Audits navigation integrity', () => {
    cy.get('a').then(($links) => {
      const internalLinks = [...$links].filter(l => l.href.startsWith('https://example.com'));
      if (internalLinks.length > 0) {
        cy.request(internalLinks[0].href).its('status').should('be.oneOf', [200, 301, 302]);
      }
    });
  });

  it('Checks for interactive failures', () => {
    cy.get('button, input[type="submit"]').each(($el) => {
      cy.wrap($el).should('not.be.disabled');
    });
  });
});
