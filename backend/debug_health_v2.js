const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const ScanReport = require('./models/ScanReport');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const reports = await ScanReport.find({ status: 'completed' }).sort({ createdAt: -1 }).limit(10).select('url healthScore');
        reports.forEach(r => console.log(`${r.url} -> ${r.healthScore}`));
    } catch (e) { console.error(e); }
    finally { mongoose.disconnect(); }
})();
