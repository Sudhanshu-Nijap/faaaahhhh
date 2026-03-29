const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    url: { type: String, required: true },
    scanType: { type: String, enum: ['quick', 'full'], default: 'quick' },
    mode: { type: String, enum: ['one-time', 'daily', 'weekly'], default: 'one-time' },
    date: { type: String }, // YYYY-MM-DD for one-time
    time: { type: String, required: true }, // HH:MM
    dayOfWeek: { type: Number, default: 0 }, // 0=Sunday, 1=Monday, etc.
    status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'paused'], default: 'pending' },
    lastRun: { type: Date },
    nextRun: { type: Date },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Tactical Indexes
jobSchema.index({ userId: 1 });
jobSchema.index({ status: 1 });

module.exports = mongoose.model('Job', jobSchema);
