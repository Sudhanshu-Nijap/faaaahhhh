require('dotenv').config();
const { analyzeURLSecurity } = require('./services/urlSecurityAnalyzer');

async function runTests() {
    console.log("--- URL Security Analyzer Tests ---");

    const tests = [
        "https://google.com/",
        "http://app1e.com/verify-account", // Typo squatting + HTTP + verify
        "http://192.168.1.1/admin", // Internal IP
        "http://itisatrap.com/payment?redirect=false", // Heuristics catch this?
        "http://testsafebrowsing.appspot.com/s/malware.html", // Google SB Test URL
        "http://google.com@evil.com/phishing" // @ bypass attempt
    ];

    for (const url of tests) {
        console.log(`\nTesting: ${url}`);
        const result = await analyzeURLSecurity(url);
        console.log(JSON.stringify(result, null, 2));
    }
}

runTests();
