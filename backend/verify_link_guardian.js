const linkGuardian = require('./backend/services/linkGuardian');

const testUrls = [
    'https://google.com',
    'http://192.168.1.1/login',
    'https://secure-bank-update-verify.top/account',
    'https://claim-your-bonus-now.xyz/win',
    'https://normal-site.com/about'
];

console.log('--- SENTINEL-AI LINK GUARDIAN TEST SUITE ---');
testUrls.forEach(url => {
    const result = linkGuardian.analyze(url);
    console.log(`\nURL: ${url}`);
    console.log(`Malicious: ${result.isMalicious ? '🚨 YES' : '✅ NO'}`);
    console.log(`Risk Score: ${result.riskScore}%`);
    console.log(`Threat: ${result.threatType}`);
    console.log(`Reason: ${result.reason}`);
});
