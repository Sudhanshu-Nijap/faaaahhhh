const { runDedicatedScan } = require('../backend/services/qaScanner');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function test() {
    console.log('--- STARTING LIGHTHOUSE TEST ---');
    try {
        const result = await runDedicatedScan('https://google.com');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Test Failed:', e);
    }
}

test();
