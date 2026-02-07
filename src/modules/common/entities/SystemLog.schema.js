/**
 * System Log Model
 * For persisting application logs with TTL for automatic cleanup
 */

const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
    level: {
        type: String,
        required: true,
        index: true
    },
    message: {
        type: String,
        required: true
    },
    context: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    traceId: {
        type: String,
        index: true
    },
    environment: {
        type: String,
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: { expires: '7d' } // Automatically delete logs after 7 days
    }
}, {
    timestamps: false, // We use timestamp field manually
    collection: 'system_logs'
});

// Compound indexes for searching
systemLogSchema.index({ environment: 1, level: 1, timestamp: -1 });
systemLogSchema.index({ timestamp: -1 });

module.exports = mongoose.models.SystemLog || mongoose.model('SystemLog', systemLogSchema);
