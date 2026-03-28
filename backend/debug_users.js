const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const ScanReport = require('./models/ScanReport');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const userStats = await ScanReport.aggregate([
            { $group: { _id: '$userId', count: { $sum: 1 }, urls: { $addToSet: '$url' } } }
        ]);
        console.log(JSON.stringify(userStats, null, 2));
    } catch (e) { console.error(e); }
    finally { mongoose.disconnect(); }
})();
