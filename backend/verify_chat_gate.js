const lg = require('./services/linkGuardian');
const url = 'https://secure-bank-login-update-verify.top/account';

console.log('--- NEURAL SECURITY GATE TEST ---');
const securityCheck = lg.analyze(url);

if (securityCheck.isMalicious) {
    console.log('STATUS: [BLOCKED]');
    console.log(`THREAT: ${securityCheck.threatType}`);
    console.log('ACTION: Posting Hazard Notification to Chat...');
    const threatMsg = `### 🚨 SECURITY HAZARD DETECTED\n\n**Sentinel AI** has intercepted this request Because the target domain matches critical phishing or malware distribution patterns.`;
    console.log('MESSAGE PREVIEW:', threatMsg);
} else {
    console.log('STATUS: [ALLOWED]');
}
