const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    url: { type: String, required: true },
    userId: { type: String, required: true },
    customName: { type: String },
    isPinned: { type: Boolean, default: false },
    lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

// One chat thread per URL per user
chatSchema.index({ url: 1, userId: 1 }, { unique: true });
chatSchema.index({ userId: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
