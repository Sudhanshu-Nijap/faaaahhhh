const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const ScanReport = require('./models/ScanReport');

dotenv.config({ path: path.join(__dirname, '.env') });

async function fixData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        
        const collection = mongoose.connection.collection('scanreports');
        const cursor = collection.find({});
        
        let fixedCount = 0;
        let totalCount = 0;

        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            totalCount++;
            let needsUpdate = false;
            const updateFields = {};

            // Check consoleErrors
            if (Array.isArray(doc.consoleErrors) && doc.consoleErrors.length > 0 && typeof doc.consoleErrors[0] === 'string') {
                if (doc.consoleErrors[0].trim().startsWith('[')) {
                    try {
                        const parsed = JSON.parse(doc.consoleErrors[0]);
                        if (Array.isArray(parsed)) {
                            updateFields.consoleErrors = parsed;
                            needsUpdate = true;
                        }
                    } catch (e) {}
                }
            } else if (typeof doc.consoleErrors === 'string') {
                 try {
                    const parsed = JSON.parse(doc.consoleErrors);
                    if (Array.isArray(parsed)) {
                        updateFields.consoleErrors = parsed;
                        needsUpdate = true;
                    }
                } catch (e) {}
            }

            // Check networkLogs similarly
            if (Array.isArray(doc.networkLogs) && doc.networkLogs.length > 0 && typeof doc.networkLogs[0] === 'string') {
                if (doc.networkLogs[0].trim().startsWith('[')) {
                    try {
                        const parsed = JSON.parse(doc.networkLogs[0]);
                        if (Array.isArray(parsed)) {
                            updateFields.networkLogs = parsed;
                            needsUpdate = true;
                        }
                    } catch (e) {}
                }
            }

            if (needsUpdate) {
                await collection.updateOne({ _id: doc._id }, { $set: updateFields });
                fixedCount++;
                console.log(`Fixed doc: ${doc._id}`);
            }
        }
        
        console.log(`\nScan complete. Fixed ${fixedCount} out of ${totalCount} documents.`);
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

fixData();
