const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const ScanReport = require('./models/ScanReport');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const userId = 'user_2r7P4m2Z5X1q4J8L'; // Just a guess or check all
        const reports = await ScanReport.find({}).select('url status createdAt userId').sort({ createdAt: -1 });
        console.log(`Total Reports: ${reports.length}`);
        
        const counts = {};
        reports.forEach(r => {
            counts[r.url] = (counts[r.url] || 0) + 1;
        });

        console.log("Counts per URL (latest 20):");
        Object.keys(counts).slice(0, 20).forEach(u => console.log(`${u}: ${counts[u]}`));
        
        console.log("\nLast 10 reports status:");
        reports.slice(0,10).forEach(r => console.log(`${r.url} -> ${r.status} (${r.createdAt})`));

    } catch (e) { console.error(e); }
    finally { mongoose.disconnect(); }
})();
