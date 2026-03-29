const mongoose = require('mongoose');
const Job = require('./models/Job');
const dotenv = require('dotenv');

async function createTestJob() {
    dotenv.config();
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const now = new Date();
        now.setMinutes(now.getMinutes() + 2); 
        
        const testJobTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        const testJobDate = now.toLocaleDateString('en-CA');
        
        console.log(`[Test]: Creating job for ${testJobDate} at ${testJobTime}...`);

        await Job.create({
            userId: '69c6e3065246e646dd8b261e',
            url: 'https://vjti.ac.in',
            scanType: 'quick',
            mode: 'one-time',
            date: testJobDate,
            time: testJobTime,
            status: 'pending',
            isActive: true
        });

        console.log(`✅ [Test]: Job registered for ${testJobTime}.`);
        process.exit(0);
    } catch (e) {
        process.exit(1);
    }
}
createTestJob();
