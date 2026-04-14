const { analyzeURLSecurity } = require('../backend/services/urlSecurityAnalyzer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function test() {
    console.log("Testing g00gle.com...");
    try {
        const verdict = await analyzeURLSecurity("http://g00gle.com");
        console.log("Verdict:", JSON.stringify(verdict, null, 2));
    } catch (e) {
        console.error("Critical Failure:", e.message);
    }
}

test();
