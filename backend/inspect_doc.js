const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function inspectDoc() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const collection = mongoose.connection.collection('scanreports');
        const doc = await collection.findOne({ _id: new mongoose.Types.ObjectId('69b974b092a42a95d4a22504') });
        
        console.log('consoleErrors type:', typeof doc.consoleErrors);
        console.log('consoleErrors length:', doc.consoleErrors?.length);
        if (doc.consoleErrors?.length > 0) {
            console.log('consoleErrors[0] type:', typeof doc.consoleErrors[0]);
            console.log('consoleErrors[0] raw:', doc.consoleErrors[0]);
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectDoc();
