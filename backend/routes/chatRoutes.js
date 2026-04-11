const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const ScanReport = require('../models/ScanReport');
const chatAgent = require('../services/chatAgent');

// ── Find or create chat thread for a URL ──────────────────────────────────────
router.post('/thread/start', async (req, res) => {
    const { url, userId } = req.body;
    if (!url || !userId) return res.status(400).json({ error: 'url and userId required' });

    try {
        let chat = await Chat.findOne({ url, userId });
        const isNew = !chat;

        if (!chat) {
            chat = await Chat.create({ url, userId });
        }

        res.json({ chatId: chat._id, isNew });
    } catch (err) {
        console.error('[ChatThread]: Start error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── List all chat threads for a user (sidebar) ────────────────────────────────
router.get('/threads', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    try {
        const chats = await Chat.find({ userId }).sort({ isPinned: -1, lastMessageAt: -1 });

        // For each chat, get the last message preview and scan count
        const enriched = await Promise.all(chats.map(async (chat) => {
            const lastMsg = await Message.findOne({ chatId: chat._id })
                .sort({ createdAt: -1 }).lean();
            const scanCount = await Message.countDocuments({ 
                chatId: chat._id, 
                type: { $in: ['report', 'rescan'] } 
            });
            return {
                ...chat.toObject(),
                lastMessage: lastMsg ? { type: lastMsg.type, content: lastMsg.content, createdAt: lastMsg.createdAt } : null,
                scanCount
            };
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Get all messages in a thread ──────────────────────────────────────────────
router.get('/thread/:chatId/messages', async (req, res) => {
    try {
        const messages = await Message.find({ chatId: req.params.chatId })
            .sort({ createdAt: 1 }).lean();
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Get all scan reports for a URL (Previous Scans dropdown) ─────────────────
router.get('/thread/:chatId/scans', async (req, res) => {
    try {
        const messages = await Message.find({ 
            chatId: req.params.chatId,
            type: { $in: ['report', 'rescan'] }
        }).sort({ createdAt: -1 }).lean();
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Post a user message to thread ────────────────────────────────────────────
router.post('/thread/:chatId/message', async (req, res) => {
    const { type, content, scanReportId, reportSummary } = req.body;
    try {
        const msg = await Message.create({
            chatId: req.params.chatId,
            type: type || 'user',
            content: content || '',
            scanReportId,
            reportSummary
        });

        // Update thread's lastMessageAt
        await Chat.findByIdAndUpdate(req.params.chatId, { lastMessageAt: new Date() });

        if (global.io) {
            global.io.to(req.params.chatId).emit('new-message', msg);

            // Global User Room Update for Sidebar Refresh
            const chat = await Chat.findById(req.params.chatId);
            if (chat?.userId) {
                global.io.to(`user_${chat.userId.toString()}`).emit('thread-update', { 
                    chatId: req.params.chatId 
                });
            }
        }

        res.json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── AI Q&A about a specific scan report ──────────────────────────────────────
router.post('/thread/:chatId/ask', async (req, res) => {
    const { message, scanReportId } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    try {
        let report = null;

        // Try provided scanReportId first
        if (scanReportId) {
            report = await ScanReport.findById(scanReportId);
        }

        // Fallback: find the latest report message in this thread
        if (!report) {
            const latestReportMsg = await Message.findOne({
                chatId: req.params.chatId,
                type: { $in: ['report', 'rescan'] },
                scanReportId: { $exists: true, $ne: null }
            }).sort({ createdAt: -1 });

            if (latestReportMsg?.scanReportId) {
                report = await ScanReport.findById(latestReportMsg.scanReportId);
            }
        }

        // Fallback: find by chat URL from Chat document
        if (!report) {
            const chat = await Chat.findById(req.params.chatId);
            if (chat?.url) {
                report = await ScanReport.findOne({ url: chat.url, status: 'completed' })
                    .sort({ createdAt: -1 });
            }
        }

        if (!report) {
            return res.status(404).json({ error: 'No scan report found for this chat. Run a scan first.' });
        }

        // Save user message first (correct ordering)
        await Message.create({ chatId: req.params.chatId, type: 'user', content: message });

        // Get recent AI messages for context window
        const recentMsgs = await Message.find({ 
            chatId: req.params.chatId, 
            type: { $in: ['user', 'ai'] }
        }).sort({ createdAt: -1 }).limit(10).lean();

        const historyWindow = recentMsgs.reverse().map(m => ({ 
            role: m.type === 'user' ? 'user' : 'ai', 
            content: m.content 
        }));

        const answer = await chatAgent.analyzeReportQuestion(historyWindow, report);

        // Save AI reply
        const aiMsg = await Message.create({ chatId: req.params.chatId, type: 'ai', content: answer });
        await Chat.findByIdAndUpdate(req.params.chatId, { lastMessageAt: new Date() });

        if (global.io) {
            global.io.to(req.params.chatId).emit('new-message', aiMsg);
            
            // Global User Room Update for Sidebar Refresh
            const chat = await Chat.findById(req.params.chatId);
            if (chat?.userId) {
                global.io.to(`user_${chat.userId.toString()}`).emit('thread-update', { 
                    chatId: req.params.chatId 
                });
            }
        }

        res.json({ reply: answer, message: aiMsg });
    } catch (err) {
        console.error('[ChatThread /ask Error]:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── Pin / Unpin a thread ──────────────────────────────────────────────────────
router.patch('/thread/:chatId/pin', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ error: 'Chat not found' });
        chat.isPinned = !chat.isPinned;
        await chat.save();
        res.json(chat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Rename a thread ───────────────────────────────────────────────────────────
router.patch('/thread/:chatId/rename', async (req, res) => {
    try {
        const chat = await Chat.findByIdAndUpdate(
            req.params.chatId, 
            { customName: req.body.name }, 
            { new: true }
        );
        if (!chat) return res.status(404).json({ error: 'Chat not found' });
        res.json(chat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Delete a thread and all its messages ──────────────────────────────────────
router.delete('/thread/:chatId', async (req, res) => {
    try {
        await Message.deleteMany({ chatId: req.params.chatId });
        await Chat.findByIdAndDelete(req.params.chatId);
        res.json({ message: 'Thread deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
