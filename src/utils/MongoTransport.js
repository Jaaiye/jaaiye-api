const Transport = require('winston-transport');
const mongoose = require('mongoose');

/**
 * Custom Winston Transport for MongoDB
 * Saves logs to the SystemLog collection
 */
class MongoTransport extends Transport {
    constructor(opts) {
        super(opts);
        this.SystemLog = null;
    }

    async log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        try {
            if (!this.SystemLog) {
                // Lazy load to avoid circular dependencies or initialization issues
                this.SystemLog = require('../modules/common/entities/SystemLog.schema');
            }

            // Extract metadata (context) from info object
            const { level, message, timestamp, environment, traceId, ...context } = info;

            await this.SystemLog.create({
                level,
                message,
                timestamp: timestamp ? new Date(timestamp) : new Date(),
                environment: environment || process.env.NODE_ENV || 'development',
                traceId: traceId || context.traceId || null,
                context: context
            });
        } catch (error) {
            // Don't let logging failures crash the app, but log to console
            console.error('Failed to save log to MongoDB:', error.message);
        }

        callback();
    }
}

module.exports = MongoTransport;
