const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const ScanReport = require('./models/ScanReport');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const urls = [
            'https://www.digitalindia.gov.in/',
            'https://pminternship.mca.gov.in/',
            'https://pmayg.dord.gov.in/',
            'https://www.pan.utiitsl.com/',
            'https://www.irctc.co.in/'
        ];
        for (const url of urls) {
            const r = await ScanReport.findOne({ url, status: 'completed' }).sort({ createdAt: -1 });
            if (r) {
                console.log(`${url} -> healthScore: ${r.healthScore}, status: ${r.status}, createdAt: ${r.createdAt}`);
            } else {
                console.log(`${url} -> Not found (completed)`);
            }
        }
    } catch (e) { console.error(e); }
    finally { mongoose.disconnect(); }
})();
