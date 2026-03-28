/**
 * Migration: Convert existing ScanReport records to Chat + Message format.
 * Run once: node scripts/migrateReportsToChats.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ScanReport = require('../models/ScanReport');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

async function migrate() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Migration]: Connected to MongoDB');

    const reports = await ScanReport.find({ status: 'completed' }).sort({ createdAt: 1 });
    console.log(`[Migration]: Found ${reports.length} completed reports to migrate`);

    let chatCreated = 0;
    let msgCreated = 0;
    let skipped = 0;

    for (const report of reports) {
        try {
            if (!report.url || !report.userId) { skipped++; continue; }

            // Find or create a Chat thread for this URL+userId
            let chat = await Chat.findOne({ url: report.url, userId: report.userId });
            if (!chat) {
                chat = await Chat.create({ 
                    url: report.url, 
                    userId: report.userId,
                    createdAt: report.createdAt,
                    lastMessageAt: report.createdAt
                });
                chatCreated++;

                // Post a "user" message with the URL
                await Message.create({
                    chatId: chat._id,
                    type: 'user',
                    content: report.url,
                    createdAt: report.createdAt
                });
                msgCreated++;
            }

            // Check if a message for this report already exists
            const exists = await Message.findOne({ scanReportId: report._id });
            if (exists) { skipped++; continue; }

            // Determine if this is a rescan (not the first report for this URL+userId)
            const prevReports = await ScanReport.find({
                url: report.url,
                userId: report.userId,
                status: 'completed',
                createdAt: { $lt: report.createdAt }
            }).countDocuments();

            const msgType = prevReports > 0 ? 'rescan' : 'report';

            const reportSummary = {
                healthScore: report.healthScore || 0,
                status: 'completed',
                lighthouseScores: report.lighthouseScores || {},
                stats: {
                    brokenLinks: report.brokenLinks?.length || 0,
                    consoleErrors: report.consoleErrors?.length || 0,
                    accessibilityIssues: report.accessibilityIssues?.length || 0,
                    networkIssues: report.networkLogs?.length || 0
                },
                comparison: report.comparison?.previousReportId ? {
                    scoreDelta: report.comparison.scoreDelta,
                    newErrors: report.comparison.stats?.newErrors,
                    fixedErrors: report.comparison.stats?.fixedErrors,
                    impact: report.comparison.stats?.impact
                } : null
            };

            await Message.create({
                chatId: chat._id,
                type: msgType,
                content: report.url,
                scanReportId: report._id,
                reportSummary,
                createdAt: report.createdAt
            });
            msgCreated++;

            // Update lastMessageAt to the latest scan time
            if (new Date(report.createdAt) > new Date(chat.lastMessageAt)) {
                await Chat.findByIdAndUpdate(chat._id, { lastMessageAt: report.createdAt });
            }

        } catch (err) {
            console.error(`[Migration]: Error processing report ${report._id}:`, err.message);
        }
    }

    console.log(`[Migration]: Done.`);
    console.log(`  Chats created: ${chatCreated}`);
    console.log(`  Messages created: ${msgCreated}`);
    console.log(`  Skipped: ${skipped}`);
    process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
